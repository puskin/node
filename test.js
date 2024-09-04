const {deepStrictEqual} = require('assert');

let actual = {
  common: {},
  key1: "",
  test: {},
  creator: "123",
};

let expected = {
  creator: "123",
  test: {},
};

for (let i = 0 ; i < 55; i++) {
  actual.test[i] = i;
  expected.test[i] = i;
}

deepStrictEqual(actual, expected);
