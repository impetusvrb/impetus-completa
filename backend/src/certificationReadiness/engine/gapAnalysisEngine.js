'use strict';

const catalog = require('../catalog/frameworkCatalog');

function _evidenceMap(inventory) {
  const m = new Map();
  for (const e of inventory.items || []) {
    m.set(e.evidence_key, e.status === true);
  }
  return m;
}

function assessControl(control, evidenceMap) {
  const required = control.evidence || [];
  const missing = [];
  const partial = [];
  for (const key of required) {
    if (evidenceMap.get(key) === true) continue;
    if (key.startsWith('doc:')) {
      partial.push(key);
    } else {
      missing.push(key);
    }
  }
  const met = missing.length === 0;
  const partialOnly = !met && missing.length === 0 && partial.length > 0;
  let status = 'gap';
  let score = 0;
  if (met) {
    status = 'met';
    score = 100;
  } else if (partialOnly || missing.length < required.length) {
    status = 'partial';
    score = Math.round(((required.length - missing.length) / required.length) * 100);
  } else {
    score = 0;
  }
  return {
    control_id: control.id,
    framework: control.framework,
    family: control.family,
    title: control.title,
    weight: control.weight,
    status,
    score,
    missing_evidence: missing,
    partial_evidence: partial
  };
}

function runGapAnalysis(inventory, frameworkFilter = null) {
  const evidenceMap = _evidenceMap(inventory);
  const controls = catalog.listControls(frameworkFilter);
  const results = controls.map((c) => assessControl(c, evidenceMap));
  const gaps = results.filter((r) => r.status === 'gap');
  const partials = results.filter((r) => r.status === 'partial');
  const met = results.filter((r) => r.status === 'met');

  const weighted =
    results.reduce((s, r) => s + r.score * (r.weight || 1), 0) /
    Math.max(1, results.reduce((s, r) => s + (r.weight || 1), 0));

  return {
    overall_score: Math.round(weighted),
    controls_assessed: results.length,
    met_count: met.length,
    partial_count: partials.length,
    gap_count: gaps.length,
    controls: results,
    gaps,
    partials,
    met
  };
}

module.exports = { runGapAnalysis, assessControl };
