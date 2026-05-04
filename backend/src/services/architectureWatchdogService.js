'use strict';

/**
 * Watchdog — pipeline OK/falha + instabilidade leve com score de estabilidade (anti-flapping).
 */

const { getArchitectureHealth, isStrictMode } = require('./architectureHealthService');
const srs = require('./systemRuntimeState');
const orchestratorExecutionGate = require('../ai/orchestratorExecutionGate');

const DEFAULT_INTERVAL_MS = 30000;
const OK_CYCLES_FOR_RECOVERY = 2;

let _intervalId = null;
/** Ciclos estáveis consecutivos (sem mild) para recuperação. */
let _consecutiveStableOk = 0;

function isWatchdogEnabled() {
  if (/^(0|false|no|off)$/i.test(String(process.env.IMPETUS_ARCHITECTURE_WATCHDOG_ENABLED || '').trim())) {
    return false;
  }
  return true;
}

function getIntervalMs() {
  const n = parseInt(process.env.IMPETUS_ARCHITECTURE_WATCHDOG_MS || '', 10);
  if (Number.isFinite(n) && n >= 5000 && n <= 300000) return n;
  return DEFAULT_INTERVAL_MS;
}

function _stabilityLimitedEnterThreshold() {
  return Math.max(
    15,
    Math.min(95, parseInt(process.env.IMPETUS_STABILITY_LIMITED_ENTER_THRESHOLD || '', 10) || 48)
  );
}

function _stabilityRecoveryMinScore() {
  return Math.max(
    35,
    Math.min(99, parseInt(process.env.IMPETUS_STABILITY_RECOVERY_MIN_SCORE || '', 10) || 72)
  );
}

function _mildInstabilitySignals(health) {
  const win = Math.max(30000, parseInt(process.env.IMPETUS_WATCHDOG_MILD_WINDOW_MS || '', 10) || 120000);
  const violMin = Math.max(1, parseInt(process.env.IMPETUS_WATCHDOG_MILD_VIOLATIONS_MIN || '', 10) || 3);
  const failMin = Math.max(1, parseInt(process.env.IMPETUS_WATCHDOG_MILD_FAILURES_MIN || '', 10) || 2);
  const v = orchestratorExecutionGate.countViolationsSince(win);
  const f = orchestratorExecutionGate.countFailuresSince(win);
  return {
    mild: v >= violMin || f >= failMin,
    violations_window: v,
    failures_window: f,
    window_ms: win
  };
}

/**
 * @returns {{ ok: boolean, health?: object, mild?: boolean, skipped?: boolean }}
 */
function runWatchdogTick() {
  if (!isWatchdogEnabled()) {
    return { ok: true, skipped: true };
  }
  if (!isStrictMode()) {
    return { ok: true, skipped: true, reason: 'strict_pipeline_off' };
  }

  const health = getArchitectureHealth({ exposeDetails: true });
  const pipelineOk =
    health.pipeline_integrity === 'OK' &&
    health.strict_mode === true &&
    Array.isArray(health.missing_stages) &&
    health.missing_stages.length === 0;

  try {
    const rf = require('./resilienceFeedbackLoop');
    if (pipelineOk && rf.shouldAnticipateLimitedPressure() && !srs.isDegraded()) {
      srs.applyStabilityMildStress();
    }
  } catch (_e) {
    /* ignore */
  }

  if (!pipelineOk) {
    _consecutiveStableOk = 0;
    srs.applyStabilityHardFail();
    const detail = {
      pipeline_integrity: health.pipeline_integrity,
      strict_mode: health.strict_mode,
      missing_stages: health.missing_stages
    };
    console.error(
      '[ARCHITECTURE_WATCHDOG_CRITICAL]',
      JSON.stringify({ ...detail, checked_at: health.checked_at })
    );
    srs.setDegraded('WATCHDOG_ARCHITECTURE_FAIL', JSON.stringify(detail).slice(0, 800));
    return { ok: false, health };
  }

  const { mild, violations_window, failures_window, window_ms } = _mildInstabilitySignals(health);

  if (mild && !srs.isDegraded()) {
    srs.applyStabilityMildStress();
    _consecutiveStableOk = 0;
    const thrEnter = _stabilityLimitedEnterThreshold();
    if (srs.isHealthy() && srs.getStabilityScore() < thrEnter) {
      srs.setLimited(
        'WATCHDOG_MILD_INSTABILITY',
        JSON.stringify({ violations_window, failures_window, window_ms }).slice(0, 400),
        { force: true }
      );
      console.warn(
        '[ARCHITECTURE_WATCHDOG_MILD]',
        JSON.stringify({
          violations_window,
          failures_window,
          stability_score: srs.getStabilityScore(),
          checked_at: health.checked_at
        })
      );
    }
    return { ok: true, health, mild: true };
  }

  srs.applyStabilityStableTick();

  if (srs.isDegraded() || srs.isLimited()) {
    _consecutiveStableOk += 1;
    const minScore = _stabilityRecoveryMinScore();
    if (
      _consecutiveStableOk >= OK_CYCLES_FOR_RECOVERY &&
      srs.getStabilityScore() >= minScore
    ) {
      if (srs.trySetHealthyFromWatchdog()) {
        console.info('[ARCHITECTURE_WATCHDOG] Recuperação: estável + score + histerese temporal.');
        _consecutiveStableOk = 0;
      }
    }
  } else {
    _consecutiveStableOk = 0;
  }

  return { ok: true, health };
}

function startArchitectureWatchdog() {
  if (_intervalId) return;
  if (!isWatchdogEnabled()) {
    console.info('[ARCHITECTURE_WATCHDOG] desativado (IMPETUS_ARCHITECTURE_WATCHDOG_ENABLED=false).');
    return;
  }
  const ms = getIntervalMs();
  _intervalId = setInterval(() => {
    try {
      runWatchdogTick();
    } catch (e) {
      console.error('[ARCHITECTURE_WATCHDOG]', e && e.message ? e.message : e);
      try {
        srs.setDegraded('WATCHDOG_EXCEPTION', e && e.message ? String(e.message) : 'tick_error');
      } catch (_e) {
        /* ignore */
      }
    }
  }, ms);
  _intervalId.unref?.();
  console.info(`[ARCHITECTURE_WATCHDOG] activo (intervalo ${ms}ms)`);
}

function stopArchitectureWatchdog() {
  if (_intervalId) {
    clearInterval(_intervalId);
    _intervalId = null;
  }
}

module.exports = {
  startArchitectureWatchdog,
  stopArchitectureWatchdog,
  runWatchdogTick,
  getIntervalMs,
  isWatchdogEnabled
};
