'use strict';

const { logWms005Event } = require('./wms005Observability');

const _entries = [];

function recordScenarioResult(scenarioId, result = {}) {
  const row = Object.freeze({
    scenario_id: scenarioId,
    ts: new Date().toISOString(),
    result: result.pass ? 'PASS' : 'FAIL',
    components: result.components || [],
    contracts: result.contracts || [],
    apis: result.apis || [],
    feature_flags: result.feature_flags || {},
    rbac: result.rbac || [],
    criteria: result.criteria || {},
    notes: result.notes || '',
    duration_ms: result.duration_ms || 0
  });
  _entries.push(row);
  logWms005Event({ event: 'SCENARIO_RESULT', ...row });
  return row;
}

function buildPilotMatrixFromResults(scenarioResults = []) {
  const rows = scenarioResults.map((sr) =>
    Object.freeze({
      scenario: sr.scenario_id,
      components: (sr.components || []).join(', '),
      contracts: (sr.contracts || []).join(', '),
      apis: (sr.apis || []).join(', '),
      feature_flags: JSON.stringify(sr.feature_flags || {}),
      rbac: (sr.rbac || []).join(', '),
      result: sr.pass ? 'PASS' : 'FAIL',
      observations: sr.notes || ''
    })
  );
  return Object.freeze({
    phase: 'WMS-005',
    generated_at: new Date().toISOString(),
    all_pass: rows.every((r) => r.result === 'PASS'),
    rows
  });
}

function buildPilotMatrix(extraRows = []) {
  const rows = [..._entries, ...extraRows].map((r) =>
    Object.freeze({
      scenario: r.scenario_id,
      components: (r.components || []).join(', '),
      contracts: (r.contracts || []).join(', '),
      apis: (r.apis || []).join(', '),
      feature_flags: JSON.stringify(r.feature_flags || {}),
      rbac: (r.rbac || []).join(', '),
      result: r.result,
      observations: r.notes || ''
    })
  );
  const allPass = rows.every((r) => r.result === 'PASS');
  return Object.freeze({
    phase: 'WMS-005',
    generated_at: new Date().toISOString(),
    all_pass: allPass,
    rows
  });
}

function resetPilotMatrixForTests() {
  _entries.length = 0;
}

function getMatrixEntries() {
  return [..._entries];
}

module.exports = {
  recordScenarioResult,
  buildPilotMatrix,
  buildPilotMatrixFromResults,
  resetPilotMatrixForTests,
  getMatrixEntries
};
