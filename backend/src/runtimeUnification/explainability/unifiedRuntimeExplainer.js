'use strict';

/**
 * Explainability pack para unificação SZ5 (LGPD / auditoria).
 */

function buildExplainability({
  channel,
  mode,
  source,
  sz5Meta = {},
  shadowCompare = null,
  pilot = false,
  governance = {}
}) {
  return Object.freeze({
    channel,
    mode,
    source,
    pilot_tenant: pilot,
    sz5: {
      active: sz5Meta.sz5_active === true,
      retrieval_hit: sz5Meta.retrieval_hit === true,
      fact_count: sz5Meta.fact_count || 0,
      elapsed_ms: sz5Meta.elapsed_ms || null
    },
    shadow: shadowCompare
      ? {
          divergent: shadowCompare.divergent === true,
          reason: shadowCompare.reason || null
        }
      : null,
    governance: {
      tenant_scoped: governance.tenant_scoped !== false,
      scope_denied: governance.scope_denied === true,
      denial_reason: governance.denial_reason || null
    },
    invariants: Object.freeze({
      additive_only: true,
      motor_a_intact: true,
      engine_v2_intact: true,
      legacy_fallback: true
    })
  });
}

module.exports = { buildExplainability };
