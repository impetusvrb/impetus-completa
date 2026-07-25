/**
 * REG-002 R3 — Política única de acesso ao núcleo industrial.
 *
 * Fonte de verdade partilhada por App.jsx (route guard) e Layout.jsx (menu).
 * Critério = o mais restritivo já aplicado nas rotas (App.jsx canAccessIndustrialCore):
 * - CEO: sempre
 * - Diretor: apenas se perfil industrial/operations ou área industrial/operações
 *
 * Não amplia permissões de rota. Alinha o menu para não mostrar itens que a rota bloqueia.
 */
export function canAccessIndustrialCore(user) {
  try {
    const u = user && typeof user === 'object' ? user : {};
    const role = String(u.role || '').toLowerCase();
    if (role === 'ceo') return true;
    if (role !== 'diretor') return false;

    const profile = String(u.dashboard_profile || '').toLowerCase();
    const area = String(u.functional_area || u.area || '').toLowerCase();
    return (
      profile === 'director_industrial' ||
      profile === 'director_operations' ||
      area.includes('industrial') ||
      area.includes('operations') ||
      area.includes('operacoes')
    );
  } catch {
    return false;
  }
}

/**
 * Variante para menu: requer também módulo `operational` visível (RBAC servidor).
 * CEO/diretor industrial sem módulo operacional não vê o bloco.
 */
export function canAccessIndustrialCoreModules(user, visibleModules = []) {
  const set = visibleModules instanceof Set ? visibleModules : new Set(visibleModules || []);
  if (!set.has('operational')) return false;
  return canAccessIndustrialCore(user);
}

export const INDUSTRIAL_CORE_PATHS = Object.freeze([
  '/app/centro-operacoes-industrial',
  '/app/cerebro-operacional',
  '/app/insights'
]);
