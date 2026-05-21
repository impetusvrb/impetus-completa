/**
 * Phase Z.15 — auditoria de render do sidebar (client-side, observability).
 */

export function auditSidebarRender(menuItems = [], dashboardMe = {}) {
  const runtime = dashboardMe?.sidebar_governance_runtime || {};
  const finalSet = new Set(
    (runtime.final_visible_modules || dashboardMe?.visible_modules || []).map((m) => String(m).toLowerCase())
  );
  const divergence = [];
  for (const item of menuItems || []) {
    if (item._safety_publication && !finalSet.has('safety_intelligence')) {
      divergence.push({ path: item.path, reason: 'safety_publication_without_module_key' });
    }
    if (item._environment_publication && !finalSet.has('environment_intelligence')) {
      divergence.push({ path: item.path, reason: 'environment_publication_without_module_key' });
    }
  }
  return {
    governance_applied: runtime.governance_applied === true,
    menu_item_count: menuItems.length,
    final_visible_count: finalSet.size,
    divergence,
    render_bypass_detected: divergence.length > 0
  };
}
