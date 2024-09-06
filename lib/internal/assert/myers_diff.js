'use strict';

const {
  Array,
  ArrayPrototypeFill,
  ArrayPrototypePush,
  ArrayPrototypeSlice,
  ArrayPrototypeSplice,
  Object,
  StringPrototypeEndsWith,
  StringPrototypeSplit,
} = primordials;

const colors = require('internal/util/colors');
const { inspect } = require('internal/util/inspect');

// Took this function from assertion_error.js . I copied it here to make sure that if
// the original function changes, the myersDiff function will work the same if an
// object is passed as an argument.
function inspectValue(val) {
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
  });
}

function isObject(val) {
  return val != null && val.constructor === Object;
}

// Function to check if two lines are equal, considering possible comma disparities
function areLinesEqual(actual, expected, checkCommaDisparity) {
  if (!checkCommaDisparity) {
    return actual === expected;
  }

  return actual === expected || `${actual},` === expected || actual === `${expected},`;
}

function myersDiff(actual, expected, checkCommaDisparity) {
  // Converting the input to arrays of lines
  // This is only useful when calling the function directly.
  // createErrDiff is doing it already
  if (isObject(actual) && isObject(expected)) {
    actual = StringPrototypeSplit(inspectValue(actual), '\n');
    expected = StringPrototypeSplit(inspectValue(expected), '\n');
    checkCommaDisparity = true;
  }

  const actualLength = actual.length;
  const expectedLength = expected.length;
  const max = actualLength + expectedLength;
  const v = ArrayPrototypeFill(Array(2 * max + 1), 0);

  const trace = [];

  for (let diffLevel = 0; diffLevel <= max; diffLevel++) {
    const newTrace = ArrayPrototypeSlice(v);
    ArrayPrototypePush(trace, newTrace);

    // Iterate over the possible values of diagonalIndex
    for (let diagonalIndex = -diffLevel; diagonalIndex <= diffLevel; diagonalIndex += 2) {
      let x;
      if (diagonalIndex === -diffLevel ||
        (
          diagonalIndex !== diffLevel &&
          v[diagonalIndex - 1 + max] < v[diagonalIndex + 1 + max]
        )) {
        x = v[diagonalIndex + 1 + max];
      } else {
        x = v[diagonalIndex - 1 + max] + 1;
      }

      let y = x - diagonalIndex;

      // Move diagonally as long as the lines are equal
      while (x < actualLength && y < expectedLength && areLinesEqual(actual[x], expected[y], checkCommaDisparity)) {
        x++;
        y++;
      }

      v[diagonalIndex + max] = x;

      // If we have reached the end of both sequences, backtrack to find the diff
      if (x >= actualLength && y >= expectedLength) {
        return backtrack(trace, actual, expected, checkCommaDisparity);
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
      (
        diagonalIndex !== diffLevel &&
        v[diagonalIndex - 1 + max] < v[diagonalIndex + 1 + max]
      )) {
      prevDiagonalIndex = diagonalIndex + 1;
    } else {
      prevDiagonalIndex = diagonalIndex - 1;
    }

    const prevX = v[prevDiagonalIndex + max];
    const prevY = prevX - prevDiagonalIndex;

    // Move diagonally as long as the lines are equal
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

const nopLinesToCollapse = 5;

function printMyersDiff(diff, skipped) {
  const message = [];
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
        ArrayPrototypePush(message, `${colors.green}+${colors.white} ${value}`);
      }
    } else if (type === 'delete') {
      if (!typeChanged && lastDeleted === value) {
        identicalDeletedCount++;
      } else {
        ArrayPrototypePush(message, `${colors.red}-${colors.white} ${value}`);
      }
    } else if (type === 'nop') {
      if (nopCount <= nopLinesToCollapse) {
        ArrayPrototypePush(message, `${colors.white}  ${value}`);
      }
      nopCount++;
    }

    const shouldGroupInsertedLines = ((previousType === 'insert' && typeChanged) ||
      (type === 'insert' && lastInserted !== value)) && identicalInsertedCount;
    const shouldGroupDeletedLines = ((previousType === 'delete' && typeChanged) ||
      (type === 'delete' && lastDeleted !== value)) && identicalDeletedCount;

    if (typeChanged && previousType === 'nop') {
      if (nopCount > nopLinesToCollapse) {
        ArrayPrototypePush(message, `${colors.blue}...${colors.white}`);
        skipped = true;
      }
      nopCount = 0;
    } else if (shouldGroupInsertedLines) {
      // Group the same inserted lines together
      ArrayPrototypeSplice(message, message.length - 1, 0, `${colors.green}...${colors.white}`);
      identicalInsertedCount = 0;
      skipped = true;
    } else if (shouldGroupDeletedLines) {
      // Group the same deleted lines together
      ArrayPrototypeSplice(message, message.length - 1, 0, `${colors.red}...${colors.white}`);
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

  return { message: message.join('\n'), skipped };
}

module.exports = { myersDiff, printMyersDiff };
