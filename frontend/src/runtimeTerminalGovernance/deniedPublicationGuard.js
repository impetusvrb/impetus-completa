/**
 * Phase Z.16 — bloqueio absoluto de publicações negadas.
 */

export function isModuleDenied(moduleId, dashboardMe) {
  const sgr = dashboardMe?.sidebar_governance_runtime || {};
  const denied = [
    ...(sgr.denied_publications || []),
    ...(sgr.removed_modules || []).map((r) => (typeof r === 'string' ? r : r.module || r))
  ].map((d) => String(d).toLowerCase());
  if (!denied.length) return false;
  const key = String(moduleId || '').toLowerCase();
  if (denied.includes(key)) return true;
  if (key.includes('safety') && denied.some((d) => d.includes('safety'))) return true;
  if (key.includes('environment') && denied.some((d) => d.includes('environment'))) return true;
  return false;
}

export function shouldBlockAllPublicationMerges(dashboardMe) {
  if (!dashboardMe?.sidebar_governance_runtime?.final_governance_locked) return false;
  return (dashboardMe.sidebar_governance_runtime.denied_publications || []).length > 0;
}
