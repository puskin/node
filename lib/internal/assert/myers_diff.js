'use strict';

const {
  Array,
  ArrayPrototypeFill,
  ArrayPrototypePush,
  ArrayPrototypeSlice,
  ArrayPrototypeSplice,
  Object,
  StringPrototypeEndsWith,
  StringPrototypeSlice,
  StringPrototypeSplit,
} = primordials;

const colors = require('internal/util/colors');
const { inspect } = require('internal/util/inspect');

const START_SINGLE_ARRAY_PLACEHOLDER = '|**~__';
const END_SINGLE_ARRAY_PLACEHOLDER = '__~**|';
const MAX_STRING_LENGTH = 512;
const NOP_LINES_TO_COLLAPSE = 5;

function inspectValue(val) {
  return inspect(val, {
    compact: false,
    customInspect: false,
    depth: 1000,
    maxArrayLength: Infinity,
    showHidden: false,
    showProxy: false,
    sorted: true,
    getters: true,
  });
}

function isObject(val) {
  return val != null && val.constructor === Object;
}

function areLinesEqual(actual, expected, checkCommaDisparity) {
  if (!checkCommaDisparity) {
    return actual === expected;
  }
  return actual === expected || `${actual},` === expected || actual === `${expected},`;
}

function getSingularizeArrayValuesString(value) {
  return `${START_SINGLE_ARRAY_PLACEHOLDER}${value}${END_SINGLE_ARRAY_PLACEHOLDER}`;
}

function removePlaceholder(value) {
  if (typeof value !== 'string') {
    return value;
  }
  const startIndex = value.indexOf(START_SINGLE_ARRAY_PLACEHOLDER);
  const endIndex = value.indexOf(END_SINGLE_ARRAY_PLACEHOLDER) + END_SINGLE_ARRAY_PLACEHOLDER.length;

  if (startIndex !== -1 && endIndex !== -1) {
    return value.slice(0, startIndex) + value.slice(endIndex);
  }

  return value;
}

function cleanDiffFromSingularizedArrays(diff) {
  for (let i = 0; i < diff.length; i++) {
    diff[i].value = removePlaceholder(diff[i].value);
  }
  return diff;
}

const inspectOptions = { getSingularizeArrayValuesString };

function myersDiff(actual, expected, stringify) {
  const checkCommaDisparity = actual != null && typeof actual === 'object';

  if (stringify || isObject(actual)) {
    actual = StringPrototypeSplit(inspectValue(actual, inspectOptions), '\n');
  }
  if (stringify || isObject(expected)) {
    expected = StringPrototypeSplit(inspectValue(expected, inspectOptions), '\n');
  }

  const actualLength = actual.length;
  const expectedLength = expected.length;
  const max = actualLength + expectedLength;
  const v = ArrayPrototypeFill(Array(2 * max + 1), 0);

  const trace = [];

  for (let diffLevel = 0; diffLevel <= max; diffLevel++) {
    const newTrace = ArrayPrototypeSlice(v);
    ArrayPrototypePush(trace, newTrace);

    for (let diagonalIndex = -diffLevel; diagonalIndex <= diffLevel; diagonalIndex += 2) {
      let x;
      if (diagonalIndex === -diffLevel ||
        (diagonalIndex !== diffLevel && v[diagonalIndex - 1 + max] < v[diagonalIndex + 1 + max])) {
        x = v[diagonalIndex + 1 + max];
      } else {
        x = v[diagonalIndex - 1 + max] + 1;
      }

      let y = x - diagonalIndex;

      while (x < actualLength && y < expectedLength && areLinesEqual(actual[x], expected[y], checkCommaDisparity)) {
        x++;
        y++;
      }

      v[diagonalIndex + max] = x;

      if (x >= actualLength && y >= expectedLength) {
        const diff = backtrack(trace, actual, expected, checkCommaDisparity);
        return cleanDiffFromSingularizedArrays(diff);
      }
    }
  }
}

function backtrack(trace, actual, expected, checkCommaDisparity) {
  const actualLength = actual.length;
  const expectedLength = expected.length;
  const max = actualLength + expectedLength;

  let x = actualLength;
  let y = expectedLength;
  const result = [];

  for (let diffLevel = trace.length - 1; diffLevel >= 0; diffLevel--) {
    const v = trace[diffLevel];
    const diagonalIndex = x - y;
    let prevDiagonalIndex;

    if (diagonalIndex === -diffLevel ||
      (diagonalIndex !== diffLevel && v[diagonalIndex - 1 + max] < v[diagonalIndex + 1 + max])) {
      prevDiagonalIndex = diagonalIndex + 1;
    } else {
      prevDiagonalIndex = diagonalIndex - 1;
    }

    const prevX = v[prevDiagonalIndex + max];
    const prevY = prevX - prevDiagonalIndex;

    while (x > prevX && y > prevY) {
      const value = !checkCommaDisparity ||
        StringPrototypeEndsWith(actual[x - 1], ',') ? actual[x - 1] : expected[y - 1];
      ArrayPrototypePush(result, { type: 'nop', value });
      x--;
      y--;
    }

    if (diffLevel > 0) {
      if (x > prevX) {
        ArrayPrototypePush(result, { type: 'insert', value: actual[x - 1] });
        x--;
      } else {
        ArrayPrototypePush(result, { type: 'delete', value: expected[y - 1] });
        y--;
      }
    }
  }

  return result.reverse();
}

function formatValue(value) {
  if (value.length > MAX_STRING_LENGTH) {
    return `${StringPrototypeSlice(value, 0, MAX_STRING_LENGTH + 1)}...`;
  }
  return value;
}

function pushGroupedLinesMessage(message, color) {
  ArrayPrototypeSplice(message, message.length - 1, 0, `${colors[color]}...${colors.white}`);
}

function printMyersDiff(diff, simpleDiff) {
  if (simpleDiff) {
    return { message: `${formatValue(diff[0].value)} !== ${formatValue((diff[1] || diff[0]).value)}`, skipped: false };
  }

  const message = [];
  let skipped = false;
  let previousType = 'null';
  let nopCount = 0;
  let lastInserted = null;
  let lastDeleted = null;
  let identicalInsertedCount = 0;
  let identicalDeletedCount = 0;

  for (let diffIdx = 0; diffIdx < diff.length; diffIdx++) {
    const { type, value } = diff[diffIdx];
    const typeChanged = previousType && (type !== previousType);

    if (type === 'insert') {
      if (!typeChanged && (lastInserted === value)) {
        identicalInsertedCount++;
      } else {
        ArrayPrototypePush(message, `${colors.green}+${colors.white} ${formatValue(value)}`);
      }
    } else if (type === 'delete') {
      if (!typeChanged && (lastDeleted === value)) {
        identicalDeletedCount++;
      } else {
        ArrayPrototypePush(message, `${colors.red}-${colors.white} ${formatValue(value)}`);
      }
    } else if (type === 'nop') {
      if (nopCount <= NOP_LINES_TO_COLLAPSE) {
        ArrayPrototypePush(message, `${colors.white}  ${formatValue(value)}`);
      }
      nopCount++;
    }

    const shouldGroupInsertedLines = ((previousType === 'insert' && typeChanged) ||
      (type === 'insert' && lastInserted !== value)) && identicalInsertedCount;
    const shouldGroupDeletedLines = ((previousType === 'delete' && typeChanged) ||
      (type === 'delete' && lastDeleted !== value)) && identicalDeletedCount;

    if (typeChanged && previousType === 'nop') {
      if (nopCount > NOP_LINES_TO_COLLAPSE) {
        pushGroupedLinesMessage(message, 'blue');
        skipped = true;
      }
      nopCount = 0;
    } else if (shouldGroupInsertedLines) {
      pushGroupedLinesMessage(message, 'green');
      identicalInsertedCount = 0;
      skipped = true;
    } else if (shouldGroupDeletedLines) {
      pushGroupedLinesMessage(message, 'red');
      identicalDeletedCount = 0;
      skipped = true;
    }

    if (type === 'insert') {
      lastInserted = value;
    } else if (type === 'delete') {
      lastDeleted = value;
    }

    previousType = type;
  }

  return { message: `\n${message.join('\n')}`, skipped };
}

module.exports = { myersDiff, printMyersDiff };
