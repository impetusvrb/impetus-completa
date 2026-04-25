'use strict';

/**
 * Ordenação determinística de riscos operacionais (sem IA).
 * Combina previsões heurísticas com resumo de correlação quando disponível.
 * Ordem final adapta-se ao histórico em operationalLearningService (memória).
 */

const {
  getMachineLearningMetrics,
  getMachineTrend,
  getLearningByContext,
  inferContextTagFromSignals
} = require('./operationalLearningService');

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

/** Mínimo de desfechos temporais para confiar no ajuste por tendência */
const TREND_MIN_EVENTS = 4;

/**
 * Peso do ajuste por aprendizado contextual (failure | maintenance | quality)
 * em relação ao `learningRankShift` global. Mantém o modelo existente como base.
 */
const CONTEXT_LEARNING_WEIGHT = 0.32;

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

/**
 * Tendência recente: melhorando → reforçar prioridade (rank mais baixo = mais urgente);
 * piorando → atenuar. Estável/sem dados: 0.
 * @param {{ trend: string, event_count?: number }|null|undefined} trendInfo
 * @returns {number}
 */
function learningTrendRankShift(trendInfo) {
  if (!trendInfo) {
    return 0;
  }
  if (trendInfo.trend === 'insufficient_data' || trendInfo.trend === 'stable') {
    return 0;
  }
  const n = Math.max(0, parseInt(trendInfo.event_count, 10) || 0);
  if (n < TREND_MIN_EVENTS) {
    return 0;
  }
  const w = Math.min(1, (n - (TREND_MIN_EVENTS - 1)) / 10);
  if (trendInfo.trend === 'improving') {
    return -(0.1 + 0.12 * w);
  }
  if (trendInfo.trend === 'worsening') {
    return 0.1 + 0.12 * w;
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

/**
 * @param {string} reason
 * @param {{ trend: string, recent_success_rate: number|null, event_count?: number }|null} trend
 * @param {number} trendShift
 * @returns {string}
 */
function appendTrendToReason(reason, trend, trendShift) {
  if (!trend || trendShift === 0 || (trend.event_count != null && trend.event_count < TREND_MIN_EVENTS)) {
    return reason;
  }
  const label =
    trend.trend === 'improving'
      ? 'em melhoria (desfechos recentes mais favoráveis)'
      : trend.trend === 'worsening'
        ? 'em deterioração (desfechos recentes menos favoráveis)'
        : null;
  if (!label) {
    return reason;
  }
  const r =
    trend.recent_success_rate != null
      ? `${Math.round(trend.recent_success_rate * 100)}% sucesso`
      : 'taxa recente indisponível';
  return `${reason} Tendência adaptativa: desempenho ${label} (${r}, ${trend.event_count} evento(s) na janela).`;
}

/**
 * Ajuste adicional com base no histórico do mesmo contexto (inferido a partir da previsão).
 * Devolve 0 se não houver amostra suficiente — fallback explícito ao shift global.
 * @param {{ success_rate: number, attempts: number }|null|undefined} ctxMetrics
 * @returns {number}
 */
function learningContextShift(ctxMetrics) {
  if (!ctxMetrics || ctxMetrics.attempts < LEARNING_MIN_ATTEMPTS) {
    return 0;
  }
  return CONTEXT_LEARNING_WEIGHT * learningRankShift(ctxMetrics);
}

/**
 * @param {string} reason
 * @param {string} contextTag
 * @param {{ success_rate: number, attempts: number }|null} ctxMetrics
 * @param {number} contextShift
 * @returns {string}
 */
function appendContextToReason(reason, contextTag, ctxMetrics, contextShift) {
  if (contextShift === 0 || !ctxMetrics) {
    return reason;
  }
  const pct = Math.round(ctxMetrics.success_rate * 100);
  const label =
    contextTag === 'quality' ? 'qualidade' : contextTag === 'maintenance' ? 'manutenção' : 'falha/operacional';
  return `${reason} Contexto operacional (${label}): ajuste por histórico específico (${pct}% sucesso, ${ctxMetrics.attempts} reg.).`;
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
function prioritizeOperationalRisks({ predictions, correlation, company_id = null } = {}) {
  const predList = resolvePredictionsList(predictions);
  const byMachine = correlationIndex(correlation);
  const cid = company_id != null ? String(company_id).trim() : '';

  const prioritized_actions = predList.map((p) => {
    const machine_id = p && p.machine_id != null ? String(p.machine_id).trim() : '';
    const priority = normalizeRiskLevel(p && p.risk_level);
    const corrRow = machine_id ? byMachine.get(machine_id) : null;
    let reason = enrichReason(p && p.reason, corrRow);
    const suggested_action = enrichSuggestedAction(p && p.recommendation_hint, corrRow);

    const metrics = machine_id ? getMachineLearningMetrics(cid || null, machine_id) : null;
    const trend = machine_id ? getMachineTrend(cid || null, machine_id) : null;
    const shift = learningRankShift(metrics);
    const trendShift = machine_id ? learningTrendRankShift(trend) : 0;

    const contextTag = inferContextTagFromSignals({
      event_type: p && p.event_type,
      risk_level: p && p.risk_level,
      intent: p && p.intent,
      text: p && p.reason
    });
    const ctxMetrics = machine_id ? getLearningByContext(cid || null, machine_id, contextTag) : null;
    const contextShift = learningContextShift(ctxMetrics);
    const combined = shift + trendShift + contextShift;
    reason = appendLearningToReason(reason, metrics, shift);
    reason = appendTrendToReason(reason, trend, trendShift);
    reason = appendContextToReason(reason, contextTag, ctxMetrics, contextShift);

    const baseRank = PRIORITY_ORDER[priority] ?? 99;
    const effectiveRank = Math.max(0.15, baseRank + combined);

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
