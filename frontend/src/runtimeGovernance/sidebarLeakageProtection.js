/**
 * Phase Z.14/Z.15 — bloqueia publicações e reinjection de módulos negados.
 */

function _deniedSet(dashboardMePayload) {
  const runtime = dashboardMePayload?.sidebar_governance_runtime || {};
  const pubs = runtime.denied_publications || [];
  const removed = (runtime.removed_modules || []).map((r) => (typeof r === 'string' ? r : r.module || r));
  return [...pubs, ...removed].map((d) => String(d).toLowerCase());
}

export function isReinjectionBlocked(moduleId, dashboardMePayload) {
  const key = String(moduleId || '').toLowerCase();
  const denied = _deniedSet(dashboardMePayload);
  if (!denied.length) return false;
  if (denied.includes(key)) return true;
  if (key.includes('safety') && denied.some((d) => d.includes('safety'))) return true;
  if (key.includes('environment') && denied.some((d) => d.includes('environment'))) return true;
  return denied.some((d) => key.includes(d) || d.includes(key));
}

export function shouldBlockPublicationMerge(publicationKind, dashboardMePayload) {
  const denied = _deniedSet(dashboardMePayload);
  if (!denied.length) return false;
  const kind = String(publicationKind || '').toLowerCase();
  return denied.some((d) => d.includes(kind));
}

export function filterMenuItemsByGovernance(menuItems, dashboardMePayload) {
  const sgr = dashboardMePayload?.sidebar_governance_runtime || {};
  const locked = dashboardMePayload?.governance_freeze_state?.governance_locked === true ||
    sgr.final_governance_locked === true;
  if (!sgr.governance_applied && !locked) {
    return menuItems;
  }
  const visible = new Set(
    (sgr.final_visible_modules || dashboardMePayload?.visible_modules || []).map(
      (m) => String(m).toLowerCase()
    )
  );
  return (menuItems || []).filter((item) => {
    if (item._safety_publication && !visible.has('safety_intelligence')) return false;
    if (item._environment_publication && !visible.has('environment_intelligence')) return false;
    if (item._quality_publication && !visible.has('quality_intelligence')) return false;
    if (item._logistics_publication && !visible.has('logistics_intelligence')) return false;
    const mod = item._module_id || item._safety_manifest_id;
    if (mod && isReinjectionBlocked(mod, dashboardMePayload)) return false;
    return true;
  });
}
