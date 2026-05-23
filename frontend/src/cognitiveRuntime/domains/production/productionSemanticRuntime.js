/** Z.P0 — isolamento semântico frontend */

const DENIED = /ebitda|faturamento|turnover|absenteismo|apr\/pt|loto|esg board|boardroom/i;

export function validateProductionSemantics(resolved = {}) {
  const blob = JSON.stringify(resolved);
  const leak = DENIED.test(blob);
  return { ok: !leak, leaks: leak ? ['cross_domain'] : [] };
}

export default validateProductionSemantics;
