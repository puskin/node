'use strict';

const {
  ArrayIsArray,
  ArrayPrototypeJoin,
  ArrayPrototypePop,
  Error,
  ErrorCaptureStackTrace,
  Map,
  Object,
  ObjectAssign,
  ObjectDefineProperty,
  ObjectGetPrototypeOf,
  ObjectKeys,
  String,
  StringPrototypeSlice,
  StringPrototypeSplit,
} = primordials;

const { inspect } = require('internal/util/inspect');
const colors = require('internal/util/colors');
const { validateObject } = require('internal/validators');
const { isErrorStackTraceLimitWritable } = require('internal/errors');
const { myersDiff, printMyersDiff } = require('internal/assert/myers_diff');

const kReadableOperator = {
  deepStrictEqual: 'Expected values to be strictly deep-equal:',
  strictEqual: 'Expected values to be strictly equal:',
  strictEqualObject: 'Expected "actual" to be reference-equal to "expected":',
  deepEqual: 'Expected values to be loosely deep-equal:',
  notDeepStrictEqual: 'Expected "actual" not to be strictly deep-equal to:',
  notStrictEqual: 'Expected "actual" to be strictly unequal to:',
  notStrictEqualObject:
    'Expected "actual" not to be reference-equal to "expected":',
  notDeepEqual: 'Expected "actual" not to be loosely deep-equal to:',
  notIdentical: 'Values have same structure but are not reference-equal:',
  notDeepEqualUnequal: 'Expected values not to be loosely deep-equal:',
};

function copyError(source) {
  const target = ObjectAssign(
    { __proto__: ObjectGetPrototypeOf(source) },
    source,
  );
  ObjectDefineProperty(target, 'message', {
    __proto__: null,
    value: source.message,
  });
  return target;
}

function inspectValue(val, additionalConfig = {}) {
  // The util.inspect default values could be changed. This makes sure the
  // error messages contain the necessary information nevertheless.
  return inspect(val, {
    compact: false,
    customInspect: false,
    depth: 1000,
    maxArrayLength: Infinity,
    // Assert compares only enumerable properties (with a few exceptions).
    showHidden: false,
    // Assert does not detect proxies currently.
    showProxy: false,
    sorted: true,
    // Inspect getters as we also check them when comparing entries.
    getters: true,
    ...additionalConfig,
  });
}

function showSimpleDiff(test) {
  const isPrimitive = test !== Object(test);
  const isEmptyArray = ArrayIsArray(test) && test.length === 0;
  const isSimpleObject = !isPrimitive && !(test instanceof Map) && ObjectKeys(test).length === 0;

  return isPrimitive || isEmptyArray || isSimpleObject;
}

function checkOperator(actual, expected, operator) {
  // In case both values are objects or functions explicitly mark them as not
  // reference equal for the `strictEqual` operator.
  if (
    operator === 'strictEqual' &&
    ((typeof actual === 'object' &&
      actual !== null &&
      typeof expected === 'object' &&
      expected !== null) ||
      (typeof actual === 'function' && typeof expected === 'function'))
  ) {
    operator = 'strictEqualObject';
  }

  return operator;
}

function createErrDiff(actual, expected, operator) {
  operator = checkOperator(actual, expected, operator);
  const nopSkippedMessage = `\n${colors.blue}...${colors.white} Lines skipped which didn't differ`;
  const insertedSkippedMessage = `\n${colors.green}...${colors.white} Lines skipped which were inserted`;
  const deletedSkippedMessage = `\n${colors.red}...${colors.white} Lines skipped which were deleted`;
  const skippedMsg = `${nopSkippedMessage}${insertedSkippedMessage}${deletedSkippedMessage}`;

  const simpleDiff = showSimpleDiff(actual) && showSimpleDiff(expected);
  const msgHeader = simpleDiff ? '' : `${colors.green}+ actual${colors.white} ${colors.red}- expected${colors.white}`;
  const msg = `${kReadableOperator[operator]}\n${msgHeader}`;

  const diff = myersDiff(actual, expected, true);
  const diffMessage = printMyersDiff(diff, simpleDiff);

  return `${msg}${(diffMessage.skipped) ? skippedMsg : ''}\n${diffMessage.message}\n`;
}

function addEllipsis(string) {
  const lines = StringPrototypeSplit(string, '\n', 11);
  if (lines.length > 10) {
    lines.length = 10;
    return `${ArrayPrototypeJoin(lines, '\n')}\n...`;
  } else if (string.length > 512) {
    return `${StringPrototypeSlice(string, 512)}...`;
  }
  return string;
}

class AssertionError extends Error {
  constructor(options) {
    validateObject(options, 'options');
    const {
      message,
      operator,
      stackStartFn,
      details,
      // Compatibility with older versions.
      stackStartFunction,
    } = options;
    let { actual, expected } = options;

    const limit = Error.stackTraceLimit;
    if (isErrorStackTraceLimitWritable()) Error.stackTraceLimit = 0;

    if (message != null) {
      super(String(message));
    } else {
      // Reset colors on each call to make sure we handle dynamically set environment
      // variables correct.
      colors.refresh();
      // Prevent the error stack from being visible by duplicating the error
      // in a very close way to the original in case both sides are actually
      // instances of Error.
      if (
        typeof actual === 'object' &&
        actual !== null &&
        typeof expected === 'object' &&
        expected !== null &&
        'stack' in actual &&
        actual instanceof Error &&
        'stack' in expected &&
        expected instanceof Error
      ) {
        actual = copyError(actual);
        expected = copyError(expected);
      }

      if (operator === 'deepStrictEqual' || operator === 'strictEqual') {
        super(createErrDiff(actual, expected, operator));
      } else if (
        operator === 'notDeepStrictEqual' ||
        operator === 'notStrictEqual'
      ) {
        // In case the objects are equal but the operator requires unequal, show
        // the first object and say A equals B
        let base = kReadableOperator[operator];
        const res = StringPrototypeSplit(inspectValue(actual), '\n');

        // In case "actual" is an object or a function, it should not be
        // reference equal.
        if (
          operator === 'notStrictEqual' &&
          ((typeof actual === 'object' && actual !== null) ||
            typeof actual === 'function')
        ) {
          base = kReadableOperator.notStrictEqualObject;
        }

        // Only remove lines in case it makes sense to collapse those.
        // TODO: Accept env to always show the full error.
        if (res.length > 50) {
          res[46] = `${colors.blue}...${colors.white}`;
          while (res.length > 47) {
            ArrayPrototypePop(res);
          }
        }

        // Only print a single input.
        if (res.length === 1) {
          super(`${base}${res[0].length > 5 ? '\n\n' : ' '}${res[0]}`);
        } else {
          super(`${base}\n\n${ArrayPrototypeJoin(res, '\n')}\n`);
        }
      } else {
        let res = inspectValue(actual);
        let other = inspectValue(expected);
        const knownOperator = kReadableOperator[operator];
        if (operator === 'notDeepEqual' && res === other) {
          res = `${knownOperator}\n\n${res}`;
          if (res.length > 1024) {
            res = `${StringPrototypeSlice(res, 0, 1021)}...`;
          }
          super(res);
        } else {
          if (res.length > 512) {
            res = `${StringPrototypeSlice(res, 0, 509)}...`;
          }
          if (other.length > 512) {
            other = `${StringPrototypeSlice(other, 0, 509)}...`;
          }
          if (operator === 'deepEqual') {
            res = `${knownOperator}\n\n${res}\n\nshould loosely deep-equal\n\n`;
          } else {
            const newOp = kReadableOperator[`${operator}Unequal`];
            if (newOp) {
              res = `${newOp}\n\n${res}\n\nshould not loosely deep-equal\n\n`;
            } else {
              other = ` ${operator} ${other}`;
            }
          }
          super(`${res}${other}`);
        }
      }
    }

    if (isErrorStackTraceLimitWritable()) Error.stackTraceLimit = limit;

    this.generatedMessage = !message;
    ObjectDefineProperty(this, 'name', {
      __proto__: null,
      value: 'AssertionError [ERR_ASSERTION]',
      enumerable: false,
      writable: true,
      configurable: true,
    });
    this.code = 'ERR_ASSERTION';
    if (details) {
      this.actual = undefined;
      this.expected = undefined;
      this.operator = undefined;
      for (let i = 0; i < details.length; i++) {
        this['message ' + i] = details[i].message;
        this['actual ' + i] = details[i].actual;
        this['expected ' + i] = details[i].expected;
        this['operator ' + i] = details[i].operator;
        this['stack trace ' + i] = details[i].stack;
      }
    } else {
      this.actual = actual;
      this.expected = expected;
      this.operator = operator;
    }
    ErrorCaptureStackTrace(this, stackStartFn || stackStartFunction);
    // Create error message including the error code in the name.
    this.stack; // eslint-disable-line no-unused-expressions
    // Reset the name.
    this.name = 'AssertionError';
  }

  toString() {
    return `${this.name} [${this.code}]: ${this.message}`;
  }

  [inspect.custom](recurseTimes, ctx) {
    // Long strings should not be fully inspected.
    const tmpActual = this.actual;
    const tmpExpected = this.expected;

    if (typeof this.actual === 'string') {
      this.actual = addEllipsis(this.actual);
    }
    if (typeof this.expected === 'string') {
      this.expected = addEllipsis(this.expected);
    }

    // This limits the `actual` and `expected` property default inspection to
    // the minimum depth. Otherwise those values would be too verbose compared
    // to the actual error message which contains a combined view of these two
    // input values.
    const result = inspect(this, {
      ...ctx,
      customInspect: false,
      depth: 0,
    });

    // Reset the properties after inspection.
    this.actual = tmpActual;
    this.expected = tmpExpected;

    return result;
  }
}

module.exports = AssertionError;
