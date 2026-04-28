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
 * Deriva sinais temporais a partir das previsões heurísticas e da fila priorizada.
 * Expõe também recurring_patterns / seasonal_patterns / anomaly_patterns no formato esperado por generateOperationalPlan.
 *
 * @param {unknown} predictions
 * @param {unknown} prioritized_actions
 * @returns {{
 *   recurring_patterns: object[],
 *   trend_direction: 'increasing'|'decreasing'|'stable',
 *   anomaly_frequency: number,
 *   seasonal_indicators: string[],
 *   seasonal_patterns: object[],
 *   anomaly_patterns: object[]
 * }}
 */
function deriveTemporalInsights(predictions, prioritized_actions) {
  const predList = asPredictionList(predictions);
  const priList = Array.isArray(prioritized_actions) ? prioritized_actions : [];

  let criticalHigh = 0;
  let lowOrOk = 0;
  for (const p of predList) {
    const r = normRisk(p);
    const ord = RISK_ORDER[r] || 0;
    if (ord >= 4) {
      criticalHigh += 1;
    } else if (ord <= 2) {
      lowOrOk += 1;
    }
  }

  let trend_direction = 'stable';
  if (criticalHigh >= 2 && criticalHigh > lowOrOk) {
    trend_direction = 'increasing';
  } else if (lowOrOk >= 2 && lowOrOk > criticalHigh && criticalHigh === 0) {
    trend_direction = 'decreasing';
  }

  const anySeverityTrendUp = predList.some(
    (p) =>
      p &&
      typeof p.reason === 'string' &&
      /aumento de severidade|Tend(ê|e)ncia de aumento/i.test(p.reason)
  );
  if (anySeverityTrendUp) {
    trend_direction = 'increasing';
  }

  const recMap = new Map();
  for (const p of predList) {
    if (!p || typeof p !== 'object') {
      continue;
    }
    const mid = p.machine_id != null ? String(p.machine_id).trim() : '';
    if (!mid) {
      continue;
    }
    const reason = p.reason != null ? String(p.reason) : '';
    const isRepeat = /Repeti(c|ç)(a|ã)o de falhas/i.test(reason);
    const mEvents = reason.match(/(\d+)\s+eventos\s+nas\s+últimas/i);
    const nEv = mEvents ? parseInt(mEvents[1], 10) : 0;
    const up = /aumento de severidade|Tend(ê|e)ncia de aumento/i.test(reason);
    if (!isRepeat && nEv < 3 && !up) {
      continue;
    }
    const key = `${mid}|op_rec`;
    if (recMap.has(key)) {
      continue;
    }
    const typeMatch = reason.match(/tipo "([^"]+)"/);
    recMap.set(key, {
      pattern_type: 'operational_recurrence',
      machine_id: mid,
      event_type: typeMatch ? typeMatch[1] : undefined,
      counts_by_window: {
        days_7: nEv >= 5 ? Math.min(3, Math.ceil(nEv / 2)) : nEv >= 3 ? 1 : up ? 1 : 0,
        days_30: Math.min(Math.max(nEv, up ? 2 : 0), 8)
      },
      trend: up || nEv >= 5 ? 'up' : 'stable',
      note: reason.slice(0, 280)
    });
  }

  const recurring_patterns = Array.from(recMap.values()).slice(0, 24);

  const anomMap = new Map();
  for (const p of predList) {
    const r = normRisk(p);
    if (r !== 'CRITICAL' && r !== 'HIGH') {
      continue;
    }
    const mid = p.machine_id != null ? String(p.machine_id).trim() : '';
    if (!mid) {
      continue;
    }
    const reason = p.reason != null ? String(p.reason) : '';
    const mEvents = reason.match(/(\d+)\s+eventos\s+nas\s+últimas/i);
    const nEv = mEvents ? parseInt(mEvents[1], 10) : 0;
    anomMap.set(mid, {
      machine_id: mid,
      note: reason.slice(0, 220) || 'Risco elevado na janela operacional recente.',
      ratio: nEv > 0 ? Number((nEv / 3).toFixed(2)) : null
    });
  }

  for (const row of priList) {
    const r = normRisk({ risk_level: row && row.priority, priority: row && row.priority });
    if (r !== 'CRITICAL' && r !== 'HIGH') {
      continue;
    }
    const mid = row && row.machine_id != null ? String(row.machine_id).trim() : '';
    if (!mid || anomMap.has(mid)) {
      continue;
    }
    const reason = row && row.reason != null ? String(row.reason) : '';
    anomMap.set(mid, {
      machine_id: mid,
      note: reason.slice(0, 220) || 'Prioridade alta na fila operacional.',
      ratio: null
    });
  }

  const anomaly_patterns = Array.from(anomMap.values()).slice(0, 12);
  const anomaly_frequency = anomMap.size;

  const seasonal_indicators = [];
  if (recurring_patterns.length) {
    seasonal_indicators.push(
      `Recorrência operacional: ${recurring_patterns.length} padrão(ões) a partir da janela e da fila correntes.`
    );
  }
  if (trend_direction === 'increasing') {
    seasonal_indicators.push(
      'Agregado de severidade com tendência de subida relativamente à dispersão de riscos na amostra.'
    );
  } else if (trend_direction === 'decreasing') {
    seasonal_indicators.push('Predominância de severidades baixas ou OK na amostra corrente.');
  }

  const seasonal_patterns = [];

  return {
    recurring_patterns,
    trend_direction,
    anomaly_frequency,
    seasonal_indicators,
    seasonal_patterns,
    anomaly_patterns
  };
}

/**
 * Combina insights heurísticos (amostra corrente) com histórico real (`correlation_history`).
 * Mantém o fallback heurístico quando o histórico está vazio ou frágil.
 *
 * @param {object} heuristic — saída de deriveTemporalInsights(predictions, prioritized_actions)
 * @param {object|null|undefined} history — saída async de correlationInsightsService.deriveTemporalInsights(companyId)
 * @returns {object}
 */
function mergeTemporalInsights(heuristic, history) {
  const h = heuristic && typeof heuristic === 'object' ? { ...heuristic } : deriveTemporalInsights([], []);
  if (!history || typeof history !== 'object') {
    return { ...h, temporal_history: null };
  }
  const rowsUsed =
    history.history_rows_used != null ? Math.max(0, Number(history.history_rows_used)) : 0;
  if (rowsUsed < 1) {
    return { ...h, temporal_history: { skipped: 'no_history_rows', history } };
  }

  const confRaw =
    history.global_trend_confidence != null ? Number(history.global_trend_confidence) : 0;
  const conf = Number.isFinite(confRaw) ? Math.max(0, Math.min(1, confRaw)) : 0;
  const tdHist = history.trend_direction != null ? String(history.trend_direction).toLowerCase() : '';

  const out = { ...h };
  if (rowsUsed >= 8 && conf >= 0.38) {
    if (tdHist === 'up') {
      out.trend_direction = 'increasing';
    } else if (tdHist === 'down') {
      out.trend_direction = 'decreasing';
    } else if (tdHist === 'unknown') {
      out.trend_direction = out.trend_direction || 'stable';
    } else {
      out.trend_direction = 'stable';
    }
  } else if (rowsUsed >= 3 && conf >= 0.22) {
    if (tdHist === 'up') {
      out.trend_direction = 'increasing';
    } else if (tdHist === 'down') {
      out.trend_direction = 'decreasing';
    }
  }

  const keyOf = (x) =>
    [x.pattern_type, x.machine_id, x.event_type].map((q) => (q != null ? String(q) : '')).join('|');
  const mergedRec = [];
  const seenRec = new Set();
  for (const x of [...(history.recurring_patterns || []), ...(h.recurring_patterns || [])]) {
    if (!x || typeof x !== 'object') {
      continue;
    }
    const k = keyOf(x);
    if (seenRec.has(k)) {
      continue;
    }
    seenRec.add(k);
    mergedRec.push(x);
    if (mergedRec.length >= 24) {
      break;
    }
  }
  out.recurring_patterns = mergedRec;

  out.seasonal_patterns = [...(history.seasonal_patterns || []), ...(h.seasonal_patterns || [])].slice(
    0,
    20
  );

  const mergedAnom = [...(history.anomaly_patterns || []), ...(h.anomaly_patterns || [])];
  const anomSeen = new Set();
  const anomOut = [];
  for (const a of mergedAnom) {
    if (!a || typeof a !== 'object') {
      continue;
    }
    const mid = a.machine_id != null ? String(a.machine_id).trim() : '';
    const k = mid || `note:${a.note != null ? String(a.note).slice(0, 80) : anomOut.length}`;
    if (anomSeen.has(k)) {
      continue;
    }
    anomSeen.add(k);
    anomOut.push(a);
    if (anomOut.length >= 16) {
      break;
    }
  }
  out.anomaly_patterns = anomOut;
  out.anomaly_frequency = Math.max(
    Number.isFinite(h.anomaly_frequency) ? h.anomaly_frequency : 0,
    anomOut.length
  );

  const hi = Array.isArray(h.seasonal_indicators) ? [...h.seasonal_indicators] : [];
  const prof = Array.isArray(history.machine_profiles) ? history.machine_profiles : [];
  const strongM = prof.filter((m) => m && m.recurrence_strength === 'strong').length;
  if (strongM >= 1) {
    hi.push(
      `Histórico real (90d): ${strongM} máquina(s) com recorrência forte em padrões persistidos.`
    );
  }
  if (history.trend_note && conf >= 0.25) {
    hi.push(`Tendência agregada (histórico): ${String(history.trend_note).slice(0, 280)}`);
  }
  out.seasonal_indicators = hi.slice(0, 12);

  out.temporal_history = {
    history_rows_used: history.history_rows_used,
    max_rows_cap: history.max_rows_cap,
    global_trend_confidence: history.global_trend_confidence,
    trend_metrics: history.trend_metrics,
    data_source: history.data_source,
    machine_profiles_sample: prof.slice(0, 8)
  };

  return out;
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

  const th =
    t.temporal_history && typeof t.temporal_history === 'object' ? t.temporal_history : {};
  const profSample = Array.isArray(th.machine_profiles_sample) ? th.machine_profiles_sample : [];
  for (const mp of profSample.slice(0, 5)) {
    if (!mp || typeof mp !== 'object' || mp.recurrence_strength !== 'strong') {
      continue;
    }
    const mid = mp.machine_id != null ? String(mp.machine_id).trim() : '';
    if (!mid) {
      continue;
    }
    const confN = mp.confidence_score != null ? Number(mp.confidence_score) : 0;
    if (!Number.isFinite(confN) || confN < 0.45) {
      continue;
    }
    const key = `hist_prof|${mid}|strong`;
    const share = mp.volume_normalized && mp.volume_normalized.share_of_company_volume_90d;
    const reason = [
      'Perfil histórico real (90d): recorrência forte.',
      `Confiança: ${Math.round(confN * 100) / 100}.`,
      share != null && Number.isFinite(Number(share))
        ? `Quota de volume na empresa (90d): ${Math.round(Number(share) * 1000) / 1000}.`
        : null
    ]
      .filter(Boolean)
      .join(' ');
    addDeduped(
      preventiveMap,
      key,
      mid,
      'Reforçar plano preventivo com base no padrão persistente detetado no histórico correlacionado.',
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
  deriveTemporalInsights,
  mergeTemporalInsights,
  generateOperationalPlan
};
