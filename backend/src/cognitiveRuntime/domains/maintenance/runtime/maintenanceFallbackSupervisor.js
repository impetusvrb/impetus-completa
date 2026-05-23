'use strict';

function superviseMaintenanceFallback(consolidated = {}, payload = {}) {
  if (consolidated.telemetry_readiness === 'unavailable' || consolidated.telemetry_readiness === 'error') {
    return {
      ...consolidated,
      fallback_mode: 'graceful_unavailable',
      centers: (consolidated.centers || []).map((c) => ({
        ...c,
        summary: c.summary || 'Telemetria indisponível — modo graceful'
      }))
    };
  }
  if (consolidated.telemetry_readiness === 'empty') {
    return {
      ...consolidated,
      fallback_mode: 'empty_feed',
      specialized_summary: consolidated.specialized_summary || 'Sem feed de manutenção — aguardando dados reais'
    };
  }
  return { ...consolidated, fallback_mode: 'none' };
}

module.exports = { superviseMaintenanceFallback };
