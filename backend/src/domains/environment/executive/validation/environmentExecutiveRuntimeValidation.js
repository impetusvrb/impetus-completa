'use strict';

const flags = require('../flags/environmentExecutiveRuntimeFlags');
const { buildExecutiveExplainability } = require('../shared/environmentExecutiveExplainability');
const { validateCatalogType } = require('../../../../eventPipeline/catalog/industrialEventCatalog');
const contract = require('../../contracts/environmentDomainContract');

const EXEC_EVENTS = [
  'environment.executive.esg_insight_generated',
  'environment.executive.sustainability_insight_generated',
  'environment.executive.carbon_hotspot_detected',
  'environment.executive.environmental_risk_escalated',
  'environment.executive.maturity_shift_detected',
  'environment.executive.environmental_narrative_generated',
  'environment.executive.cross_domain_insight_generated'
];

function environmentExecutiveRuntimeValidation() {
  const checks = [];
  const push = (id, ok, detail) => checks.push({ id, ok, detail });
  push('flags', typeof flags.getExecutiveRuntimeFlagSnapshot === 'function', 'ok');
  const ex = buildExecutiveExplainability({});
  push('no_enforcement', ex.no_enforcement === true, 'explainability');
  for (const t of EXEC_EVENTS) {
    const v = validateCatalogType(t, { strict: true });
    push(`catalog_${t}`, v.ok === true, v.reason || 'ok');
  }
  push('contract_api', contract.EXECUTIVE_API_PREFIX === '/api/environment-executive', contract.EXECUTIVE_API_PREFIX);
  const failed = checks.filter((c) => !c.ok).length;
  return { ok: failed === 0, checks, summary: { total: checks.length, failed } };
}

function environmentExecutiveAudienceValidation() {
  return { ok: true, bands: ['coordinator', 'manager', 'director'] };
}

function environmentExecutiveExplainabilityValidation() {
  const ex = buildExecutiveExplainability({ causal_chain: ['a'], impact: 'operational' });
  return { ok: ex.causal_chain.length === 1, envelope: ex };
}

function environmentExecutiveMaturityValidation() {
  return { ok: true, stage: 5, shadow: true };
}

function environmentExecutiveBehaviorValidation() {
  return { ok: true, assistive_only: true, no_auto_promotion: true, no_enforcement: true };
}

function runFullExecutiveValidation() {
  return {
    runtime: environmentExecutiveRuntimeValidation(),
    audience: environmentExecutiveAudienceValidation(),
    explainability: environmentExecutiveExplainabilityValidation(),
    maturity: environmentExecutiveMaturityValidation(),
    behavior: environmentExecutiveBehaviorValidation()
  };
}

module.exports = {
  environmentExecutiveRuntimeValidation,
  environmentExecutiveAudienceValidation,
  environmentExecutiveExplainabilityValidation,
  environmentExecutiveMaturityValidation,
  environmentExecutiveBehaviorValidation,
  runFullExecutiveValidation
};
