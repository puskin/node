'use strict';

require('../common');
const { myersDiff, deepStrictEqual } = require('assert');
const { test, describe } = require('node:test');

// Disable colored output to prevent color codes from breaking assertion
// message comparisons. This should only be an issue when process.stdout
// is a TTY.
if (process.stdout.isTTY) {
  process.env.NODE_DISABLE_COLORS = '1';
}

describe('myersDiff', () => {
  test('simple strings', () => {
    const actual = 'ABCABBA';
    const expected = 'CBABAC';
    const diff = myersDiff(actual, expected);

    deepStrictEqual(diff, [
      { type: 'insert', value: 'A' },
      { type: 'insert', value: 'B' },
      { type: 'nop', value: 'C' },
      { type: 'delete', value: 'B' },
      { type: 'nop', value: 'A' },
      { type: 'nop', value: 'B' },
      { type: 'insert', value: 'B' },
      { type: 'nop', value: 'A' },
      { type: 'delete', value: 'C' },
    ]);
  });

  test('arrays', () => {
    const actual = [1, 2, 3, 4, 5];
    const expected = [1, 2, 8, 4, 5];
    const diff = myersDiff(actual, expected);

    deepStrictEqual(diff, [
      { type: 'nop', value: 1 },
      { type: 'nop', value: 2 },
      { type: 'insert', value: 3 },
      { type: 'delete', value: 8 },
      { type: 'nop', value: 4 },
      { type: 'nop', value: 5 },
    ]);
  });

  test('arrays with missing commas at the end', () => {
    const actual = [1, 2, 3, 4, 5, 6];
    const expected = [1, 2, 8, 4, 5];
    const diff = myersDiff(actual, expected);

    deepStrictEqual(diff, [
      { type: 'nop', value: 1 },
      { type: 'nop', value: 2 },
      { type: 'insert', value: 3 },
      { type: 'delete', value: 8 },
      { type: 'nop', value: 4 },
      { type: 'nop', value: 5 },
      { type: 'insert', value: 6 },
    ]);
  });

  test('stringified arrays', () => {
    const actual = ['[', '  1,', '  2,', '  3', ']'];
    const expected = ['[', '  1,', '  2', ']'];
    const diff = myersDiff(actual, expected);

    deepStrictEqual(diff, [
      { type: 'nop', value: '[' },
      { type: 'nop', value: '  1,' },
      { type: 'insert', value: '  2,' },
      { type: 'insert', value: '  3' },
      { type: 'delete', value: '  2' },
      { type: 'nop', value: ']' },
    ]);
  });

  test('objects', () => {
    const actual = { a: 1, b: 2, c: { x: 1, y: 2 }, d: 4, e: 5 };
    const expected = { a: 1, b: 2, c: { x: 8, y: 2 }, d: 9, e: 5 };
    const diff = myersDiff(actual, expected);

    deepStrictEqual(diff, [
      { type: 'nop', value: '{' },
      { type: 'nop', value: '  a: 1,' },
      { type: 'nop', value: '  b: 2,' },
      { type: 'nop', value: '  c: {' },
      { type: 'insert', value: '    x: 1,' },
      { type: 'delete', value: '    x: 8,' },
      { type: 'nop', value: '    y: 2' },
      { type: 'nop', value: '  },' },
      { type: 'insert', value: '  d: 4,' },
      { type: 'delete', value: '  d: 9,' },
      { type: 'nop', value: '  e: 5' },
      { type: 'nop', value: '}' },
    ]);
  });

  test('non omogeneus objects', () => {
    const actual = { a: 1, b: 2, c: { x: [1, 2, 3], y: 2 } };
    const expected = { a: 1, b: 3, c: { x: 8, y: [3, 4, 5] } };
    const diff = myersDiff(actual, expected);

    deepStrictEqual(
      diff,
      [
        { type: 'nop', value: '{' },
        { type: 'nop', value: '  a: 1,' },
        { type: 'insert', value: '  b: 2,' },
        { type: 'delete', value: '  b: 3,' },
        { type: 'nop', value: '  c: {' },
        { type: 'insert', value: '    x: [' },
        { type: 'insert', value: '      1,' },
        { type: 'insert', value: '      2,' },
        { type: 'delete', value: '    x: 8,' },
        { type: 'delete', value: '    y: [' },
        { type: 'nop', value: '      3,' },
        { type: 'delete', value: '      4,' },
        { type: 'delete', value: '      5' },
        { type: 'nop', value: '    ],' },
        { type: 'insert', value: '    y: 2' },
        { type: 'nop', value: '  }' },
        { type: 'nop', value: '}' },
      ]
    );
  });
});
