'use strict';

/**
 * @param {object|null} user
 * @param {object} [opts]
 */
function resolveDomainAudienceBand(user, opts = {}) {
  if (!user) return 'production';
  const role = String(user.role || '').toLowerCase();
  const profile = String(user.dashboard_profile || '').toLowerCase();

  if (role === 'internal_admin' || role === 'admin') return 'auditor';
  if (role === 'ceo' || role === 'diretor' || role === 'gerente') return 'director';
  if (role === 'coordenador' || role === 'supervisor') return 'coordinator';
  if (role === 'operador' || role === 'colaborador') return 'operator';
  if (profile.includes('inspector') || profile.includes('inspec')) return 'inspector';
  if (profile.includes('labor') || role === 'laboratorista') return 'laboratory';
  if (profile.includes('third') || profile.includes('terceiro')) return 'third_party';
  if (profile.includes('maintenance') || role.includes('mecan')) return 'maintenance';
  if (role === 'rh') return 'production';
  return opts.defaultBand || 'production';
}

module.exports = { resolveDomainAudienceBand };
