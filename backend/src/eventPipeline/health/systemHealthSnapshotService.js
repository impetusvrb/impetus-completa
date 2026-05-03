'use strict';

/**
 * Gera snapshots periódicos do estado do sistema e publica como evento
 * `system_health_snapshot` no bus. Frontend NUNCA chama Claude — apenas lê
 * o resultado já persistido pelo handler do orquestrador.
 *
 * Estrutura do snapshot.payload.summary alinhada ao contrato do produto:
 *   { status, cpu, memoria, falhas, tarefas_atrasadas, uptime }
 *
 * Persistência (DB / Firestore) é responsabilidade do handler de Claude
 * registado em `wireOrchestrator({ claude_handler })`.
 */

const os = require('os');
const { publishEvent } = require('../pipeline');

let _timer = null;

function _cpuUsagePercent() {
  const cpus = os.cpus() || [];
  if (!cpus.length) return 0;
  let idleSum = 0;
  let totalSum = 0;
  for (const cpu of cpus) {
    const t = cpu.times || { idle: 0, user: 0, sys: 0, nice: 0, irq: 0 };
    const total = t.user + t.nice + t.sys + t.idle + t.irq;
    idleSum += t.idle;
    totalSum += total;
  }
  if (totalSum === 0) return 0;
  return Math.max(0, Math.min(100, Math.round(((totalSum - idleSum) / totalSum) * 100)));
}

function _memoryUsagePercent() {
  const total = os.totalmem();
  const free = os.freemem();
  if (!total) return 0;
  return Math.round(((total - free) / total) * 100);
}

/**
 * @param {{ falhas?: number, tarefas_atrasadas?: number, status?: 'ok'|'warning'|'critical' }} [extras]
 * @returns {object} payload do snapshot
 */
function buildSnapshotPayload(extras = {}) {
  const cpu = _cpuUsagePercent();
  const memoria = _memoryUsagePercent();
  const falhas = Number.isFinite(extras.falhas) ? Math.max(0, extras.falhas) : 0;
  const tarefas_atrasadas = Number.isFinite(extras.tarefas_atrasadas)
    ? Math.max(0, extras.tarefas_atrasadas)
    : 0;
  const uptime = Math.round(process.uptime());

  let status = 'ok';
  if (cpu > 90 || memoria > 92 || falhas > 10) status = 'critical';
  else if (cpu > 75 || memoria > 80 || falhas > 0) status = 'warning';
  if (extras.status && ['ok', 'warning', 'critical'].includes(extras.status)) {
    status = extras.status;
  }

  return {
    summary: {
      status,
      cpu,
      memoria,
      falhas,
      tarefas_atrasadas,
      uptime
    }
  };
}

/**
 * Constrói e publica um snapshot — devolve o envelope publicado.
 *
 * @param {object} [extras]
 * @returns {Promise<object>}
 */
async function captureAndPublishSnapshot(extras = {}) {
  const payload = buildSnapshotPayload(extras);
  return publishEvent({
    type: 'system_health_snapshot',
    source: 'system',
    user: null,
    priority: payload.summary.status === 'critical' ? 'high' : 'medium',
    payload
  });
}

/**
 * Inicia ciclo periódico (default 60s; mínimo 5s). Idempotente.
 *
 * @param {{ intervalMs?: number, extrasProvider?: () => Promise<object>|object }} [opts]
 */
function startSystemHealthLoop(opts = {}) {
  if (_timer) return { ok: true, already_running: true };
  if (process.env.IMPETUS_SYSTEM_HEALTH_ENABLED !== 'true') {
    return { ok: false, reason: 'disabled_by_env' };
  }
  const intervalMs = Math.max(5000, Number(opts.intervalMs) || 60000);
  _timer = setInterval(async () => {
    try {
      const extras =
        typeof opts.extrasProvider === 'function' ? (await opts.extrasProvider()) || {} : {};
      await captureAndPublishSnapshot(extras);
    } catch (err) {
      console.warn('[SYSTEM_HEALTH_LOOP_ERROR]', err && err.message);
    }
  }, intervalMs);
  if (typeof _timer.unref === 'function') _timer.unref();
  return { ok: true, intervalMs };
}

function stopSystemHealthLoop() {
  if (_timer) {
    clearInterval(_timer);
    _timer = null;
  }
}

module.exports = {
  buildSnapshotPayload,
  captureAndPublishSnapshot,
  startSystemHealthLoop,
  stopSystemHealthLoop
};
