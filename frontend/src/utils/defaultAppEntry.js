/**
 * Rota inicial após login — painel principal por defeito; admin → IA em texto.
 */
import { isStrictAdminRole } from './roleUtils';

const LEADERSHIP_ROLES = new Set(['ceo', 'diretor', 'gerente', 'coordenador', 'supervisor']);

export function markVoiceResetOnNextEntry() {
  try {
    sessionStorage.setItem('impetus_reset_voice_on_entry', '1');
    sessionStorage.removeItem('impetus_voice_user_initiated');
  } catch (_) {}
}

export function markVoiceUserInitiated() {
  try {
    sessionStorage.setItem('impetus_voice_user_initiated', '1');
  } catch (_) {}
}

/**
 * @param {object|null|undefined} user
 * @returns {string}
 */
export function resolveDefaultAppPath(user) {
  if (!user || typeof user !== 'object') return '/app';
  if (user.is_first_access) return '/setup-empresa';
  if (user.needs_factory_member_selection) return '/app/equipe-operacional';

  const role = String(user.role || 'colaborador').toLowerCase();

  if (user.needs_role_verification && !LEADERSHIP_ROLES.has(role)) {
    return '/validacao-cargo';
  }

  if (isStrictAdminRole(user) || role === 'admin' || role === 'internal_admin') {
    return '/app/chatbot';
  }

  if (LEADERSHIP_ROLES.has(role) || role === 'operador') {
    return '/app';
  }

  if (['colaborador', 'auxiliar_producao', 'auxiliar'].includes(role)) {
    return '/app';
  }

  return '/app';
}
