/**
 * Detecção de perfil — ManuIA Gestão de Ativos (sec. 2.2)
 * Campos Impetus: department, area, job_title, role, permissions[]
 */
export function detectProfile(user) {
  if (!user || typeof user !== 'object') return 'unauthorized';

  const fa = String(user.functional_area || '').toLowerCase();
  const dept = String(user.department || user.area || user.departamento || '').toLowerCase();
  const role = String(user.role || user.cargo || '').toLowerCase();
  const title = String(user.job_title || user.jobTitle || user.funcao || '').toLowerCase();
  const perms = Array.isArray(user.permissions) ? user.permissions.map((p) => String(p).toLowerCase()) : [];

  const isMaintenanceDept =
    fa === 'maintenance' ||
    fa === 'manutencao' ||
    dept.includes('manutenção') ||
    dept.includes('manutencao') ||
    dept.includes('maintenance') ||
    dept.includes('pcm') ||
    dept.includes('engenharia') ||
    dept.includes('mecânica') ||
    dept.includes('mecanica') ||
    role.includes('maintenance') ||
    role.includes('manutencao') ||
    role.includes('manutenção') ||
    role.includes('mecanico') ||
    role.includes('mecânico') ||
    role.includes('eletricista') ||
    role.includes('eletromecanico') ||
    role.includes('eletromecânico') ||
    role.includes('technician') ||
    perms.includes('maintenance:access') ||
    perms.includes('view_maintenance');

  if (!isMaintenanceDept) return 'unauthorized';

  const isGerente =
    role.includes('gerente') ||
    role.includes('manager') ||
    role.includes('diretor') ||
    role.includes('coordenador') ||
    role.includes('coordinate') ||
    title.includes('gerente') ||
    title.includes('coordenador') ||
    title.includes('head') ||
    title.includes('diretor') ||
    perms.includes('maintenance:manage') ||
    perms.includes('manage_maintenance');

  if (isGerente) return 'gerente';

  const isPCM =
    role.includes('pcm') ||
    role.includes('analista') ||
    title.includes('pcm') ||
    title.includes('analista') ||
    title.includes('planejamento') ||
    title.includes('confiabilidade') ||
    title.includes('planner') ||
    perms.includes('maintenance:pcm') ||
    perms.includes('pcm');

  if (isPCM) return 'analista_pcm';

  /* Default manutenção: técnico, supervisor, auxiliar com acesso ao módulo */
  return 'supervisor';
}
