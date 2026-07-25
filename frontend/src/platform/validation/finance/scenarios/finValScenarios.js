/**
 * FIN-VAL-001 — Exception / degradation scenarios.
 */
export const FIN_VAL_EXCEPTION_SCENARIOS = Object.freeze([
  Object.freeze({
    id: 'EX-FIN-001',
    label: 'Aumento abrupto de custos',
    trigger: 'operational.per_day spike vs baseline month/30',
    expect: 'performance variance / efficiency reflect spike; hub KPIs update'
  }),
  Object.freeze({
    id: 'EX-FIN-002',
    label: 'Perda financeira (Leakage)',
    trigger: 'high-severity leakage alert + projected impact',
    expect: 'economic_losses > 0; twin operational_risk elevated/high; decisions compose'
  }),
  Object.freeze({
    id: 'EX-FIN-003',
    label: 'Mudança de driver de custo',
    trigger: 'plantRateProvider / by-origin rate change',
    expect: 'driver contributions recalculate; unit cost may change; evidence trace updated'
  }),
  Object.freeze({
    id: 'EX-FIN-004',
    label: 'Alteração de valuation do estoque',
    trigger: 'wms row metadata average_cost / lot_cost change',
    expect: 'lotCosts / valuation attrs update via wms_valuation adapter'
  }),
  Object.freeze({
    id: 'EX-FIN-005',
    label: 'Indisponibilidade de fonte (degradação controlada)',
    trigger: 'missing byOrigin / empty costs / twin state null',
    expect: 'composition soft-fails; parallelTwin false; no throw; hub shows partial state'
  })
]);

export function validateFinValScenarios() {
  const issues = [];
  if (FIN_VAL_EXCEPTION_SCENARIOS.length < 5) issues.push('exception scenarios incomplete');
  for (const s of FIN_VAL_EXCEPTION_SCENARIOS) {
    if (!s.trigger || !s.expect) issues.push(`${s.id} incomplete`);
  }
  return { valid: issues.length === 0, issues, count: FIN_VAL_EXCEPTION_SCENARIOS.length };
}
