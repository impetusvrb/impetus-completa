/**
 * IMPETUS - Utilitários de mapeamento de roles
 * Normaliza roles do backend (PT/EN, compostos) para chaves de menu/layout.
 */

import {
  hasMaintenanceDashboardSurface,
  resolveDashboardSurfaceCapabilities
} from './dashboardSurfaceCapabilities.js';

/** Capability contextual: administrador de sistema (company_role), sem users.role = diretor */
export const CAP_SYSTEM_ADMINISTRATION = 'system_administration';

/**
 * Sinal de superfície/manutenção (menu, audiência de domínio).
 * Delega à política fail-closed INC-009/INC-022 — qualidade/ambiental/executivo primários nunca
 * herdam manutenção por functional_area errado, heurística `tecnic` ou eixo secundário.
 */
export function isMaintenanceProfile(user) {
  return resolveDashboardSurfaceCapabilities(user).maintenance;
}

export {
  resolveDashboardSurfaceCapabilities,
  hasMaintenanceDashboardSurface,
  resolveMaintenanceFromDashboardMe,
  isQualityPrimary
} from './dashboardSurfaceCapabilities.js';

/**
 * Superfície executiva estratégica — ceo_executive, eixo executivo, liderança em área executive.
 * Fail-closed: perfis de manutenção nunca são classificados como executivos puros.
 */
export function isExecutiveDashboardProfile(user) {
  if (!user) return false;
  if (isMaintenanceProfile(user)) return false;
  const profile = String(user.dashboard_profile || '').toLowerCase();
  if (profile === 'ceo_executive') return true;
  const sp = user.structural_profile;
  if (sp?.eixo_primario === 'eixo_executivo') return true;
  const fa = String(user.functional_area || user.area || user.department || '').toLowerCase();
  if (fa === 'executive' && isExecutiveLeadershipRole(user)) return true;
  return false;
}

/** Superfície exclusiva de manutenção — política fail-closed (INC-009). */
export function hasMaintenanceProfileContext(user, maintenanceFromProfile = false) {
  return hasMaintenanceDashboardSurface(user, maintenanceFromProfile);
}

/**
 * Mapeia role/profile para chave de menu do Layout (admin, diretor, gerente, coordenador, supervisor, colaborador, ceo)
 * Auxiliar de produção = colaborador (mesmo menu e painel)
 */
/** Papéis com acesso à rota /app/pulse-rh (backend: role rh ou dashboard_profile hr_management). */
export const PULSE_RH_ROLE_KEYS = ['rh'];

function normTxt(v) {
  return String(v || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Área / cargo claramente de RH (mesmo quando dashboard_profile ainda não foi gravado como hr_management).
 */
export function isHrFunctionalContext(user) {
  if (!user) return false;
  for (const raw of [
    user.functional_area,
    user.area,
    user.department,
    user.hr_responsibilities
  ]) {
    const x = normTxt(raw);
    if (!x) continue;
    if (x === 'hr' || x === 'rh') return true;
    if (x.includes('recursos humanos') || x.includes('recursos_humanos')) return true;
    if (x.includes('gestao de pessoas')) return true;
    if (x.includes('human resources')) return true;
    if (x.includes('people operations') || x.includes('people and culture') || x.includes('people & culture')) return true;
    if (/\bhrbp\b/.test(x)) return true;
  }
  const job = `${normTxt(user.job_title)} ${normTxt(user.cargo)}`;
  if (!job.trim()) return false;
  return (
    /\brecursos humanos\b/.test(job) ||
    /\bgestao de pessoas\b/.test(job) ||
    /\brh\b/.test(job) ||
    /human resources/.test(job) ||
    /\bhrbp\b/.test(job) ||
    /people (management|ops)\b/.test(job) ||
    /people operations/.test(job) ||
    /people (and|&) culture/.test(job)
  );
}

/**
 * Menu lateral + rota /app/pulse-rh: papel rh, perfil hr_management, ou liderança com contexto RH (ex.: diretor com setor RH).
 */
export function shouldOfferPulseRhMenu(user) {
  if (!user) return false;
  const p = String(user.dashboard_profile || '').toLowerCase();
  if (p === 'hr_management') return true;
  const r = (user.role || '').toLowerCase();
  if (PULSE_RH_ROLE_KEYS.includes(r)) return true;
  if (!isHrFunctionalContext(user)) return false;
  return isLeadershipMenuKey(resolveMenuRole(user));
}

/** Liderança para regras de menu (PT + EN). */
export function isLeadershipMenuKey(menuKey) {
  return ['ceo', 'diretor', 'gerente', 'coordenador', 'supervisor'].includes(menuKey);
}

export function canAccessPulseRhRoute(user) {
  if (!user) return false;
  return shouldOfferPulseRhMenu(user);
}

/** Layout do Centro de Comando: perfil/cargo/área de RH (evita painel industrial para diretora de RH). */
export function isHrDashboardLayout(user) {
  if (!user) return false;
  const p = String(user.dashboard_profile || '').toLowerCase();
  if (p === 'hr_management' || p === 'director_hr' || p === 'hr_director') return true;
  const r = String(user.role || '').toLowerCase();
  if (r === 'rh') return true;
  if (r === 'diretor' && (p.includes('hr') || p.includes('rh'))) return true;
  return isHrFunctionalContext(user);
}

/** Layout do Centro de Comando: perfil/cargo/área financeira. */
export function isFinanceFunctionalContext(user) {
  if (!user) return false;
  for (const raw of [user.functional_area, user.area, user.department]) {
    const x = normTxt(raw);
    if (!x) continue;
    if (x === 'finance' || x === 'financeiro') return true;
    if (x.includes('controladoria') || x.includes('financas')) return true;
  }
  const job = `${normTxt(user.job_title)} ${normTxt(user.cargo)}`;
  if (!job.trim()) return false;
  return (
    /\bfinanc/.test(job) ||
    /\bcfo\b/.test(job) ||
    /chief financial/.test(job) ||
    /\bcontroladoria\b/.test(job)
  );
}

export function isFinanceDashboardLayout(user) {
  if (!user) return false;
  const p = String(user.dashboard_profile || '').toLowerCase();
  if (p === 'finance_management') return true;
  const r = String(user.role || '').toLowerCase();
  if (r === 'financeiro') return true;
  return isFinanceFunctionalContext(user);
}

export function userHasSystemAdministrationCapability(user) {
  if (!user) return false;
  if (String(user.role || '').toLowerCase() === 'admin') return true;
  return (
    Array.isArray(user.contextual_capabilities) &&
    user.contextual_capabilities.includes(CAP_SYSTEM_ADMINISTRATION)
  );
}

/** Alinhado a DirectorOrCEORouteGuard (App.jsx) — Logs de Áudio e rotas sensíveis diretoria. */
export function canAccessDirectorOrCEOAdminRoutes(user) {
  if (!user) return false;
  if (userHasSystemAdministrationCapability(user)) return true;
  return ['ceo', 'admin', 'diretor'].includes(String(user.role || '').toLowerCase());
}

/** Conta técnica `role === 'admin'` OU administrador contextual (cargo na base estrutural) OU admin de tenant (Fase 1). */
export function isStrictAdminRole(user) {
  if (!user) return false;
  const role = String(user.role || '').toLowerCase();
  if (role === 'admin' || role === 'internal_admin') return true;
  if (user.is_tenant_admin === true) return true;
  return userHasSystemAdministrationCapability(user);
}

export function resolveMenuRole(user) {
  if (!user) return 'colaborador';
  if (user.is_tenant_admin === true) return 'admin';
  if (userHasSystemAdministrationCapability(user)) return 'admin';
  let role = (user.role || '').toLowerCase();
  const profile = (user.dashboard_profile || '').toLowerCase();
  const jobTitle = (user.job_title || '').toLowerCase();

  // Papéis em inglês (BD/API) → mesma chave que PT para menu e regras
  if (role === 'director' || role === 'diretora') role = 'diretor';
  if (role === 'manager') role = 'gerente';
  if (role === 'coordinator') role = 'coordenador';

  if (role === 'admin' || profile === 'admin_system') return 'admin';
  if (role === 'rh') return 'rh';
  if (role === 'ceo' || profile === 'ceo_executive') return 'ceo';
  if (role === 'diretor' || role.includes('diretor') || profile.includes('director')) return 'diretor';
  if (role === 'gerente' || role.includes('gerente') || role.includes('manager') || profile.includes('manager_')) {
    return 'gerente';
  }
  if (role === 'coordenador' || role.includes('coordenador') || role.includes('coordinator') || profile.includes('coordinator_')) {
    return 'coordenador';
  }
  if (role.includes('supervisor') || profile.includes('supervisor_')) return 'supervisor';
  if (role === 'operador' || profile.includes('operator_floor')) return 'operador';
  if (role.includes('auxiliar') || jobTitle.includes('auxiliar') || jobTitle.includes('aux. produ')) return 'colaborador';

  return 'colaborador';
}

/** Colaborador/auxiliar sem perfil de manutenção — menu mínimo (sem dashboard tradicional) */
export function isColaboradorSimples(user, maintenanceFromProfile = false) {
  if (!user) return false;
  if (hasMaintenanceProfileContext(user, maintenanceFromProfile)) return false;
  const role = (user.role || '').toLowerCase();
  return ['colaborador', 'auxiliar_producao', 'auxiliar'].includes(role);
}

/** Técnico de manutenção (mecânico, eletricista, etc.): dashboard e módulos técnicos, não o menu mínimo do colaborador */
export function isMaintenanceTechnicianMenu(user, maintenanceFromProfile = false) {
  return hasMaintenanceProfileContext(user, maintenanceFromProfile) && resolveMenuRole(user) === 'colaborador';
}

/**
 * Liderança/coordenador/supervisor de manutenção: injeta ManuIA no menu de liderança.
 * Técnicos já recebem MENU_MANUTENCAO_TECNICO — não duplicar.
 * Alinhado a STANDALONE_MANUIA_PATHS em useVisibleModules (menu == route access).
 */
export function shouldInjectManuiaMenuModules(user, maintenanceFromProfile = false) {
  if (!user || isAdministrativePortalOnlyUser(user)) return false;
  if (!hasMaintenanceProfileContext(user, maintenanceFromProfile)) return false;
  if (isMaintenanceTechnicianMenu(user, maintenanceFromProfile)) return false;
  return true;
}

/** Dashboard Vivo: todos exceto admin técnico */
export function canAccessLiveDashboardUser(user) {
  return (user?.role || '').toLowerCase() !== 'admin';
}

/** Orquestração IA: supervisor, coordenador, gerente, diretor, CEO (incl. aliases EN) */
export function canUseTaskOrchestrationUser(user) {
  let r = (user?.role || '').toLowerCase();
  if (r === 'coordinator') r = 'coordenador';
  if (r === 'director') r = 'diretor';
  if (r === 'manager') r = 'gerente';
  return ['ceo', 'diretor', 'gerente', 'coordenador', 'supervisor'].includes(r);
}

/**
 * Visão unificada (Centro de Comando + Dashboard Vivo / IA): CEO, diretor, gerente, coordenador, supervisor.
 * Usa a mesma chave de menu que resolveMenuRole (cargos compostos, ex. diretor industrial).
 */
export function isExecutiveLeadershipRole(user) {
  if (!user) return false;
  const key = resolveMenuRole(user);
  return ['ceo', 'diretor', 'gerente', 'coordenador', 'supervisor'].includes(key);
}

/**
 * Portal administrativo do tenant (governança / cadastro) — alinhado a backend/tenantAdminPortalScope.
 * Não inclui perfis operacionais (director, CFO, supervisor) sem capability de administração sistémica.
 */
export function isAdministrativePortalOnlyUser(user) {
  if (!user) return false;
  const role = String(user.role || '').toLowerCase();
  if (role === 'admin' || role === 'internal_admin') return true;
  if (user.is_tenant_admin === true) return true;
  return userHasSystemAdministrationCapability(user);
}
