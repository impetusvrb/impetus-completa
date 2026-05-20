/**
 * Guard de runtime técnico (Fase D) — espelho do backend para UI.
 * Não altera design system; apenas bloqueia JSON bruto em hubs técnicos.
 */

function resolveUserAxis(user) {
  if (!user) return 'operations';
  const fa = String(user.functional_axis || user.functional_area || '').toLowerCase().replace(/\s+/g, '_');
  if (['safety', 'environmental_health_safety', 'seguranca', 'sst'].includes(fa)) return 'safety';
  if (['environmental', 'sustainability', 'esg', 'utilities', 'ambiental', 'meio_ambiente'].includes(fa)) {
    return 'environmental';
  }
  if (fa.includes('quality') || fa === 'quality') return 'quality';
  if (fa.includes('finance')) return 'finance';
  if (fa.includes('hr') || fa === 'rh') return 'hr';
  const dept = String(user.department || user.job_title || '').toLowerCase();
  if (/(seguranca do trabalho|segurança do trabalho|\bsst\b)/.test(dept) && !/(ambiental|esg)/.test(dept)) return 'safety';
  if (/(ambiental|meio ambiente|esg)/.test(dept)) return 'environmental';
  return 'operations';
}

export function isRuntimeTechnicalGuardEnabled() {
  const v = import.meta.env?.VITE_IMPETUS_RUNTIME_TECHNICAL_GUARD;
  if (v === undefined || v === '') return true;
  return String(v).toLowerCase() === 'on' || v === '1';
}

export function evaluateTechnicalRuntimeAccess(user, scope = 'ui') {
  if (!isRuntimeTechnicalGuardEnabled()) return { allowed: true };
  const axis = resolveUserAxis(user);
  const role = String(user?.role || user?.perfil || '').toLowerCase();
  if (['admin', 'internal_admin', 'super_admin'].includes(role) && (user?.hierarchy_level ?? 5) <= 1) {
    return { allowed: true, reason: 'admin' };
  }
  if (axis === 'engineering' || axis === 'admin') return { allowed: true, reason: 'axis' };
  const operationalAxes = [
    'safety',
    'environmental',
    'sustainability',
    'esg',
    'utilities',
    'hr',
    'finance',
    'quality',
    'operations'
  ];
  if (operationalAxes.includes(axis)) {
    const redirect =
      axis === 'safety' ?
        '/app/safety/operational' :
        ['environmental', 'sustainability', 'esg', 'utilities'].includes(axis) ?
          '/app/environment/operational' :
          '/app';
    return {
      allowed: false,
      reason: 'domain_blocked',
      axis,
      user_message:
        'Detalhes técnicos de runtime estão disponíveis apenas para engenharia de plataforma.',
      redirect_path: redirect
    };
  }
  return { allowed: true, reason: 'default' };
}

export function readUserFromStorage() {
  try {
    return JSON.parse(localStorage.getItem('impetus_user') || '{}');
  } catch {
    return {};
  }
}
