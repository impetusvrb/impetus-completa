/**
 * moduleAccessGovernanceEngine — Engine Inteligente de Liberação Modular
 *
 * Pipeline obrigatória:
 *   1. Identificar utilizador
 *   2. Gestão de utilizadores (perfil)
 *   3. Base Estrutural (cargo oficial)
 *   4. Validar coerência + liberar módulos
 *
 * Regras:
 *   - Módulos universal: sempre liberados
 *   - Módulos contextual: SOMENTE com estrutura organizacional válida
 *   - Sem inferência, sem fallback automático, fail-closed
 */
'use strict';

const db = require('../db');
const registry = require('../contextualModules/moduleRegistry');
const orgContextEngine = require('./organizationalContextEngine');
const orgIdentity = require('./organizationalIdentityEngine');
const tenantAdminPortalScope = require('./tenantAdminPortalScope');
const functionalAreaCatalog = require('../config/functionalAreaCatalog');

const MSG_INCOMPLETE =
  'Módulo indisponível por ausência de configuração estrutural.';
const MSG_INCOMPATIBLE =
  'Acesso não compatível com a estrutura organizacional.';

/** menu_key → aliases em recommended_permissions / visible_themes */
const STRUCTURAL_TOKEN_TO_MENU_KEYS = Object.freeze({
  dashboard: ['dashboard'],
  operacional: ['operational'],
  operational: ['operational'],
  producao: ['operational'],
  production: ['operational'],
  manutencao: ['manuia'],
  maintenance: ['manuia'],
  manuia: ['manuia'],
  qualidade: ['quality_intelligence'],
  quality: ['quality_intelligence'],
  rh: ['hr_intelligence'],
  hr: ['hr_intelligence'],
  recursos_humanos: ['hr_intelligence'],
  financeiro: ['financial_intelligence', 'operational', 'anomaly_detection'],
  finance: ['financial_intelligence', 'operational', 'anomaly_detection'],
  finanças: ['financial_intelligence', 'operational'],
  seguranca: ['safety_intelligence'],
  safety: ['safety_intelligence'],
  ambiental: ['environment_intelligence'],
  environment: ['environment_intelligence'],
  logistica: ['logistics_intelligence'],
  logistics: ['logistics_intelligence'],
  auditoria: ['audit'],
  audit: ['audit'],
  admin: ['admin'],
  ia: ['ai', 'chat'],
  ai: ['ai', 'chat'],
  chat: ['chat'],
  biblioteca: ['biblioteca'],
  proacao: ['proaction'],
  proaction: ['proaction'],
  registro: ['registro_inteligente'],
  cadastrar: ['cadastrar_com_ia'],
  estrategico: ['audit', 'anomaly_detection', 'operational'],
  bi: ['operational', 'anomaly_detection'],
  engenharia: ['operational', 'quality_intelligence']
});

const FUNCTIONAL_AREA_TO_MENU_KEYS = Object.freeze({
  hr: ['hr_intelligence', 'operational'],
  finance: ['financial_intelligence', 'operational', 'anomaly_detection'],
  maintenance: ['manuia', 'operational'],
  quality: ['quality_intelligence', 'operational'],
  production: ['operational'],
  operations: ['operational'],
  admin: ['admin', 'audit'],
  environmental: ['environment_intelligence'],
  sustainability: ['environment_intelligence'],
  environmental_health_safety: ['safety_intelligence', 'environment_intelligence']
});

const MODULE_TYPE_OVERRIDES = Object.freeze({
  dashboard: 'universal',
  settings: 'universal',
  chat: 'universal',
  proaction: 'universal',
  registro_inteligente: 'universal',
  cadastrar_com_ia: 'universal',
  admin: 'restricted',
  audit: 'strategic',
  operational: 'operational',
  manuia: 'operational',
  hr_intelligence: 'contextual',
  quality_intelligence: 'contextual',
  safety_intelligence: 'contextual',
  environment_intelligence: 'contextual',
  logistics_intelligence: 'contextual',
  financial_intelligence: 'contextual',
  anomaly_detection: 'strategic'
});

function isEnabled() {
  const v = String(process.env.IMPETUS_MODULE_ACCESS_GOVERNANCE || 'true').toLowerCase();
  return v !== 'false' && v !== '0' && v !== 'off';
}

function getModuleType(mod) {
  if (!mod) return 'contextual';
  if (mod.module_type) return mod.module_type;
  const key = mod.menu_key || mod.module_id;
  if (MODULE_TYPE_OVERRIDES[key]) return MODULE_TYPE_OVERRIDES[key];
  if (mod.universal === true) return 'universal';
  if (mod.category === 'admin') return 'restricted';
  if (mod.category === 'audit' || mod.lgpd_scope === 'high') return 'strategic';
  if (mod.category === 'operational' || mod.category === 'maintenance') return 'operational';
  return 'contextual';
}

function isUniversalModule(mod) {
  return getModuleType(mod) === 'universal' || mod?.universal === true;
}

function _normToken(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function _expandToken(token) {
  const t = _normToken(token);
  if (!t) return [];
  const direct = STRUCTURAL_TOKEN_TO_MENU_KEYS[t];
  if (direct) return direct;
  const partial = [];
  for (const [key, mods] of Object.entries(STRUCTURAL_TOKEN_TO_MENU_KEYS)) {
    if (t.includes(key) || key.includes(t)) partial.push(...mods);
  }
  return [...new Set(partial)];
}

/**
 * Autorização estrutural explícita (cargo + permissões cadastradas — sem inferir por nome).
 */
function buildStructuralAuthorizedMenuKeys(ctx) {
  const keys = new Set();
  const role = ctx.structural_role;
  const fa = ctx.functional_area;

  if (fa && FUNCTIONAL_AREA_TO_MENU_KEYS[fa]) {
    for (const k of FUNCTIONAL_AREA_TO_MENU_KEYS[fa]) keys.add(k);
  }

  const hint = role?.dashboard_functional_hint || ctx.dashboard_functional_hint;
  if (hint && FUNCTIONAL_AREA_TO_MENU_KEYS[hint]) {
    for (const k of FUNCTIONAL_AREA_TO_MENU_KEYS[hint]) keys.add(k);
  }

  const lists = [
    role?.recommended_permissions,
    role?.visible_themes,
    role?.approval_domains
  ];
  for (const list of lists) {
    if (!Array.isArray(list)) continue;
    for (const item of list) {
      for (const k of _expandToken(item)) keys.add(k);
    }
  }

  if (role?.access_strategic_data === true) {
    keys.add('audit');
    keys.add('anomaly_detection');
    keys.add('operational');
  }
  if (role?.access_financial_data === true) {
    keys.add('financial_intelligence');
    keys.add('operational');
    keys.add('anomaly_detection');
  }
  if (role?.access_hr_data === true) {
    keys.add('hr_intelligence');
    keys.add('operational');
  }
  if (role?.access_critical_indicators === true) {
    keys.add('operational');
    keys.add('anomaly_detection');
  }

  const opScope = _normToken(role?.operational_scope);
  if (opScope === 'estrategico' || opScope === 'corporativo') {
    keys.add('audit');
    keys.add('anomaly_detection');
  }
  if (opScope === 'operacional' || opScope === 'tatico') {
    keys.add('operational');
  }

  return keys;
}

function getUniversalMenuKeys() {
  const keys = new Set();
  for (const mod of registry.getAllModules()) {
    if (isUniversalModule(mod) && mod.menu_key) keys.add(mod.menu_key);
  }
  keys.add('proaction');
  keys.add('registro_inteligente');
  keys.add('cadastrar_com_ia');
  return keys;
}

/**
 * ETAPA 1–3: contexto completo do utilizador + cargo estrutural.
 */
async function buildModuleAccessContext(user) {
  if (!user?.id) {
    return {
      valid: false,
      structural_complete: false,
      validation_message: MSG_INCOMPLETE,
      issues: [{ code: 'no_user', message: 'Utilizador não identificado.' }]
    };
  }

  let enrichedUser = user;
  try {
    const structuralSvc = require('./structuralUserProfileService');
    enrichedUser = await structuralSvc.enrichUserForDashboardAsync(user);
  } catch (_) {
    enrichedUser = user;
  }

  const orgContext = await orgContextEngine.buildOrganizationalContext(enrichedUser);
  let structuralRole = null;
  if (enrichedUser.company_id && enrichedUser.company_role_id) {
    structuralRole = await orgIdentity.loadEnrichedRole(
      enrichedUser.company_id,
      enrichedUser.company_role_id
    );
  }

  const structuralComplete = !!(
    enrichedUser.company_role_id &&
    structuralRole &&
    structuralRole.department_id &&
    structuralRole.sector_id
  );

  const functionalArea =
    enrichedUser.functional_area ||
    structuralRole?.dashboard_functional_hint ||
    functionalAreaCatalog.resolveIdFromText(structuralRole?.work_area) ||
    null;

  const authorizedFromStructure = buildStructuralAuthorizedMenuKeys({
    structural_role: structuralRole,
    functional_area: functionalArea,
    dashboard_functional_hint: structuralRole?.dashboard_functional_hint
  });

  const hiddenThemes = new Set(
    (Array.isArray(structuralRole?.hidden_themes) ? structuralRole.hidden_themes : [])
      .map(_normToken)
      .filter(Boolean)
  );

  return {
    valid: orgContext.valid !== false,
    user_id: enrichedUser.id,
    company_id: enrichedUser.company_id,
    nome: enrichedUser.name,
    email: enrichedUser.email,
    role: enrichedUser.role,
    hierarchy_level: enrichedUser.hierarchy_level ?? structuralRole?.hierarchy_level ?? 5,
    company_role_id: enrichedUser.company_role_id || null,
    functional_area: functionalArea,
    department_id: structuralRole?.department_id || enrichedUser.department_id || null,
    sector_id: structuralRole?.sector_id || null,
    organizational_context: orgContext,
    structural_role: structuralRole,
    structural_complete: structuralComplete,
    authorized_menu_keys: [...authorizedFromStructure],
    hidden_themes: [...hiddenThemes],
    recommended_permissions: structuralRole?.recommended_permissions || [],
    issues: orgContext.issues || [],
    warnings: orgContext.warnings || [],
    loaded_at: new Date().toISOString()
  };
}

/**
 * Valida um módulo (menu_key ou module_id) contra o contexto estrutural.
 */
function validateModuleAccess(accessContext, moduleKeyOrId) {
  const ctx = accessContext || {};
  const key = String(moduleKeyOrId || '').trim();
  if (!key) {
    return { allowed: false, reason: MSG_INCOMPATIBLE, code: 'empty_module' };
  }

  const defs = registry.getModulesByMenuKey(key);
  const mod = defs[0] || registry.getModule(key);
  const menuKey = mod?.menu_key || key;

  if (mod && isUniversalModule(mod)) {
    return { allowed: true, module_type: 'universal', menu_key: menuKey };
  }

  if (tenantAdminPortalScope.isAdministrativePortalOnlyUser({ role: ctx.role, is_tenant_admin: ctx.is_tenant_admin })) {
    if (menuKey === 'admin' || menuKey === 'audit') {
      return { allowed: true, module_type: 'restricted', menu_key: menuKey, bypass: 'admin_portal' };
    }
  }

  if (!ctx.structural_complete) {
    return {
      allowed: false,
      reason: MSG_INCOMPLETE,
      code: 'structural_incomplete',
      menu_key: menuKey
    };
  }

  const hidden = new Set(ctx.hidden_themes || []);
  for (const token of hidden) {
    const blocked = _expandToken(token);
    if (blocked.includes(menuKey)) {
      return {
        allowed: false,
        reason: MSG_INCOMPATIBLE,
        code: 'theme_blocked',
        menu_key: menuKey
      };
    }
  }

  const hl = ctx.hierarchy_level;
  if (mod?.compatible_levels && hl != null) {
    const min = mod.compatible_levels.min ?? 0;
    const max = mod.compatible_levels.max ?? 5;
    if (hl < min || hl > max) {
      return {
        allowed: false,
        reason: MSG_INCOMPATIBLE,
        code: 'hierarchy_mismatch',
        menu_key: menuKey
      };
    }
  }

  const authorized = new Set(ctx.authorized_menu_keys || []);
  if (!authorized.has(menuKey)) {
    const forbidden = registry.getForbiddenModulesFor(
      ctx.organizational_context?.funcao_organizacional ? 'analise' : 'execucao',
      ctx.functional_area || 'operations'
    );
    const modId = mod?.module_id || key;
    if (forbidden.includes(modId) || forbidden.includes(menuKey)) {
      return {
        allowed: false,
        reason: MSG_INCOMPATIBLE,
        code: 'forbidden_by_policy',
        menu_key: menuKey
      };
    }
    return {
      allowed: false,
      reason: MSG_INCOMPATIBLE,
      code: 'not_in_structural_authorization',
      menu_key: menuKey
    };
  }

  return {
    allowed: true,
    module_type: getModuleType(mod),
    menu_key: menuKey,
    source: 'structural_authorization'
  };
}

/**
 * Resolve lista final de visible_modules governada.
 */
function resolveGovernedVisibleModules(accessContext, legacyCandidates = []) {
  const ctx = accessContext || {};
  const universal = getUniversalMenuKeys();
  const allowed = new Set(universal);
  const denied = [];
  const validations = [];

  if (tenantAdminPortalScope.isAdministrativePortalOnlyUser({
    role: ctx.role,
    is_tenant_admin: ctx.is_tenant_admin,
    dashboard_profile: ctx.dashboard_profile
  })) {
    allowed.add('admin');
    allowed.add('audit');
    for (const u of tenantAdminPortalScope.ADMIN_PORTAL_UNIVERSAL_MODULES || []) {
      allowed.add(u);
    }
  }

  const candidates = [
    ...new Set([
      ...(Array.isArray(legacyCandidates) ? legacyCandidates : []),
      ...(ctx.authorized_menu_keys || [])
    ])
  ];

  for (const key of candidates) {
    if (universal.has(key)) continue;
    const v = validateModuleAccess(ctx, key);
    validations.push({ menu_key: key, ...v });
    if (v.allowed) {
      allowed.add(key);
    } else {
      denied.push({ menu_key: key, reason: v.reason, code: v.code });
    }
  }

  if (allowed.has('ai') && !allowed.has('chat')) allowed.add('chat');

  return {
    visible_modules: [...allowed],
    denied,
    validations,
    structural_complete: ctx.structural_complete === true,
    universal_modules: [...universal],
    authorized_structural: ctx.authorized_menu_keys || [],
    governance_message: !ctx.structural_complete
      ? MSG_INCOMPLETE
      : denied.length
        ? MSG_INCOMPATIBLE
        : null
  };
}

/**
 * Ponto de entrada: utilizador + candidatos legacy → módulos governados.
 */
async function resolveForUser(user, legacyCandidates = []) {
  const ctx = await buildModuleAccessContext(user);
  ctx.is_tenant_admin = user?.is_tenant_admin;
  ctx.dashboard_profile = user?.dashboard_profile;
  const out = resolveGovernedVisibleModules(ctx, legacyCandidates);

  return {
    visible_modules: out.visible_modules,
    module_access_context: {
      structural_complete: ctx.structural_complete,
      company_role_id: ctx.company_role_id,
      functional_area: ctx.functional_area,
      authorized_menu_keys: ctx.authorized_menu_keys,
      nome: ctx.nome,
      cargo: ctx.organizational_context?.cargo,
      departamento: ctx.organizational_context?.departamento,
      setor: ctx.organizational_context?.setor
    },
    module_access_governance: {
      engine: 'moduleAccessGovernanceEngine',
      version: 1,
      structural_complete: out.structural_complete,
      universal_modules: out.universal_modules,
      denied: out.denied,
      governance_message: out.governance_message,
      validations_count: out.validations.length,
      denied_count: out.denied.length
    },
    denied: out.denied,
    context: ctx
  };
}

module.exports = {
  isEnabled,
  getModuleType,
  isUniversalModule,
  buildModuleAccessContext,
  validateModuleAccess,
  resolveGovernedVisibleModules,
  resolveForUser,
  MSG_INCOMPLETE,
  MSG_INCOMPATIBLE,
  getUniversalMenuKeys
};
