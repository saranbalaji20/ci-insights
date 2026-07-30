// Node's built-in test runner (`node --test`) prints TAP-style lines like:
//   ok 1 - add adds two numbers
//   not ok 2 - subtract subtracts two numbers
// This pulls out each test's name and pass/fail status.
// Kept deliberately simple/rule-based, per the project brief — no ML.
export function parseTestResults(logText) {
  const results = [];
  const lines = logText.split('\n');

  for (const line of lines) {
    const match = line.match(/^\s*(ok|not ok)\s+\d+\s+-\s+(.+?)\s*$/);
    if (match) {
      const passed = match[1] === 'ok';
      const name = match[2].trim();
      results.push({ name, passed });
    }
  }

  return results;
}
