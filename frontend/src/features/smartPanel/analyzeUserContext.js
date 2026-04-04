/**
 * Carrega contexto do utilizador a partir de GET /dashboard/me (perfil, módulos, permissões).
 */
import { dashboard } from '../../services/api';
import { resolveMenuRole } from '../../utils/roleUtils';

/**
 * @returns {Promise<{
 *   userId: string,
 *   displayName: string,
 *   roleKey: string,
 *   roleLabel: string,
 *   department: string,
 *   permissions: string[],
 *   dataScope: string,
 *   accessibleModuleLabels: string[],
 *   profileLabel: string
 * }>}
 */
export async function analyzeUserContext() {
  try {
    const r = await dashboard.getMe();
    const d = r?.data || r;
    const rawUser = (() => {
      try {
        return JSON.parse(localStorage.getItem('impetus_user') || '{}');
      } catch {
        return {};
      }
    })();
    const uc = d?.user_context || {};
    const displayName =
      String(rawUser?.name || rawUser?.full_name || rawUser?.email || 'Utilizador').trim() || 'Utilizador';
    const roleKey = resolveMenuRole(rawUser);
    const roleLabel = String(rawUser?.role || roleKey || 'colaborador');
    const department = String(
      uc?.department || rawUser?.area || rawUser?.functional_area || d?.functional_area || ''
    ).trim();
    const permissions = Array.isArray(d?.effective_permissions) ? d.effective_permissions : [];
    const modules = Array.isArray(d?.visible_modules) ? d.visible_modules : [];
    return {
      userId: String(rawUser?.id || ''),
      displayName: displayName.split(/\s+/)[0] || displayName,
      roleKey,
      roleLabel,
      department: department || '—',
      permissions,
      dataScope: String(uc?.scope || 'department'),
      accessibleModuleLabels: modules.length ? modules : ['dashboard'],
      profileLabel: String(d?.profile_label || d?.profile_code || 'Perfil')
    };
  } catch (e) {
    return {
      userId: '',
      displayName: 'Utilizador',
      roleKey: 'colaborador',
      roleLabel: 'colaborador',
      department: '—',
      permissions: [],
      dataScope: 'department',
      accessibleModuleLabels: [],
      profileLabel: 'Perfil'
    };
  }
}
