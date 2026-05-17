/**
 * Resolução de audiência industrial para o domínio QUALITY (sem if(role) no Layout).
 * Single decision table: menuKey × contexto funcional × perfis.
 */

import {
  resolveMenuRole,
  isLeadershipMenuKey,
  isMaintenanceProfile,
  shouldOfferPulseRhMenu,
  isStrictAdminRole
} from '../../../utils/roleUtils.js';

/** @typedef {'operator'|'coordinator'|'director'|'auditor'|'production'} QualityAudienceBand */

/**
 * @param {object|null} user
 * @returns {QualityAudienceBand}
 */
export function resolveQualityAudienceBand(user) {
  if (!user) return 'production';
  if (isStrictAdminRole(user)) return 'auditor';
  if (isMaintenanceProfile(user)) return 'production';

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
 * Densidade cognitiva sugerida para UX adaptativa (atributo data / CSS).
 * @param {QualityAudienceBand} band
 */
export function resolveQualityUxDensity(band) {
  switch (band) {
    case 'operator':
    case 'production':
      return 'compact';
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
