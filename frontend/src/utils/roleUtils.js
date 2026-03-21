/**
 * IMPETUS - Utilitários de mapeamento de roles
 * Normaliza roles do backend (PT/EN, compostos) para chaves de menu/layout.
 */

const MAINTENANCE_PATTERN = /maintenance|manuten|mecan|eletric|technician_maintenance|manager_maintenance|coordinator_maintenance|supervisor_maintenance/i;

/**
 * Verifica se o usuário tem perfil de manutenção
 */
export function isMaintenanceProfile(user) {
  if (!user) return false;
  const role = (user.role || '').toLowerCase();
  const area = (user.functional_area || user.area || '').toLowerCase();
  const profile = (user.dashboard_profile || '').toLowerCase();
  return MAINTENANCE_PATTERN.test(role) || MAINTENANCE_PATTERN.test(area) || MAINTENANCE_PATTERN.test(profile);
}

/**
 * Mapeia role/profile para chave de menu do Layout (admin, diretor, gerente, coordenador, supervisor, colaborador, ceo)
 */
export function resolveMenuRole(user) {
  if (!user) return 'colaborador';
  const role = (user.role || '').toLowerCase();
  const profile = (user.dashboard_profile || '').toLowerCase();

  if (role === 'admin' || profile === 'admin_system') return 'admin';
  if (role === 'ceo' || profile === 'ceo_executive') return 'ceo';
  if (role.includes('diretor') || profile.includes('director')) return 'diretor';
  if (role.includes('gerente') || role.includes('manager') || profile.includes('manager_')) return 'gerente';
  if (role.includes('coordenador') || role.includes('coordinator') || profile.includes('coordinator_')) return 'coordenador';
  if (role.includes('supervisor') || profile.includes('supervisor_')) return 'supervisor';

  return 'colaborador';
}
