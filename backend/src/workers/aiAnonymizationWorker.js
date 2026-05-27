'use strict';

/**
 * AI Anonymization Worker — Scheduled execution for SZ5 pipelines
 *
 * Executa periodicamente:
 *   - Re-embedding pipeline (marca chunks órfãos para regeneração)
 *   - Summary regeneration pipeline (marca summaries para re-geração)
 *   - Post-execution checks (non-re-identification verification)
 *   - Alerting se re-identification check falha
 *
 * Não executa anonymization de titulares automaticamente (requer trigger via DSR).
 * Este worker trata apenas maintenance pipelines (re-embedding + summary regen).
 *
 * Flag: IMPETUS_AI_ANONYMIZATION=on (requer mode=on para executar)
 */

const db = require('../db');
const aiAnon = require('../services/aiAnonymizationService');

let _intervalHandle = null;
let _runCount = 0;
let _lastRun = null;
let _alerts = [];

function _log(event, data) {
  try {
    console.info('[AI_ANON_WORKER]', JSON.stringify({
      _type: 'ai_anonymization_worker',
      layer: 'SZ5_GOVERNANCE',
      event,
      ts: new Date().toISOString(),
      mode: aiAnon.getAnonymizationMode(),
      ...data,
    }));
  } catch { /* never throw */ }
}

/**
 * Executa post-anonymization verification para todos titulares com dados anonimizados recentes.
 * Emite alerta se algum check falhar.
 */
async function _verifyRecentAnonymizations() {
  try {
    const recent = await db.query(`
      SELECT DISTINCT user_id, company_id 
      FROM ai_interaction_traces 
      WHERE (input_payload->>'_anonymized') = 'true'
      AND (input_payload->>'_ts')::timestamp > NOW() - INTERVAL '24 hours'
      LIMIT 50
    `);

    const failures = [];

    for (const row of recent.rows) {
      const exposed = await db.query(
        `SELECT COUNT(*) as c FROM ai_interaction_traces 
         WHERE user_id = $1 AND company_id = $2 AND (input_payload->>'_anonymized') IS NULL`,
        [row.user_id, row.company_id]
      );
      const count = parseInt(exposed.rows[0]?.c || 0);

      if (count > 0) {
        failures.push({ user_id: row.user_id, company_id: row.company_id, exposed_traces: count });
      }
    }

    return { checked: recent.rows.length, failures };
  } catch (err) {
    _log('verification_error', { error: err?.message });
    return { checked: 0, failures: [], error: err?.message };
  }
}

/**
 * Emite alerta de re-identification risk.
 * Non-blocking, grava em notifications + structured log.
 */
async function _emitReIdentificationAlert(failures) {
  const alert = {
    type: 'RE_IDENTIFICATION_RISK',
    severity: 'critical',
    failures: failures.length,
    details: failures.slice(0, 5),
    timestamp: new Date().toISOString(),
  };

  _alerts.push(alert);
  if (_alerts.length > 100) _alerts = _alerts.slice(-50);

  _log('re_identification_alert', alert);

  // Notify DPO team
  try {
    const admins = await db.query(
      `SELECT id, company_id FROM users WHERE hierarchy_level <= 1 AND active = true AND deleted_at IS NULL LIMIT 10`
    );

    for (const admin of admins.rows) {
      await db.query(`
        INSERT INTO notifications (company_id, user_id, type, priority, title, message, action_required, created_at, expires_at)
        VALUES ($1, $2, 'ai_re_identification_risk', 'critical', 'ALERTA: Risco de re-identificação IA detectado', $3, true, NOW(), NOW() + INTERVAL '7 days')
      `, [
        admin.company_id,
        admin.id,
        `${failures.length} titular(es) com dados IA parcialmente anonimizados. Verificação manual necessária. IDs: ${failures.map(f => f.user_id.slice(0, 8)).join(', ')}`,
      ]);
    }
  } catch { /* alerting non-blocking */ }

  // Record in audit
  try {
    await db.query(`
      INSERT INTO audit_logs (action, entity_type, entity_id, details, performed_by, performed_at)
      VALUES ('ai_re_identification_risk', 'system', 'ai_anonymization_worker', $1, 'system:ai_anon_worker', NOW())
    `, [JSON.stringify(alert)]);
  } catch { /* audit non-blocking */ }
}

/**
 * Executa run completo do worker:
 * 1. Re-embedding (mark orphans)
 * 2. Summary regeneration (mark for regen)
 * 3. Post-execution verification
 * 4. Alert if re-identification risk
 */
async function executeWorkerRun() {
  if (!aiAnon.isEnabled()) {
    return { ok: false, error: 'AI Anonymization disabled', code: 'DISABLED' };
  }

  const isLiveMode = aiAnon.getAnonymizationMode() === aiAnon.MODES.ON;
  const start = Date.now();
  _runCount++;

  _log('worker_run_started', { run: _runCount, live: isLiveMode });

  const results = {};

  // 1. Re-embedding
  results.re_embedding = await aiAnon.executeReEmbedding({ dryRun: !isLiveMode });

  // 2. Summary regeneration
  results.summary_regen = await aiAnon.executeSummaryRegenMarking({ dryRun: !isLiveMode });

  // 3. Post-execution verification (only in live mode)
  if (isLiveMode) {
    const verification = await _verifyRecentAnonymizations();
    results.verification = verification;

    // 4. Alert if failures
    if (verification.failures && verification.failures.length > 0) {
      await _emitReIdentificationAlert(verification.failures);
      results.alert_emitted = true;
      results.re_identification_safe = false;
    } else {
      results.alert_emitted = false;
      results.re_identification_safe = true;
    }
  } else {
    results.verification = { skipped: true, reason: 'audit_mode' };
    results.re_identification_safe = null;
  }

  const elapsed = Date.now() - start;

  const summary = {
    run_number: _runCount,
    mode: aiAnon.getAnonymizationMode(),
    live: isLiveMode,
    re_embedding_ok: results.re_embedding?.ok,
    summary_regen_ok: results.summary_regen?.ok,
    re_identification_safe: results.re_identification_safe,
    alert_emitted: results.alert_emitted || false,
    elapsed_ms: elapsed,
    completed_at: new Date().toISOString(),
  };

  _lastRun = { summary, results, timestamp: new Date().toISOString() };

  _log('worker_run_completed', summary);

  return { ok: true, summary, results };
}

/**
 * Inicia scheduler periódico (a cada 12h).
 */
function startScheduler(intervalMs = 12 * 3600 * 1000) {
  if (!aiAnon.isEnabled()) {
    _log('scheduler_disabled', { reason: 'AI Anonymization is off' });
    return false;
  }

  if (_intervalHandle) return false;

  _log('scheduler_started', { interval_ms: intervalMs, mode: aiAnon.getAnonymizationMode() });

  // First run after 3 minutes
  setTimeout(() => {
    executeWorkerRun().catch(err => {
      _log('scheduled_run_error', { error: err?.message });
    });
  }, 180000);

  _intervalHandle = setInterval(() => {
    executeWorkerRun().catch(err => {
      _log('scheduled_run_error', { error: err?.message });
    });
  }, intervalMs);

  if (_intervalHandle.unref) _intervalHandle.unref();

  return true;
}

function stopScheduler() {
  if (_intervalHandle) {
    clearInterval(_intervalHandle);
    _intervalHandle = null;
    _log('scheduler_stopped', {});
    return true;
  }
  return false;
}

function getWorkerStats() {
  return {
    enabled: aiAnon.isEnabled(),
    mode: aiAnon.getAnonymizationMode(),
    run_count: _runCount,
    scheduler_active: !!_intervalHandle,
    last_run: _lastRun?.timestamp || null,
    alerts_count: _alerts.length,
    recent_alerts: _alerts.slice(-5),
  };
}

function getLastRun() {
  return _lastRun;
}

module.exports = {
  executeWorkerRun,
  startScheduler,
  stopScheduler,
  getWorkerStats,
  getLastRun,
};
