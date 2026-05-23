const DENIED = /ebitda|oee|turnover|boardroom executivo|production_shift/i;

export function validateEnvironmentalSemantics(resolved = {}) {
  const blob = JSON.stringify(resolved);
  return { ok: !DENIED.test(blob), leaks: DENIED.test(blob) ? ['cross_domain'] : [] };
}

export default validateEnvironmentalSemantics;
