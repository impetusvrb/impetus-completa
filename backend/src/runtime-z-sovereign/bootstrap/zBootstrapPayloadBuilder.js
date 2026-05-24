'use strict';

/**
 * Constrói o payload base equivalente ao `legacyResponse` produzido pela
 * rota `/api/dashboard/me`. Aceita apenas os resultados já resolvidos pelos
 * sub-runtimes soberanos do Z para garantir que NADA é importado
 * directamente do Motor A neste ponto — só os dados normalizados.
 */
function buildBootstrapPayload(parts = {}) {
  const {
    profile = null,
    modulesOut = {},
    sectionsOut = {},
    kpisOut = {},
    contextOut = {},
    userContext = null,
    user = {}
  } = parts;

  const profileCode = profile?.profile_code || user?.dashboard_profile || 'colaborador_geral';
  const profileConfig = profile?.profile_config || {};

  const personalization = contextOut?.context?.personalization || null;

  return {
    profile_code: profileCode,
    profile_label: profileConfig.label || profileCode,
    profile_config: profileConfig,
    visible_modules: modulesOut.visible_modules || [],
    allowed_modules: modulesOut.allowed_modules || [],
    effective_permissions: modulesOut.effective_permissions || {},
    ia_data_depth: modulesOut.ia_data_depth || null,
    module_access_governance: modulesOut.module_access_governance || undefined,
    module_access_context: modulesOut.module_access_context || undefined,
    sections: sectionsOut.sections || [],
    kpis: kpisOut.kpis || [],
    kpis_aggregated: kpisOut.kpis_aggregated || null,
    functional_area: profile?.functional_area || null,
    functional_axis: profile?.functional_axis || profile?.functional_area || null,
    functional_area_label: profile?.functional_area_label || null,
    functional_area_source: profile?.functional_area_source || null,
    contextual_modules_hint: profile?.contextual_modules_hint || null,
    personalization: personalization || undefined,
    contextual_capabilities: Array.isArray(user?.contextual_capabilities)
      ? user.contextual_capabilities
      : [],
    user_context: userContext || null,
    is_tenant_admin: !!user?.is_tenant_admin,
    tenant_admin_type: user?.tenant_admin_type || null,
    tenant_admin_can_manage: !!user?.tenant_admin_can_manage,
    sovereign_payload: true,
    sovereign_runtime: 'runtime_z'
  };
}

module.exports = { buildBootstrapPayload };
