'use strict';

/**
 * DASHBOARD DELIVERY AUDIT SERVICE (read-only)
 * ============================================
 * Observabilidade da cadeia completa de entrega de dashboards, módulos,
 * widgets, summaries e orquestração para cada utilizador.
 *
 * REGRA: este serviço é SOMENTE DE LEITURA — não executa mutations,
 * não força roles, não altera payloads de produção.
 *
 * Expõe:
 *   auditDeliveryForUser(user)        — snapshot completo para um utilizador
 *   auditProfileMatrix(users[])       — matriz de entrega por lista de perfis
 *   detectDeliveryRisks(user)         — lista de riscos/anomalias detectados
 *   getDeliveryAuditSummary(user)     — resumo executivo (para logs/obs)
 */

const dashboardProfileResolver = require('./dashboardProfileResolver');
const dashboardAccessService    = require('./dashboardAccessService');
const { buildIntelligentSummary, canOrchestrate } = require('./liveDashboardService');
const { getProfile, DASHBOARD_PROFILES } = require('../config/dashboardProfiles');
const { getExpectedDomainMenuKeySet } = require('../security/domainAccessMatrix');

// ─── helpers ────────────────────────────────────────────────────────────────

const NON_OPERATIONAL_PROFILES = new Set([
  'finance_management', 'hr_management', 'director_unassigned', 'admin_system'
]);

const NON_OPERATIONAL_AREAS = new Set([
  'finance', 'financeiro', 'hr', 'rh', 'recursos_humanos', 'admin'
]);

/** Conjunto de perfis válidos conhecidos */
const VALID_PROFILE_CODES = new Set(Object.keys(DASHBOARD_PROFILES));

function normRole(r) {
  return String(r || '').toLowerCase().trim();
}
function normArea(a) {
  return String(a || '').toLowerCase().trim();
}

/**
 * Determina domínio esperado a partir do perfil resolvido
 */
function expectedDomainFromProfile(profileCode) {
  const p = String(profileCode || '');
  if (p.includes('finance')) return 'finance';
  if (p.includes('hr') || p === 'hr_management') return 'hr';
  if (p.includes('maintenance') || p.includes('industrial')) return 'industrial';
  if (p.includes('production') || p.includes('operator') || p.includes('coordinator') || p.includes('supervisor')) return 'production';
  if (p.includes('director_operations') || p.includes('ceo')) return 'operations';
  if (p.includes('director_unassigned')) return 'unassigned';
  if (p.includes('admin')) return 'admin';
  return 'generic';
}

/**
 * Testa se um módulo pode ser cruzado com o domínio do utilizador
 */
function isCrossDomainModule(moduleKey, domain) {
  const FINANCE_ONLY = new Set(['centro_custos', 'mapa_vazamento_financeiro', 'finance']);
  const MAINT_ONLY   = new Set(['manuia', 'manutencao']);
  const HR_ONLY      = new Set(['hr_intelligence', 'pulse_rh']);
  if (domain === 'finance' && (MAINT_ONLY.has(moduleKey) || HR_ONLY.has(moduleKey))) return true;
  if (domain === 'hr'      && (MAINT_ONLY.has(moduleKey) || FINANCE_ONLY.has(moduleKey))) return true;
  if ((domain === 'production' || domain === 'industrial') && FINANCE_ONLY.has(moduleKey)) return true;
  return false;
}

// ─── FASE 1+2 — perfil, área e módulos ──────────────────────────────────────

/**
 * Resolve configuração de entrega completa (sem DB) para um utilizador.
 */
function resolveDeliveryConfig(user) {
  const cfg    = dashboardProfileResolver.getDashboardConfigForUser(user);
  const profile = cfg.profile_config || {};
  const area   = cfg.functional_area;
  const allowed = dashboardAccessService.getAllowedModules(user);
  const iaDepth = dashboardAccessService.getIADataDepth(user);
  const kpiFiltered = dashboardAccessService.getAllowedKpis(user, profile.cards || []);
  const orchAllowed = canOrchestrate(user, cfg.profile_code, area);
  const expectedDomain = getExpectedDomainMenuKeySet(user);
  const expectedDomainLabel = expectedDomainFromProfile(cfg.profile_code);

  return {
    profile_code: cfg.profile_code,
    profile_label: profile.label || cfg.profile_code,
    functional_area: area,
    allowed_modules: allowed,
    ia_depth: iaDepth,
    kpi_count: kpiFiltered.length,
    orchestration_allowed: orchAllowed,
    expected_domain_set: Array.from(expectedDomain),
    expected_domain_label: expectedDomainLabel,
    visible_modules_from_profile: profile.visible_modules || [],
    widgets_from_profile: profile.widgets || [],
    cards_from_profile: (profile.cards || []).map(c => c.key || c.title)
  };
}

// ─── FASE 3 — análise de capabilities implícitas ─────────────────────────────

/**
 * Detecta capabilities derivadas implicitamente (potencial inflação)
 */
function detectImplicitCapabilityRisks(user) {
  const risks = [];
  const role = normRole(user.role);
  const area = normArea(user.functional_area);
  const perms = Array.isArray(user.permissions) ? user.permissions : [];
  const permSet = new Set(perms);

  // CEO/admin com wildcard '*' — aceitável, registado para auditoria
  if (permSet.has('*')) {
    risks.push({
      type: 'wildcard_permission',
      severity: 'info',
      detail: `role="${role}" tem permissão wildcard (*) — verificar se é correto para este perfil`
    });
  }

  // Diretor sem área definida ainda recebia 'operations' por defeito (corrigido)
  if (role === 'diretor' && !user.functional_area && !user.dashboard_profile) {
    risks.push({
      type: 'director_no_area_no_override',
      severity: 'warning',
      detail: 'Diretor sem área funcional e sem dashboard_profile: perfil resolverá para director_unassigned'
    });
  }

  // Liderança com permissions vazias — fallback legado activo
  const leadershipRoles = new Set(['ceo', 'diretor', 'gerente', 'coordenador', 'supervisor']);
  if (leadershipRoles.has(role) && perms.length === 0) {
    risks.push({
      type: 'leadership_no_explicit_permissions',
      severity: 'warning',
      detail: `role="${role}" sem permissions[] explícito: getAllowedModules usa fallback legado (visible_modules do perfil). Definir permissions evita dependência de perfil.`
    });
  }

  // Área financeira com permissões operacionais explícitas
  const opPerms = ['VIEW_OPERATIONAL', 'ACCESS_PLC', 'ACCESS_TELEMETRY'];
  if (NON_OPERATIONAL_AREAS.has(area) && opPerms.some(p => permSet.has(p))) {
    risks.push({
      type: 'non_operational_area_with_operational_perm',
      severity: 'warning',
      detail: `Área "${area}" tem permissões operacionais explícitas (${opPerms.filter(p => permSet.has(p)).join(', ')}). Verificar intencionalidade.`
    });
  }

  return risks;
}

// ─── FASE 4 — payload risks ──────────────────────────────────────────────────

/**
 * Avalia se o payload /dashboard/me conteria campos excessivos para o domínio
 */
function detectPayloadRisks(user, deliveryConfig) {
  const risks = [];
  const area = normArea(user.functional_area);
  const domain = deliveryConfig.expected_domain_label;

  // Módulos no payload que são cross-domain
  for (const mod of deliveryConfig.allowed_modules) {
    if (isCrossDomainModule(mod, domain)) {
      risks.push({
        type: 'cross_domain_module_in_payload',
        severity: 'high',
        module: mod,
        detail: `Módulo "${mod}" entregue para domínio "${domain}" (área="${area}") — potencial vazamento`
      });
    }
  }

  // functional_area ausente para perfis que não são unassigned
  if (!deliveryConfig.functional_area && !NON_OPERATIONAL_PROFILES.has(deliveryConfig.profile_code)) {
    const profileIsAssigned = !deliveryConfig.profile_code.includes('unassigned');
    if (profileIsAssigned) {
      risks.push({
        type: 'missing_functional_area_label',
        severity: 'info',
        detail: `functional_area não resolvida para perfil "${deliveryConfig.profile_code}" — frontend não exibe label de setor`
      });
    }
  }

  // Perfil desconhecido (fora do catálogo)
  if (!VALID_PROFILE_CODES.has(deliveryConfig.profile_code)) {
    risks.push({
      type: 'unknown_profile_code',
      severity: 'critical',
      detail: `profile_code "${deliveryConfig.profile_code}" não está no catálogo DASHBOARD_PROFILES`
    });
  }

  return risks;
}

// ─── FASE 5 — contextualização cognitiva ────────────────────────────────────

/**
 * Audita o resumo cognitivo (buildIntelligentSummary) para o utilizador
 */
function auditCognitiveSummary(user, deliveryConfig) {
  const area = deliveryConfig.functional_area || null;
  const profileCode = deliveryConfig.profile_code;
  const signals = { tasksOpen: 0, tasksOverdue: 0, alertsOpen: 0 };
  const summary = buildIntelligentSummary({
    userName: user.name || 'Auditado',
    profileLabel: deliveryConfig.profile_label,
    areaLabel: area || null,
    deptName: user.department || null,
    jobTitle: user.job_title || null,
    signals,
    gaps: [],
    sufficiency: 'full',
    profileCode,
    functionalArea: area
  });
  const hasOperationalPhrasing = /alertas operacionais/i.test(summary);
  const isDomainSafe = !hasOperationalPhrasing ||
    (!NON_OPERATIONAL_PROFILES.has(profileCode) && !NON_OPERATIONAL_AREAS.has(String(area)));
  return {
    summary_excerpt: summary.slice(0, 280),
    has_operational_phrasing: hasOperationalPhrasing,
    domain_safe: isDomainSafe,
    orchestration_in_summary: deliveryConfig.orchestration_allowed,
    risks: isDomainSafe ? [] : [{
      type: 'operational_phrasing_for_non_operational_domain',
      severity: 'high',
      detail: `Resumo usa linguagem operacional para perfil "${profileCode}" / área "${area}"`
    }]
  };
}

// ─── FASE 6 — frontend delivery ──────────────────────────────────────────────

/**
 * Snapshot do que o frontend receberia via /dashboard/me (sem DB)
 */
function buildFrontendDeliverySnapshot(user, deliveryConfig) {
  const expectedSet = new Set(deliveryConfig.expected_domain_set);
  const deliveredSet = new Set(deliveryConfig.allowed_modules);

  // Módulos entregues mas não esperados para o domínio
  const unexpectedModules = deliveryConfig.allowed_modules.filter(m => {
    if (m === 'dashboard' || m === 'settings') return false; // baseline
    const domain = deliveryConfig.expected_domain_label;
    return isCrossDomainModule(m, domain);
  });

  // Módulos esperados mas ausentes
  const missingExpected = Array.from(expectedSet).filter(m => !deliveredSet.has(m));

  return {
    delivered_modules: deliveryConfig.allowed_modules,
    unexpected_cross_domain: unexpectedModules,
    missing_expected: missingExpected,
    fail_open_risk: deliveryConfig.allowed_modules.length === 0 ? 'empty_may_bypass_for_admin' : 'none'
  };
}

// ─── API PÚBLICA ─────────────────────────────────────────────────────────────

/**
 * Auditoria completa de entrega para um utilizador (sem DB / in-memory).
 * @param {Object} user — objeto de utilizador (role, functional_area, permissions, etc.)
 * @returns {Object} audit report
 */
function auditDeliveryForUser(user) {
  if (!user) return { ok: false, error: 'user_required' };
  const delivery  = resolveDeliveryConfig(user);
  const capRisks  = detectImplicitCapabilityRisks(user);
  const payRisks  = detectPayloadRisks(user, delivery);
  const cogAudit  = auditCognitiveSummary(user, delivery);
  const feSnap    = buildFrontendDeliverySnapshot(user, delivery);
  const allRisks  = [...capRisks, ...payRisks, ...cogAudit.risks];
  const highRisks = allRisks.filter(r => r.severity === 'high' || r.severity === 'critical');

  return {
    ok: true,
    audited_at: new Date().toISOString(),
    user_snapshot: {
      id: user.id || null,
      role: user.role || null,
      job_title: user.job_title || null,
      functional_area: user.functional_area || null,
      department: user.department || null,
      hierarchy_level: user.hierarchy_level ?? null,
      dashboard_profile: user.dashboard_profile || null,
      permissions_count: Array.isArray(user.permissions) ? user.permissions.length : 0
    },
    delivery,
    cognitive_audit: cogAudit,
    frontend_snapshot: feSnap,
    risks: allRisks,
    high_risk_count: highRisks.length,
    governance_status: highRisks.length === 0 ? 'clean' : 'risks_detected'
  };
}

/**
 * Matriz de entrega para múltiplos perfis (sem DB).
 * @param {Object[]} users
 * @returns {{ matrix: Object[], summary: Object }}
 */
function auditProfileMatrix(users) {
  if (!Array.isArray(users)) return { matrix: [], summary: {} };
  const matrix = users.map(u => {
    const r = auditDeliveryForUser(u);
    return {
      user_id: u.id || null,
      role: u.role || null,
      area: u.functional_area || null,
      profile_code: r.delivery?.profile_code || null,
      profile_label: r.delivery?.profile_label || null,
      modules_count: r.delivery?.allowed_modules?.length || 0,
      orchestration: r.delivery?.orchestration_allowed || false,
      ia_depth: r.delivery?.ia_depth || null,
      high_risks: r.high_risk_count || 0,
      governance_status: r.governance_status || 'unknown'
    };
  });
  const dirty = matrix.filter(r => r.governance_status !== 'clean');
  return {
    matrix,
    summary: {
      total: matrix.length,
      clean: matrix.length - dirty.length,
      risks_detected: dirty.length,
      dirty_profiles: dirty.map(r => r.profile_code)
    }
  };
}

/**
 * Apenas lista de riscos detectados (atalho para logs).
 */
function detectDeliveryRisks(user) {
  const audit = auditDeliveryForUser(user);
  return audit.risks || [];
}

/**
 * Resumo executivo (uma linha de log por utilizador).
 */
function getDeliveryAuditSummary(user) {
  const audit = auditDeliveryForUser(user);
  return {
    user_id: user?.id || null,
    profile: audit.delivery?.profile_code || 'unknown',
    area: audit.delivery?.functional_area || null,
    modules: audit.delivery?.allowed_modules?.length || 0,
    orchestration: audit.delivery?.orchestration_allowed || false,
    ia_depth: audit.delivery?.ia_depth || null,
    high_risks: audit.high_risk_count || 0,
    status: audit.governance_status || 'unknown'
  };
}

module.exports = {
  auditDeliveryForUser,
  auditProfileMatrix,
  detectDeliveryRisks,
  getDeliveryAuditSummary,
  /** internos expostos para testes */
  resolveDeliveryConfig,
  detectImplicitCapabilityRisks,
  detectPayloadRisks,
  auditCognitiveSummary,
  buildFrontendDeliverySnapshot
};
