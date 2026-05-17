/**
 * Audiência industrial SST — decision table (sem if(role) no Layout).
 */
import {
  resolveMenuRole,
  isLeadershipMenuKey,
  isMaintenanceProfile,
  shouldOfferPulseRhMenu,
  isStrictAdminRole
} from '../../../utils/roleUtils.js';

/** @typedef {'operator'|'coordinator'|'director'|'auditor'|'production'|'sst_technician'} SafetyAudienceBand */

/**
 * @param {object|null} user
 * @returns {SafetyAudienceBand}
 */
export function resolveSafetyAudienceBand(user) {
  if (!user) return 'production';
  if (isStrictAdminRole(user)) return 'auditor';

  const fa = String(user.functional_area || user.area || '')
    .toLowerCase()
    .replace(/\s+/g, '_');
  if (['sst', 'seguranca', 'safety', 'ehs', 'sesmt'].some((k) => fa.includes(k))) {
    return 'sst_technician';
  }

  if (isMaintenanceProfile(user)) return 'operator';

  const menuKey = resolveMenuRole(user);
  if (menuKey === 'ceo' || menuKey === 'diretor' || menuKey === 'gerente') return 'director';
  if (menuKey === 'coordenador' || menuKey === 'supervisor') return 'coordinator';
  if (menuKey === 'operador' || menuKey === 'colaborador') return 'operator';

  if (shouldOfferPulseRhMenu(user) && !isLeadershipMenuKey(menuKey)) return 'production';
  if (menuKey === 'rh') return 'production';
  if (menuKey === 'admin') return 'auditor';

  return 'production';
}

/**
 * @param {SafetyAudienceBand} band
 */
export function resolveSafetyUxDensity(band) {
  switch (band) {
    case 'operator':
    case 'production':
      return 'compact';
    case 'sst_technician':
    case 'coordinator':
      return 'tactical';
    case 'director':
      return 'executive';
    case 'auditor':
      return 'audit';
    default:
      return 'compact';
  }
}
