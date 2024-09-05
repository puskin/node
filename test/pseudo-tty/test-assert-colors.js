'use strict';
require('../common');
const assert = require('assert').strict;

assert.throws(() => {
  process.env.FORCE_COLOR = '1';
  delete process.env.NODE_DISABLE_COLORS;
  delete process.env.NO_COLOR;
  assert.deepStrictEqual([1, 2, 2, 2, 2], [2, 2, 2, 2, 2]);
}, (err) => {
  const expected = 'Expected values to be strictly deep-equal:\n' +
    '\x1B[32m+ actual\x1B[39m \x1B[31m- expected\x1B[39m\n' +
    "\x1B[34m...\x1B[39m Lines skipped which didn't differ\n" +
    '\x1B[32m...\x1B[39m Lines skipped which were identical and inserted\n' +
    '\x1B[31m...\x1B[39m Lines skipped which were identical and deleted\n' +
    '\n' +
    '\x1B[39m  [\n' +
    '\u001b[32m+\u001b[39m   1,\n' +
    '\u001b[31m-\u001b[39m   2,\n' +
    '    2,\n' +
    '\u001b[34m...\u001b[39m\n' +
    '    2,\n' +
    '    2\n' +
    '  ]';
  assert.strictEqual(err.message, expected);
  return true;
});
