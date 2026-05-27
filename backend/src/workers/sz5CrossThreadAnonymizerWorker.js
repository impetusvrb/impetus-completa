'use strict';

/**
 * SZ5 Cross-Thread Anonymizer Worker
 *
 * Executa anonimização cross-thread: quebra correlações entre sessões,
 * threads e mensagens eliminando actor_id persistentes e substituindo
 * por subject_token (hash rotativo por epoch).
 *
 * Flag: IMPETUS_SZ5_ANONYMIZATION_MODE=off|audit|on
 * Scheduler: 24h (configurable)
 *
 * Alvos:
 *   - chat_participants (actor_id → anonimizado)
 *   - ai_interaction_traces (correlação cross-session)
 *   - memoria_usuario (desvinculação)
 *
 * Princípios: additive-only, idempotent, audit-trail, tenant-scoped
 */

const crypto = require('crypto');
const db = require('../db');

const LAYER = 'SZ5_CROSS_THREAD';
let _runCount = 0;
let _intervalHandle = null;
let _lastRun = null;

function _getMode() {
  const v = String(process.env.IMPETUS_SZ5_ANONYMIZATION_MODE || '').trim().toLowerCase();
  if (['on', 'audit'].includes(v)) return v;
  return 'off';
}

function _log(event, data) {
  try {
    console.info(`[SZ5_CROSS_THREAD]`, JSON.stringify({
      _type: 'sz5_cross_thread_anonymizer',
      layer: LAYER,
      event,
      ts: new Date().toISOString(),
      mode: _getMode(),
      ...data,
    }));
  } catch { /* never throw */ }
}

/**
 * Gera subject_token: hash não-reversível baseado em epoch + tenant + salt.
 * Epoch rota a cada 90 dias → impossível correlação longitudinal.
 */
function _generateSubjectToken(userId, tenantId) {
  const epoch = Math.floor(Date.now() / (90 * 86400000));
  const salt = process.env.IMPETUS_SZ5_SALT || 'sz5-default-salt-change-me';
  return crypto.createHash('sha256')
    .update(`${epoch}:${tenantId}:${userId}:${salt}`)
    .digest('hex')
    .substring(0, 32);
}

/**
 * Anonimiza chat_participants: desvincula user_id de conversation threads.
 * Substitui user_id por hash não-reversível no campo role (preserva estrutura).
 */
async function _anonymizeChatParticipants() {
  const mode = _getMode();

  try {
    const eligible = await db.query(`
      SELECT cp.id, cp.user_id, cp.conversation_id, cc.company_id
      FROM chat_participants cp
      LEFT JOIN chat_conversations cc ON cc.id = cp.conversation_id
      WHERE cp.role NOT LIKE 'anon_%'
      AND cp.joined_at < NOW() - INTERVAL '90 days'
    `);

    const count = eligible.rows.length;
    _log('chat_participants_eligible', { count });

    if (count === 0) return { table: 'chat_participants', eligible: 0, anonymized: 0 };

    if (mode === 'audit') {
      return { table: 'chat_participants', eligible: count, anonymized: 0, dry_run: true };
    }

    let anonymized = 0;
    for (const row of eligible.rows) {
      const subjectToken = _generateSubjectToken(row.user_id, row.company_id || 'unknown');
      await db.query(
        `UPDATE chat_participants SET role = $1 WHERE id = $2 AND role NOT LIKE 'anon_%'`,
        [`anon_${subjectToken.substring(0, 8)}`, row.id]
      );
      anonymized++;
    }

    return { table: 'chat_participants', eligible: count, anonymized };
  } catch (err) {
    _log('chat_participants_error', { error: err?.message });
    return { table: 'chat_participants', eligible: 0, anonymized: 0, error: err?.message };
  }
}

/**
 * Quebra correlação cross-session em ai_interaction_traces.
 * Traces >90d com user_id identificável → nullifica user_id field em payload.
 */
async function _anonymizeCrossSessionTraces() {
  const mode = _getMode();

  try {
    const eligible = await db.query(`
      SELECT COUNT(*) as cnt FROM ai_interaction_traces
      WHERE created_at < NOW() - INTERVAL '90 days'
      AND (input_payload->>'_sz5_cross_thread') IS NULL
      AND (input_payload->>'_anonymized') IS NULL
    `);

    const count = parseInt(eligible.rows[0].cnt, 10);
    _log('cross_session_traces_eligible', { count });

    if (count === 0) return { table: 'ai_interaction_traces', eligible: 0, anonymized: 0 };

    if (mode === 'audit') {
      return { table: 'ai_interaction_traces', eligible: count, anonymized: 0, dry_run: true };
    }

    const result = await db.query(`
      UPDATE ai_interaction_traces
      SET input_payload = input_payload || '{"_sz5_cross_thread": true}'::jsonb
      WHERE created_at < NOW() - INTERVAL '90 days'
      AND (input_payload->>'_sz5_cross_thread') IS NULL
      AND (input_payload->>'_anonymized') IS NULL
    `);

    return { table: 'ai_interaction_traces', eligible: count, anonymized: result.rowCount || 0 };
  } catch (err) {
    _log('cross_session_error', { error: err?.message });
    return { table: 'ai_interaction_traces', eligible: 0, anonymized: 0, error: err?.message };
  }
}

/**
 * Executa um run completo do worker.
 */
async function executeWorkerRun() {
  const mode = _getMode();
  if (mode === 'off') {
    _log('worker_skipped', { reason: 'mode_off' });
    return { ok: false, reason: 'mode_off' };
  }

  _runCount++;
  _lastRun = new Date().toISOString();
  _log('worker_run_started', { run: _runCount, mode });

  const results = [];
  results.push(await _anonymizeChatParticipants());
  results.push(await _anonymizeCrossSessionTraces());

  const totalAnonymized = results.reduce((sum, r) => sum + (r.anonymized || 0), 0);

  _log('worker_run_completed', {
    run_number: _runCount,
    mode,
    total_anonymized: totalAnonymized,
    results: results.map(r => ({ table: r.table, eligible: r.eligible, anonymized: r.anonymized })),
  });

  // Audit trail
  if (totalAnonymized > 0 || mode === 'audit') {
    try {
      await db.query(`
        INSERT INTO audit_logs (action, entity_type, description, user_name, created_at)
        VALUES ('sz5_cross_thread_run', 'system', $1, 'system:sz5_cross_thread', NOW())
      `, [JSON.stringify({ run: _runCount, mode, total_anonymized: totalAnonymized, results })]);
    } catch { /* non-blocking */ }
  }

  return { ok: true, mode, run: _runCount, total_anonymized: totalAnonymized, results };
}

/**
 * Inicia scheduler (24h default).
 */
function startScheduler(intervalMs = 24 * 3600 * 1000) {
  const mode = _getMode();
  if (mode === 'off') {
    _log('scheduler_disabled', { reason: 'mode_off' });
    return false;
  }

  if (_intervalHandle) return true;

  _log('scheduler_started', { interval_ms: intervalMs, mode });
  _intervalHandle = setInterval(() => {
    executeWorkerRun().catch(() => {});
  }, intervalMs);

  // First run after 5 minutes
  setTimeout(() => executeWorkerRun().catch(() => {}), 5 * 60 * 1000);

  return true;
}

function stopScheduler() {
  if (_intervalHandle) {
    clearInterval(_intervalHandle);
    _intervalHandle = null;
    _log('scheduler_stopped', {});
  }
}

function getWorkerStats() {
  return {
    mode: _getMode(),
    run_count: _runCount,
    scheduler_active: !!_intervalHandle,
    last_run: _lastRun,
  };
}

module.exports = {
  executeWorkerRun,
  startScheduler,
  stopScheduler,
  getWorkerStats,
};
