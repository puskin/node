// Flags: --no-warnings
'use strict';
require('../common');
const assert = require('assert').strict;

process.env.NO_COLOR = '1';
process.env.NODE_DISABLE_COLORS = '1';
process.env.FORCE_COLOR = '0';

assert.throws(
  () => {
    assert.deepStrictEqual({}, { foo: 'bar' });
  },
  {
    message: 'Expected values to be strictly deep-equal:\n' +
      '+ actual - expected\n' +
      '\n' +
      '- {\n' +
      '-   foo: \'bar\'\n' +
      '- }\n' +
      '+ {}\n',
  });

{
  assert.throws(
    () => {
      assert.partialDeepStrictEqual({}, { foo: 'bar' });
    },
    {
      message: 'Expected values to be partially and strictly deep-equal:\n' +
        '+ actual - expected\n' +
        '\n' +
        '- {\n' +
        "-   foo: 'bar'\n" +
        '- }\n' +
        '+ {}\n',
    });
}
