/**
 * IMPETUS - Utilitários de mapeamento de roles
 * Normaliza roles do backend (PT/EN, compostos) para chaves de menu/layout.
 */

const MAINTENANCE_PATTERN = /maintenance|manuten|mecan|eletric|eletromecan|soldad|tecnic|technician_maintenance|manager_maintenance|coordinator_maintenance|supervisor_maintenance/i;

/**
 * Verifica se o usuário tem perfil de manutenção
 */
export function isMaintenanceProfile(user) {
  if (!user) return false;
  const role = (user.role || '').toLowerCase();
  const area = (user.functional_area || user.area || user.department || '').toLowerCase();
  const jobTitle = (user.job_title || user.cargo || '').toLowerCase();
  const profile = (user.dashboard_profile || '').toLowerCase();
  return (
    MAINTENANCE_PATTERN.test(role) ||
    MAINTENANCE_PATTERN.test(area) ||
    MAINTENANCE_PATTERN.test(jobTitle) ||
    MAINTENANCE_PATTERN.test(profile)
  );
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

/** Conta técnica com `role === 'admin'` (não diretor/gerente/coordenador). */
export function isStrictAdminRole(user) {
  if (!user) return false;
  return String(user.role || '').toLowerCase() === 'admin';
}

export function resolveMenuRole(user) {
  if (!user) return 'colaborador';
  let role = (user.role || '').toLowerCase();
  const profile = (user.dashboard_profile || '').toLowerCase();
  const jobTitle = (user.job_title || '').toLowerCase();

  // Papéis em inglês (BD/API) → mesma chave que PT para menu e regras
  if (role === 'director' || role === 'diretora') role = 'diretor';
  if (role === 'manager') role = 'gerente';
  if (role === 'coordinator') role = 'coordenador';

  /** Staff IMPETUS — mesmo menu lateral que administrador de tenant (rotas admin continuam com guards próprios). */
  if (role === 'internal_admin') return 'admin';
  if (role === 'tenant_admin' || role === 'company_admin') return 'admin';

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
export function isColaboradorSimples(user) {
  if (!user) return false;
  const role = (user.role || '').toLowerCase();
  if (!['colaborador', 'auxiliar_producao', 'auxiliar'].includes(role)) return false;
  return !isMaintenanceProfile(user);
}

/** Técnico de manutenção (mecânico, eletricista, etc.): dashboard e módulos técnicos, não o menu mínimo do colaborador */
export function isMaintenanceTechnicianMenu(user) {
  return isMaintenanceProfile(user) && resolveMenuRole(user) === 'colaborador';
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
