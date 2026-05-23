export function adaptMaintenanceFallback(runtime = {}) {
  const readiness = runtime.telemetry_readiness || 'unavailable';
  return {
    mode: readiness === 'empty' ? 'empty_feed' : readiness === 'degraded' ? 'degraded' : readiness === 'unavailable' ? 'unavailable' : 'ready',
    graceful: readiness !== 'error'
  };
}

export default adaptMaintenanceFallback;
