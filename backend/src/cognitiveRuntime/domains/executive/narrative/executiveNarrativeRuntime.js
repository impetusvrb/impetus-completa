'use strict';

const { buildStrategicNarrative } = require('./strategicNarrativeEngine');

function runExecutiveNarrativeRuntime(enterpriseBundle = {}, strategic = {}, reliability = {}) {
  const ent = enterpriseBundle.enterprise || {};
  return buildStrategicNarrative(ent, strategic, reliability);
}

module.exports = { runExecutiveNarrativeRuntime };
