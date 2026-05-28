'use strict';

/**
 * Replay governado WAVE 2 — shadow | audit | on.
 * Persiste runs em industrial_event_replay_log; replay on re-enfileira com sufixo idempotency.
 */

const { v4: uuidv4 } = require('uuid');
const {
  industrialReplayMode,
  isReplayDryRun,
  isIndustrialOutboxEnabled,
  isIndustrialDlqEnabled,
  isIndustrialEventsEnabled
} = require('../industrialFlags');
const { runShadowReplay, shadowReplayHandler } = require('./shadowReplayWorker');

let _stats = {
  runs: 0,
  items: 0,
  re_enqueued: 0,
  audit_only: 0,
  errors: 0
};

async function _persistReplayLog(runId, summary) {
  if (!isIndustrialOutboxEnabled()) return;
  try {
    const db = require('../../db');
    await db.query(
      `INSERT INTO industrial_event_replay_log
       (id, run_id, source, items_checked, divergences, matches, divergence_rate, metadata)
       VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, $7, $8::jsonb)`,
      [
        uuidv4(),
        runId,
        summary.source || 'orchestrator',
        summary.items_checked || 0,
        summary.divergences || 0,
        summary.matches || 0,
        summary.divergence_rate != null ? summary.divergence_rate : null,
        JSON.stringify(summary)
      ]
    );
  } catch (_e) {}
}

/**
 * @param {{ limit?: number, source?: string, company_id?: string, mode?: string }} [opts]
 */
async function runGovernedReplay(opts = {}) {
  if (!isIndustrialEventsEnabled()) {
    return { ok: false, reason: 'industrial_events_disabled' };
  }

  const mode = opts.mode || industrialReplayMode();
  if (mode === 'off') {
    return { ok: false, reason: 'replay_disabled' };
  }

  const runId = uuidv4();
  const limit = Math.min(500, Math.max(1, Number(opts.limit) || 100));
  const source = opts.source || 'outbox';
  _stats.runs += 1;

  if (mode === 'shadow') {
    const shadow = await runShadowReplay({ limit, source });
    await _persistReplayLog(runId, { ...shadow, mode, run_id: runId });
    return { ok: true, mode: 'shadow', run_id: runId, ...shadow };
  }

  const dryRun = mode === 'audit' || isReplayDryRun();
  const results = [];
  let itemsChecked = 0;
  let matches = 0;
  let divergences = 0;

  try {
    const db = require('../../db');
    const outbox = require('../outbox/industrialOutboxService');

    if ((source === 'outbox' || source === 'all') && isIndustrialOutboxEnabled()) {
      const params = [limit];
      let sql = `SELECT id, envelope, company_id, idempotency_key, event_name
                 FROM industrial_event_outbox
                 WHERE status IN ('delivered', 'pending', 'dlq')`;
      if (opts.company_id) {
        sql += ` AND company_id = $2::uuid`;
        params.push(opts.company_id);
      }
      sql += ` ORDER BY created_at DESC LIMIT $1`;
      const r = await db.query(sql, params);
      for (const row of r.rows || []) {
        itemsChecked += 1;
        const env = typeof row.envelope === 'object' ? row.envelope : JSON.parse(row.envelope);
        const check = await shadowReplayHandler(env);
        if (!check.ok) {
          divergences += 1;
          results.push({ id: row.id, status: 'divergence', reason: check.error });
          continue;
        }
        matches += 1;
        if (dryRun) {
          _stats.audit_only += 1;
          results.push({ id: row.id, status: 'audit_ok', event_name: env.event_name });
          continue;
        }
        if (mode === 'on' && opts.company_id && String(env.company_id) !== String(opts.company_id)) {
          divergences += 1;
          results.push({ id: row.id, status: 'tenant_mismatch' });
          continue;
        }
        const replayEnv = {
          ...env,
          idempotency_key: `${env.idempotency_key}:replay:${runId.slice(0, 8)}`,
          metadata: { ...(env.metadata || {}), replay_run_id: runId, replay_mode: 'on' }
        };
        const enq = await outbox.enqueueIndustrialEvent(replayEnv);
        if (enq.ok) {
          _stats.re_enqueued += 1;
          results.push({ id: row.id, status: 're_enqueued', outbox_id: enq.id });
        } else {
          results.push({ id: row.id, status: 'enqueue_failed', reason: enq.reason });
        }
      }
    }

    if ((source === 'dlq' || source === 'all') && isIndustrialDlqEnabled()) {
      const dr = await db.query(
        `SELECT id, envelope, company_id, idempotency_key FROM industrial_event_dlq
         ${opts.company_id ? 'WHERE company_id = $2::uuid' : ''}
         ORDER BY created_at DESC LIMIT $1`,
        opts.company_id ? [limit, opts.company_id] : [limit]
      );
      for (const row of dr.rows || []) {
        itemsChecked += 1;
        const env = typeof row.envelope === 'object' ? row.envelope : JSON.parse(row.envelope);
        const check = await shadowReplayHandler(env);
        if (!check.ok) {
          divergences += 1;
          continue;
        }
        matches += 1;
        if (!dryRun && mode === 'on') {
          const replayEnv = {
            ...env,
            idempotency_key: `${env.idempotency_key}:dlq_replay:${runId.slice(0, 8)}`,
            metadata: { ...(env.metadata || {}), dlq_replay_run_id: runId }
          };
          await outbox.enqueueIndustrialEvent(replayEnv);
          _stats.re_enqueued += 1;
        }
      }
    }

    const divergenceRate = itemsChecked > 0 ? divergences / itemsChecked : 0;
    const summary = {
      run_id: runId,
      mode,
      dry_run: dryRun,
      source,
      items_checked: itemsChecked,
      matches,
      divergences,
      divergence_rate: divergenceRate,
      results: results.slice(0, 50)
    };

    await _persistReplayLog(runId, summary);

    console.info('[INDUSTRIAL_REPLAY]', JSON.stringify({ event: 'INDUSTRIAL_REPLAY', ...summary }));

    return { ok: true, ...summary };
  } catch (err) {
    _stats.errors += 1;
    return { ok: false, error: err?.message || String(err), run_id: runId };
  }
}

function getOrchestratorStats() {
  return { ..._stats, replay_mode: industrialReplayMode() };
}

module.exports = {
  runGovernedReplay,
  getOrchestratorStats
};
