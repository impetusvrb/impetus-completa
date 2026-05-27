'use strict';

/**
 * Flag Reconciler Runtime — Enterprise Grade
 *
 * Resolve drift PM2 vs dotenv, detecta contradições, valida estados impossíveis,
 * produz snapshot de flags efetivas e diagnostics ao boot.
 *
 * Propriedades:
 *   - Additive-only (nunca altera flags existentes)
 *   - Boot-time validation (emite warnings, não bloqueia por default)
 *   - Blocking mode via IMPETUS_FLAG_RECONCILER_STRICT=on (bloqueia em contradição crítica)
 *   - Runtime snapshot acessível via getEffectiveFlags()
 *   - Observabilidade: drift logs estruturados
 *
 * Flag: IMPETUS_FLAG_RECONCILER=off|on (default on)
 */

const CRITICAL_FLAGS = Object.freeze([
  'IMPETUS_FAILSAFE_GOVERNANCE',
  'IMPETUS_DASHBOARD_ENGINE_V2',
  'IMPETUS_UNIVERSAL_AUDIT',
  'IMPETUS_VISIBILITY_HARDENED',
  'IMPETUS_GOVERNANCE_SHADOW_MODE',
  'IMPETUS_CHAT_GOVERNANCE',
  'IMPETUS_CONTROLLED_GOVERNANCE_ACTIVATION',
  'IMPETUS_RUNTIME_STATE_ENFORCEMENT',
  'IMPETUS_DSR_EXPORT',
  'IMPETUS_DSR_ERASE',
  'IMPETUS_DSR_ERASE_STRICT',
  'IMPETUS_RETENTION_MODE',
  'IMPETUS_RETENTION_ENABLED',
  'IMPETUS_AI_ANONYMIZATION',
  'IMPETUS_SZ5_ANONYMIZATION_MODE',
  'IMPETUS_KMS_GOVERNANCE',
]);

/**
 * Regras de contradição: pares de flags que não podem coexistir em determinados estados.
 * Formato: [flagA, stateA, flagB, stateB, severity, description]
 */
const CONTRADICTION_RULES = Object.freeze([
  [
    'IMPETUS_FAILSAFE_GOVERNANCE', 'off',
    'IMPETUS_UNIVERSAL_AUDIT', 'on',
    'warning',
    'Audit universal ON sem failsafe governance — risco de audit sem proteção deny-first',
  ],
  [
    'IMPETUS_GOVERNANCE_SHADOW_MODE', 'on',
    'IMPETUS_CONTROLLED_GOVERNANCE_ACTIVATION', 'on',
    'warning',
    'Shadow mode e controlled activation ambos ON — estado ambíguo (shadow deve preceder activation)',
  ],
  [
    'IMPETUS_DASHBOARD_ENGINE_V2', 'on',
    'IMPETUS_SIDEBAR_GOVERNANCE_RUNTIME', 'off',
    'info',
    'Engine V2 ON mas sidebar governance OFF — modules podem divergir do engine',
  ],
  [
    'IMPETUS_KPI_GOVERNANCE', 'on',
    'IMPETUS_SOFT_KPI_GOVERNANCE_ROLLOUT', 'on',
    'warning',
    'KPI governance hard e soft ambos ON — rollout deve usar apenas um',
  ],
  [
    'IMPETUS_DSR_ERASE', 'on',
    'IMPETUS_DSR_ERASE_STRICT', 'on',
    'info',
    'DSR Erase strict ON — requer confirmação explícita do titular para erasure',
  ],
]);

/**
 * Dependências obrigatórias: flagA=stateA requer flagB=stateB.
 */
const DEPENDENCY_RULES = Object.freeze([
  [
    'IMPETUS_UNIVERSAL_AUDIT', 'on',
    'IMPETUS_FAILSAFE_GOVERNANCE', 'on',
    'critical',
    'Audit universal requer failsafe governance ativa',
  ],
  [
    'IMPETUS_VISIBILITY_HARDENED', 'on',
    'IMPETUS_FAILSAFE_GOVERNANCE', 'on',
    'critical',
    'Visibility hardened requer failsafe governance ativa',
  ],
  [
    'IMPETUS_GOVERNANCE_OPERATIONS', 'on',
    'IMPETUS_CONTROLLED_GOVERNANCE_ACTIVATION', 'on',
    'warning',
    'Governance operations requer controlled activation',
  ],
]);

let _bootSnapshot = null;
let _bootDiagnostics = null;
let _reconcilerEnabled = true;

function _readFlag(name) {
  const v = process.env[name];
  if (v === undefined || v === null || v === '') return { raw: undefined, effective: null, defined: false };
  const lower = String(v).trim().toLowerCase();
  return { raw: v, effective: lower, defined: true };
}

function _isTruthy(effective) {
  return ['on', '1', 'true', 'yes'].includes(effective);
}

function _isFalsy(effective) {
  return ['off', '0', 'false', 'no'].includes(effective);
}

function _normalizeState(effective) {
  if (_isTruthy(effective)) return 'on';
  if (_isFalsy(effective)) return 'off';
  return effective;
}

/**
 * Executa reconciliação completa. Chamado ao boot.
 * @returns {{ snapshot, conflicts, dependencies, diagnostics }}
 */
function reconcile() {
  const snapshot = {};
  const conflicts = [];
  const dependencyViolations = [];
  const diagnostics = { total_flags: 0, critical_flags: 0, undefined_critical: [], drift_detected: false };

  const allEnvKeys = Object.keys(process.env).filter(k => k.startsWith('IMPETUS_'));
  diagnostics.total_flags = allEnvKeys.length;

  for (const key of allEnvKeys) {
    const { raw, effective, defined } = _readFlag(key);
    snapshot[key] = {
      raw,
      effective: _normalizeState(effective),
      defined,
      critical: CRITICAL_FLAGS.includes(key),
    };
  }

  for (const flagName of CRITICAL_FLAGS) {
    if (!snapshot[flagName] || !snapshot[flagName].defined) {
      diagnostics.undefined_critical.push(flagName);
      diagnostics.critical_flags++;
    } else {
      diagnostics.critical_flags++;
    }
  }

  for (const [flagA, stateA, flagB, stateB, severity, description] of CONTRADICTION_RULES) {
    const a = snapshot[flagA];
    const b = snapshot[flagB];
    if (a?.effective === stateA && b?.effective === stateB) {
      conflicts.push({ flagA, stateA, flagB, stateB, severity, description });
      if (severity === 'critical') diagnostics.drift_detected = true;
    }
  }

  for (const [flagA, stateA, flagB, requiredState, severity, description] of DEPENDENCY_RULES) {
    const a = snapshot[flagA];
    const b = snapshot[flagB];
    if (a?.effective === stateA && b?.effective !== requiredState) {
      dependencyViolations.push({ flagA, stateA, requires: flagB, requiredState, actual: b?.effective, severity, description });
      if (severity === 'critical') diagnostics.drift_detected = true;
    }
  }

  return { snapshot, conflicts, dependencyViolations, diagnostics };
}

/**
 * Boot-time validation. Chamado uma vez ao iniciar o servidor.
 * Emite logs estruturados. Bloqueia se IMPETUS_FLAG_RECONCILER_STRICT=on e há contradições críticas.
 * @returns {boolean} true se boot é seguro
 */
function bootValidation() {
  const mode = String(process.env.IMPETUS_FLAG_RECONCILER || 'on').trim().toLowerCase();
  _reconcilerEnabled = mode === 'on' || mode === '1' || mode === 'true';

  if (!_reconcilerEnabled) {
    _log('reconciler_disabled', { reason: 'IMPETUS_FLAG_RECONCILER=off' });
    return true;
  }

  const result = reconcile();
  _bootSnapshot = result.snapshot;
  _bootDiagnostics = {
    timestamp: new Date().toISOString(),
    total_flags: result.diagnostics.total_flags,
    critical_flags: result.diagnostics.critical_flags,
    undefined_critical: result.diagnostics.undefined_critical,
    conflicts_count: result.conflicts.length,
    dependency_violations_count: result.dependencyViolations.length,
    drift_detected: result.diagnostics.drift_detected,
  };

  _log('boot_reconciliation_complete', _bootDiagnostics);

  if (result.diagnostics.undefined_critical.length > 0) {
    _log('critical_flags_undefined', {
      flags: result.diagnostics.undefined_critical,
      severity: 'warning',
    });
  }

  for (const c of result.conflicts) {
    _log('flag_contradiction_detected', { ...c });
  }

  for (const d of result.dependencyViolations) {
    _log('flag_dependency_violation', { ...d });
  }

  const strict = String(process.env.IMPETUS_FLAG_RECONCILER_STRICT || '').trim().toLowerCase();
  if ((strict === 'on' || strict === '1') && result.diagnostics.drift_detected) {
    _log('boot_blocked_critical_drift', {
      conflicts: result.conflicts.filter(c => c.severity === 'critical'),
      violations: result.dependencyViolations.filter(d => d.severity === 'critical'),
    });
    return false;
  }

  return true;
}

/**
 * Retorna snapshot das flags efetivas.
 * Usado pelo endpoint /admin/runtime/flags/effective.
 */
function getEffectiveFlags() {
  if (!_bootSnapshot) {
    const result = reconcile();
    _bootSnapshot = result.snapshot;
  }

  const effective = {};
  for (const [key, val] of Object.entries(_bootSnapshot)) {
    effective[key] = val.effective;
  }
  return effective;
}

function getBootDiagnostics() {
  return _bootDiagnostics || { error: 'boot_validation_not_executed' };
}

function getConflictMatrix() {
  const result = reconcile();
  return {
    conflicts: result.conflicts,
    dependency_violations: result.dependencyViolations,
    diagnostics: result.diagnostics,
    timestamp: new Date().toISOString(),
  };
}

function getRuntimeDiagnostics() {
  const result = reconcile();
  return {
    effective_flags: getEffectiveFlags(),
    boot_diagnostics: _bootDiagnostics,
    conflict_matrix: {
      conflicts: result.conflicts,
      dependency_violations: result.dependencyViolations,
    },
    runtime_info: {
      node_version: process.version,
      pid: process.pid,
      uptime_s: Math.round(process.uptime()),
      memory_mb: Math.round(process.memoryUsage().rss / 1024 / 1024),
      env: process.env.NODE_ENV || 'development',
    },
    timestamp: new Date().toISOString(),
  };
}

function _log(event, data) {
  try {
    const entry = { _type: 'flag_reconciler', event, ts: new Date().toISOString(), ...data };
    console.info('[FLAG_RECONCILER]', JSON.stringify(entry));
  } catch { /* never throw from logging */ }
}

module.exports = {
  reconcile,
  bootValidation,
  getEffectiveFlags,
  getBootDiagnostics,
  getConflictMatrix,
  getRuntimeDiagnostics,
  CRITICAL_FLAGS,
  CONTRADICTION_RULES,
  DEPENDENCY_RULES,
};
