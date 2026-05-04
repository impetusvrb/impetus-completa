'use strict';

/**
 * Watchdog interno — avalia a saúde da arquitectura de IA a cada 30s (lógica directa, sem HTTP).
 * Auto-degradação e auto-recuperação com base em ciclos consecutivos OK.
 */

const { getArchitectureHealth, isStrictMode } = require('./architectureHealthService');
const systemRuntimeState = require('./systemRuntimeState');

const DEFAULT_INTERVAL_MS = 30000;
const OK_CYCLES_FOR_RECOVERY = 2;

let _intervalId = null;
let _consecutiveOk = 0;

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

/**
 * Um ciclo de verificação (exportado para testes).
 * @returns {{ ok: boolean, health: object }}
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

  if (pipelineOk) {
    if (systemRuntimeState.isDegraded()) {
      _consecutiveOk += 1;
      if (_consecutiveOk >= OK_CYCLES_FOR_RECOVERY) {
        systemRuntimeState.setHealthy();
        _consecutiveOk = 0;
        console.info('[ARCHITECTURE_WATCHDOG] Recuperação automática: pipeline OK em ciclos consecutivos.');
      }
    } else {
      _consecutiveOk = 0;
    }
    return { ok: true, health };
  }

  _consecutiveOk = 0;
  const detail = {
    pipeline_integrity: health.pipeline_integrity,
    strict_mode: health.strict_mode,
    missing_stages: health.missing_stages
  };
  console.error(
    '[ARCHITECTURE_WATCHDOG_CRITICAL]',
    JSON.stringify({ ...detail, checked_at: health.checked_at })
  );
  systemRuntimeState.setDegraded('WATCHDOG_ARCHITECTURE_FAIL', JSON.stringify(detail).slice(0, 800));
  return { ok: false, health };
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
        systemRuntimeState.setDegraded('WATCHDOG_EXCEPTION', e && e.message ? String(e.message) : 'tick_error');
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
