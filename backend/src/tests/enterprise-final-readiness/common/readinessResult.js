'use strict';

function check(id, ok, severity = 'fail', detail = '') {
  const status = ok ? 'pass' : severity === 'warn' ? 'warn' : 'fail';
  return { id, status, detail: detail || (ok ? 'ok' : 'failed') };
}

function phaseResult(phaseId, title, checks) {
  const failed = checks.filter((c) => c.status === 'fail');
  const warned = checks.filter((c) => c.status === 'warn');
  let verdict = 'pass';
  if (failed.length) verdict = 'fail';
  else if (warned.length) verdict = 'warn';
  return { phaseId, title, verdict, checks, failed: failed.length, warned: warned.length };
}

module.exports = { check, phaseResult };
