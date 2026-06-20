'use strict';

/**
 * M1.19 — MES/ERP ingest consumer (MES-01)
 */

const queue = require('../services/mesErpIngestQueueService');
const core = require('../services/mesErpIntegrationService');

const INTERVAL_MS = parseInt(process.env.IMPETUS_MES_ERP_CONSUMER_INTERVAL_MS || '3000', 10) || 3000;
let _timer = null;
let _running = false;

async function handleMesErpEnvelope(env) {
  const pl = env?.payload || {};
  const companyId = env?.company_id || pl.company_id;
  const connectorId = pl.connector_id;
  const payload = pl.payload;
  if (!companyId || !connectorId) {
    return { ok: false, error: 'missing_company_or_connector' };
  }
  const r = await core.processPushDirect(companyId, connectorId, payload);
  return { ok: true, recordsCount: r.recordsCount };
}

async function tick() {
  if (_running) return;
  _running = true;
  try {
    const outbox = require('../eventPipeline/outbox/industrialOutboxService');
    await outbox.drainOutboxBatch({
      batchSize: 25,
      defaultHandler: async (env) => {
        if (env?.event_name !== 'mes_erp.push.ingest' && env?.domain !== 'mes_erp') {
          return { ok: true, skipped: true };
        }
        return handleMesErpEnvelope(env);
      },
    });
    await queue.drainMemoryQueue(25);
  } catch (err) {
    console.warn('[MES_ERP_CONSUMER]', err?.message ?? err);
  } finally {
    _running = false;
  }
}

function startMesErpConsumer() {
  if (_timer) return { ok: true, already_running: true };
  if (!queue.isMesAsyncIngestionEnabled()) return { ok: false, reason: 'async_disabled' };
  _timer = setInterval(() => {
    tick().catch(() => {});
  }, INTERVAL_MS);
  if (_timer.unref) _timer.unref();
  tick().catch(() => {});
  return { ok: true, interval_ms: INTERVAL_MS };
}

function stopMesErpConsumer() {
  if (_timer) {
    clearInterval(_timer);
    _timer = null;
  }
}

module.exports = {
  handleMesErpEnvelope,
  tick,
  startMesErpConsumer,
  stopMesErpConsumer,
};
