'use strict';

/**
 * Matriz declarativa de chaves de menu (visible_modules) por domínio funcional.
 * Usada em testes e documentação; o Motor A continua a usar perfis + permissões.
 *
 * Regra: um módulo só pode aparecer se o domínio do utilizador o incluir explicitamente
 * OU se for baseline (dashboard) / perfil + RBAC em dashboardAccessService.
 */

const BASELINE_MENU_KEYS = Object.freeze(['dashboard']);

const FINANCIAL_MENU_KEYS = Object.freeze(
  new Set(['dashboard', 'operational', 'biblioteca', 'ai', 'settings', 'audit', 'anomaly_detection'])
);

const MAINTENANCE_MENU_KEYS = Object.freeze(
  new Set(['dashboard', 'operational', 'proaction', 'biblioteca', 'ai', 'manuia', 'anomaly_detection', 'audit', 'settings'])
);

const OPERATIONAL_MENU_KEYS = Object.freeze(
  new Set(['dashboard', 'operational', 'proaction', 'biblioteca', 'ai', 'chat', 'settings', 'anomaly_detection'])
);

const RH_MENU_KEYS = Object.freeze(
  new Set(['dashboard', 'operational', 'biblioteca', 'ai', 'hr_intelligence', 'settings'])
);

const EXECUTIVE_CROSS_MENU_KEYS = Object.freeze(
  new Set(['dashboard', 'operational', 'proaction', 'chat', 'biblioteca', 'ai', 'audit', 'settings'])
);

const ADMINISTRATIVE_MENU_KEYS = Object.freeze(
  new Set(['dashboard', 'proaction', 'biblioteca', 'ai', 'chat', 'admin', 'audit', 'settings'])
);

function _normArea(user) {
  const raw = (user?.functional_area || user?.area || user?.department || '').toString().toLowerCase();
  if (/finance|financeiro/.test(raw)) return 'finance';
  if (/maint|manuten|mecan|eletro/.test(raw)) return 'maintenance';
  if (/rh|hr|recursos humanos|pessoas/.test(raw)) return 'hr';
  if (/industrial|produ[cç]ao|operac/.test(raw)) return 'operations';
  return null;
}

/**
 * Conjunto de referência para testes de segregação (não substitui getAllowedModules).
 */
function getExpectedDomainMenuKeySet(user) {
  if (!user) return new Set(BASELINE_MENU_KEYS);
  const role = String(user.role || '').toLowerCase();
  if (role === 'admin' || role === 'internal_admin' || user.is_tenant_admin === true) {
    return new Set([...ADMINISTRATIVE_MENU_KEYS, ...OPERATIONAL_MENU_KEYS, 'manuia', 'hr_intelligence']);
  }
  const area = _normArea(user);
  const base = new Set(BASELINE_MENU_KEYS);
  if (area === 'finance') {
    for (const k of FINANCIAL_MENU_KEYS) base.add(k);
    return base;
  }
  if (area === 'maintenance') {
    for (const k of MAINTENANCE_MENU_KEYS) base.add(k);
    return base;
  }
  if (area === 'hr') {
    for (const k of RH_MENU_KEYS) base.add(k);
    return base;
  }
  if (['ceo'].includes(role)) {
    for (const k of EXECUTIVE_CROSS_MENU_KEYS) base.add(k);
    for (const k of ['hr_intelligence', 'anomaly_detection']) base.add(k);
    return base;
  }
  for (const k of OPERATIONAL_MENU_KEYS) base.add(k);
  return base;
}

module.exports = {
  BASELINE_MENU_KEYS,
  FINANCIAL_MENU_KEYS,
  MAINTENANCE_MENU_KEYS,
  OPERATIONAL_MENU_KEYS,
  RH_MENU_KEYS,
  EXECUTIVE_CROSS_MENU_KEYS,
  ADMINISTRATIVE_MENU_KEYS,
  getExpectedDomainMenuKeySet
};
