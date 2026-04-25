'use strict';

/**
 * Correlação determinística de dados operacionais (sem IA).
 * - Eventos → máquinas: por identificador ou nome normalizado.
 * - Máquinas → responsáveis: utilizadores ordenados por papel; atribuição estável por hash(machine_id).
 */

/** Ordem crescente de “distância” ao comando (menor índice = mais provável responsável global). */
const ROLE_PRIORITY = [
  'ceo',
  'diretor',
  'admin',
  'gerente',
  'coordenador',
  'supervisor',
  'encarregado',
  'manutencao',
  'manutenção',
  'tecnico',
  'técnico',
  'operador',
  'colaborador',
  'profissional'
];

function normalizeKey(value) {
  if (value == null) return '';
  return String(value)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

function roleRank(role) {
  const r = normalizeKey(role);
  if (!r) return ROLE_PRIORITY.length;
  for (let i = 0; i < ROLE_PRIORITY.length; i += 1) {
    if (r === ROLE_PRIORITY[i] || r.includes(ROLE_PRIORITY[i])) {
      return i;
    }
  }
  return ROLE_PRIORITY.length;
}

function sortUsersForResponsibility(users) {
  const list = Array.isArray(users) ? users.slice() : [];
  list.sort((a, b) => {
    const ra = roleRank(a && a.role);
    const rb = roleRank(b && b.role);
    if (ra !== rb) return ra - rb;
    const ida = a && a.id != null ? String(a.id) : '';
    const idb = b && b.id != null ? String(b.id) : '';
    return ida.localeCompare(idb);
  });
  return list;
}

/** Hash determinístico inteiro não negativo (estável entre execuções). */
function stableIndexFromString(str) {
  const s = str != null ? String(str) : '';
  let h = 5381;
  for (let i = 0; i < s.length; i += 1) {
    h = (h * 33) ^ s.charCodeAt(i);
  }
  return Math.abs(h >>> 0);
}

function pickResponsibleUser(sortedUsers, machineKey) {
  if (!sortedUsers.length) return null;
  const idx = stableIndexFromString(machineKey) % sortedUsers.length;
  const u = sortedUsers[idx];
  return {
    user_id: u.id != null ? String(u.id) : '',
    name: u.name != null ? String(u.name) : '',
    role: u.role != null ? String(u.role) : ''
  };
}

/**
 * Indica se o evento se refere à máquina (por ids ou nome).
 * @param {{ id?: string, name?: string }} machine
 * @param {object} event
 */
function eventBelongsToMachine(machine, event) {
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

function deriveStatus(lastEvent) {
  if (!lastEvent) return 'no_recent_events';

  const sev = normalizeKey(lastEvent.severity);
  if (
    sev.includes('crit') ||
    sev.includes('critical') ||
    sev === 'alta' ||
    sev.includes('high') ||
    sev.includes('emerg')
  ) {
    return 'critical';
  }
  if (sev.includes('media') || sev.includes('medium') || sev.includes('moderate')) {
    return 'attention';
  }
  if (sev.includes('baixa') || sev.includes('low')) {
    return 'operational';
  }

  const et = normalizeKey(lastEvent.event_type);
  if (
    et.includes('alarm') ||
    et.includes('falha') ||
    et.includes('parada') ||
    et.includes('down') ||
    et.includes('emergencia')
  ) {
    return 'attention';
  }

  return 'operational';
}

function summarizeLastEvent(ev) {
  if (!ev) return null;
  return {
    event_type: ev.event_type != null ? String(ev.event_type) : '',
    severity: ev.severity != null ? String(ev.severity) : '',
    created_at: ev.created_at != null ? ev.created_at : null,
    source: ev.source != null ? String(ev.source) : ''
  };
}

/**
 * @param {object} params
 * @param {object[]} [params.users]
 * @param {object[]} [params.machines]
 * @param {object[]} [params.events]
 * @returns {{
 *   machine_status_summary: Array<{
 *     machine_id: string,
 *     status: string,
 *     last_event: object|null,
 *     responsible_user: object|null
 *   }>
 * }}
 */
function correlateOperationalData({ users = [], machines = [], events = [] } = {}) {
  const machineList = Array.isArray(machines) ? machines : [];
  const eventList = Array.isArray(events) ? events : [];
  const sortedUsers = sortUsersForResponsibility(Array.isArray(users) ? users : []);

  const machine_status_summary = machineList.map((machine) => {
    const machine_id = machine && machine.id != null ? String(machine.id).trim() : '';

    const related = eventList.filter((ev) => eventBelongsToMachine(machine, ev));
    related.sort((a, b) => parseEventTime(b) - parseEventTime(a));

    const last = related.length ? related[0] : null;
    const status = deriveStatus(last);
    const machineKey = machine_id || (machine && machine.name != null ? String(machine.name) : '');

    return {
      machine_id,
      status,
      last_event: summarizeLastEvent(last),
      responsible_user: pickResponsibleUser(sortedUsers, machineKey)
    };
  });

  return { machine_status_summary };
}

module.exports = {
  correlateOperationalData
};
