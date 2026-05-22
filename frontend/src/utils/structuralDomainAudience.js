/**
 * Espelho leve do backend — classificação RH / SST / industrial para menu e publicações.
 */

function norm(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function blob(user) {
  const u = user || {};
  return norm(
    [
      u.role,
      u.job_title,
      u.cargo,
      u.department,
      u.functional_area,
      u.area,
      u.dashboard_profile,
      u.hr_responsibilities,
      u.structural_profile?.cargo,
      u.structural_profile?.departamento,
      u.structural_profile?.descricao
    ]
      .filter(Boolean)
      .join(' ')
  );
}

export function isHrDomainUser(user) {
  if (!user) return false;
  const prof = norm(user.dashboard_profile);
  if (prof.includes('hr') || prof === 'hr_management') return true;
  if (norm(user.role) === 'rh') return true;
  const b = blob(user);
  if (/\b(recursos humanos|gestao de pessoas|people|rh\b|hrbp|clima organizacional)\b/.test(b)) {
    return true;
  }
  return user.structural_profile?.eixo_primario === 'eixo_humano';
}

export function isSafetyDomainUser(user) {
  if (!user) return false;
  if (isHrDomainUser(user)) return false;
  const prof = norm(user.dashboard_profile);
  if (prof.includes('safety') || prof.includes('sst') || prof.includes('seguranca')) return true;
  const b = blob(user);
  if (/\b(seguranca do trabalho|sst\b|sesmt|tecnico de seguranca|engenharia de seguranca)\b/.test(b)) {
    return true;
  }
  return user.structural_profile?.eixo_primario === 'eixo_seguranca';
}

export function userQualifiesForSafetyMenu(user, visibleModules) {
  if (!Array.isArray(visibleModules) || !visibleModules.includes('safety_intelligence')) {
    return false;
  }
  return isSafetyDomainUser(user);
}
