'use strict';

/**
 * Classificação de domínio funcional do utilizador (RH, SST, industrial, financeiro).
 * Usado para menu, módulos e publicações de domínio (Safety, Quality, etc.).
 */

const { interpretProfileContext, normalizeText } = require('./profileContextInterpreter');
const { normalizeStructuralUser } = require('./structuralUserProfileService');

const HR_PROFILES = new Set([
  'hr_management',
  'director_hr',
  'supervisor_hr',
  'coordinator_hr',
  'manager_hr'
]);

const INDUSTRIAL_DIRECTOR_PROFILES = new Set([
  'director_industrial',
  'director_operations',
  'director_executive',
  'ceo_executive',
  'manager_production',
  'supervisor_production'
]);

function _blob(user) {
  const u = normalizeStructuralUser(user);
  return normalizeText(
    [
      u.role,
      u.funcao_label,
      u.job_title,
      u.cargo,
      u.department,
      u.functional_area,
      u.area,
      u.dashboard_profile,
      u.hr_responsibilities,
      u.company_role_name,
      u._structural_interpretation_text
    ]
      .filter(Boolean)
      .join(' ')
  );
}

function isHrDomainUser(user) {
  if (!user) return false;
  const prof = String(user.dashboard_profile || '').toLowerCase();
  if (HR_PROFILES.has(prof) || prof.includes('hr')) return true;
  const role = String(user.role || '').toLowerCase();
  if (role === 'rh') return true;
  const b = _blob(user);
  if (
    /\b(recursos humanos|gestao de pessoas|gestão de pessoas|people|rh\b|hrbp|clima organizacional|folha de pagamento)\b/.test(
      b
    )
  ) {
    return true;
  }
  const ctx = interpretProfileContext(normalizeStructuralUser(user));
  return ctx.primary_axis === 'eixo_humano';
}

function isSafetyDomainUser(user) {
  if (!user) return false;
  const prof = String(user.dashboard_profile || '').toLowerCase();
  if (prof.includes('safety') || prof.includes('sst') || prof.includes('seguranca')) return true;
  const b = _blob(user);
  if (
    /\b(seguranca do trabalho|sst\b|sesmt|tecnico de seguranca|técnico de seguranca|engenharia de seguranca|ehs\b)\b/.test(
      b
    )
  ) {
    return true;
  }
  const ctx = interpretProfileContext(normalizeStructuralUser(user));
  if (ctx.primary_axis === 'eixo_seguranca') return true;
  return (ctx.responsibilities || []).includes('seguranca') && !isHrDomainUser(user);
}

function isIndustrialDirectorUser(user) {
  if (!user) return false;
  const role = String(user.role || '').toLowerCase();
  if (!['diretor', 'director', 'ceo', 'gerente'].includes(role)) return false;
  if (isHrDomainUser(user) || isSafetyDomainUser(user)) return false;
  const prof = String(user.dashboard_profile || '').toLowerCase();
  if (INDUSTRIAL_DIRECTOR_PROFILES.has(prof)) return true;
  if (prof.startsWith('director_') && !prof.includes('hr')) return true;
  const b = _blob(user);
  return /\b(industrial|operacoes|operações|producao|produção|plant|fabrica|fábrica)\b/.test(b);
}

/**
 * Menu / módulos SST só para perfil de domínio SST (não para diretor de RH ou diretor industrial genérico).
 */
function userQualifiesForSafetyDomain(user) {
  if (!user) return false;
  if (isHrDomainUser(user)) return false;
  return isSafetyDomainUser(user);
}

/**
 * Módulos RH (Pulse, hr_intelligence) — perfil de pessoas.
 */
function userQualifiesForHrDomain(user) {
  return isHrDomainUser(user);
}

module.exports = {
  HR_PROFILES,
  isHrDomainUser,
  isSafetyDomainUser,
  isIndustrialDirectorUser,
  userQualifiesForSafetyDomain,
  userQualifiesForHrDomain
};
