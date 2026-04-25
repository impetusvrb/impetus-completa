'use strict';

/**
 * Previsão heurística de risco operacional a partir de eventos recentes (sem IA).
 */

const DEFAULT_WINDOW_HOURS = 24;

function normalizeKey(value) {
  if (value == null) return '';
  return String(value)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

function severityScore(ev) {
  const s = normalizeKey(ev && ev.severity);
  if (!s) return 1;
  if (s.includes('crit')) return 4;
  if (s.includes('high') || s.includes('alta') || s.includes('emerg')) return 3;
  if (s.includes('med') || s.includes('media') || s.includes('moder')) return 2;
  if (s.includes('low') || s.includes('baixa')) return 1;
  return 1;
}

function eventMatchesMachine(machine, event) {
  const mid = machine && machine.id != null ? String(machine.id).trim() : '';
  const mname = normalizeKey(machine && machine.name);

  const eIdent = event && event.machine_identifier != null ? String(event.machine_identifier).trim() : '';
  const eCode = event && event.machine_code != null ? String(event.machine_code).trim() : '';
  const eName = normalizeKey(event && event.machine_name);

  if (mid) {
    if (eIdent && mid === eIdent) return true;
    if (eCode && mid === eCode) return true;
  }
  if (mname && eName && mname === eName) return true;
  return false;
}

function parseEventTime(ev) {
  const t = ev && ev.created_at != null ? new Date(ev.created_at).getTime() : NaN;
  return Number.isFinite(t) ? t : 0;
}

const RISK_ORDER = { OK: 0, LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };

function maxRisk(a, b) {
  return RISK_ORDER[a] >= RISK_ORDER[b] ? a : b;
}

function hasSeverityIncrease(sortedEvents) {
  for (let i = 1; i < sortedEvents.length; i += 1) {
    if (severityScore(sortedEvents[i]) > severityScore(sortedEvents[i - 1])) {
      return true;
    }
  }
  return false;
}

function dominantRepeatedType(sortedEvents) {
  const map = {};
  for (const e of sortedEvents) {
    const t = e && e.event_type != null ? String(e.event_type).trim() : 'desconhecido';
    map[t] = (map[t] || 0) + 1;
  }
  let best = null;
  let n = 0;
  for (const [t, c] of Object.entries(map)) {
    if (c > n) {
      n = c;
      best = t;
    }
  }
  return n >= 2 ? { type: best, count: n } : null;
}

/**
 * @param {{ machine_status_summary?: object[] }|null|undefined} correlation
 * @returns {{ byMachine: Map<string, object>, rows: object[] }}
 */
function buildCorrelationIndex(correlation) {
  const byMachine = new Map();
  const rows =
    correlation && Array.isArray(correlation.machine_status_summary)
      ? correlation.machine_status_summary
      : [];
  for (const row of rows) {
    const id = row && row.machine_id != null ? String(row.machine_id).trim() : '';
    if (id) byMachine.set(id, row);
  }
  return { byMachine, rows };
}

/** Conta em quantas máquinas o mesmo user_id figura como responsável (correlação). */
function getOverloadedResponsibleUserIds(rows, minMachines) {
  const counts = new Map();
  for (const row of rows) {
    const ru = row && row.responsible_user;
    const uid = ru && ru.user_id != null ? String(ru.user_id).trim() : '';
    if (!uid) continue;
    counts.set(uid, (counts.get(uid) || 0) + 1);
  }
  const overloaded = new Set();
  for (const [uid, c] of counts) {
    if (c >= minMachines) overloaded.add(uid);
  }
  return overloaded;
}

function normCorrStatus(s) {
  return normalizeKey(s);
}

function applyCorrelationHints(riskLevel, reasonParts, {
  corrRow,
  responsibleOverloaded
}) {
  let r = riskLevel;
  if (!corrRow) {
    return { risk_level: r, reasonParts };
  }

  const st = normCorrStatus(corrRow.status);
  if (st === 'critical') {
    r = maxRisk(r, 'CRITICAL');
    reasonParts.push('Correlação: estado operacional crítico no resumo (último evento / dossié).');
  } else if (st === 'attention') {
    r = maxRisk(r, 'MEDIUM');
    reasonParts.push('Correlação: atenção requerida (condição anómala ou evento de severidade elevada).');
  }

  const ru = corrRow.responsible_user;
  const uid = ru && ru.user_id != null ? String(ru.user_id).trim() : '';
  if (uid && responsibleOverloaded.has(uid)) {
    r = maxRisk(r, 'MEDIUM');
    const name = ru && ru.name != null ? String(ru.name).trim() : '';
    reasonParts.push(
      name
        ? `O mesmo operador/responsável (${name}) surge associado a várias máquinas — carga e risco conjunto elevados.`
        : 'O mesmo responsável surge associado a várias máquinas — carga e risco conjunto elevados.'
    );
  }

  return { risk_level: r, reasonParts };
}

function hintForLevel(risk_level) {
  if (risk_level === 'CRITICAL') {
    return 'Tratar com urgência: inspeção prioritária, avaliar parada controlada e envolver manutenção.';
  }
  if (risk_level === 'HIGH') {
    return 'Agendar revisão técnica em breve, reforçar monitorização e cruzar com histórico de manutenção.';
  }
  if (risk_level === 'MEDIUM') {
    return 'Investigar causa raiz (repetição, correlação ou carga de responsáveis) e validar condição do equipamento.';
  }
  if (risk_level === 'LOW') {
    return 'Registar contexto do evento e acompanhar evolução nas próximas horas.';
  }
  return 'Manter monitorização regular.';
}

/**
 * @param {object} params
 * @param {object[]} [params.events]
 * @param {object[]} [params.machines]
 * @param {{ machine_status_summary?: object[] }} [params.correlation] — saída de correlateOperationalData
 * @param {number} [params.windowHours] — janela em horas (padrão 24)
 * @param {Date} [params.referenceTime] — instante de referência “agora” (testes)
 * @returns {{
 *   predictions: Array<{
 *     machine_id: string,
 *     risk_level: string,
 *     reason: string,
 *     recommendation_hint: string
 *   }>
 * }}
 */
function predictOperationalRisks({ events = [], machines = [], correlation, windowHours, referenceTime } = {}) {
  const machineList = Array.isArray(machines) ? machines : [];
  const eventList = Array.isArray(events) ? events : [];
  const { byMachine: correlationByMachine, rows: correlationRows } = buildCorrelationIndex(correlation);
  const overloadedResponsibles = getOverloadedResponsibleUserIds(correlationRows, 2);
  const hours = Math.max(1, Math.min(Number(windowHours) || DEFAULT_WINDOW_HOURS, 168));
  const ref = referenceTime instanceof Date && !Number.isNaN(referenceTime.getTime()) ? referenceTime : new Date();
  const cutoff = ref.getTime() - hours * 3600000;

  const predictions = [];

  for (const machine of machineList) {
    const machine_id = machine && machine.id != null ? String(machine.id).trim() : '';

    const recent = eventList
      .filter((e) => eventMatchesMachine(machine, e) && parseEventTime(e) >= cutoff)
      .sort((a, b) => parseEventTime(a) - parseEventTime(b));

    const n = recent.length;
    let risk_level = 'OK';
    const reasonParts = [];

    if (n >= 5) {
      risk_level = 'CRITICAL';
      reasonParts.push(`${n} eventos nas últimas ${hours}h (≥5 — limite crítico).`);
    } else if (n >= 3) {
      risk_level = 'HIGH';
      reasonParts.push(`${n} eventos nas últimas ${hours}h (≥3 — elevada concentração).`);
    }

    const repeat = dominantRepeatedType(recent);
    if (repeat) {
      risk_level = maxRisk(risk_level, 'MEDIUM');
      reasonParts.push(`Repetição de falhas: tipo "${repeat.type}" (${repeat.count} ocorrências).`);
    }

    if (n >= 2 && hasSeverityIncrease(recent)) {
      risk_level = maxRisk(risk_level, 'MEDIUM');
      reasonParts.push('Tendência de aumento de severidade entre eventos recentes.');
    }

    if (n > 0 && n < 3 && risk_level === 'OK') {
      risk_level = 'LOW';
      reasonParts.push(`${n} evento(s) isolado(s) na janela.`);
    }

    if (n === 0) {
      reasonParts.push(`Sem eventos registados nas últimas ${hours}h.`);
    }

    const corrRow = machine_id ? correlationByMachine.get(machine_id) : null;
    const applied = applyCorrelationHints(risk_level, reasonParts, {
      corrRow,
      responsibleOverloaded: overloadedResponsibles
    });
    risk_level = applied.risk_level;
    const mergedReasons = applied.reasonParts;

    const recommendation_hint = hintForLevel(risk_level);

    predictions.push({
      machine_id,
      risk_level,
      reason: mergedReasons.join(' '),
      recommendation_hint
    });
  }

  return { predictions };
}

module.exports = {
  predictOperationalRisks,
  DEFAULT_WINDOW_HOURS
};
