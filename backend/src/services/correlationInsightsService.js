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
    }).catch(() => {});
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

/**
 * Janelas 7/30/90 dias; heurísticas de repetição, sazonalidade simples (dow) e pico 7d vs 30d.
 * @param {string} companyId
 * @returns {Promise<{
 *   recurring_patterns: object[],
 *   seasonal_patterns: object[],
 *   anomaly_patterns: object[]
 * }>}
 */
async function deriveTemporalInsights(companyId) {
  const cid = companyId != null ? String(companyId).trim() : '';
  if (!cid || !isValidUUID(cid)) {
    return { recurring_patterns: [], seasonal_patterns: [], anomaly_patterns: [] };
  }
  const rows = await correlationHistoryRepository.listHistoryForCompany(cid, 90);
  if (!rows.length) {
    return { recurring_patterns: [], seasonal_patterns: [], anomaly_patterns: [] };
  }

  const now = Date.now();
  const d7 = now - 7 * 86400000;
  const d30 = now - 30 * 86400000;
  const d90 = now - 90 * 86400000;

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
    groups.get(k).rows.push({ t, occ: row.occurrences, wd: row.window_days });
  }

  const recurring_patterns = [];
  const seasonal_patterns = [];
  const anomaly_patterns = [];

  for (const g of groups.values()) {
    const times = g.rows.map((x) => x.t).filter((t) => Number.isFinite(t) && t > 0);
    if (!times.length) {
      continue;
    }
    const inWin = (t0, t1) => g.rows.filter((r) => r.t >= t0 && r.t <= t1).length;
    const c7 = inWin(d7, now);
    const c30 = inWin(d30, now);
    const c90 = inWin(d90, now);

    const dows = g.rows
      .filter((r) => r.t >= d90)
      .map((r) => new Date(r.t).getUTCDay());
    const hist = new Array(7).fill(0);
    for (const d of dows) {
      hist[d] += 1;
    }
    const totalDow = dows.length;
    let maxD = 0;
    let maxIdx = 0;
    for (let i = 0; i < 7; i += 1) {
      if (hist[i] > maxD) {
        maxD = hist[i];
        maxIdx = i;
      }
    }
    const conc = totalDow > 0 ? maxD / totalDow : 0;

    if (c90 >= 2 && (c30 >= 2 || c7 >= 1)) {
      const trend = c7 > c30 / 4 ? 'up' : c7 < c30 / 6 ? 'down' : 'stable';
      recurring_patterns.push({
        pattern_type: g.pattern_type,
        machine_id: g.machine_id,
        event_type: g.event_type,
        counts_by_window: { days_7: c7, days_30: c30, days_90: c90 },
        trend,
        note: 'repetição observada nas janelas 7/30/90d (metadados agregados)'
      });
    }

    if (totalDow >= 5 && conc >= 0.38) {
      seasonal_patterns.push({
        pattern_type: g.pattern_type,
        machine_id: g.machine_id,
        event_type: g.event_type,
        day_of_week_peak: maxIdx,
        concentration: Math.round(conc * 100) / 100,
        note: 'concentração em dia da semana (UTC) — padrão cíclico simples'
      });
    }

    const baseline = Math.max(1, c30 / 4);
    if (c30 >= 3 && c7 > baseline * 1.35) {
      anomaly_patterns.push({
        pattern_type: g.pattern_type,
        machine_id: g.machine_id,
        event_type: g.event_type,
        short_window: c7,
        baseline_30d_quarter: Math.round(baseline * 100) / 100,
        ratio: Math.round((c7 / baseline) * 100) / 100,
        note: 'aumento de ocorrências na janela curta vs. base derivada de 30d'
      });
    }
  }

  return {
    recurring_patterns: recurring_patterns.slice(0, 24),
    seasonal_patterns: seasonal_patterns.slice(0, 20),
    anomaly_patterns: anomaly_patterns.slice(0, 20)
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
