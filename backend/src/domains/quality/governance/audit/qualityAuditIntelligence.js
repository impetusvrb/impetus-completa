'use strict';

function summarizeAuditFindings(findings = []) {
  const bySev = { critical: 0, major: 0, minor: 0 };
  for (const f of findings) {
    const s = String(f.severity || 'minor').toLowerCase();
    if (bySev[s] != null) bySev[s] += 1;
    else bySev.minor += 1;
  }
  return { count: findings.length, by_severity: bySev };
}

module.exports = {
  summarizeAuditFindings
};
