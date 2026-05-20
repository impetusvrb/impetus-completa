'use strict';

const { execSync } = require('child_process');
const flags = require('./config/productionDeploymentFeatureFlags');
const { logProductionDeployment } = require('./productionDeploymentLogger');
const { recordHealthCheck } = require('./productionDeploymentTelemetry');

function _safeRequire(mod) {
  try {
    return require(mod);
  } catch {
    return null;
  }
}

function checkPm2Readiness() {
  try {
    const out = execSync('pm2 jlist 2>/dev/null || pm2 list --no-color', {
      encoding: 'utf8',
      timeout: 8000,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    const online = /online|ready/i.test(out);
    return { ready: online, snippet: out.slice(0, 120), auto_checked: true };
  } catch (e) {
    return { ready: false, error: e.message, manual_verification_required: true };
  }
}

function checkHttpRuntimeHealth(port = 4000) {
  recordHealthCheck();
  try {
    const out = execSync(
      `curl -sf http://127.0.0.1:${port}/api/health 2>/dev/null || curl -sf http://127.0.0.1:${port}/health`,
      { encoding: 'utf8', timeout: 10000, stdio: ['pipe', 'pipe', 'pipe'] }
    );
    return { ok: true, snippet: out.slice(0, 200) };
  } catch (e) {
    if (flags.isDeploymentObservabilityEnabled()) {
      logProductionDeployment('RUNTIME_HEALTH_DEGRADED', { port, error: e.message, shadow_only: true });
    }
    return { ok: false, error: e.message };
  }
}

function validateRuntimeDeployment(ctx = {}) {
  const calibration = _safeRequire('../runtimeCalibration/runtimeCalibrationFacade');
  const activation = _safeRequire('../controlledActivation/productionActivationOrchestrator');

  let governance_health = { ok: true, score: 0.85 };
  let runtime_consistency = { ok: true, score: 0.88 };
  let runtime_stability = { ok: true, score: 0.87 };
  let enrichment_integrity = { ok: true, score: 0.86 };

  if (ctx.runtime_calibration) {
    const stable = ctx.runtime_calibration.tenant_stabilization?.stable !== false;
    runtime_stability = {
      ok: stable,
      score: ctx.runtime_calibration.calibration_score ?? 0.75
    };
  } else if (calibration?.isRuntimeCalibrationLayerActive?.()) {
    const status = calibration.getRuntimeCalibrationStatus(ctx);
    const tel = status.telemetry || {};
    runtime_stability = {
      ok: (tel.tenant_stability ?? 0.8) >= 0.65,
      score: tel.tenant_stability ?? 0.8
    };
  }

  if (activation?.assessEnterpriseReadiness) {
    const readiness = activation.assessEnterpriseReadiness(ctx.user || {}, { force: ctx.force });
    governance_health = {
      ok: readiness.readiness_ok !== false,
      score: readiness.readiness_score ?? 0.8
    };
  }

  if (ctx.runtime_enrichment) {
    enrichment_integrity = {
      ok: !ctx.runtime_enrichment.low_density,
      score: ctx.runtime_enrichment.consolidated_signals?.enrichment_integrity ?? 0.85
    };
  }

  if (ctx.runtime_consistency) {
    runtime_consistency = {
      ok: ctx.runtime_consistency.stable !== false,
      score: ctx.runtime_consistency.consistency_score ?? 0.88
    };
  }

  const pm2 = ctx.skip_pm2_check ? { ready: true, skipped: true } : checkPm2Readiness();
  const http = ctx.skip_http_check ? { ok: true, skipped: true } : checkHttpRuntimeHealth(ctx.port);

  const checks = [governance_health, runtime_consistency, runtime_stability, enrichment_integrity];
  const composite = Number(
    (checks.reduce((s, c) => s + (c.score ?? 0.8), 0) / checks.length).toFixed(4)
  );

  const runtime_ok = checks.every((c) => c.ok !== false) && pm2.ready !== false && http.ok !== false;

  if (!runtime_ok && flags.isDeploymentValidationEnabled()) {
    logProductionDeployment('DEPLOY_VALIDATION_REQUIRED', {
      composite,
      governance: governance_health.ok,
      pm2: pm2.ready,
      http: http.ok,
      shadow_only: !flags.isProductionDeploymentEnabled()
    });
  }

  return {
    runtime_health: { ok: http.ok, ...http },
    governance_health,
    runtime_consistency,
    runtime_stability,
    enrichment_integrity,
    pm2_readiness: pm2,
    composite_score: composite,
    validation_passed: runtime_ok || ctx.force_validation === true,
    enforcement_active: flags.isDeploymentValidationEnabled()
  };
}

module.exports = { validateRuntimeDeployment, checkPm2Readiness, checkHttpRuntimeHealth };
