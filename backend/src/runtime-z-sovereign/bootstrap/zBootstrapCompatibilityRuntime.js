'use strict';

/**
 * zBootstrapCompatibilityRuntime — garante que o payload soberano permanece
 * estruturalmente compatível com o `legacyResponse` actual de
 * `/api/dashboard/me`. Acrescenta apenas (additive-only) chaves que o
 * frontend já conhece, sem nunca remover nada do payload Motor A real
 * quando este existir em paralelo.
 */
const LEGACY_KEYS = [
  'profile_code',
  'profile_label',
  'profile_config',
  'visible_modules',
  'contextual_capabilities',
  'user_context',
  'sections',
  'kpis',
  'functional_area',
  'functional_axis',
  'functional_area_label',
  'functional_area_source',
  'contextual_modules_hint',
  'personalization',
  'ia_data_depth',
  'effective_permissions',
  'is_tenant_admin',
  'tenant_admin_type',
  'tenant_admin_can_manage',
  'module_access_governance',
  'module_access_context'
];

function ensureCompatibility(sovereignPayload = {}, legacyPayload = null) {
  if (!legacyPayload) {
    return { payload: sovereignPayload, compatible: true, missing_keys: [], extra_keys: [] };
  }

  const missing = LEGACY_KEYS.filter(
    (k) => legacyPayload[k] !== undefined && sovereignPayload[k] === undefined
  );

  const restored = { ...sovereignPayload };
  for (const k of missing) {
    restored[k] = legacyPayload[k];
  }

  const extra = Object.keys(sovereignPayload).filter(
    (k) => legacyPayload[k] === undefined && !['sovereign_payload', 'sovereign_runtime'].includes(k)
  );

  return {
    payload: restored,
    compatible: missing.length === 0,
    missing_keys: missing,
    extra_keys: extra
  };
}

module.exports = { ensureCompatibility, LEGACY_KEYS };
