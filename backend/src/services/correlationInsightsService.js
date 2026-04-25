'use strict';

/**
 * Insights operacionais determinísticos a partir de histórico recente e frequência.
 * Não invoca modelos de IA externos.
 * Extensão: padrões aprendidos in-memory por empresa (Map) + `learned_patterns` em contextual_data.
 */

const { isValidUUID } = require('../utils/security');
const { correlateOperationalData, eventBelongsToMachine, parseEventTime } = require('./correlationService');

/** Janela de "histórico recente" para contagens. */
const RECENT_MS = 30 * 24 * 60 * 60 * 1000;

const FAILURE_LIKE_RE =
  /falha|parada|down|emerg|alarm|crit|fail|erro|error|inativo|stop|trip|falout|falh/i;

/** Mínimo de desfechos tipo-falha para falar em recorrência. */
const MIN_RECURRING_FAILURES = 3;

/** Mínimo de eventos com o mesmo `event_type` (entre falhas) para marcar padrão. */
const MIN_SAME_TYPE_FAILURES = 2;

/** Mínimo de “peso” (eventos de falha recente) atribuídos ao operador (correlação) para padrão. */
const MIN_OPERATOR_FAILURE_WEIGHT = 3;

/** Janela deslizante: eventos muito próximos no tempo (picos de atividade / alarme). */
const BURST_WINDOW_MS = 4 * 60 * 60 * 1000;
const BURST_MIN_EVENTS = 4;

/** Quantos ativos em estado exigente com o mesmo responsável → sobrecarga atribuível. */
const HEAVY_OPERATOR_MIN_ASSETS = 2;

const STRESS_STATUS = new Set(['critical', 'attention']);

const MAX_INSIGHTS = 12;

/** Teto de padrões devolvidos e guardados em memória por empresa. */
const MAX_LEARNED_PATTERNS = 20;

/**
 * Aprendizado in-memory: por empresa, última fotografia de padrões calculados a cada execução.
 * @type {Map<string, { recurring_patterns: object[], last_updated: string }>}
 */
const companyRecurringPatternStore = new Map();

/**
 * @param {number} n
 * @returns {'low'|'medium'|'high'}
 */
function confidenceFromCount(n) {
  const c = Math.max(0, parseInt(n, 10) || 0);
  if (c >= 5) {
    return 'high';
  }
  if (c >= 3) {
    return 'medium';
  }
  return 'low';
}

/**
 * @param {object} ev
 * @returns {boolean}
 */
function isFailureLikeEvent(ev) {
  if (!ev || typeof ev !== 'object') {
    return false;
  }
  const sev = ev.severity != null ? String(ev.severity) : '';
  const et = ev.event_type != null ? String(ev.event_type) : '';
  return FAILURE_LIKE_RE.test(sev) || FAILURE_LIKE_RE.test(et);
}

/**
 * @param {object|undefined} machine
 * @returns {string}
 */
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

/**
 * @param {number} t
 * @returns {boolean}
 */
function isInRecentWindow(t) {
  if (!Number.isFinite(t) || t <= 0) {
    return true;
  }
  return t >= Date.now() - RECENT_MS;
}

/**
 * @param {object[]} machines
 * @param {object[]} events
 * @returns {Map<string, { machine: object, events: object[] }>}
 */
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

/**
 * Eventos com timestamp utilizável, ordenados por tempo crescente.
 * @param {object[]} list
 * @returns {Array<{ t: number, ev: object }>}
 */
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

/**
 * Picos: em alguma janela de duração `winMs` existem >= `minN` eventos.
 * @param {Array<{ t: number, ev: object }>} timed
 * @param {number} winMs
 * @param {number} minN
 * @returns {boolean}
 */
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

/**
 * @param {object} correlation
 * @returns {Map<string, { responsible_user: object|null, status: string }>}
 */
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

/**
 * @param {object} correlation
 * @returns {string[]}
 */
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
    const n = (byName.get(name) || 0) + 1;
    byName.set(name, n);
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

/**
 * Padrão estruturado para múltiplas máquinas em stress com o mesmo responsável (alinhado a collectOperatorInsights).
 * @param {object} correlation
 * @param {(obj: object) => void} pushPattern
 */
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
    const b = byName.get(name);
    b.count += 1;
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
      confidence: confidenceFromCount(count)
    });
  }
}

/**
 * @param {string|undefined} companyId
 * @param {object[]} learnedPatterns
 */
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

/**
 * Retorna a última fotografia de padrões aprendidos para a empresa (só in-memory; pode ser vazio).
 * @param {string|null|undefined} companyId
 * @returns {{ recurring_patterns: object[], last_updated: string }|null}
 */
function getCompanyRecurringPatternMemory(companyId) {
  const cid = companyId != null && String(companyId).trim() !== '' ? String(companyId).trim() : '';
  if (!cid || !isValidUUID(cid)) {
    return null;
  }
  return companyRecurringPatternStore.get(cid) || null;
}

/**
 * Analisa correlação e gera listas de mensagens (insights) e padrões estruturados.
 * Atualiza o Map in-memory se `company_id` for um UUID válido.
 *
 * @param {{ users?: object[], machines?: object[], events?: object[], correlation?: object, company_id?: string }|null|undefined} params
 * @returns {{ insights: string[], learned_patterns: object[] }}
 */
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
    const key = [
      obj.pattern_type,
      obj.machine_id,
      obj.event_type,
      obj.operator_name
    ]
      .map((x) => (x != null ? String(x) : ''))
      .join('|');
    if (seenPatternKeys.has(key)) {
      return;
    }
    seenPatternKeys.add(key);
    learnedPatterns.push(obj);
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
      pushPattern({
        pattern_type: 'recurring_machine_failure',
        label: 'Falhas recorrentes no ativo',
        summary: `Máquina ${label} com ${failRecent.length} ocorrência(s) tipo-falha na janela recente.`,
        machine_id: machineId || null,
        machine_label: label,
        event_type: null,
        operator_id: opId,
        operator_name: opName || null,
        evidence_count: failRecent.length,
        confidence: confidenceFromCount(failRecent.length)
      });
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
        confidence: confidenceFromCount(c)
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
      confidence: confidenceFromCount(w)
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

/**
 * @param {{ users?: object[], machines?: object[], events?: object[], correlation?: object, company_id?: string }|null|undefined} params
 * @returns {string[]}
 */
function deriveCorrelationInsights(params) {
  return deriveCorrelationInsightsWithLearning(params).insights;
}

module.exports = {
  deriveCorrelationInsights,
  deriveCorrelationInsightsWithLearning,
  getCompanyRecurringPatternMemory
};
