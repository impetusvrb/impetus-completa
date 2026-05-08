'use strict';

/**
 * Fase 7 — aprendizagem supervisionada: propostas auditáveis; aplicação só após aprovação explícita.
 * Não altera pipeline, council, prompts nem motor de decisão.
 */

const crypto = require('crypto');
const { getRecentInteractions } = require('./learningMemoryService');

/** decision_score em memória: 0–1 ou 0–100 */
function confidenceToPercent(c) {
  if (c == null || !Number.isFinite(Number(c))) return null;
  const n = Number(c);
  if (n >= 0 && n <= 1) return n * 100;
  return n;
}

/**
 * @returns {Array<{ type: string, suggestion: string, proposedChange: object }>}
 */
function generateAdjustmentSuggestions() {
  const data = getRecentInteractions();

  if (data.length < 20) return [];

  const withScore = data.filter((i) => confidenceToPercent(i.confidence) != null);
  if (withScore.length < 20) return [];

  const lowConfidence = withScore.filter((i) => confidenceToPercent(i.confidence) < 50);

  if (lowConfidence.length > withScore.length * 0.4) {
    return [
      {
        type: 'confidence_adjustment',
        suggestion: 'Reduzir peso de confiança quando data_state != production_active',
        proposedChange: { factor: 0.5 }
      }
    ];
  }

  return [];
}

const proposals = [];

/**
 * @param {object} proposal — item devolvido por generateAdjustmentSuggestions
 * @returns {string} id da proposta
 */
function storeProposal(proposal) {
  const id = crypto.randomUUID();
  const row = {
    id,
    proposal,
    status: 'pending',
    createdAt: new Date().toISOString(),
    audit: [{ at: new Date().toISOString(), action: 'created' }]
  };
  proposals.push(row);
  try {
    console.log('[LEARNING_PROPOSAL]', { id, proposal, status: 'pending' });
  } catch (_e) {}
  return id;
}

function getProposals() {
  return proposals.map((p) => ({ ...p, proposal: { ...p.proposal } }));
}

function findProposal(id) {
  const sid = id != null ? String(id) : '';
  return proposals.find((p) => String(p.id) === sid) || null;
}

/**
 * Gera sugestões e regista como propostas pendentes (sem duplicar tipo pendente).
 * @returns {{ createdIds: string[] }}
 */
function generateStrategicProposals() {
  const { analyzeSystemPatterns } = require('./strategicLearningService');
  const patterns = analyzeSystemPatterns();

  return patterns
    .map((p) => {
      if (p.type === 'high_no_data_usage') {
        return {
          type: 'strategy_adjustment',
          suggestion: 'Priorizar respostas orientadas a onboarding/configuração',
          action: 'increase_no_data_guidance'
        };
      }
      if (p.type === 'low_confidence_global') {
        return {
          type: 'strategy_adjustment',
          suggestion: 'Reduzir assertividade global do modelo',
          action: 'reduce_assertiveness'
        };
      }
      return null;
    })
    .filter(Boolean);
}

function isDuplicatePendingProposal(s) {
  return proposals.some((p) => {
    if (p.status !== 'pending' || p.proposal?.type !== s.type) return false;
    if (s.type === 'strategy_adjustment') {
      return p.proposal?.action === s.action;
    }
    return true;
  });
}

function scanAndStorePendingProposals() {
  const buckets = [...generateAdjustmentSuggestions(), ...generateStrategicProposals()];
  const createdIds = [];
  for (const s of buckets) {
    if (isDuplicatePendingProposal(s)) continue;
    createdIds.push(storeProposal(s));
  }
  return { createdIds };
}

/**
 * @param {string|number} id
 * @param {{ userId?: string|null }} meta
 * @returns {object|null} proposta actualizada ou null
 */
function approveProposal(id, meta = {}) {
  const p = findProposal(id);
  if (!p || p.status !== 'pending') return null;

  p.status = 'approved';
  p.approvedAt = new Date().toISOString();
  p.approvedBy = meta.userId != null ? String(meta.userId) : null;
  p.audit.push({
    at: p.approvedAt,
    action: 'approved',
    user_id: p.approvedBy
  });

  try {
    console.log('[LEARNING_APPROVED]', { id: p.id, type: p.proposal?.type, approvedBy: p.approvedBy });
  } catch (_e) {}

  const adaptiveTuningService = require('./adaptiveTuningService');
  if (p.proposal?.type === 'confidence_adjustment' && p.proposal.proposedChange?.factor != null) {
    adaptiveTuningService.mergeApprovedAdjustments({
      confidenceFactor: Number(p.proposal.proposedChange.factor)
    });
  } else if (p.proposal?.type === 'strategy_adjustment' && p.proposal.action != null) {
    adaptiveTuningService.mergeApprovedAdjustments({
      strategy: String(p.proposal.action)
    });
  }

  return p;
}

function rejectProposal(id, meta = {}) {
  const p = findProposal(id);
  if (!p || p.status !== 'pending') return null;
  p.status = 'rejected';
  p.audit.push({
    at: new Date().toISOString(),
    action: 'rejected',
    user_id: meta.userId != null ? String(meta.userId) : null
  });
  return p;
}

module.exports = {
  generateAdjustmentSuggestions,
  generateStrategicProposals,
  storeProposal,
  getProposals,
  findProposal,
  scanAndStorePendingProposals,
  approveProposal,
  rejectProposal
};
