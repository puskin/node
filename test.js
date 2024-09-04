// function myersDiff(actual, expected) {
//   const lcs = calculateLCS(actual, expected);
//   const diffResult = [];
//   let actualIndex = 0, expectedIndex = 0;

//   while (actualIndex < actual.length || expectedIndex < expected.length) {
//     if (actualIndex < actual.length && expectedIndex < expected.length && actual[actualIndex] === expected[expectedIndex]) {
//       // Both lines match, no diff needed
//       actualIndex++;
//       expectedIndex++;
//     } else if (actualIndex < actual.length && lcs.indexOf(actual[actualIndex]) === -1) {
//       // Line in actual but not in LCS or expected, hence it should be marked as added
//       diffResult.push({type: 'add', value: actual[actualIndex]});
//       actualIndex++;
//     } else if (expectedIndex < expected.length && lcs.indexOf(expected[expectedIndex]) === -1) {
//       // Line in expected but not in LCS or actual, hence it should be marked as removed
//       diffResult.push({type: 'remove', value: expected[expectedIndex]});
//       expectedIndex++;
//     } else {
//       // Lines are in LCS but not in the correct order (moved)
//       if (actualIndex < actual.length && lcs.indexOf(actual[actualIndex]) !== -1) {
//         ai++;
//       }
//       if (expectedIndex < expected.length && lcs.indexOf(expected[expectedIndex]) !== -1) {
//         expectedIndex++;
//       }
//     }
//   }

//   return diffResult;
// }

// // LCS === Longest Common Subsequence
// function calculateLCS(actual, expected) {
//   const actualLength = actual.length
//   const expectedLength = expected.length;
//   const dp = Array.from({ length: actualLength + 1 }, () => Array(expectedLength + 1).fill(0));

//   for (let i = 1; i <= actualLength; i++) {
//     for (let j = 1; j <= expectedLength; j++) {
//       if (actual[i - 1] === expected[j - 1]) {
//         dp[i][j] = dp[i - 1][j - 1] + 1;
//       } else {
//         dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
//       }
//     }
//   }

//   const lcs = [];
//   let i = actualLength;
//   let j = expectedLength;

//   while (i > 0 && j > 0) {
//     if (actual[i - 1] === expected[j - 1]) {
//       lcs.unshift(actual[i - 1]);
//       i--;
//       j--;
//     } else if (dp[i - 1][j] > dp[i][j - 1]) {
//       i--;
//     } else {
//       j--;
//     }
//   }

//   return lcs;
// }

// function myersDiff(actual, expected) {
//   const N = actual.length;
//   const M = expected.length;
//   const max = N + M;
//   const v = Array(2 * max + 1).fill(0);

//   let trace = [];

//   for (let d = 0; d <= max; d++) {
//       const newTrace = [...v];
//       trace.push(newTrace);
      
//       for (let k = -d; k <= d; k += 2) {
//           let x;
//           if (k === -d || (k !== d && v[k - 1 + max] < v[k + 1 + max])) {
//               x = v[k + 1 + max];
//           } else {
//               x = v[k - 1 + max] + 1;
//           }
          
//           let y = x - k;
          
//           while (x < N && y < M && actual[x] === expected[y]) {
//               x++;
//               y++;
//           }
          
//           v[k + max] = x;
          
//           if (x >= N && y >= M) {
//               return backtrack(trace, actual, expected);
//           }
//       }
//   }
// }

// function backtrack(trace, a, b) {
//   const N = a.length;
//   const M = b.length;
//   const max = N + M;
  
//   let x = N;
//   let y = M;
//   let result = [];
  
//   for (let d = trace.length - 1; d >= 0; d--) {
//       const v = trace[d];
//       const k = x - y;
//       let prevK;
      
//       if (k === -d || (k !== d && v[k - 1 + max] < v[k + 1 + max])) {
//           prevK = k + 1;
//       } else {
//           prevK = k - 1;
//       }
      
//       const prevX = v[prevK + max];
//       const prevY = prevX - prevK;
      
//       while (x > prevX && y > prevY) {
//           x--;
//           y--;
//       }
      
//       if (d > 0) {
//           if (x > prevX) {
//               result.push({ type: 'delete', value: a[x - 1] });
//               x--;
//           } else {
//               result.push({ type: 'insert', value: b[y - 1] });
//               y--;
//           }
//       }
//   }
  
//   return result.reverse();
// }

// const actual = ['{', '  common: {},', "  creator: '123'", "  key1: ''", '}'];
// const expected = ['{', "  creator: '123'", '}'];

// const result = myersDiff(expected, actual);
// console.log(result);

// for (const diff of result) {
//   switch (diff.type) {
//     case 'insert':
//       console.log(`+ ${diff.value}`);
//       break;
//     case 'delete':
//       console.log(`- ${diff.value}`);
//       break;
//     default:
//       break;
//   }
// }




require("assert").deepStrictEqual(
  {
    common: {},
    key1: "",
    creator: "123"
  },
  {
    creator: "123"
  },
);