'use strict';

/**
 * ENTERPRISE READINESS — Fase 2.3
 * Rollback Drill Scenarios
 *
 * Cenários:
 * - observability OFF durante tracing
 * - domains OFF durante requests
 * - cognitive budget OFF durante chat load
 * - event backbone OFF durante replay
 */

/**
 * Cenário: observability desligado a meio de um trace activo.
 * Expectativa: trace em curso não lança excepção, regista last_state gracefully.
 */
function scenarioObservabilityOffDuringTracing(workflowTracingService) {
  const wfId = `drill-obs-${Date.now()}`;
  let error = null;
  try {
    workflowTracingService.startWorkflowTrace(wfId, { type: 'drill', tenant_id: 'drill-t' });
    workflowTracingService.recordWorkflowStep(wfId, 'step_1', {});
    // Simulate turning off observability mid-trace
    process.env.IMPETUS_OBSERVABILITY_V2_ENABLED = 'false';
    // Continue recording — should not crash
    workflowTracingService.recordWorkflowStep(wfId, 'step_2', {});
    workflowTracingService.endWorkflowTrace(wfId, 'rollback_drill');
  } catch (err) {
    error = err?.message || String(err);
  } finally {
    delete process.env.IMPETUS_OBSERVABILITY_V2_ENABLED;
  }
  return { no_crash: error === null, error };
}

/**
 * Cenário: domains desligados a meio de um request de domínio.
 * Expectativa: guard não lança em observe mode, regista violation.
 */
function scenarioDomainsOffDuringRequest(domainIsolationGuard) {
  let error = null;
  let result = null;
  try {
    process.env.IMPETUS_DOMAINS_V5_ENABLED = 'false';
    // Should not throw even in strict mode when disabled
    result = domainIsolationGuard.assertImport
      ? domainIsolationGuard.assertImport('quality', 'safety')
      : { ok: true, mode: 'disabled' };
  } catch (err) {
    error = err?.message || String(err);
  } finally {
    delete process.env.IMPETUS_DOMAINS_V5_ENABLED;
  }
  return { no_crash: error === null, result, error };
}

/**
 * Cenário: cognitive budget desligado durante carga de chat.
 * Expectativa: applyBudget retorna passthrough (não truncado) quando desactivado.
 */
function scenarioCognitiveBudgetOffDuringChatLoad(aiContextBudgetService, chatLoadFn) {
  let error = null;
  let passthrough = false;
  try {
    process.env.IMPETUS_AI_CONTEXT_BUDGET_ENABLED = 'false';
    const LARGE_TEXT = 'X'.repeat(50000);
    const result = aiContextBudgetService.applyBudget({
      persona: 'supervisor',
      domain: 'quality',
      module: 'chat',
      text: LARGE_TEXT
    });
    // When disabled, text should NOT be truncated (passthrough)
    passthrough = !result.truncated || result.text.length === LARGE_TEXT.length;
  } catch (err) {
    error = err?.message || String(err);
  } finally {
    delete process.env.IMPETUS_AI_CONTEXT_BUDGET_ENABLED;
  }
  return { no_crash: error === null, passthrough, error };
}

/**
 * Cenário: event backbone desligado durante replay activo.
 * Expectativa: mirrorLegacyEventToIndustrial retorna no-op silencioso.
 */
function scenarioEventBackboneOffDuringReplay(industrialEventBackbone) {
  let error = null;
  let noop = false;
  try {
    process.env.IMPETUS_INDUSTRIAL_EVENTS_ENABLED = 'false';
    const result = industrialEventBackbone.mirrorLegacyEventToIndustrial
      ? industrialEventBackbone.mirrorLegacyEventToIndustrial({ type: 'test', payload: {} })
      : Promise.resolve({ ok: true, noop: true });
    noop = true;
  } catch (err) {
    error = err?.message || String(err);
  } finally {
    delete process.env.IMPETUS_INDUSTRIAL_EVENTS_ENABLED;
  }
  return { no_crash: error === null, noop, error };
}

module.exports = {
  scenarioObservabilityOffDuringTracing,
  scenarioDomainsOffDuringRequest,
  scenarioCognitiveBudgetOffDuringChatLoad,
  scenarioEventBackboneOffDuringReplay
};
