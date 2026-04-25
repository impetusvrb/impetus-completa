'use strict';

/**
 * Ordenação determinística de riscos operacionais (sem IA).
 * Combina previsões heurísticas com resumo de correlação quando disponível.
 * Ordem final adapta-se ao histórico em operationalLearningService (memória).
 */

const { getMachineLearningMetrics } = require('./operationalLearningService');

const PRIORITY_ORDER = {
  CRITICAL: 1,
  HIGH: 2,
  MEDIUM: 3,
  LOW: 4,
  OK: 5
};

/** Tentativas mínimas para aplicar aprendizado */
const LEARNING_MIN_ATTEMPTS = 3;
const LEARNING_LOW_SUCCESS = 0.38;
const LEARNING_HIGH_SUCCESS = 0.72;

/**
 * Desvio no score de ordenação (maior = menos urgente na fila).
 * Baixa eficácia histórica → valor positivo (desce prioridade relativa).
 * Alta eficácia → valor negativo (sobe prioridade relativa).
 * @param {{ success_rate: number, attempts: number }|null} metrics
 * @returns {number}
 */
function learningRankShift(metrics) {
  if (!metrics || metrics.attempts < LEARNING_MIN_ATTEMPTS) {
    return 0;
  }
  const w = Math.min(1, (metrics.attempts - LEARNING_MIN_ATTEMPTS + 1) / 12);
  if (metrics.success_rate <= LEARNING_LOW_SUCCESS) {
    return 0.35 + 0.65 * w;
  }
  if (metrics.success_rate >= LEARNING_HIGH_SUCCESS) {
    return -(0.22 + 0.48 * w);
  }
  return 0;
}

function appendLearningToReason(reason, metrics, shift) {
  if (!metrics || metrics.attempts < LEARNING_MIN_ATTEMPTS || shift === 0) {
    return reason;
  }
  const pct = Math.round(metrics.success_rate * 100);
  if (shift > 0) {
    return `${reason} Ajuste adaptativo: histórico com baixa eficácia (${pct}% sucesso, ${metrics.attempts} registos) — peso relativo reduzido.`;
  }
  return `${reason} Ajuste adaptativo: histórico com alta eficácia (${pct}% sucesso, ${metrics.attempts} registos) — urgência relativa reforçada.`;
}

function normalizeRiskLevel(level) {
  if (level == null) return 'OK';
  const u = String(level).trim().toUpperCase();
  if (PRIORITY_ORDER[u] != null) return u;
  return 'OK';
}

function resolvePredictionsList(predictions) {
  if (Array.isArray(predictions)) return predictions;
  if (predictions && Array.isArray(predictions.predictions)) return predictions.predictions;
  return [];
}

function correlationIndex(correlation) {
  const map = new Map();
  const rows =
    correlation &&
    typeof correlation === 'object' &&
    Array.isArray(correlation.machine_status_summary)
      ? correlation.machine_status_summary
      : [];
  for (const row of rows) {
    const id = row && row.machine_id != null ? String(row.machine_id).trim() : '';
    if (id) map.set(id, row);
  }
  return map;
}

function enrichReason(baseReason, corrRow) {
  const parts = [baseReason != null ? String(baseReason).trim() : ''].filter(Boolean);
  if (corrRow && corrRow.status != null) {
    parts.push(`Estado correlacionado: ${String(corrRow.status)}.`);
  }
  if (corrRow && corrRow.last_event && corrRow.last_event.event_type) {
    parts.push(`Último evento: ${String(corrRow.last_event.event_type)}.`);
  }
  return parts.join(' ').trim() || 'Sem detalhe adicional.';
}

function enrichSuggestedAction(hint, corrRow) {
  let s = hint != null ? String(hint).trim() : '';
  if (corrRow && corrRow.responsible_user && corrRow.responsible_user.name) {
    const name = String(corrRow.responsible_user.name).trim();
    if (name) {
      s = s ? `${s} Envolver ${name} como contacto operacional.` : `Envolver ${name} como contacto operacional.`;
    }
  }
  return s || 'Manter monitorização.';
}

/**
 * @param {object} params
 * @param {object[]|{ predictions: object[] }} [params.predictions]
 * @param {{ machine_status_summary?: object[] }} [params.correlation]
 * @returns {{
 *   prioritized_actions: Array<{
 *     machine_id: string,
 *     priority: string,
 *     reason: string,
 *     suggested_action: string
 *   }>
 * }}
 */
function prioritizeOperationalRisks({ predictions, correlation } = {}) {
  const predList = resolvePredictionsList(predictions);
  const byMachine = correlationIndex(correlation);

  const prioritized_actions = predList.map((p) => {
    const machine_id = p && p.machine_id != null ? String(p.machine_id).trim() : '';
    const priority = normalizeRiskLevel(p && p.risk_level);
    const corrRow = machine_id ? byMachine.get(machine_id) : null;
    let reason = enrichReason(p && p.reason, corrRow);
    const suggested_action = enrichSuggestedAction(p && p.recommendation_hint, corrRow);

    const metrics = machine_id ? getMachineLearningMetrics(machine_id) : null;
    const shift = learningRankShift(metrics);
    reason = appendLearningToReason(reason, metrics, shift);

    const baseRank = PRIORITY_ORDER[priority] ?? 99;
    const effectiveRank = Math.max(0.15, baseRank + shift);

    return {
      machine_id,
      priority,
      reason,
      suggested_action,
      _effectiveRank: effectiveRank
    };
  });

  prioritized_actions.sort((a, b) => {
    const da = a._effectiveRank ?? PRIORITY_ORDER[a.priority] ?? 99;
    const db = b._effectiveRank ?? PRIORITY_ORDER[b.priority] ?? 99;
    if (da !== db) return da - db;
    return String(a.machine_id).localeCompare(String(b.machine_id));
  });

  for (const row of prioritized_actions) {
    delete row._effectiveRank;
  }

  return { prioritized_actions };
}

module.exports = {
  prioritizeOperationalRisks,
  PRIORITY_ORDER
};
