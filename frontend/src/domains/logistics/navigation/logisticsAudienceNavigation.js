import {
  resolveMenuRole,
  isLeadershipMenuKey,
  shouldOfferPulseRhMenu,
  isStrictAdminRole
} from '../../../utils/roleUtils.js';

/** @typedef {'operator'|'technician'|'supervisor'|'coordinator'|'manager'|'director'|'auditor'|'production'} LogisticsAudienceBand */

export function resolveLogisticsAudienceBand(user) {
  if (!user) return 'production';
  if (isStrictAdminRole(user)) return 'auditor';

  const fa = String(user.functional_area || user.area || '')
    .toLowerCase()
    .replace(/\s+/g, '_');
  if (['logistica', 'logistics', 'expedicao', 'wms', 'tms', 'almoxarifado'].some((k) => fa.includes(k))) {
    return 'technician';
  }

  const menuKey = resolveMenuRole(user);
  if (menuKey === 'ceo' || menuKey === 'diretor') return 'director';
  if (menuKey === 'gerente') return 'manager';
  if (menuKey === 'coordenador') return 'coordinator';
  if (menuKey === 'supervisor') return 'supervisor';
  if (menuKey === 'operador' || menuKey === 'colaborador') return 'operator';

  if (shouldOfferPulseRhMenu(user) && !isLeadershipMenuKey(menuKey)) return 'production';
  if (menuKey === 'admin') return 'auditor';
  return 'production';
}

export function resolveLogisticsUxDensity(band) {
  switch (band) {
    case 'operator':
    case 'production':
      return 'compact';
    case 'technician':
    case 'supervisor':
      return 'tactical';
    case 'coordinator':
    case 'manager':
      return 'tactical';
    case 'director':
      return 'executive';
    case 'auditor':
      return 'audit';
    default:
      return 'compact';
  }
}
