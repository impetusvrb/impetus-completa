'use strict';

/**
 * Plano operacional a partir de dados já existentes (riscos, priorização, aprendizagem, insights temporais).
 * Sem alterar a origem dos dados — apenas compõe ações em três horizontes.
 */

const RISK_ORDER = { CRITICAL: 5, HIGH: 4, MEDIUM: 3, LOW: 2, OK: 1 };

/**
 * @param {unknown} p
 * @returns {string}
 */
function normRisk(p) {
  if (!p || typeof p !== 'object') {
    return 'OK';
  }
  const r = p.risk_level != null ? String(p.risk_level) : p.priority != null ? String(p.priority) : 'OK';
  return r.trim().toUpperCase() || 'OK';
}

/**
 * @param {unknown} pred
 * @returns {Array<object>}
 */
function asPredictionList(pred) {
  if (Array.isArray(pred)) {
    return pred;
  }
  if (pred && typeof pred === 'object' && Array.isArray(pred.predictions)) {
    return pred.predictions;
  }
  return [];
}

/**
 * @param {string} risk
 * @returns {boolean}
 */
function isImmediateRisk(risk) {
  return risk === 'CRITICAL' || risk === 'HIGH';
}

/**
 * @param {string} risk
 * @returns {boolean}
 */
function isShortTermRisk(risk) {
  return risk === 'MEDIUM';
}

/**
 * @param {object} p
 * @param {'immediate'|'short'|'from_prioritized'} source
 * @returns {{ machine_id: string, action: string, reason: string, priority: string }}
 */
function itemFromPrediction(p) {
  const risk = normRisk(p);
  const machine_id = p.machine_id != null ? String(p.machine_id).trim() : '';
  const reason =
    p.reason != null && String(p.reason).trim()
      ? String(p.reason).trim()
      : 'Risco operacional mapeado pelos indicadores atuais.';
  const rec = p.recommendation_hint != null && String(p.recommendation_hint).trim()
    ? String(p.recommendation_hint).trim()
    : p.suggested_action != null && String(p.suggested_action).trim()
      ? String(p.suggested_action).trim()
      : 'Avaliar o ativo, confirmar leituras e alinhar intervenção com manutenção.';
  return { machine_id, action: rec, reason, priority: risk };
}

/**
 * @param {object} row
 * @returns {{ machine_id: string, action: string, reason: string, priority: string }}
 */
function itemFromPrioritized(row) {
  const risk = normRisk({ risk_level: row && row.priority, priority: row && row.priority });
  const machine_id = row && row.machine_id != null ? String(row.machine_id).trim() : '';
  const reason =
    row && row.reason != null && String(row.reason).trim()
      ? String(row.reason).trim()
      : 'Prioridade determinística a partir do histórico e correlação.';
  const action =
    row && row.suggested_action != null && String(row.suggested_action).trim()
      ? String(row.suggested_action).trim()
      : 'Acompanhar o ativo e executar a intervenção alinhada à prioridade.';
  return { machine_id, action, reason, priority: risk };
}

/**
 * @param {string} k
 * @param {string} mid
 * @param {string} action
 * @param {string} reason
 * @param {string} priority
 */
function addDeduped(map, k, mid, action, reason, priority) {
  if (!k || map.has(k)) {
    return;
  }
  map.set(k, { machine_id: mid, action, reason, priority });
}

/**
 * @param {object} params
 * @param {unknown} [params.predictions]
 * @param {unknown} [params.prioritized_actions]
 * @param {unknown} [params.learning_summary]
 * @param {unknown} [params.temporal_insights]
 * @returns {{
 *   immediate_actions: object[],
 *   short_term_actions: object[],
 *   preventive_actions: object[]
 * }}
 */
function generateOperationalPlan({
  predictions,
  prioritized_actions,
  learning_summary,
  temporal_insights
} = {}) {
  const immediateMap = new Map();
  const shortMap = new Map();
  const preventiveMap = new Map();

  const predList = asPredictionList(predictions);
  for (const p of predList) {
    if (!p || typeof p !== 'object') {
      continue;
    }
    const r = normRisk(p);
    const mid = p.machine_id != null ? String(p.machine_id).trim() : '';
    const key = `p|${mid}|${r}`;
    const it = itemFromPrediction(p);
    if (isImmediateRisk(r)) {
      addDeduped(immediateMap, key, it.machine_id, it.action, it.reason, it.priority);
    } else if (isShortTermRisk(r)) {
      addDeduped(shortMap, key, it.machine_id, it.action, it.reason, it.priority);
    }
  }

  function hasMachineId(map, mid) {
    const m = mid != null ? String(mid).trim() : '';
    if (!m) {
      return false;
    }
    for (const v of map.values()) {
      if (v && v.machine_id === m) {
        return true;
      }
    }
    return false;
  }

  const priList = Array.isArray(prioritized_actions) ? prioritized_actions : [];
  for (const row of priList) {
    if (!row || typeof row !== 'object') {
      continue;
    }
    const r = normRisk({ risk_level: row.priority, priority: row.priority });
    const it = itemFromPrioritized(row);
    const key = `z|${it.machine_id}|${r}`;
    if (isImmediateRisk(r)) {
      if (!hasMachineId(immediateMap, it.machine_id)) {
        addDeduped(immediateMap, key, it.machine_id, it.action, it.reason, it.priority);
      }
    } else if (isShortTermRisk(r)) {
      if (!hasMachineId(shortMap, it.machine_id)) {
        addDeduped(shortMap, key, it.machine_id, it.action, it.reason, it.priority);
      }
    }
  }

  const t = temporal_insights && typeof temporal_insights === 'object' ? temporal_insights : {};
  const recPatterns = Array.isArray(t.recurring_patterns) ? t.recurring_patterns : [];
  for (const x of recPatterns) {
    if (!x || typeof x !== 'object') {
      continue;
    }
    const mid = x.machine_id != null ? String(x.machine_id).trim() : '';
    if (!mid) {
      continue;
    }
    const ptype = x.pattern_type != null ? String(x.pattern_type) : 'recurring';
    const key = `t|${mid}|${ptype}`;
    const trend = x.trend != null ? String(x.trend) : '';
    const c7 = x.counts_by_window && x.counts_by_window.days_7 != null ? x.counts_by_window.days_7 : 0;
    const c30 = x.counts_by_window && x.counts_by_window.days_30 != null ? x.counts_by_window.days_30 : 0;
    if (trend === 'up' || c7 >= 1 || c30 >= 3) {
      const reason = [
        'Padrão recorrente / temporal (sem texto de utilizador).',
        x.note ? String(x.note) : null,
        x.event_type ? `Tipo de evento: ${x.event_type}.` : null
      ]
        .filter(Boolean)
        .join(' ');
      addDeduped(
        preventiveMap,
        key,
        mid,
        'Reforçar monitorização, analisar causa raiz e planear manutenção preventiva alinhada ao padrão.',
        reason,
        'PREVENTIVE'
      );
    }
  }

  const seasonal = Array.isArray(t.seasonal_patterns) ? t.seasonal_patterns : [];
  for (const s of seasonal.slice(0, 6)) {
    if (!s || typeof s !== 'object') {
      continue;
    }
    const mid = s.machine_id != null ? String(s.machine_id).trim() : '';
    if (!mid) {
      continue;
    }
    const key = `s|${mid}|${s.day_of_week_peak != null ? s.day_of_week_peak : 0}`;
    const reason = `Ciclo sazonal simples (DOW pico: ${s.day_of_week_peak != null ? s.day_of_week_peak : '—'}). ${s.note || ''}`.trim();
    addDeduped(
      preventiveMap,
      key,
      mid,
      'Agendar reforço de inspeção nos períodos de pico assinalados pelo padrão temporal.',
      reason,
      'PREVENTIVE'
    );
  }

  const anom = Array.isArray(t.anomaly_patterns) ? t.anomaly_patterns : [];
  for (const a of anom.slice(0, 6)) {
    if (!a || typeof a !== 'object') {
      continue;
    }
    const mid = a.machine_id != null ? String(a.machine_id).trim() : '';
    if (!mid) {
      continue;
    }
    const key = `a|${mid}|anomaly`;
    const reason = `Anomalia de frequência: ${a.note || 'pico em janela curta'}. ${a.ratio != null ? `Rácio: ${a.ratio}.` : ''}`.trim();
    addDeduped(
      preventiveMap,
      key,
      mid,
      'Investigar a causa do pico recente (comparado à linha de base) e definir contramedidas preventivas.',
      reason,
      'PREVENTIVE'
    );
  }

  const learn = Array.isArray(learning_summary) ? learning_summary : [];
  for (const row of learn) {
    if (!row || typeof row !== 'object') {
      continue;
    }
    const mid = row.machine_id != null ? String(row.machine_id).trim() : '';
    if (!mid) {
      continue;
    }
    const sr = row.success_rate != null ? parseFloat(String(row.success_rate)) : 1;
    if (!Number.isFinite(sr) || sr >= 0.55) {
      continue;
    }
    const key = `l|${mid}|low_sr`;
    const mea = row.most_effective_action != null ? String(row.most_effective_action) : '';
    const reason = 'Histórico de aprendizagem: taxa de sucesso baixa no agregado operacional; reforçar padrão de intervenção em vez de reativar ações ineficazes.';
    const action = mea
      ? `Priorizar/validar ações do tipo “${mea.slice(0, 80)}” com checklist e supervisão.`
      : 'Rever playbook de intervenção e recalibrar prioridades para este ativo.';
    if (![...immediateMap].some(([, v]) => v.machine_id === mid)) {
      addDeduped(preventiveMap, key, mid, action, reason, 'PREVENTIVE');
    }
  }

  const rank = (a, b) => {
    const ra = RISK_ORDER[normRisk({ risk_level: a.priority, priority: a.priority })] || 0;
    const rb = RISK_ORDER[normRisk({ risk_level: b.priority, priority: b.priority })] || 0;
    if (rb !== ra) {
      return rb - ra;
    }
    return String(a.machine_id).localeCompare(String(b.machine_id));
  };

  return {
    immediate_actions: Array.from(immediateMap.values()).sort(rank).slice(0, 24),
    short_term_actions: Array.from(shortMap.values()).sort(rank).slice(0, 24),
    preventive_actions: Array.from(preventiveMap.values()).slice(0, 32)
  };
}

module.exports = {
  generateOperationalPlan
};
