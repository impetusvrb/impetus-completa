'use strict';

/**
 * APPSEC-02 — Security Comparison Engine
 * Compara cenários actuais vs baseline Red Team 04/07/2026.
 */

const { RED_TEAM_BASELINE } = require('./baseline/redTeamBaseline20260704');
const { COMPARISON_STATUS, createComparisonEntry } = require('./dto/appsecValidationDto');
const { SCENARIO_RESULT } = require('./dto/appsecValidationDto');

/** Mapeamento finding → cenários que o validam */
const FINDING_SCENARIO_MAP = Object.freeze({
  'RT-01': ['ACC-IDOR-CHAT'],
  'RT-02': ['SSRF-TIMECLOCK-INTEGRATION', 'SSRF-INTERNAL-127', 'SSRF-HTTP-ONLY'],
  'RT-03': ['SSRF-PLC-REST', 'SSRF-RFC1918', 'SSRF-LINK-LOCAL'],
  'RT-04': ['UPL-CHAT-CANONICAL', 'UPL-MANUALS-CANONICAL', 'UPL-MAGIC-BYTES'],
  'RT-05': ['PUB-BOOT-METRICS', 'PUB-AIOI-HEALTH'],
  'RT-06': ['ACC-ACL-UPLOADS'],
  'RT-07': ['CFG-SECRET-SCANNER', 'CFG-ENV-BACKUPS'],
  'RT-08': ['CFG-RUNTIME-VALIDATOR', 'CFG-PROD-FLAGS', 'CFG-FALLBACK-KEY'],
  'RT-09': ['DEP-NPM-AUDIT'],
  'RT-10': [],
  'RT-11': ['PUB-FEDERATION'],
  'RT-12': ['PUB-HEALTH-DEEP'],
  'RT-13': [],
  'RT-14': ['UPL-MIME-EXE', 'UPL-OCTET-PDF'],
  'RT-15': ['CFG-FALLBACK-KEY'],
  'RT-16': ['ACC-DASHBOARD-NO-AUTH', 'OWASP-APPSEC-LAYER']
});

function scenarioById(scenarios, id) {
  return scenarios.find((s) => s.id === id);
}

function aggregateScenarioStatus(scenarios, ids) {
  if (!ids.length) return { status: COMPARISON_STATUS.NOT_APPLICABLE, pass: 0, fail: 0, warn: 0, skip: 0 };
  let pass = 0;
  let fail = 0;
  let warn = 0;
  let skip = 0;
  for (const id of ids) {
    const s = scenarioById(scenarios, id);
    if (!s) { skip++; continue; }
    if (s.result === SCENARIO_RESULT.PASS) pass++;
    else if (s.result === SCENARIO_RESULT.FAIL) fail++;
    else if (s.result === SCENARIO_RESULT.WARN) warn++;
    else skip++;
  }
  const total = ids.length - skip;
  if (fail > 0) return { status: COMPARISON_STATUS.NOT_FIXED, pass, fail, warn, skip };
  if (total === 0) return { status: COMPARISON_STATUS.NOT_APPLICABLE, pass, fail, warn, skip };
  if (warn > 0 && pass > 0) return { status: COMPARISON_STATUS.PARTIALLY_FIXED, pass, fail, warn, skip };
  if (warn > 0 && pass === 0) return { status: COMPARISON_STATUS.PARTIALLY_FIXED, pass, fail, warn, skip };
  if (pass === total) return { status: COMPARISON_STATUS.FIXED, pass, fail, warn, skip };
  return { status: COMPARISON_STATUS.PARTIALLY_FIXED, pass, fail, warn, skip };
}

/**
 * @param {object[]} scenarios
 * @param {object[]} regressions
 */
function compareWithBaseline(scenarios, regressions) {
  const regressionIds = new Set(regressions.map((r) => r.id));
  const comparison = [];

  for (const finding of RED_TEAM_BASELINE.findings) {
    const scenarioIds = FINDING_SCENARIO_MAP[finding.id] || [];
    const agg = aggregateScenarioStatus(scenarios, scenarioIds);

    let status = agg.status;

    // Regressão directa ligada ao finding
    const relatedRegression = regressions.find((r) => {
      const map = {
        'RT-01': 'REG-CHAT-NO-CROSS-TENANT',
        'RT-02': 'REG-TIMECLOCK-RAW-FETCH',
        'RT-03': 'REG-PLC-RAW-AXIOS',
        'RT-04': ['REG-CHAT-LEGACY-MULTER', 'REG-MANUALS-LEGACY-MULTER'],
        'RT-06': 'REG-ACL-NO-STRICT',
        'RT-14': 'REG-OCTET-BYPASS'
      };
      const keys = map[finding.id];
      if (!keys) return false;
      return Array.isArray(keys) ? keys.some((k) => regressionIds.has(k)) : regressionIds.has(keys);
    });

    if (relatedRegression) status = COMPARISON_STATUS.REGRESSION;

    // Out of scope APPSEC-01
    if (finding.before_state === 'RESIDUAL' && ['RT-10', 'RT-13', 'RT-16'].includes(finding.id)) {
      status = COMPARISON_STATUS.NOT_APPLICABLE;
    }

    // RT-07: scanner FIXED but backups may remain (operational)
    if (finding.id === 'RT-07' && agg.status === COMPARISON_STATUS.FIXED) {
      const backups = scenarioById(scenarios, 'CFG-ENV-BACKUPS');
      if (backups && backups.result === SCENARIO_RESULT.WARN) {
        status = COMPARISON_STATUS.PARTIALLY_FIXED;
      }
    }

    // RT-09 dependencies — governance exists but vulns remain
    if (finding.id === 'RT-09') {
      const dep = scenarioById(scenarios, 'DEP-NPM-AUDIT');
      if (dep && dep.result !== SCENARIO_RESULT.PASS) {
        status = dep.result === SCENARIO_RESULT.SKIP
          ? COMPARISON_STATUS.PARTIALLY_FIXED
          : COMPARISON_STATUS.PARTIALLY_FIXED;
      } else if (dep && dep.result === SCENARIO_RESULT.PASS) {
        status = COMPARISON_STATUS.FIXED;
      }
    }

    comparison.push(createComparisonEntry({
      finding_id: finding.id,
      baseline_priority: finding.priority,
      baseline_risk: finding.risk,
      status,
      before_summary: finding.before_summary,
      after_summary: buildAfterSummary(finding, agg, scenarios, scenarioIds),
      scenario_ids: scenarioIds,
      impact_operational: status === COMPARISON_STATUS.PARTIALLY_FIXED ? 'Requer acção operacional ou P2 residual' : null
    }));
  }

  return comparison;
}

function buildAfterSummary(finding, agg, scenarios, scenarioIds) {
  const parts = [];
  for (const id of scenarioIds) {
    const s = scenarioById(scenarios, id);
    if (s) parts.push(`${id}:${s.result}`);
  }
  if (!parts.length) return `APPSEC-01 mitigação: ${finding.before_state === 'RESIDUAL' ? 'fora de escopo' : 'validado por camada'}`;
  return `Cenários [${parts.join(', ')}] — agregado ${agg.status}`;
}

/**
 * @param {object[]} comparison
 */
function computeScores(comparison, scenarios, regressions) {
  const inScope = comparison.filter((c) => c.status !== COMPARISON_STATUS.NOT_APPLICABLE);
  const fixed = inScope.filter((c) => c.status === COMPARISON_STATUS.FIXED).length;
  const partial = inScope.filter((c) => c.status === COMPARISON_STATUS.PARTIALLY_FIXED).length;
  const notFixed = inScope.filter((c) => c.status === COMPARISON_STATUS.NOT_FIXED).length;
  const regression = inScope.filter((c) => c.status === COMPARISON_STATUS.REGRESSION).length;

  const total = inScope.length || 1;
  const securityImprovementScore = Math.round(((fixed + partial * 0.5) / total) * 100);

  const baselineExploitable = RED_TEAM_BASELINE.findings.filter((f) => f.before_state === 'EXPLOITABLE').length;
  const remainingExploitable = scenarios.filter((s) => s.exploitable && s.result !== SCENARIO_RESULT.SKIP).length;
  const vulnerabilityReduction = Math.max(0, baselineExploitable - remainingExploitable);

  const p0p1 = comparison.filter((c) =>
    ['P0', 'P1'].includes(c.baseline_priority) && c.status !== COMPARISON_STATUS.NOT_APPLICABLE
  );
  const p0p1Fixed = p0p1.filter((c) => c.status === COMPARISON_STATUS.FIXED).length;
  const p0p1Partial = p0p1.filter((c) => c.status === COMPARISON_STATUS.PARTIALLY_FIXED).length;
  const p0p1Failed = p0p1.filter((c) =>
    [COMPARISON_STATUS.NOT_FIXED, COMPARISON_STATUS.REGRESSION].includes(c.status)
  ).length;

  let residualRisk = 'low';
  if (p0p1Failed > 0 || regression > 0) residualRisk = 'high';
  else if (p0p1Partial > 0 || notFixed > 0) residualRisk = 'medium';

  const scenarioPass = scenarios.filter((s) => s.result === SCENARIO_RESULT.PASS).length;
  const scenarioTotal = scenarios.filter((s) => s.result !== SCENARIO_RESULT.SKIP).length;

  return {
    security_improvement_score: securityImprovementScore,
    vulnerability_reduction_count: vulnerabilityReduction,
    baseline_exploitable_findings: baselineExploitable,
    remaining_exploitable_scenarios: remainingExploitable,
    residual_risk: residualRisk,
    comparison_summary: { fixed, partially_fixed: partial, not_fixed: notFixed, regression, not_applicable: comparison.length - inScope.length },
    p0_p1_summary: { total: p0p1.length, fixed: p0p1Fixed, partially_fixed: p0p1Partial, failed: p0p1Failed },
    scenario_pass_rate: scenarioTotal ? Math.round((scenarioPass / scenarioTotal) * 100) : 0,
    regression_count: regressions.length
  };
}

module.exports = {
  FINDING_SCENARIO_MAP,
  compareWithBaseline,
  computeScores
};
