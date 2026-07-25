/** Shared harness for OPM-GOV-001 test suites. */
export function createSuite(name) {
  let passed = 0;
  let failed = 0;

  function test(label, fn) {
    try {
      fn();
      passed += 1;
      console.log(`  ✓ ${label}`);
    } catch (e) {
      failed += 1;
      console.error(`  ✗ ${label}: ${e.message}`);
    }
  }

  function finish() {
    console.log(`\n${name}: ${passed} passed, ${failed} failed`);
    return failed;
  }

  return { test, finish, get failed() { return failed; } };
}
