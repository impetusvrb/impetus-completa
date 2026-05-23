export function superviseExecutiveFallback(runtime = null) {
  if (!runtime) return { mode: 'legacy', reason: 'no_executive_runtime' };
  if (runtime.aggregation_readiness === 'empty') {
    return { mode: 'graceful_empty', reason: 'aggregation_partial' };
  }
  return { mode: 'boardroom', reason: 'executive_native' };
}

export default superviseExecutiveFallback;
