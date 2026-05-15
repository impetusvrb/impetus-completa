'use strict';

/**
 * FASE 9 — EXPLAINABILITY TOTAL
 *
 * Toda decisão, alerta, tarefa ou dashboard deve ser rastreável.
 * O usuário pode perguntar: "Por que recebi esse alerta?",
 * "Por que essa tarefa foi criada?", "Por que esse dashboard apareceu?"
 *
 * Feature flag: EXPLAINABILITY_ENABLED (default true)
 *
 * Gera grafos de explicação com: policy, capability, score,
 * contexto, modelo, arbitration trace e governance trace.
 */

const db = require('../../db');

const ENABLED = process.env.EXPLAINABILITY_ENABLED !== 'false';
const MAX_TRACE_DEPTH = 10;

const _explanationCache = new Map();
const CACHE_TTL = 300000;

/**
 * Registra uma decisão explicável no grafo.
 */
async function recordDecision(params = {}) {
  if (!ENABLED) return { ok: false };

  const {
    companyId, userId, decisionType, entityId, entityType,
    reasons = [], policies = [], scores = {}, context = {},
    model, arbitration, governance
  } = params;

  const entry = {
    company_id: companyId,
    user_id: userId,
    decision_type: decisionType,
    entity_id: entityId,
    entity_type: entityType,
    explanation: {
      reasons,
      policies_applied: policies,
      scores,
      context_used: Object.keys(context),
      model_used: model || 'default',
      arbitration_trace: arbitration || null,
      governance_trace: governance || null
    },
    created_at: new Date().toISOString()
  };

  try {
    await db.query(`
      INSERT INTO memory_audit_log (company_id, user_id, action, scope_filter, facts_count, source_type)
      VALUES ($1, $2, $3, $4, $5, 'explainability')
    `, [
      companyId, userId,
      `decision:${decisionType}:${entityType}`,
      JSON.stringify(entry.explanation),
      reasons.length
    ]);
  } catch (err) {
    if (!err.message?.includes('does not exist')) {
      console.warn('[EXPLAINABILITY] record:', err.message);
    }
  }

  const cacheKey = `${companyId}:${entityType}:${entityId}`;
  _explanationCache.set(cacheKey, { entry, ts: Date.now() });

  return { ok: true, explanation: entry };
}

/**
 * Consulta explicação de uma decisão específica.
 * @param {string} companyId
 * @param {string} entityType - 'task', 'alert', 'dashboard', 'widget'
 * @param {string} entityId
 */
async function getExplanation(companyId, entityType, entityId) {
  if (!ENABLED) return { ok: false, reason: 'disabled' };

  const cacheKey = `${companyId}:${entityType}:${entityId}`;
  const cached = _explanationCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return { ok: true, explanation: cached.entry, source: 'cache' };
  }

  try {
    const r = await db.query(`
      SELECT action, scope_filter, created_at FROM memory_audit_log
      WHERE company_id = $1 AND source_type = 'explainability'
        AND action LIKE $2
      ORDER BY created_at DESC LIMIT 1
    `, [companyId, `%${entityType}%`]);

    if (r.rows?.length) {
      const row = r.rows[0];
      let explanation = {};
      try { explanation = JSON.parse(row.scope_filter); } catch (_) {}
      return { ok: true, explanation, createdAt: row.created_at, source: 'db' };
    }

    return { ok: false, reason: 'not_found' };
  } catch (err) {
    return { ok: false, reason: err.message };
  }
}

/**
 * Gera explicação em linguagem natural para o usuário.
 */
function humanReadableExplanation(explanation) {
  if (!explanation) return 'Não há explicação disponível para esta decisão.';

  const parts = [];

  if (explanation.reasons?.length) {
    parts.push(`Motivos: ${explanation.reasons.join('; ')}`);
  }
  if (explanation.policies_applied?.length) {
    parts.push(`Políticas aplicadas: ${explanation.policies_applied.join(', ')}`);
  }
  if (explanation.scores && Object.keys(explanation.scores).length) {
    const scoreStr = Object.entries(explanation.scores)
      .map(([k, v]) => `${k}: ${v}`).join(', ');
    parts.push(`Scores: ${scoreStr}`);
  }
  if (explanation.model_used) {
    parts.push(`Modelo: ${explanation.model_used}`);
  }
  if (explanation.governance_trace) {
    parts.push(`Governance: ${JSON.stringify(explanation.governance_trace)}`);
  }

  return parts.length > 0
    ? parts.join('\n')
    : 'Decisão tomada com base nas políticas padrão do sistema.';
}

module.exports = {
  recordDecision,
  getExplanation,
  humanReadableExplanation,
  isEnabled: () => ENABLED
};
