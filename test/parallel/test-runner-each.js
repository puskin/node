'use strict';
const common = require('../common');
const { ok, equal } = require('node:assert');
const { it, describe } = require('node:test');

const numericalTestCases = [
  [1, 1, 2],
  [1, 2, 3],
  [2, 1, 3],
  [2, 2, 4],
];

const objectTestCases = [
  { a: 1, b: 1, result: 2 },
  { a: 1, b: 2, result: 3 },
  { a: 2, b: 1, result: 3 },
  { a: 2, b: 2, result: 4 },
];

describe('with no options', { plan: numericalTestCases.length }, () => {
  it.each(numericalTestCases)('.add(%d, %d) = %d', common.mustCallAtLeast((a, b, result) => {
    ok(numericalTestCases.some((testCase) => testCase[0] === a && testCase[1] === b && testCase[2] === result));
  }));
});

describe('with options', { plan: numericalTestCases.length }, () => {
  it.each(numericalTestCases)('test options only', { skip: true }, common.mustNotCall());

});

describe('if the array has only one element', { plan: 3 }, () => {
  it.each([1, 2, 3])('should run the test 3 times', common.mustCallAtLeast(() => {
    ok(true);
  }));
});

describe('array of objects', { plan: objectTestCases.length }, () => {
  it.each(objectTestCases)('should add consider an array of objects', common.mustCallAtLeast(({ a, b, result }) => {
    ok(objectTestCases.some((tc) => tc.a === a && tc.b === b && tc.result === result));
  }));
});

describe('describe.each', () => {
  describe.each([
    [1, 2, 3],
    [1, 3, 4],
    [2, 3, 5],
  ])('given %d and %d', (a, b, expected) => {
    it(`returns ${expected}`, () => {
      equal(a + b, expected);
    });
  });
});
