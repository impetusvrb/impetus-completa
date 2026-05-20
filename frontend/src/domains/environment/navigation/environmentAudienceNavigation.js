import {
  resolveMenuRole,
  isLeadershipMenuKey,
  shouldOfferPulseRhMenu,
  isStrictAdminRole
} from '../../../utils/roleUtils.js';

/** @typedef {'operator'|'technician'|'supervisor'|'coordinator'|'manager'|'director'|'auditor'|'production'} EnvironmentAudienceBand */

export function shouldPublishEnvironmentNavigation(user) {
  if (!user) return false;
  const fa = String(user.functional_area || user.functional_axis || user.area || user.department || '')
    .toLowerCase()
    .replace(/\s+/g, '_');
  if (['safety', 'environmental_health_safety', 'seguranca', 'sst'].some((k) => fa.includes(k))) {
    if (!['ambiental', 'environment', 'meio_ambiente', 'esg', 'sustentab'].some((k) => fa.includes(k))) {
      return false;
    }
  }
  const dept = String(user.department || user.job_title || '').toLowerCase();
  if (/(seguranca do trabalho|segurança do trabalho|\bsst\b)/.test(dept) && !/(ambiental|meio ambiente|esg)/.test(dept)) {
    return false;
  }
  return true;
}

export function resolveEnvironmentAudienceBand(user) {
  if (!user) return 'production';
  if (!shouldPublishEnvironmentNavigation(user)) return 'production';
  if (isStrictAdminRole(user)) return 'auditor';

  const fa = String(user.functional_area || user.functional_axis || user.area || user.department || '')
    .toLowerCase()
    .replace(/\s+/g, '_');
  if (['ambiental', 'environment', 'efluentes', 'eta', 'ete', 'laboratorio', 'meio_ambiente', 'sustentab', 'esg'].some((k) => fa.includes(k))) {
    return 'technician';
  }

  const menuKey = resolveMenuRole(user);
  const deptBlob = String(user.department || user.job_title || '').toLowerCase();
  const isEnvironmentalDept = /(ambiental|meio ambiente|esg|sustentab|emiss)/.test(deptBlob);
  const isSafetyDept = /(seguranca do trabalho|segurança do trabalho|\bsst\b)/.test(deptBlob) && !isEnvironmentalDept;

  if (isSafetyDept) return 'production';

  if (menuKey === 'ceo' || menuKey === 'diretor') {
    return isEnvironmentalDept ? 'director' : 'production';
  }
  if (menuKey === 'gerente') return isEnvironmentalDept ? 'manager' : 'production';
  if (menuKey === 'coordenador') return isEnvironmentalDept ? 'coordinator' : 'production';
  if (menuKey === 'supervisor') return isEnvironmentalDept ? 'supervisor' : 'production';
  if (menuKey === 'operador' || menuKey === 'colaborador') return 'operator';

  if (shouldOfferPulseRhMenu(user) && !isLeadershipMenuKey(menuKey)) return 'production';
  if (menuKey === 'admin') return 'auditor';
  return 'production';
}

export function resolveEnvironmentUxDensity(band) {
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
