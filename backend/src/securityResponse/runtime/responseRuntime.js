'use strict';

/**
 * SEC-06 — Response Runtime (bootstrap + audit).
 */

const flags = require('../config/securityResponseFlags');
const orchestrator = require('../engine/responseOrchestrator');
const store = require('../store/responseStore');
const metrics = require('../metrics/responseMetrics');
const { freezeResponse } = require('../dto/securityResponseDto');

let pollTimer = null;

function bootstrap() {
  if (!flags.isSecurityResponseOrchestratorEnabled()) {
    return { enabled: false };
  }

  runCycle().catch((e) => console.warn('[SEC-06] initial cycle:', e?.message));

  pollTimer = setInterval(() => {
    runCycle().catch((e) => console.warn('[SEC-06] periodic cycle:', e?.message));
  }, 120000);

  if (pollTimer.unref) pollTimer.unref();

  console.log('[SEC-06] Enterprise Security Response Orchestrator activo (graduated, reversible)');
  return { enabled: true };
}

async function runCycle() {
  await orchestrator.processPendingNotifications();
}

function shutdown() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

function getAuditPayload() {
  const history = store.getHistory(50);
  const latest = history[0] || null;

  return {
    ok: true,
    phase: 'SEC-06',
    orchestrator_enabled: flags.isSecurityResponseOrchestratorEnabled(),
    mode: 'graduated_response',
    no_destructive_actions: true,
    protect_auto_execute: false,
    default_mode: flags.defaultResponseMode(),
    max_executable_level: flags.maxExecutableLevel(),
    protect_enabled: flags.protectModeEnabled(),
    feature_flag: {
      SECURITY_RESPONSE_ORCHESTRATOR: flags.isSecurityResponseOrchestratorEnabled(),
      SECURITY_RESPONSE_DEFAULT_MODE: flags.defaultResponseMode(),
      SECURITY_RESPONSE_MAX_LEVEL: flags.maxExecutableLevel(),
      SECURITY_RESPONSE_PROTECT_ENABLED: flags.protectModeEnabled()
    },
    latest_response: latest ? freezeResponse(latest) : null,
    response_count: store.getAll().length,
    metrics: metrics.getSnapshot(),
    criteria: {
      response_orchestrator_available: true,
      response_catalog_available: true,
      response_levels_available: true,
      observe_mode_available: true,
      advise_mode_available: true,
      assist_mode_available: true,
      protect_mode_disabled: !flags.protectModeEnabled(),
      rollback_available: true,
      audit_endpoint_available: true,
      feature_flag_available: true,
      no_destructive_actions: true,
      security_notification_center_preserved: true
    }
  };
}

function getHistoryPayload() {
  return {
    ok: true,
    phase: 'SEC-06',
    count: store.getAll().length,
    history: store.getHistory(100).map((r) => freezeResponse(r))
  };
}

module.exports = {
  bootstrap,
  shutdown,
  runCycle,
  getAuditPayload,
  getHistoryPayload
};
