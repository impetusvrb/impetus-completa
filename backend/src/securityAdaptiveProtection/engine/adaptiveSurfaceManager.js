'use strict';

/**
 * SEC-11 — Adaptive Surface Manager.
 * Gera planos — nunca aplica alterações.
 */

function buildSurfacePlan(profile, incidents, sec10Recommendations) {
  const actions = [];
  const p = profile?.id || 'NORMAL';

  if (['DEFENSE', 'PROTECTED', 'LOCKDOWN'].includes(p)) {
    actions.push({
      action: 'hide_admin_endpoints',
      target: '/api/admin/*',
      rationale: 'Reduzir exposição administrativa durante incidente',
      auto_execute: false
    });
    actions.push({
      action: 'restrict_public_documentation',
      target: '/api/docs/*',
      rationale: 'Ocultar documentação pública',
      auto_execute: false
    });
  }

  if (['PROTECTED', 'LOCKDOWN'].includes(p)) {
    actions.push({
      action: 'limit_uploads',
      target: '/api/uploads/*',
      rationale: 'Isolar uploads durante ameaça alta',
      auto_execute: false
    });
    actions.push({
      action: 'reduce_api_exposure',
      target: 'non_critical_apis',
      rationale: 'Reduzir superfície API',
      auto_execute: false
    });
  }

  if (p === 'LOCKDOWN') {
    actions.push({
      action: 'restrict_admin_features',
      target: 'admin_portal',
      rationale: 'Funcionalidades admin mínimas',
      auto_execute: false
    });
    actions.push({
      action: 'limit_heavy_queries',
      target: 'reporting_apis',
      rationale: 'Limitar consultas pesadas',
      auto_execute: false
    });
  }

  for (const rec of sec10Recommendations || []) {
    for (const a of rec.recommended_actions || []) {
      if (a.action && !actions.some((x) => x.action === a.action)) {
        actions.push({ ...a, source: 'SEC-10', auto_execute: false });
      }
    }
  }

  const highVolume = (incidents || []).some((i) => (i.metrics?.requestCount || 0) > 5000);
  if (highVolume) {
    actions.push({
      action: 'limit_heavy_queries',
      target: 'all_heavy_endpoints',
      rationale: 'Volume elevado detectado — plano consultivo',
      auto_execute: false
    });
  }

  return {
    schema_version: 'surface_plan_v1',
    profile: p,
    actions,
    read_only: true,
    auto_execute: false
  };
}

module.exports = { buildSurfacePlan };
