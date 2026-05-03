'use strict';

/**
 * Fila de jobs Claude (background, nunca síncrono no fluxo do utilizador).
 *
 * MVP: in-process, sequencial, com handler injectável (default = noop estruturado).
 * O handler real (chamada à API Claude + persistência) deve ser registado no boot
 * do servidor; aqui mantemos isolamento total para testes e evitar import circular.
 */

const queue = [];
let running = false;
let handler = async function defaultHandler(job) {
  console.info('[CLAUDE_JOB_NOOP]', JSON.stringify({ event_id: job.event_id, intent: job.intent }));
  return {
    status: 'ok',
    kpis: [],
    alerts: [],
    recommendations: [],
    generated_at: new Date().toISOString(),
    note: 'NOOP_HANDLER'
  };
};

function setHandler(fn) {
  if (typeof fn !== 'function') throw new Error('claudeJobQueue.setHandler: fn deve ser função');
  handler = fn;
}

async function _drain() {
  if (running) return;
  running = true;
  try {
    while (queue.length > 0) {
      const job = queue.shift();
      try {
        const out = await handler(job);
        if (typeof job._resolve === 'function') job._resolve(out);
      } catch (err) {
        console.warn('[CLAUDE_JOB_FAIL]', { event_id: job.event_id, err: err && err.message });
        if (typeof job._resolve === 'function') {
          job._resolve({
            status: 'critical',
            kpis: [],
            alerts: [{ severity: 'high', message: 'claude_job_failed' }],
            recommendations: [],
            generated_at: new Date().toISOString(),
            error: err && err.message
          });
        }
      }
    }
  } finally {
    running = false;
  }
}

/**
 * @param {{ event_id: string, intent: string, summary: string, entities: string[], priority: string, payload: object }} job
 * @returns {Promise<object>} resultado estruturado (contrato Claude)
 */
function enqueue(job) {
  return new Promise((resolve) => {
    queue.push({ ...job, _resolve: resolve });
    setImmediate(_drain);
  });
}

function stats() {
  return { pending: queue.length, running };
}

module.exports = {
  enqueue,
  setHandler,
  stats
};
