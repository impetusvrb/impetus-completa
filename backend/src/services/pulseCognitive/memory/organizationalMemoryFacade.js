/**
 * CERT-PULSE-05 — Facade da Memória Organizacional Cognitiva.
 */
'use strict';

const organizationalMemory = require('./organizationalMemoryService');
const { buildConsolidatedOrganizationalTimeline } = require('./consolidatedTimeline');
const { auditPulseGovernance } = require('./governanceAudit');
const { rankSimilarCases, buildSignatureFromContext } = require('./similarCaseSearch');

async function consultMemory(companyId, scope = {}) {
  return organizationalMemory.consultOrganizationalMemory(companyId, scope);
}

async function searchSimilar(companyId, scope = {}) {
  const ctx = await organizationalMemory.buildCurrentContext(companyId, scope);
  const signature = buildSignatureFromContext(ctx);
  const rows = await organizationalMemory.loadMemoryRows(companyId, 150);
  return {
    ok: true,
    current_signature: signature,
    similar_cases: rankSimilarCases(signature, rows, {
      min_score: parseFloat(scope.min_score) || 0.4,
      limit: parseInt(scope.limit, 10) || 8
    }),
    governance: { not_a_prediction: true, historical_only: true }
  };
}

async function getConsolidatedTimeline(companyId, opts = {}) {
  return buildConsolidatedOrganizationalTimeline(companyId, opts);
}

async function getGovernanceAudit(companyId) {
  return auditPulseGovernance(companyId);
}

async function recordOutcome(companyId, body, actorUserId) {
  return organizationalMemory.recordHumanOutcome(companyId, body, actorUserId);
}

function getArchitectureContractSummary() {
  return {
    ok: true,
    document: 'backend/docs/PULSE_ARCHITECTURE_CONTRACT.md',
    pulse_completed: true,
    core_frozen: true,
    single_extension_point: 'eventIngestion.ingestHumanEvent',
    statement:
      'O Pulse RH está arquiteturalmente concluído. Evoluções futuras deverão ocorrer exclusivamente através da adição de novos eventos ao ecossistema IMPETUS, sem alteração do núcleo cognitivo.',
    governance: { assistive_only: true, human_in_the_loop: true }
  };
}

module.exports = {
  consultMemory,
  searchSimilar,
  getConsolidatedTimeline,
  getGovernanceAudit,
  recordOutcome,
  getArchitectureContractSummary,
  scheduleMemoryCapture: organizationalMemory.scheduleCapture
};
