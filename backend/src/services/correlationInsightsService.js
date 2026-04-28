'use strict';

/**
 * Insights operacionais + aprendizagem in-memory (learned_patterns) + histórico temporal (BD).
 * Não utiliza modelos de ML; heurísticas determinísticas.
 */

const { isValidUUID } = require('../utils/security');
const { correlateOperationalData, eventBelongsToMachine, parseEventTime } = require('./correlationService');
const correlationHistoryRepository = require('../repositories/correlationHistoryRepository');

const RECENT_MS = 30 * 24 * 60 * 60 * 1000;
const FAILURE_LIKE_RE =
  /falha|parada|down|emerg|alarm|crit|fail|erro|error|inativo|stop|trip|falout|falh/i;
const MIN_RECURRING_FAILURES = 3;
const MIN_SAME_TYPE_FAILURES = 2;
const MIN_OPERATOR_FAILURE_WEIGHT = 3;
const BURST_WINDOW_MS = 4 * 60 * 60 * 1000;
const BURST_MIN_EVENTS = 4;
const HEAVY_OPERATOR_MIN_ASSETS = 2;
const STRESS_STATUS = new Set(['critical', 'attention']);
const MAX_INSIGHTS = 12;
const MAX_LEARNED_PATTERNS = 20;

const companyRecurringPatternStore = new Map();

/** Padrões com repetição detectada → persistir histórico para análise temporal. */
const PERSISTED_RECURRING_TYPES = new Set(['recurring_machine_failure', 'machine_event_pair']);

/**
 * @param {string|undefined} companyId
 * @param {object} p
 */
function schedulePersistRecurringPattern(companyId, p) {
  const cid = companyId != null ? String(companyId).trim() : '';
  if (!cid || !isValidUUID(cid) || !p || typeof p !== 'object') {
    return;
  }
  if (!PERSISTED_RECURRING_TYPES.has(p.pattern_type)) {
    return;
  }
  setImmediate(() => {
    persistCorrelationPattern(cid, {
      pattern_type: p.pattern_type,
      machine_id: p.machine_id != null ? String(p.machine_id) : null,
      event_type: p.event_type != null ? String(p.event_type) : null,
      occurrences: p.evidence_count != null ? parseInt(p.evidence_count, 10) || 1 : 1,
      window_days: 30
    }).catch((err) => {
      console.warn('[correlationInsightsService][persist_pattern_async]', err?.message ?? err);
    });
  });
}

/**
 * Grava metadados do padrão na tabela de histórico (sem alterar a análise em memória corrente).
 * @param {string} companyId
 * @param {object} pattern
 * @returns {Promise<boolean>}
 */
async function persistCorrelationPattern(companyId, pattern) {
  return correlationHistoryRepository.insertCorrelationPattern(companyId, pattern);
}

function isFailureLikeEvent(ev) {
  if (!ev || typeof ev !== 'object') {
    return false;
  }
  const sev = ev.severity != null ? String(ev.severity) : '';
  const et = ev.event_type != null ? String(ev.event_type) : '';
  return FAILURE_LIKE_RE.test(sev) || FAILURE_LIKE_RE.test(et);
}

function machineLabel(machine) {
  if (!machine) {
    return 'ativo';
  }
  const n = machine.name != null ? String(machine.name).trim() : '';
  const id = machine.id != null ? String(machine.id).trim() : '';
  if (n) {
    return n;
  }
  return id || 'ativo';
}

function isInRecentWindow(t) {
  if (!Number.isFinite(t) || t <= 0) {
    return true;
  }
  return t >= Date.now() - RECENT_MS;
}

function groupEventsByMachine(machines, events) {
  const mList = Array.isArray(machines) ? machines : [];
  const eList = Array.isArray(events) ? events : [];
  const byId = new Map();
  for (const m of mList) {
    const id = m && m.id != null ? String(m.id).trim() : '';
    if (!id) {
      continue;
    }
    if (!byId.has(id)) {
      byId.set(id, { machine: m, events: [] });
    }
    const g = byId.get(id);
    for (const ev of eList) {
      if (eventBelongsToMachine(/** @type {any} */ (m), ev)) {
        g.events.push(ev);
      }
    }
  }
  return byId;
}

function sortedTimedEvents(list) {
  const out = [];
  for (const ev of list) {
    const raw = parseEventTime(ev);
    if (!Number.isFinite(raw) || raw <= 0) {
      continue;
    }
    out.push({ t: raw, ev });
  }
  out.sort((a, b) => a.t - b.t);
  return out;
}

function hasBurstInWindow(timed, winMs, minN) {
  if (timed.length < minN) {
    return false;
  }
  let j = 0;
  for (let i = 0; i < timed.length; i += 1) {
    while (timed[i].t - timed[j].t > winMs) {
      j += 1;
    }
    if (i - j + 1 >= minN) {
      return true;
    }
  }
  return false;
}

function buildMachineIdToSummaryRow(correlation) {
  const m = new Map();
  const summary =
    correlation &&
    typeof correlation === 'object' &&
    !Array.isArray(correlation) &&
    Array.isArray(correlation.machine_status_summary)
      ? correlation.machine_status_summary
      : [];
  for (const row of summary) {
    const id = row && row.machine_id != null ? String(row.machine_id).trim() : '';
    if (id) {
      m.set(id, row);
    }
  }
  return m;
}

function collectOperatorInsights(correlation) {
  const out = [];
  const summary =
    correlation &&
    typeof correlation === 'object' &&
    !Array.isArray(correlation) &&
    Array.isArray(correlation.machine_status_summary)
      ? correlation.machine_status_summary
      : [];
  const byName = new Map();
  for (const row of summary) {
    const st = row && row.status != null ? String(row.status).trim().toLowerCase() : '';
    if (!STRESS_STATUS.has(st)) {
      continue;
    }
    const ru = row && row.responsible_user;
    const name = ru && ru.name != null ? String(ru.name).trim() : '';
    if (!name) {
      continue;
    }
    byName.set(name, (byName.get(name) || 0) + 1);
  }
  for (const [name, count] of byName) {
    if (count >= HEAVY_OPERATOR_MIN_ASSETS) {
      out.push(
        `Operador ${name} associado a múltiplas máquinas críticas ou em atenção (${count} ativos) — risco de sobrecarga.`
      );
    }
  }
  return out;
}

function collectOperatorMultiStressLearnedPatterns(correlation, pushPattern) {
  const summary =
    correlation &&
    typeof correlation === 'object' &&
    !Array.isArray(correlation) &&
    Array.isArray(correlation.machine_status_summary)
      ? correlation.machine_status_summary
      : [];
  const byName = new Map();
  for (const row of summary) {
    const st = row && row.status != null ? String(row.status).trim().toLowerCase() : '';
    if (!STRESS_STATUS.has(st)) {
      continue;
    }
    const ru = row && row.responsible_user;
    const name = ru && ru.name != null ? String(ru.name).trim() : '';
    if (!name) {
      continue;
    }
    if (!byName.has(name)) {
      byName.set(name, { count: 0, user_id: ru.user_id != null ? String(ru.user_id) : null });
    }
    byName.get(name).count += 1;
  }
  for (const [name, { count, user_id }] of byName) {
    if (count < HEAVY_OPERATOR_MIN_ASSETS) {
      continue;
    }
    pushPattern({
      pattern_type: 'operator_multi_stress',
      label: 'Operador com vários ativos em estado exigente',
      summary: `${name}: ${count} ativo(s) em crítico ou atenção (sobrecarga potencial).`,
      machine_id: null,
      machine_label: null,
      event_type: null,
      operator_id: user_id,
      operator_name: name,
      evidence_count: count,
      confidence: count >= 3 ? 'high' : 'medium'
    });
  }
}

function refreshCompanyRecurringStore(companyId, learnedPatterns) {
  if (!companyId || !isValidUUID(String(companyId).trim())) {
    return;
  }
  const cid = String(companyId).trim();
  companyRecurringPatternStore.set(cid, {
    recurring_patterns: Array.isArray(learnedPatterns) ? learnedPatterns.slice(0, MAX_LEARNED_PATTERNS) : [],
    last_updated: new Date().toISOString()
  });
}

function getCompanyRecurringPatternMemory(companyId) {
  const cid = companyId != null && String(companyId).trim() !== '' ? String(companyId).trim() : '';
  if (!cid || !isValidUUID(cid)) {
    return null;
  }
  return companyRecurringPatternStore.get(cid) || null;
}

function deriveCorrelationInsightsWithLearning(params) {
  const p = params && typeof params === 'object' ? params : {};
  const company_id = p.company_id != null && String(p.company_id).trim() !== '' ? String(p.company_id).trim() : '';
  const users = Array.isArray(p.users) ? p.users : [];
  const machines = Array.isArray(p.machines) ? p.machines : [];
  const events = Array.isArray(p.events) ? p.events : [];

  const correlation =
    p.correlation && typeof p.correlation === 'object' && !Array.isArray(p.correlation)
      ? p.correlation
      : correlateOperationalData({ users, machines, events });

  const insights = /** @type {string[]} */ ([]);
  const seen = new Set();
  const push = (s) => {
    const t = s != null ? String(s).trim() : '';
    if (!t || seen.has(t)) {
      return;
    }
    seen.add(t);
    insights.push(t);
  };

  const learnedPatterns = /** @type {object[]} */ ([]);
  const seenPatternKeys = new Set();
  const pushPattern = (obj) => {
    if (learnedPatterns.length >= MAX_LEARNED_PATTERNS || !obj || typeof obj !== 'object') {
      return;
    }
    const key = [obj.pattern_type, obj.machine_id, obj.event_type, obj.operator_name]
      .map((x) => (x != null ? String(x) : ''))
      .join('|');
    if (seenPatternKeys.has(key)) {
      return;
    }
    seenPatternKeys.add(key);
    learnedPatterns.push(obj);
    if (company_id) {
      schedulePersistRecurringPattern(company_id, obj);
    }
  };

  const machineRowById = buildMachineIdToSummaryRow(correlation);
  const operatorFailureWeight = new Map();
  const grouped = groupEventsByMachine(machines, events);

  for (const { machine, events: evs } of grouped.values()) {
    const label = machineLabel(machine);
    const machineId = machine && machine.id != null ? String(machine.id).trim() : '';
    const failRecent = evs.filter((e) => {
      if (!isFailureLikeEvent(e)) {
        return false;
      }
      const ts = parseEventTime(e);
      return isInRecentWindow(ts);
    });
    const byType = new Map();
    for (const e of failRecent) {
      const k = e && e.event_type != null ? String(e.event_type).trim() : '—';
      byType.set(k, (byType.get(k) || 0) + 1);
    }

    const sumRow = machineId ? machineRowById.get(machineId) : null;
    const opName =
      sumRow && sumRow.responsible_user && sumRow.responsible_user.name != null
        ? String(sumRow.responsible_user.name).trim()
        : '';
    const opId =
      sumRow && sumRow.responsible_user && sumRow.responsible_user.user_id != null
        ? String(sumRow.responsible_user.user_id)
        : null;
    if (opName && failRecent.length > 0) {
      operatorFailureWeight.set(opName, (operatorFailureWeight.get(opName) || 0) + failRecent.length);
    }

    if (failRecent.length >= MIN_RECURRING_FAILURES) {
      push(
        `Máquina ${label} apresenta falhas recorrentes no período recente (${failRecent.length} ocorrência(s) relevantes).`
      );
      const pat = {
        pattern_type: 'recurring_machine_failure',
        label: 'Falhas recorrentes no ativo',
        summary: `Máquina ${label} com ${failRecent.length} ocorrência(s) tipo-falha na janela recente.`,
        machine_id: machineId || null,
        machine_label: label,
        event_type: null,
        operator_id: opId,
        operator_name: opName || null,
        evidence_count: failRecent.length,
        confidence: failRecent.length >= 5 ? 'high' : 'medium'
      };
      pushPattern(pat);
    } else {
      for (const [et, c] of byType) {
        if (et !== '—' && c >= MIN_SAME_TYPE_FAILURES) {
          push(
            `Máquina ${label} concentra repetição de ocorrências do tipo “${et}” (frequência elevada).`
          );
          break;
        }
      }
    }

    for (const [et, c] of byType) {
      if (et === '—' || c < MIN_SAME_TYPE_FAILURES) {
        continue;
      }
      pushPattern({
        pattern_type: 'machine_event_pair',
        label: 'Combinação ativo + tipo de evento (repetida)',
        summary: `Máquina ${label}: tipo de evento “${et}” repetido (${c}×) no período recente.`,
        machine_id: machineId || null,
        machine_label: label,
        event_type: et,
        operator_id: opId,
        operator_name: opName || null,
        evidence_count: c,
        confidence: c >= 4 ? 'high' : 'medium'
      });
    }

    const timed = sortedTimedEvents(
      evs.filter((e) => {
        const ts = parseEventTime(e);
        return Number.isFinite(ts) && ts > 0 && isInRecentWindow(ts);
      })
    );
    if (hasBurstInWindow(timed, BURST_WINDOW_MS, BURST_MIN_EVENTS)) {
      push(
        `Máquina ${label} concentrou múltiplos eventos em intervalo curto (máquinas com eventos próximos no tempo) — padrão de pico de alarmes ou instabilidade.`
      );
      const burstN = Math.min(timed.length, BURST_MIN_EVENTS);
      pushPattern({
        pattern_type: 'burst_stability',
        label: 'Pico de eventos no tempo (janela curta)',
        summary: `Máquina ${label}: ≥${BURST_MIN_EVENTS} eventos em ${BURST_WINDOW_MS / 3600000}h.`,
        machine_id: machineId || null,
        machine_label: label,
        event_type: null,
        operator_id: opId,
        operator_name: opName || null,
        evidence_count: burstN,
        confidence: 'medium'
      });
    }
  }

  for (const [opName, w] of operatorFailureWeight) {
    if (w < MIN_OPERATOR_FAILURE_WEIGHT) {
      continue;
    }
    let opId = null;
    for (const row of machineRowById.values()) {
      const ru = row && row.responsible_user;
      const n = ru && ru.name != null ? String(ru.name).trim() : '';
      if (n === opName && ru && ru.user_id != null) {
        opId = String(ru.user_id);
        break;
      }
    }
    pushPattern({
      pattern_type: 'operator_failure_load',
      label: 'Operador com volume elevado de falhas nos ativos sob correlação',
      summary: `Operador ${opName}: cerca de ${w} ocorrência(s) tipo-falha recente(s) em máquina(s) com responsável atribuído (correlação).`,
      machine_id: null,
      machine_label: null,
      event_type: null,
      operator_id: opId,
      operator_name: opName,
      evidence_count: w,
      confidence: w >= 5 ? 'high' : 'medium'
    });
  }

  collectOperatorMultiStressLearnedPatterns(correlation, pushPattern);

  for (const s of collectOperatorInsights(correlation)) {
    push(s);
  }

  const outInsights = insights.length > MAX_INSIGHTS ? insights.slice(0, MAX_INSIGHTS) : insights;
  refreshCompanyRecurringStore(company_id, learnedPatterns);

  return { insights: outInsights, learned_patterns: learnedPatterns };
}

function keyTriplet(r) {
  const pt = r.pattern_type != null ? String(r.pattern_type) : '';
  const mid = r.machine_id != null ? String(r.machine_id) : '';
  const et = r.event_type != null ? String(r.event_type) : '';
  return `${pt}|${mid}|${et}`;
}

function rowOccurrences(row) {
  const n = parseInt(String(row && row.occurrences != null ? row.occurrences : 1), 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

function clamp01(x) {
  if (!Number.isFinite(x)) {
    return 0;
  }
  return Math.max(0, Math.min(1, x));
}

function linearRegressionWeekIndex(weights) {
  const y = Array.isArray(weights) ? weights.map((v) => Math.max(0, Number(v) || 0)) : [];
  const n = y.length;
  if (n < 2) {
    return { slope: 0, r2: 0, intercept: 0, weekly_mean: 0, n };
  }
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  for (let i = 0; i < n; i += 1) {
    sumX += i;
    sumY += y[i];
    sumXY += i * y[i];
    sumXX += i * i;
  }
  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) {
    return { slope: 0, r2: 0, intercept: sumY / n, weekly_mean: sumY / n, n };
  }
  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  const meanY = sumY / n;
  let ssTot = 0;
  let ssRes = 0;
  for (let i = 0; i < n; i += 1) {
    const yi = y[i];
    const pred = slope * i + intercept;
    ssTot += (yi - meanY) ** 2;
    ssRes += (yi - pred) ** 2;
  }
  const r2 = ssTot > 1e-9 ? clamp01(1 - ssRes / ssTot) : 0;
  return { slope, r2, intercept, weekly_mean: meanY, n };
}

function buildWeeklyVolumeSeries(rows, tStart, now) {
  const MSW = 7 * 86400000;
  const span = Math.max(now - tStart, MSW);
  const nWeeks = Math.min(14, Math.max(2, Math.ceil(span / MSW)));
  const w = new Array(nWeeks).fill(0);
  for (const row of rows) {
    const t = row.created_at != null ? new Date(row.created_at).getTime() : 0;
    if (!Number.isFinite(t) || t < tStart || t > now) {
      continue;
    }
    const idx = Math.min(Math.floor((t - tStart) / MSW), nWeeks - 1);
    w[idx] += rowOccurrences(row);
  }
  return w;
}

function recurrenceStrengthFromSignals({ v7, v30, v90, c7, c30, c90, patternTrend, conc }) {
  const snapScore = Math.min(1, c90 / 5) * 0.45 + Math.min(1, v90 / 18) * 0.55;
  const momentum =
    patternTrend === 'up' ? 0.15 : patternTrend === 'down' ? -0.05 : 0;
  const seasonalBoost = conc >= 0.42 ? 0.12 : conc >= 0.32 ? 0.06 : 0;
  const burstShort = v7 >= 4 && c7 >= 2 ? 0.1 : 0;
  const score = clamp01(snapScore + momentum + seasonalBoost + burstShort);
  if (score >= 0.58 || (v90 >= 8 && c90 >= 3) || (v30 >= 6 && c7 >= 2 && patternTrend === 'up')) {
    return { strength: 'strong', score };
  }
  if (score >= 0.35 || v90 >= 4 || c90 >= 2) {
    return { strength: 'weak', score };
  }
  return { strength: 'weak', score };
}

function patternConfidenceScore({ v7, v30, v90, c90, conc, share90 }) {
  const volPart = Math.min(1, Math.log2(1 + v90) / Math.log2(1 + 36));
  const snapPart = Math.min(1, c90 / 6);
  const concPart = conc > 0 ? 0.25 + 0.75 * conc : 0.25;
  const sharePart =
    share90 != null && Number.isFinite(share90) && share90 > 0
      ? Math.min(1, 0.35 + share90 * 2)
      : 0.35;
  return clamp01(volPart * 0.42 + snapPart * 0.28 + concPart * 0.15 + sharePart * 0.15);
}

/**
 * Janelas 7/30/90 dias sobre `correlation_history` (≤1500 registos) + regressão semanal ponderada,
 * sazonalidade DOW com volume, perfis por máquina, força de recorrência e confiança.
 * @param {string} companyId
 * @returns {Promise<object>}
 */
async function deriveTemporalInsights(companyId) {
  const LOOKBACK_DAYS = 90;
  const maxList = Math.min(
    correlationHistoryRepository.DEFAULT_TEMPORAL_LIST_CAP,
    correlationHistoryRepository.TEMPORAL_ANALYSIS_HARD_CAP != null
      ? correlationHistoryRepository.TEMPORAL_ANALYSIS_HARD_CAP
      : 1500
  );

  const emptyOut = (note) => ({
    recurring_patterns: [],
    seasonal_patterns: [],
    anomaly_patterns: [],
    machine_profiles: [],
    trend_direction: 'stable',
    trend_note: note || null,
    windows_days: [7, 30, LOOKBACK_DAYS],
    history_rows_used: 0,
    history_lookback_days: LOOKBACK_DAYS,
    data_source: 'correlation_history',
    global_trend_confidence: 0,
    trend_metrics: {
      method: 'none',
      r_squared: 0,
      slope_per_week: 0,
      week_over_week_ratio: null,
      weeks_in_series: 0
    }
  });

  const cid = companyId != null ? String(companyId).trim() : '';
  if (!cid || !isValidUUID(cid)) {
    return emptyOut('company_id inválido');
  }

  let rows = [];
  try {
    rows = await correlationHistoryRepository.listHistoryForCompany(cid, LOOKBACK_DAYS, maxList);
  } catch (e) {
    console.warn('[correlationInsightsService][deriveTemporalInsights_query]', e?.message ?? e);
    return {
      ...emptyOut('falha ao ler histórico; usar heurísticas a jusante'),
      trend_direction: 'unknown',
      global_trend_confidence: 0
    };
  }

  if (!rows.length) {
    return emptyOut('sem registos em correlation_history no período (fallback heurístico possível)');
  }

  const now = Date.now();
  const d7 = now - 7 * 86400000;
  const d30 = now - 30 * 86400000;
  const d90 = now - LOOKBACK_DAYS * 86400000;

  let aggV7 = 0;
  let aggV30 = 0;
  let companyV90 = 0;
  for (const row of rows) {
    const t = row.created_at != null ? new Date(row.created_at).getTime() : 0;
    if (!Number.isFinite(t) || t <= 0) {
      continue;
    }
    const w = rowOccurrences(row);
    if (t >= d7) {
      aggV7 += w;
    }
    if (t >= d30) {
      aggV30 += w;
    }
    if (t >= d90) {
      companyV90 += w;
    }
  }

  const weeklySeries = buildWeeklyVolumeSeries(rows, d90, now);
  const reg = linearRegressionWeekIndex(weeklySeries);
  const meanY = reg.weekly_mean;
  const relSlope = meanY > 0.4 ? reg.slope / meanY : reg.slope;
  const lastW = weeklySeries[weeklySeries.length - 1] || 0;
  const prevW = weeklySeries.length >= 2 ? weeklySeries[weeklySeries.length - 2] || 0 : 0;
  const wow = prevW > 0 ? lastW / prevW : lastW > 0 ? 2 : 1;

  let trend_direction = 'stable';
  let trend_note = null;
  let global_trend_confidence = clamp01(reg.r2 * Math.min(1, companyV90 / 24));

  if (companyV90 < 3) {
    trend_direction = 'unknown';
    trend_note = 'volume agregado insuficiente para tendência global';
    global_trend_confidence = 0;
  } else {
    const strongUp = relSlope > 0.1 && reg.r2 >= 0.15;
    const strongDown = relSlope < -0.1 && reg.r2 >= 0.15;
    const wowUp = wow >= 1.5 && lastW >= 2;
    const wowDown = wow <= 0.55 && prevW >= 3;

    if (strongUp || (wowUp && reg.r2 >= 0.08)) {
      trend_direction = 'up';
      trend_note = strongUp
        ? 'regressão linear sobre semanas (volume ponderado) indica subida'
        : 'última semana acima da anterior (week-over-week)';
      global_trend_confidence = clamp01(Math.max(global_trend_confidence, 0.45 + reg.r2 * 0.4));
    } else if (strongDown || (wowDown && reg.r2 >= 0.08)) {
      trend_direction = 'down';
      trend_note = strongDown
        ? 'regressão linear sobre semanas indica descida'
        : 'queda acentuada semana a semana';
      global_trend_confidence = clamp01(Math.max(global_trend_confidence, 0.45 + reg.r2 * 0.4));
    } else {
      const expected7from30 = aggV30 > 0 ? aggV30 * (7 / 30) : 0;
      if (aggV30 < 3 && aggV7 < 2) {
        trend_direction = 'unknown';
        trend_note = 'sinal fraco: poucos registos nas janelas 7d/30d';
        global_trend_confidence = clamp01(reg.r2 * 0.25);
      } else if (expected7from30 > 0 && aggV7 > expected7from30 * 1.25) {
        trend_direction = 'up';
        trend_note = 'volume ponderado 7d acima do proporcional à janela 30d (fallback ratio)';
        global_trend_confidence = clamp01(0.32 + reg.r2 * 0.28);
      } else if (expected7from30 > 0 && aggV7 < expected7from30 * 0.65) {
        trend_direction = 'down';
        trend_note = 'volume 7d abaixo do proporcional 30d (fallback ratio)';
        global_trend_confidence = clamp01(0.32 + reg.r2 * 0.28);
      } else {
        trend_note = 'variação compatível com estabilidade (histórico real)';
        global_trend_confidence = clamp01(reg.r2 * 0.35 + 0.1);
      }
    }
  }

  const trend_metrics = {
    method:
      companyV90 < 3 ? 'insufficient_data' : 'weekly_weighted_regression_plus_ratio_fallback',
    r_squared: Math.round(reg.r2 * 1000) / 1000,
    slope_per_week: Math.round(reg.slope * 1000) / 1000,
    week_over_week_ratio: Math.round(wow * 100) / 100,
    weeks_in_series: weeklySeries.length
  };

  const machineBuckets = new Map();
  for (const row of rows) {
    const mid = row.machine_id != null ? String(row.machine_id).trim() : '';
    if (!mid) {
      continue;
    }
    const t = row.created_at != null ? new Date(row.created_at).getTime() : 0;
    if (!Number.isFinite(t) || t < d90) {
      continue;
    }
    const w = rowOccurrences(row);
    if (!machineBuckets.has(mid)) {
      machineBuckets.set(mid, {
        machine_id: mid,
        vol7: 0,
        vol30: 0,
        vol90: 0,
        c7: 0,
        c30: 0,
        c90: 0,
        dow: new Array(7).fill(0)
      });
    }
    const b = machineBuckets.get(mid);
    b.vol90 += w;
    b.c90 += 1;
    if (t >= d30) {
      b.vol30 += w;
      b.c30 += 1;
    }
    if (t >= d7) {
      b.vol7 += w;
      b.c7 += 1;
    }
    const dow = new Date(t).getUTCDay();
    b.dow[dow] += w;
  }

  const groups = new Map();
  for (const row of rows) {
    const k = keyTriplet(row);
    if (!groups.has(k)) {
      groups.set(k, {
        pattern_type: row.pattern_type,
        machine_id: row.machine_id,
        event_type: row.event_type,
        rows: []
      });
    }
    const t = row.created_at != null ? new Date(row.created_at).getTime() : 0;
    groups.get(k).rows.push({ t, occ: rowOccurrences(row), wd: row.window_days });
  }

  const recurring_patterns = [];
  const seasonal_patterns = [];
  const anomaly_patterns = [];

  const countSnaps = (grows, t0, t1) => grows.filter((r) => r.t >= t0 && r.t <= t1 && Number.isFinite(r.t)).length;
  const sumVol = (grows, t0, t1) =>
    grows.reduce(
      (s, r) => (Number.isFinite(r.t) && r.t >= t0 && r.t <= t1 ? s + Math.max(1, r.occ || 1) : s),
      0
    );

  for (const g of groups.values()) {
    const times = g.rows.map((x) => x.t).filter((t) => Number.isFinite(t) && t > 0);
    if (!times.length) {
      continue;
    }
    const c7 = countSnaps(g.rows, d7, now);
    const c30 = countSnaps(g.rows, d30, now);
    const c90 = countSnaps(g.rows, d90, now);
    const v7 = sumVol(g.rows, d7, now);
    const v30 = sumVol(g.rows, d30, now);
    const v90 = sumVol(g.rows, d90, now);

    const hist = new Array(7).fill(0);
    for (const r of g.rows) {
      if (!Number.isFinite(r.t) || r.t < d90) {
        continue;
      }
      const dow = new Date(r.t).getUTCDay();
      hist[dow] += Math.max(1, r.occ || 1);
    }
    const totalDow = hist.reduce((a, b) => a + b, 0);
    let maxD = 0;
    let maxIdx = 0;
    for (let i = 0; i < 7; i += 1) {
      if (hist[i] > maxD) {
        maxD = hist[i];
        maxIdx = i;
      }
    }
    const conc = totalDow > 0 ? maxD / totalDow : 0;

    const recurrentBySnapshots = c90 >= 2 && (c30 >= 2 || c7 >= 1);
    const recurrentByVolume = v90 >= 5 && v30 >= 2;
    if (recurrentBySnapshots || recurrentByVolume) {
      let patternTrend = 'stable';
      if (c30 > 0 && v30 > 0) {
        const expected7 = v30 * (7 / 30);
        if (expected7 > 0 && v7 > expected7 * 1.2) {
          patternTrend = 'up';
        } else if (expected7 > 0 && v7 < expected7 * 0.7) {
          patternTrend = 'down';
        } else if (c7 > c30 / 4) {
          patternTrend = 'up';
        } else if (c7 < c30 / 6) {
          patternTrend = 'down';
        }
      } else if (c7 > c30 / 4) {
        patternTrend = 'up';
      } else if (c7 < c30 / 6) {
        patternTrend = 'down';
      }
      const share90 = companyV90 > 0 ? v90 / companyV90 : 0;
      const conf = patternConfidenceScore({
        v7,
        v30,
        v90,
        c90,
        conc,
        share90
      });
      const { strength: recurrence_strength, score: recurrence_score } = recurrenceStrengthFromSignals({
        v7,
        v30,
        v90,
        c7,
        c30,
        c90,
        patternTrend,
        conc
      });
      recurring_patterns.push({
        pattern_type: g.pattern_type,
        machine_id: g.machine_id,
        event_type: g.event_type,
        counts_by_window: { days_7: c7, days_30: c30, days_90: c90 },
        evidence_volume_by_window: { days_7: v7, days_30: v30, days_90: v90 },
        trend_direction: patternTrend,
        trend: patternTrend,
        confidence_score: Math.round(conf * 100) / 100,
        recurrence_strength,
        recurrence_score: Math.round(recurrence_score * 100) / 100,
        volume_normalized: {
          events_per_day_90d: Math.round((v90 / 90) * 1000) / 1000,
          share_of_company_volume_90d: companyV90 > 0 ? Math.round(share90 * 1000) / 1000 : null
        },
        note: 'repetição a partir de correlation_history (snapshots + volume occurrences), normalizado à empresa',
        data_source: 'correlation_history'
      });
    }

    if (totalDow >= 5 && conc >= 0.38) {
      const seasonality_strength = clamp01(conc * Math.min(1, Math.log1p(totalDow) / Math.log1p(48)));
      seasonal_patterns.push({
        pattern_type: g.pattern_type,
        machine_id: g.machine_id,
        event_type: g.event_type,
        day_of_week_peak: maxIdx,
        concentration: Math.round(conc * 100) / 100,
        seasonality_strength: Math.round(seasonality_strength * 100) / 100,
        weighted_samples_90d: Math.round(totalDow * 100) / 100,
        note: 'concentração em dia da semana (UTC), pesado por occurrences (volume)',
        data_source: 'correlation_history'
      });
    }

    const baselineVol = Math.max(1, v30 / 4);
    if (v30 >= 3 && v7 > baselineVol * 1.35) {
      anomaly_patterns.push({
        pattern_type: g.pattern_type,
        machine_id: g.machine_id,
        event_type: g.event_type,
        short_window_volume: v7,
        baseline_30d_quarter_volume: Math.round(baselineVol * 100) / 100,
        ratio: Math.round((v7 / baselineVol) * 100) / 100,
        snapshot_short_window: c7,
        note: 'aumento de volume na janela 7d vs base derivada de 30d (occurrences)',
        data_source: 'correlation_history'
      });
    } else if (c30 >= 3 && c7 > Math.max(1, c30 / 4) * 1.35) {
      anomaly_patterns.push({
        pattern_type: g.pattern_type,
        machine_id: g.machine_id,
        event_type: g.event_type,
        short_window: c7,
        baseline_30d_quarter: Math.round(Math.max(1, c30 / 4) * 100) / 100,
        ratio: Math.round((c7 / Math.max(1, c30 / 4)) * 100) / 100,
        note: 'aumento de frequência de registos na janela curta vs. base 30d (heurística de contagem)',
        data_source: 'correlation_history_heuristic'
      });
    }
  }

  const machine_profiles = [];
  for (const b of machineBuckets.values()) {
    const tdow = b.dow.reduce((a, x) => a + x, 0);
    let maxD = 0;
    let maxIdx = 0;
    for (let i = 0; i < 7; i += 1) {
      if (b.dow[i] > maxD) {
        maxD = b.dow[i];
        maxIdx = i;
      }
    }
    const concM = tdow > 0 ? maxD / tdow : 0;
    let pTrend = 'stable';
    if (b.c30 > 0 && b.vol30 > 0) {
      const e7 = b.vol30 * (7 / 30);
      if (e7 > 0 && b.vol7 > e7 * 1.2) {
        pTrend = 'up';
      } else if (e7 > 0 && b.vol7 < e7 * 0.7) {
        pTrend = 'down';
      }
    }
    const { strength, score: recScore } = recurrenceStrengthFromSignals({
      v7: b.vol7,
      v30: b.vol30,
      v90: b.vol90,
      c7: b.c7,
      c30: b.c30,
      c90: b.c90,
      patternTrend: pTrend,
      conc: concM
    });
    const confM = patternConfidenceScore({
      v7: b.vol7,
      v30: b.vol30,
      v90: b.vol90,
      c90: b.c90,
      conc: concM,
      share90: companyV90 > 0 ? b.vol90 / companyV90 : 0
    });
    machine_profiles.push({
      machine_id: b.machine_id,
      windows: {
        days_7: { volume: Math.round(b.vol7 * 100) / 100, snapshots: b.c7 },
        days_30: { volume: Math.round(b.vol30 * 100) / 100, snapshots: b.c30 },
        days_90: { volume: Math.round(b.vol90 * 100) / 100, snapshots: b.c90 }
      },
      volume_normalized: {
        events_per_day_90d: Math.round((b.vol90 / 90) * 1000) / 1000,
        share_of_company_volume_90d:
          companyV90 > 0 ? Math.round((b.vol90 / companyV90) * 1000) / 1000 : null
      },
      trend_direction: pTrend,
      recurrence_strength: strength,
      recurrence_score: Math.round(recScore * 100) / 100,
      confidence_score: Math.round(confM * 100) / 100,
      seasonality_hint:
        tdow >= 4 && concM >= 0.34
          ? {
              day_of_week_peak_utc: maxIdx,
              concentration: Math.round(concM * 100) / 100
            }
          : null
    });
  }
  machine_profiles.sort(
    (a, b) => (b.windows?.days_90?.volume || 0) - (a.windows?.days_90?.volume || 0)
  );

  return {
    recurring_patterns: recurring_patterns.slice(0, 24),
    seasonal_patterns: seasonal_patterns.slice(0, 20),
    anomaly_patterns: anomaly_patterns.slice(0, 20),
    machine_profiles: machine_profiles.slice(0, 40),
    trend_direction,
    trend_note,
    global_trend_confidence: Math.round(global_trend_confidence * 100) / 100,
    trend_metrics,
    windows_days: [7, 30, LOOKBACK_DAYS],
    history_rows_used: rows.length,
    history_lookback_days: LOOKBACK_DAYS,
    max_rows_cap: maxList,
    data_source: 'correlation_history'
  };
}

function deriveCorrelationInsights(params) {
  return deriveCorrelationInsightsWithLearning(params).insights;
}

module.exports = {
  deriveCorrelationInsights,
  deriveCorrelationInsightsWithLearning,
  getCompanyRecurringPatternMemory,
  persistCorrelationPattern,
  deriveTemporalInsights
};
