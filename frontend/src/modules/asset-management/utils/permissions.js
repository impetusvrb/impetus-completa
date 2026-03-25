/**
 * Permissões por perfil — alinhado à matriz ManuIA Gestão de Ativos (sec. 2.3)
 */
const BY_PROFILE = {
  gerente: new Set([
    'strategicKpis',
    'twinsViewSummary',
    'ordersViewAll',
    'ordersApproveP1P2',
    'ordersApproveP3P4',
    'ordersReassign',
    'ordersCreateManual',
    'stockViewSummary',
    'insightsView',
    'reportsManagerial'
  ]),
  supervisor: new Set([
    'operationalDashboard',
    'twinsViewFull',
    'twinSimulateFailure',
    'stockView',
    'ordersViewAll',
    'ordersApproveP3P4',
    'ordersReassign',
    'ordersCreateManual',
    'insightsView',
    'reportsTechnical'
  ]),
  analista_pcm: new Set([
    'pcmDashboard',
    'twinsViewFull',
    'twinSimulateFailure',
    'stockView',
    'stockPurchaseOrder',
    'stockAdjustReorder',
    'ordersViewAll',
    'insightsView',
    'reportsTechnical'
  ])
};

export function can(profile, permission) {
  const set = BY_PROFILE[String(profile || '').toLowerCase()];
  if (!set) return false;
  return set.has(permission);
}
