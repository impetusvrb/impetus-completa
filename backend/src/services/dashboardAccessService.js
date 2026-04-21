/**
 * CONTROLE DE ACESSO DO DASHBOARD
 * Filtra módulos, cards, KPIs e widgets por permissões do usuário.
 * A. Frontend: esconder menus/cards/widgets
 * B. Backend: proteger endpoints
 * C. IA: adaptar profundidade e bloquear dados sensíveis
 */
const { getProfile } = require('../config/dashboardProfiles');
const dashboardProfileResolver = require('./dashboardProfileResolver');

/** Módulos que exigem permissões específicas */
const MODULE_PERMISSIONS = {
  dashboard: ['dashboard.view', 'VIEW_DASHBOARD'],
  operational: ['operational.view', 'VIEW_OPERATIONAL'],
  proaction: ['proaction.view', 'VIEW_PROPOSALS'],
  chat: ['chat.view', 'ACCESS_AI_ANALYTICS'],
  biblioteca: ['files.view', 'VIEW_DOCUMENTS'],
  ai: ['ai.use', 'ACCESS_AI_ANALYTICS'],
  audit: ['audit.view', 'VIEW_AUDIT_LOGS'],
  admin: ['admin.manage', 'MANAGE_USERS'],
  settings: ['settings.view', 'VIEW_SETTINGS']
};

const UNIVERSAL_MODULES = ['dashboard', 'proaction', 'operational', 'ai', 'chat', 'settings'];

function withUniversalModules(modules) {
  return [...new Set([...(Array.isArray(modules) ? modules : []), ...UNIVERSAL_MODULES])];
}

/** KPIs/cards sensíveis (estratégicos/financeiros) - exigem VIEW_STRATEGIC ou VIEW_FINANCIAL */
const SENSITIVE_KPI_KEYS = [
  'financial_indicators', 'weekly_growth', 'critical_alerts',
  'strategic_actions', 'sectors_alert', 'indicadores financeiros',
  'crescimento semanal', 'alertas críticos', 'ações estratégicas'
];

/**
 * Retorna módulos permitidos ao usuário (interseção perfil x permissões)
 * @param {Object} user
 * @returns {string[]} lista de module_key
 */
function getAllowedModules(user) {
  if (!user) return [];
  const config = dashboardProfileResolver.getDashboardConfigForUser(user);
  const profileModules = config.profile_config?.visible_modules || [];
  const userPerms = Array.isArray(user.permissions) ? user.permissions : [];
  const role = String(user.role || '').toLowerCase();
  const leadershipRoles = new Set(['ceo', 'diretor', 'gerente', 'coordenador', 'supervisor']);
  // Compatibilidade: se permissions não vierem populadas para liderança,
  // não “derruba” módulos do menu (mantém comportamento histórico via visible_modules do perfil).
  if (leadershipRoles.has(role) && userPerms.length === 0) {
    return withUniversalModules(profileModules);
  }

  const perms = new Set([
    ...userPerms,
    ...(role === 'admin' || role === 'ceo' ? ['*'] : [])
  ]);
  const hasWildcard = perms.has('*');

  const filtered = profileModules.filter(moduleKey => {
    const required = MODULE_PERMISSIONS[moduleKey];
    if (!required) return true;
    const hasAny = required.some(p => perms.has(p));
    return hasWildcard || hasAny;
  });
  return withUniversalModules(filtered);
}

/**
 * Retorna KPIs permitidos (filtra sensíveis por permissão)
 * @param {Object} user
 * @param {Array} kpis - lista de KPIs do perfil
 * @returns {Array}
 */
function getAllowedKpis(user, kpis) {
  if (!kpis || !Array.isArray(kpis)) return [];
  const perms = new Set(Array.isArray(user?.permissions) ? user.permissions : []);
  const hasStrategic = perms.has('*') || perms.has('VIEW_STRATEGIC') || perms.has('VIEW_FINANCIAL');

  return kpis.filter(k => {
    const key = (k.key || k.id || k.title || '').toString().toLowerCase();
    const isSensitive = SENSITIVE_KPI_KEYS.some(s => key.includes(s.toLowerCase()));
    if (!isSensitive) return true;
    return hasStrategic;
  });
}

/**
 * Filtra cards do perfil por permissões
 */
function getAllowedCards(user, cards) {
  return getAllowedKpis(user, cards);
}

/**
 * Verifica se usuário pode acessar um módulo
 */
function canAccessModule(user, moduleKey) {
  return getAllowedModules(user).includes(moduleKey);
}

/**
 * Nível de profundidade da IA para o usuário (evitar vazamento de dados)
 * strategic | analytical | operational | practical
 */
function getIADataDepth(user) {
  const level = user?.hierarchy_level ?? 5;
  const perms = new Set(Array.isArray(user?.permissions) ? user.permissions : []);
  const hasStrategic = perms.has('*') || perms.has('VIEW_STRATEGIC');

  if (level <= 1 && hasStrategic) return 'strategic';
  if (level <= 2) return 'analytical';
  if (level <= 4) return 'operational';
  return 'practical';
}

/**
 * Lista de códigos de permissão sugeridos para o frontend (ocultar UI)
 */
function getEffectivePermissions(user) {
  const config = dashboardProfileResolver.getDashboardConfigForUser(user);
  const modules = getAllowedModules(user);
  const base = Array.isArray(user?.permissions) ? [...user.permissions] : [];
  const fromModules = modules.flatMap(m => MODULE_PERMISSIONS[m] || []).filter(Boolean);
  return [...new Set([...base, ...fromModules])];
}

module.exports = {
  getAllowedModules,
  getAllowedKpis,
  getAllowedCards,
  canAccessModule,
  getIADataDepth,
  getEffectivePermissions,
  MODULE_PERMISSIONS,
  SENSITIVE_KPI_KEYS
};
