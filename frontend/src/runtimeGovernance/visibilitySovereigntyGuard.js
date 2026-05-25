/**
 * visibilitySovereigntyGuard — Guard de Soberania de Visibilidade Frontend
 *
 * Garante que o frontend nunca:
 *   1. Esconda um módulo que o backend autorizou
 *   2. Renderize um módulo que o backend negou
 *   3. Tenha stale visibility após reconciliação
 *
 * Integra com o payload de /dashboard/me para validar coerência
 * entre governed_visible_modules e o que o sidebar renderiza.
 *
 * Additive-only: não altera nenhum componente existente.
 * Exporta funções de validação que podem ser consumidas
 * opcionalmente por qualquer camada.
 */

const UNIVERSAL_MODULES = new Set([
  'dashboard', 'settings', 'proaction', 'registro_inteligente',
  'cadastrar_com_ia', 'chat', 'ai', 'biblioteca'
]);

const DOMAIN_MODULES = new Set([
  'quality_intelligence', 'safety_intelligence', 'environment_intelligence',
  'logistics_intelligence', 'hr_intelligence', 'manuia',
  'financial_intelligence', 'anomaly_detection', 'audit', 'admin'
]);

/**
 * Valida se os módulos no menu correspondem ao que o backend autorizou.
 * Retorna divergências para observabilidade.
 *
 * @param {string[]} renderedModuleKeys - módulos efetivamente no sidebar
 * @param {string[]} governedModules - visible_modules do payload
 * @param {object} [dashboardMePayload] - payload completo para context
 * @returns {object} { valid, missing, unauthorized, trace }
 */
export function validateSidebarSovereignty(renderedModuleKeys, governedModules, dashboardMePayload) {
  const governed = new Set(Array.isArray(governedModules) ? governedModules : []);
  const rendered = new Set(Array.isArray(renderedModuleKeys) ? renderedModuleKeys : []);

  const missing = [];
  const unauthorized = [];

  for (const mod of governed) {
    if (UNIVERSAL_MODULES.has(mod)) continue;
    if (DOMAIN_MODULES.has(mod) && !rendered.has(mod)) {
      missing.push({
        module: mod,
        severity: 'high',
        reason: 'Backend authorized but frontend not rendering'
      });
    }
  }

  for (const mod of rendered) {
    if (UNIVERSAL_MODULES.has(mod)) continue;
    if (DOMAIN_MODULES.has(mod) && !governed.has(mod)) {
      unauthorized.push({
        module: mod,
        severity: 'critical',
        reason: 'Frontend rendering module not authorized by backend'
      });
    }
  }

  const reconciliation = dashboardMePayload?.visibility_reconciliation;

  return {
    valid: missing.length === 0 && unauthorized.length === 0,
    missing,
    unauthorized,
    governed_count: governed.size,
    rendered_count: rendered.size,
    reconciliation_applied: reconciliation?.reconciliation_applied ?? false,
    reconciliation_added: reconciliation?.added_modules ?? [],
    timestamp: new Date().toISOString()
  };
}

/**
 * Aplica reconciliação additive: se o backend adicionou módulos via
 * reconciliação, garante que o frontend os inclui no set de visibilidade.
 *
 * @param {string[]} currentModules - módulos visíveis actuais
 * @param {object} dashboardMePayload - payload de /dashboard/me
 * @returns {string[]} módulos com reconciliação aplicada
 */
export function applyReconciliationToVisibleModules(currentModules, dashboardMePayload) {
  const mods = Array.isArray(currentModules) ? [...currentModules] : [];
  const reconciliation = dashboardMePayload?.visibility_reconciliation;

  if (!reconciliation?.reconciliation_applied) return mods;

  const added = reconciliation.added_modules;
  if (!Array.isArray(added) || added.length === 0) return mods;

  const set = new Set(mods);
  for (const mod of added) {
    if (!set.has(mod)) {
      set.add(mod);
      mods.push(mod);
    }
  }

  return mods;
}

/**
 * Retorna o identity observability block para diagnóstico no devtools.
 */
export function getIdentityObservability(dashboardMePayload) {
  return dashboardMePayload?.identity_observability || null;
}

/**
 * Verifica se existe mismatch entre normalização e governança.
 */
export function hasIdentityMismatch(dashboardMePayload) {
  const obs = dashboardMePayload?.identity_observability;
  if (!obs) return false;
  const reconc = obs.reconciliation;
  return reconc?.mismatches_high > 0;
}
