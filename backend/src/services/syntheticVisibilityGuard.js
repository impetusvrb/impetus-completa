'use strict';

/**
 * FASE 36-D — Garante que eventos synthetic nunca pareçam operacionais reais na API/UI.
 * Propaga verification_state="synthetic" e metadados de visibilidade até ao frontend.
 */

const SYNTHETIC_LABEL_PT = 'SIMULAÇÃO · não é dado PLC/real';

function isSyntheticEvent(ev = {}) {
  if (!ev || typeof ev !== 'object') return false;
  if (ev.verification_state === 'synthetic') return true;
  if (ev.source_runtime === 'synthetic_operational') return true;
  if (String(ev.event_id || '').startsWith('syn_')) return true;
  return false;
}

function tagOperationalEvent(ev = {}) {
  if (!ev || typeof ev !== 'object') return ev;
  if (!isSyntheticEvent(ev)) {
    return {
      ...ev,
      verification_state: ev.verification_state || 'pending',
      synthetic: false,
      display_trust: ev.display_trust || 'operational_pending'
    };
  }
  const ctx = String(ev.operational_context || ev.message || '').trim();
  const prefixed =
    ctx && !ctx.startsWith('[SIM]') && !ctx.includes('SIMULAÇÃO')
      ? `[SIM] ${ctx}`
      : ctx || SYNTHETIC_LABEL_PT;
  return {
    ...ev,
    verification_state: 'synthetic',
    synthetic: true,
    source_runtime: ev.source_runtime || 'synthetic_operational',
    operational_context: prefixed,
    display_label: SYNTHETIC_LABEL_PT,
    display_trust: 'synthetic_only',
    must_not_present_as_plc: true,
    must_not_present_as_kpi: true
  };
}

function applyToEventsArray(events) {
  if (!Array.isArray(events)) return [];
  return events.map(tagOperationalEvent);
}

function applyToOperationalContextRuntime(runtime = {}) {
  if (!runtime || runtime.skipped) return runtime;
  const sample = applyToEventsArray(runtime.events_sample || []);
  const synthetic_count = sample.filter((e) => e.synthetic).length;
  return {
    ...runtime,
    events_sample: sample,
    synthetic_visibility_guard: {
      applied: true,
      synthetic_events_in_sample: synthetic_count,
      policy: 'synthetic_must_be_labeled'
    }
  };
}

function applyToEventDensityRuntime(density = {}) {
  if (!density || typeof density !== 'object') return density;
  return {
    ...density,
    synthetic_visibility_guard: {
      applied: true,
      synthetic_generated: density.synthetic_generated ?? 0,
      synthetic_vs_real_ratio: density.synthetic_vs_real_ratio ?? null,
      warning:
        (density.synthetic_generated || 0) > 0
          ? 'Contém eventos de simulação de densidade — não confundir com telemetria PLC.'
          : null
    }
  };
}

function applyToCognitiveConvergenceRuntime(runtime = {}) {
  if (!runtime || typeof runtime !== 'object') return runtime;
  const ratio = Number(runtime.synthetic_memory_ratio ?? 0);
  return {
    ...runtime,
    synthetic_visibility_guard: {
      applied: true,
      synthetic_memory_ratio: ratio,
      high_synthetic_ratio: ratio >= 0.5,
      user_facing_label: ratio > 0 ? SYNTHETIC_LABEL_PT : null
    }
  };
}

/**
 * Aplica guardas a blocos do GET /dashboard/me (e payloads similares).
 */
function applyToDashboardPayload(payload = {}) {
  if (!payload || typeof payload !== 'object') return payload;
  const out = { ...payload };

  if (out.operational_context_runtime) {
    out.operational_context_runtime = applyToOperationalContextRuntime(out.operational_context_runtime);
  }
  if (out.event_density_runtime) {
    out.event_density_runtime = applyToEventDensityRuntime(out.event_density_runtime);
  }
  if (out.cognitive_convergence_runtime) {
    out.cognitive_convergence_runtime = applyToCognitiveConvergenceRuntime(
      out.cognitive_convergence_runtime
    );
  }

  out.synthetic_containment = {
    phase: 'F36',
    verification_state_propagation: true,
    policy: 'synthetic_never_masquerade_as_real'
  };

  return out;
}

/**
 * Marca eventos antes de persistência em timeline (C2).
 */
function tagIncomingSyntheticEvents(events = []) {
  return applyToEventsArray(events);
}

module.exports = {
  SYNTHETIC_LABEL_PT,
  isSyntheticEvent,
  tagOperationalEvent,
  applyToEventsArray,
  applyToOperationalContextRuntime,
  applyToEventDensityRuntime,
  applyToCognitiveConvergenceRuntime,
  applyToDashboardPayload,
  tagIncomingSyntheticEvents
};
