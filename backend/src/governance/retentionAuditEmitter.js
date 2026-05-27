'use strict';

/**
 * Retention Audit Emitter — Enterprise-grade T1.7
 *
 * Emite eventos de auditoria estruturados para todas as operações de retenção.
 * Persiste em audit_logs com classificação por tipo:
 *   - retention_shadow_scan
 *   - retention_pilot_purge
 *   - retention_enforce_purge
 *   - retention_eligibility_resolved
 *   - sz5_activation_phase_1
 *   - sz5_activation_phase_2
 *
 * Princípios:
 *   - Sem dados pessoais (apenas contadores, tabelas, timestamps)
 *   - TTL = NEVER (audit_logs é AUDIT_IMMUTABLE)
 *   - Tenant-scoped quando aplicável
 *   - Non-blocking (catch all errors)
 */

const db = require('../db');

const LAYER = 'RETENTION_AUDIT_EMITTER';

function _log(event, data) {
  try {
    console.info('[RETENTION_AUDIT]', JSON.stringify({
      _type: 'retention_audit_emitter',
      layer: LAYER,
      event,
      ts: new Date().toISOString(),
      ...data,
    }));
  } catch { /* never throw */ }
}

/**
 * Emite evento de shadow scan (nenhuma mutação).
 */
async function emitShadowScan(summary) {
  try {
    await db.query(`
      INSERT INTO audit_logs (action, entity_type, description, user_name, created_at)
      VALUES ('retention_shadow_scan', 'system', $1, 'system:retention', NOW())
    `, [JSON.stringify({
      mode: 'shadow',
      tables_scanned: summary.tables_scanned,
      total_expired: summary.total_expired_rows,
      estimated_purge_mb: summary.total_estimated_purge_mb,
      mutations: 0,
      scanned_at: summary.scanned_at,
    })]);
    _log('shadow_scan_emitted', { tables: summary.tables_scanned });
  } catch (err) {
    _log('emit_error', { type: 'shadow_scan', error: err?.message });
  }
}

/**
 * Emite evento de pilot purge (mutações controladas).
 */
async function emitPilotPurge(summary, tenantId) {
  try {
    await db.query(`
      INSERT INTO audit_logs (action, entity_type, description, user_name, created_at, company_id)
      VALUES ('retention_pilot_purge', 'system', $1, 'system:retention', NOW(), $2)
    `, [JSON.stringify({
      mode: 'pilot',
      run_number: summary.run_number,
      total_rows_mutated: summary.total_rows_mutated,
      aborted: summary.aborted,
      elapsed_ms: summary.elapsed_ms,
    }), tenantId || null]);
    _log('pilot_purge_emitted', { mutated: summary.total_rows_mutated, tenant: tenantId });
  } catch (err) {
    _log('emit_error', { type: 'pilot_purge', error: err?.message });
  }
}

/**
 * Emite evento de enforce purge (mutações globais).
 */
async function emitEnforcePurge(summary) {
  try {
    await db.query(`
      INSERT INTO audit_logs (action, entity_type, description, user_name, created_at)
      VALUES ('retention_enforce_purge', 'system', $1, 'system:retention', NOW())
    `, [JSON.stringify({
      mode: 'enforce',
      run_number: summary.run_number,
      tables_processed: summary.tables_processed,
      total_rows_mutated: summary.total_rows_mutated,
      tables_aborted: summary.tables_aborted,
      elapsed_ms: summary.elapsed_ms,
    })]);
    _log('enforce_purge_emitted', { mutated: summary.total_rows_mutated, tables: summary.tables_processed });
  } catch (err) {
    _log('emit_error', { type: 'enforce_purge', error: err?.message });
  }
}

/**
 * Emite evento de eligibilidade resolvida.
 */
async function emitEligibilityResolved(resolveResult) {
  try {
    await db.query(`
      INSERT INTO audit_logs (action, entity_type, description, user_name, created_at)
      VALUES ('retention_eligibility_resolved', 'system', $1, 'system:retention', NOW())
    `, [JSON.stringify({
      total_eligible: resolveResult.total_eligible,
      tables_resolved: resolveResult.tables_resolved,
      resolved_at: resolveResult.resolved_at,
    })]);
    _log('eligibility_emitted', { eligible: resolveResult.total_eligible });
  } catch (err) {
    _log('emit_error', { type: 'eligibility', error: err?.message });
  }
}

/**
 * Emite evento de activação SZ5 Phase 1.
 */
async function emitSz5ActivationPhase1(validationResult) {
  try {
    await db.query(`
      INSERT INTO audit_logs (action, entity_type, description, user_name, created_at)
      VALUES ('sz5_activation_phase_1', 'system', $1, 'system:sz5_governance', NOW())
    `, [JSON.stringify({
      event: 'SZ5_ANONYMIZATION_ACTIVATED',
      mode: 'on',
      preconditions_met: validationResult.all_passed,
      checks: validationResult.checks,
      activated_at: new Date().toISOString(),
    })]);
    _log('sz5_phase_1_emitted', { passed: validationResult.all_passed });
  } catch (err) {
    _log('emit_error', { type: 'sz5_phase_1', error: err?.message });
  }
}

/**
 * Emite evento de activação SZ5 Phase 2 (graph purge).
 */
async function emitSz5ActivationPhase2() {
  try {
    await db.query(`
      INSERT INTO audit_logs (action, entity_type, description, user_name, created_at)
      VALUES ('sz5_activation_phase_2', 'system', $1, 'system:sz5_governance', NOW())
    `, [JSON.stringify({
      event: 'SZ5_GRAPH_PURGE_ENABLED',
      warning: 'DESTRUCTIVE_OPERATION_AUTHORIZED',
      enabled_at: new Date().toISOString(),
    })]);
    _log('sz5_phase_2_emitted', {});
  } catch (err) {
    _log('emit_error', { type: 'sz5_phase_2', error: err?.message });
  }
}

/**
 * Emite bloqueio de activação SZ5 (pré-condições não atendidas).
 */
async function emitSz5ActivationBlocked(reason, checks) {
  try {
    await db.query(`
      INSERT INTO audit_logs (action, entity_type, description, user_name, created_at)
      VALUES ('sz5_activation_blocked', 'system', $1, 'system:sz5_governance', NOW())
    `, [JSON.stringify({
      event: 'SZ5_ACTIVATION_DENIED',
      reason,
      checks,
      blocked_at: new Date().toISOString(),
    })]);
    _log('sz5_activation_blocked', { reason });
  } catch (err) {
    _log('emit_error', { type: 'sz5_blocked', error: err?.message });
  }
}

module.exports = {
  emitShadowScan,
  emitPilotPurge,
  emitEnforcePurge,
  emitEligibilityResolved,
  emitSz5ActivationPhase1,
  emitSz5ActivationPhase2,
  emitSz5ActivationBlocked,
};
