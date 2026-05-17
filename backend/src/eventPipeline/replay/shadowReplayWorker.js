'use strict';

/**
 * Replay shadow (WAVE 1) — reprocessa outbox/DLQ em memória sem efeitos laterais.
 * Default: IMPETUS_INDUSTRIAL_REPLAY_SHADOW=true
 */

const { isIndustrialReplayShadow, isIndustrialOutboxEnabled } = require('../industrialFlags');

let _stats = {
  runs: 0,
  items_checked: 0,
  divergences: 0,
  matches: 0,
  errors: 0
};

/**
 * Handler noop para shadow — apenas valida estrutura do envelope.
 */
async function shadowReplayHandler(envelope) {
  if (!envelope || !envelope.event_name || !envelope.company_id) {
    return { ok: false, error: 'invalid_envelope' };
  }
  return { ok: true, shadow: true };
}

/**
 * @param {{ limit?: number, source?: 'outbox'|'dlq'|'memory' }} [opts]
 */
async function runShadowReplay(opts = {}) {
  if (!isIndustrialReplayShadow()) {
    return { ok: false, reason: 'replay_shadow_disabled' };
  }

  const limit = Math.min(500, Math.max(1, Number(opts.limit) || 100));
  _stats.runs += 1;
  const divergences = [];
  const matches = [];

  if (opts.source === 'dlq' || !opts.source) {
    const dlq = require('../dlq/industrialDlqService');
    const items = dlq.listMemoryDlq(limit);
    for (const item of items) {
      _stats.items_checked += 1;
      const env = item.envelope || item;
      const r = await shadowReplayHandler(env);
      if (r.ok) {
        _stats.matches += 1;
        matches.push({ id: item.id, event_name: env.event_name });
      } else {
        _stats.divergences += 1;
        divergences.push({ id: item.id, reason: r.error });
      }
    }
  }

  if (isIndustrialOutboxEnabled() && (opts.source === 'outbox' || !opts.source)) {
    try {
      const db = require('../../db');
      const r = await db.query(
        `SELECT id, envelope FROM industrial_event_outbox
         WHERE status IN ('pending', 'delivered')
         ORDER BY created_at DESC LIMIT $1`,
        [limit]
      );
      for (const row of r.rows || []) {
        _stats.items_checked += 1;
        const env = typeof row.envelope === 'object' ? row.envelope : JSON.parse(row.envelope);
        const replay = await shadowReplayHandler(env);
        const storedOk = env && env.event_name && env.company_id;
        if (replay.ok && storedOk) {
          _stats.matches += 1;
          matches.push({ id: row.id, event_name: env.event_name });
        } else {
          _stats.divergences += 1;
          divergences.push({ id: row.id, reason: replay.error || 'structure_mismatch' });
        }
      }
    } catch (err) {
      _stats.errors += 1;
    }
  }

  const divergenceRate =
    _stats.items_checked > 0 ? _stats.divergences / _stats.items_checked : 0;

  try {
    console.info(
      '[INDUSTRIAL_REPLAY_SHADOW]',
      JSON.stringify({
        event: 'INDUSTRIAL_REPLAY_SHADOW',
        items_checked: _stats.items_checked,
        divergences: divergences.length,
        matches: matches.length,
        divergence_rate: divergenceRate,
        ts: new Date().toISOString()
      })
    );
  } catch (_e) {}

  return {
    ok: true,
    shadow: true,
    items_checked: divergences.length + matches.length,
    divergences,
    matches,
    divergence_rate: divergenceRate,
    stats: { ..._stats }
  };
}

function getReplayStats() {
  return { ..._stats, replay_shadow: isIndustrialReplayShadow() };
}

module.exports = {
  shadowReplayHandler,
  runShadowReplay,
  getReplayStats
};
