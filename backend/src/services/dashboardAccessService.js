/**
 * CONTROLE DE ACESSO DO DASHBOARD
 * Filtra módulos, cards, KPIs e widgets por permissões do usuário.
 * A. Frontend: esconder menus/cards/widgets
 * B. Backend: proteger endpoints
 * C. IA: adaptar profundidade e bloquear dados sensíveis
 */
const { getProfile } = require('../config/dashboardProfiles');
const dashboardProfileResolver = require('./dashboardProfileResolver');
const tenantAdminPortalScope = require('./tenantAdminPortalScope');
const { applyStructuralModuleFilter } = require('./structuralModuleResolver');

/**
 * Módulos de acesso universal seguro — liberados explicitamente para TODOS os usuários.
 * Allowlist controlada: SOMENTE estes 3 módulos têm acesso universal.
 * NÃO ativa fail-open global nem abre orchestration/telemetry.
 */
const UNIVERSAL_SAFE_ACCESS_MODULES = Object.freeze([
  'proaction',          // PróAção — registro de ações e propostas
  'registro_inteligente', // Registro Inteligente — captura de registros
  'cadastrar_com_ia'    // Cadastrar com IA — entrada de dados com suporte de IA
]);

/**
 * Módulos explicitamente excluídos do perfil CEO (executive experience refinement).
 * O CEO consome síntese estratégica — módulos operacionais/táticos são ruído cognitivo.
 * Deny-only: não afeta nenhum outro perfil; módulo continua universal para os demais.
 */
const CEO_DENIED_MODULES = Object.freeze(new Set([
  'proaction'
]));

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
  // registro_inteligente e cadastrar_com_ia não exigem permissões específicas
  // (sem entrada em MODULE_PERMISSIONS → sempre passam quando em visible_modules)
};

/**
 * Baseline mínimo (entrada ao painel). NÃO incluir domínios operacionais/financeiros/RH aqui —
 * isso causava vazamento cross-domain em todos os perfis (união com visible_modules do perfil).
 */
const PROFILE_BASELINE_MODULE_KEYS = ['dashboard'];

function withBaselineModules(modules) {
  return [...new Set([...(Array.isArray(modules) ? modules : []), ...PROFILE_BASELINE_MODULE_KEYS])];
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

  if (tenantAdminPortalScope.isAdministrativePortalOnlyUser(user)) {
    const { filtered, removed } = tenantAdminPortalScope.filterModulesForAdministrativePortal(profileModules);
    const withAdmin = [...new Set([...filtered, 'admin', 'audit'])];
    // Inclui módulos universais seguros também para o portal administrativo.
    let merged = [...new Set([...withAdmin, ...tenantAdminPortalScope.ADMIN_PORTAL_UNIVERSAL_MODULES, ...UNIVERSAL_SAFE_ACCESS_MODULES])];
    const structural = applyStructuralModuleFilter(user, merged);
    merged = structural.modules;
    try {
      console.log(
        '[ADMIN_PORTAL_SCOPE]',
        JSON.stringify({
          tag: 'TENANT_ADMIN_CONTEXT',
          user_id: user.id,
          company_id: user.company_id,
          allowed_modules: merged,
          suppressed_universal: [...tenantAdminPortalScope.SUPPRESS_UNIVERSAL_FOR_ADMIN_PORTAL],
          removed_from_profile: removed
        })
      );
      if (removed.length) {
        console.log(
          '[OPERATIONAL_MODULE_SUPPRESSED]',
          JSON.stringify({ user_id: user.id, module_keys: removed, reason: 'administrative_portal_scope' })
        );
      }
    } catch (_) {
      /* never throw */
    }
    return merged;
  }
  const leadershipRoles = new Set(['ceo', 'diretor', 'gerente', 'coordenador', 'supervisor']);
  const hasStrategicLeadership =
    userPerms.includes('*') ||
    userPerms.includes('VIEW_STRATEGIC') ||
    userPerms.includes('VIEW_FINANCIAL');
  // Compatibilidade: se permissions não vierem populadas para liderança,
  // não “derruba” módulos do menu (mantém comportamento histórico via visible_modules do perfil).
  if (leadershipRoles.has(role) && (userPerms.length === 0 || hasStrategicLeadership)) {
    let leaderMerged = [...new Set([...withBaselineModules(profileModules), ...UNIVERSAL_SAFE_ACCESS_MODULES])];
    leaderMerged = applyStructuralModuleFilter(user, leaderMerged).modules;
    return _applyCeoExclusions(leaderMerged, role, user);
  }

  const perms = new Set([
    ...userPerms,
    ...(role === 'admin' || role === 'ceo' || role === 'internal_admin' ? ['*'] : [])
  ]);
  const hasWildcard = perms.has('*');

  const filtered = profileModules.filter(moduleKey => {
    const required = MODULE_PERMISSIONS[moduleKey];
    if (!required) return true;
    const hasAny = required.some(p => perms.has(p));
    return hasWildcard || hasAny;
  });
  // Garante que os 3 módulos universais seguras sempre fazem parte do resultado,
  // independentemente de perfil, cargo ou permissões. Não afeta orchestration,
  // telemetry, dashboards operacionais ou qualquer outro módulo.
  let merged = [...new Set([...withBaselineModules(filtered), ...UNIVERSAL_SAFE_ACCESS_MODULES])];
  merged = applyStructuralModuleFilter(user, merged).modules;
  return _applyCeoExclusions(merged, role, user);
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

/**
 * Estágio final: remove módulos proibidos para CEO.
 * Executa depois de TODA composição (perfil + universal + baseline).
 * @param {string[]} modules
 * @param {string} role
 * @returns {string[]}
 */
function _applyCeoExclusions(modules, role, user) {
  if (role !== 'ceo') return modules;
  return modules.filter((m) => !CEO_DENIED_MODULES.has(m));
}

module.exports = {
  getAllowedModules,
  getAllowedKpis,
  getAllowedCards,
  canAccessModule,
  getIADataDepth,
  getEffectivePermissions,
  MODULE_PERMISSIONS,
  SENSITIVE_KPI_KEYS,
  UNIVERSAL_SAFE_ACCESS_MODULES,
  CEO_DENIED_MODULES
};
