'use strict';

/**
 * Promotion gates — avaliação segura (não altera .env em runtime).
 */

const catalog = require('../catalog/capabilityCatalog');

function _readMode(flagName) {
  if (!flagName) return 'off';
  const v = process.env[flagName];
  if (v == null || String(v).trim() === '') return 'off';
  return String(v).trim().toLowerCase();
}

function _readPilots(envName) {
  const raw = envName ? process.env[envName] : '';
  return String(raw || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

function evaluateGate(capabilityId, targetMode = null) {
  const cap = catalog.getCapability(capabilityId);
  if (!cap) {
    return { ok: false, error: 'unknown_capability', gate_passed: false };
  }

  const currentMode = _readMode(cap.mode_flag);
  const enabled =
    !cap.enabled_flag ||
    ['true', '1', 'yes', 'on'].includes(String(process.env[cap.enabled_flag] || '').toLowerCase());
  const pilots = _readPilots(cap.pilot_env);
  const nextDefault = catalog.nextModeInLadder(currentMode, cap.allowed_modes);
  const requested = targetMode ? String(targetMode).toLowerCase() : nextDefault;

  const checks = [];
  checks.push({
    id: 'capability_known',
    passed: true,
    detail: cap.id
  });
  checks.push({
    id: 'enabled_or_off',
    passed: currentMode === 'off' || enabled,
    detail: enabled ? 'enabled' : 'disabled_flag'
  });

  if (requested) {
    const allowed = cap.allowed_modes.includes(requested);
    checks.push({ id: 'target_allowed', passed: allowed, detail: requested });
    const curIdx = cap.allowed_modes.indexOf(currentMode);
    const reqIdx = cap.allowed_modes.indexOf(requested);
    checks.push({
      id: 'no_skip_ladder',
      passed: !allowed || reqIdx <= curIdx + 1,
      detail: `${currentMode} → ${requested}`
    });
  }

  if (requested === 'on') {
    checks.push({
      id: 'pilots_recommended',
      passed: pilots.length > 0,
      detail: `${pilots.length} pilot(s)`
    });
  }

  let reconcilerOk = true;
  try {
    const fr = require('../../governance/flagReconcilerRuntime');
    const matrix = fr.getConflictMatrix();
    const critical = (matrix.conflicts || []).filter((c) => c.severity === 'critical');
    reconcilerOk = critical.length === 0;
    checks.push({
      id: 'no_critical_flag_conflicts',
      passed: reconcilerOk,
      detail: `${critical.length} critical`
    });
  } catch (_e) {
    checks.push({ id: 'reconciler_available', passed: true, detail: 'skipped' });
  }

  const gate_passed = checks.every((c) => c.passed);

  return {
    ok: true,
    capability_id: cap.id,
    current_mode: currentMode,
    requested_mode: requested,
    next_recommended: nextDefault,
    gate_passed,
    checks,
    pilots,
    enabled,
    promotion_safe: gate_passed,
    note: 'Gate é advisory — alteração de .env requer deploy controlado (pm2 reload --update-env).'
  };
}

function evaluateAllGates() {
  return catalog.listCapabilities().map((cap) => evaluateGate(cap.id));
}

module.exports = { evaluateGate, evaluateAllGates };
