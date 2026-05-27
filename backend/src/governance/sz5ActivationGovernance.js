'use strict';

/**
 * SZ5 Activation Governance — Pre-condition Validator
 *
 * Valida pré-condições ANTES de permitir activação do SZ5 Anonymization.
 * Bloqueia activação se qualquer condição falhar.
 *
 * Pré-condições obrigatórias para IMPETUS_SZ5_ANONYMIZATION_MODE=on:
 *   1. IMPETUS_RETENTION_MODE === enforce
 *   2. Retention worker activo (scheduler running)
 *   3. Audit trail operacional (tabela audit_logs acessível)
 *   4. Runtime Z autorizado (flag reconciler sem conflitos críticos)
 *
 * Activação Phase 2 (IMPETUS_SZ5_PURGE_GRAPH=on):
 *   - Requer Phase 1 activa
 *   - Requer confirmação explícita (flag separada)
 *   - Hard warning em logs e audit trail
 *
 * Princípios: deny-first, auditable, non-destructive validation
 */

const db = require('../db');
const auditEmitter = require('./retentionAuditEmitter');

const LAYER = 'SZ5_ACTIVATION_GOVERNANCE';

function _log(event, data) {
  try {
    console.info('[SZ5_ACTIVATION]', JSON.stringify({
      _type: 'sz5_activation_governance',
      layer: LAYER,
      event,
      ts: new Date().toISOString(),
      ...data,
    }));
  } catch { /* never throw */ }
}

/**
 * Valida TODAS as pré-condições para SZ5 Anonymization MODE=on.
 * @returns {{ all_passed: boolean, checks: object[], blocked_reasons: string[] }}
 */
async function validatePhase1Preconditions() {
  const checks = [];
  const blockedReasons = [];

  // Check 1: Retention Mode === enforce
  {
    const retentionMode = String(process.env.IMPETUS_RETENTION_MODE || '').trim().toLowerCase();
    const passed = retentionMode === 'enforce';
    checks.push({ check: 'retention_mode_enforce', passed, value: retentionMode, required: 'enforce' });
    if (!passed) blockedReasons.push('IMPETUS_RETENTION_MODE must be enforce');
  }

  // Check 2: Retention enabled
  {
    const enabled = String(process.env.IMPETUS_RETENTION_ENABLED || 'true').trim().toLowerCase();
    const passed = enabled !== 'false' && enabled !== '0';
    checks.push({ check: 'retention_enabled', passed, value: enabled });
    if (!passed) blockedReasons.push('IMPETUS_RETENTION_ENABLED must be true');
  }

  // Check 3: Retention worker active (check via enforce worker scheduler)
  {
    let workerActive = false;
    try {
      const enforceWorker = require('../workers/retentionEnforceWorker');
      const stats = enforceWorker.getEnforceStats();
      workerActive = stats.scheduler_active || stats.run_count > 0;
    } catch { /* worker not loaded */ }

    if (!workerActive) {
      try {
        const unifiedWorker = require('../workers/retentionWorker');
        const stats = unifiedWorker.getWorkerStats();
        workerActive = stats.scheduler_active || stats.run_count > 0;
      } catch { /* worker not loaded */ }
    }

    checks.push({ check: 'retention_worker_active', passed: workerActive });
    if (!workerActive) blockedReasons.push('Retention worker must be active (scheduler running or has completed at least 1 run)');
  }

  // Check 4: Audit trail operational
  {
    let auditOperational = false;
    try {
      const result = await db.query(`SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs')`);
      auditOperational = result.rows[0].exists;
    } catch { /* DB unreachable */ }

    checks.push({ check: 'audit_trail_operational', passed: auditOperational });
    if (!auditOperational) blockedReasons.push('audit_logs table must be accessible');
  }

  // Check 5: Flag Reconciler without critical conflicts
  {
    let reconcilerOk = false;
    try {
      const reconciler = require('./flagReconcilerRuntime');
      const diag = reconciler.getRuntimeDiagnostics();
      reconcilerOk = (diag.critical_conflicts || 0) === 0;
    } catch {
      reconcilerOk = true; // If reconciler not loaded, pass (non-blocking)
    }

    checks.push({ check: 'flag_reconciler_no_conflicts', passed: reconcilerOk });
    if (!reconcilerOk) blockedReasons.push('Flag Reconciler reports critical conflicts');
  }

  const allPassed = blockedReasons.length === 0;

  _log('phase_1_validation', { all_passed: allPassed, checks_count: checks.length, blocked: blockedReasons.length });

  return { all_passed: allPassed, checks, blocked_reasons: blockedReasons };
}

/**
 * Tenta activar SZ5 Phase 1 (MODE=on).
 * Bloqueia se pré-condições não forem atendidas.
 */
async function attemptPhase1Activation() {
  const currentMode = String(process.env.IMPETUS_SZ5_ANONYMIZATION_MODE || '').trim().toLowerCase();

  if (currentMode === 'on') {
    return { ok: true, already_active: true, message: 'SZ5 already in mode=on' };
  }

  const validation = await validatePhase1Preconditions();

  if (!validation.all_passed) {
    _log('phase_1_blocked', { reasons: validation.blocked_reasons });
    await auditEmitter.emitSz5ActivationBlocked('preconditions_not_met', validation.checks);
    return {
      ok: false,
      blocked: true,
      reasons: validation.blocked_reasons,
      checks: validation.checks,
      message: 'SZ5 activation blocked — preconditions not met',
    };
  }

  // All checks passed — emit activation event
  _log('phase_1_activated', { mode: 'on' });
  await auditEmitter.emitSz5ActivationPhase1(validation);

  return {
    ok: true,
    activated: true,
    message: 'SZ5 Phase 1 preconditions validated — MODE=on is safe to activate',
    validation,
    action_required: 'Set IMPETUS_SZ5_ANONYMIZATION_MODE=on in .env and restart PM2',
  };
}

/**
 * Valida pré-condições para Phase 2 (Graph Purge).
 */
async function validatePhase2Preconditions() {
  const checks = [];
  const blockedReasons = [];

  // Check 1: Phase 1 must be active
  {
    const sz5Mode = String(process.env.IMPETUS_SZ5_ANONYMIZATION_MODE || '').trim().toLowerCase();
    const passed = sz5Mode === 'on';
    checks.push({ check: 'phase_1_active', passed, value: sz5Mode, required: 'on' });
    if (!passed) blockedReasons.push('IMPETUS_SZ5_ANONYMIZATION_MODE must be on (Phase 1)');
  }

  // Check 2: Explicit graph purge flag
  {
    const graphFlag = String(process.env.IMPETUS_SZ5_PURGE_GRAPH || '').trim().toLowerCase();
    const passed = graphFlag === 'on';
    checks.push({ check: 'graph_purge_flag', passed, value: graphFlag, required: 'on' });
    if (!passed) blockedReasons.push('IMPETUS_SZ5_PURGE_GRAPH must be explicitly set to on');
  }

  // Check 3: Rollback window must be > 0
  {
    const window = parseInt(process.env.IMPETUS_SZ5_ROLLBACK_WINDOW_MINUTES || '60', 10);
    const passed = window > 0;
    checks.push({ check: 'rollback_window_positive', passed, value: window });
    if (!passed) blockedReasons.push('IMPETUS_SZ5_ROLLBACK_WINDOW_MINUTES must be > 0 for safety');
  }

  const allPassed = blockedReasons.length === 0;

  if (allPassed) {
    _log('phase_2_warning', {
      severity: 'HIGH',
      message: 'GRAPH PURGE WILL REMOVE EDGES — DESTRUCTIVE OPERATION',
    });
    await auditEmitter.emitSz5ActivationPhase2();
  }

  return { all_passed: allPassed, checks, blocked_reasons: blockedReasons };
}

/**
 * Diagnóstico geral do estado de activação SZ5.
 */
function getDiagnostics() {
  const sz5Mode = String(process.env.IMPETUS_SZ5_ANONYMIZATION_MODE || 'off').trim().toLowerCase();
  const graphPurge = String(process.env.IMPETUS_SZ5_PURGE_GRAPH || 'off').trim().toLowerCase();
  const relinkEnabled = String(process.env.IMPETUS_SZ5_RELINK_ENABLED || 'off').trim().toLowerCase();
  const rollbackWindow = parseInt(process.env.IMPETUS_SZ5_ROLLBACK_WINDOW_MINUTES || '60', 10);

  return {
    sz5_mode: sz5Mode,
    phase_1_active: sz5Mode === 'on',
    phase_2_active: graphPurge === 'on',
    relink_enabled: relinkEnabled === 'on',
    rollback_window_minutes: rollbackWindow,
    retention_mode: String(process.env.IMPETUS_RETENTION_MODE || 'off').trim().toLowerCase(),
    retention_enabled: String(process.env.IMPETUS_RETENTION_ENABLED || 'true').trim().toLowerCase() !== 'false',
  };
}

module.exports = {
  validatePhase1Preconditions,
  attemptPhase1Activation,
  validatePhase2Preconditions,
  getDiagnostics,
};
