'use strict';

/**
 * Fallback determinístico de KPIs — usado apenas quando o serviço base
 * não devolve nenhum KPI. Garante que o frontend nunca recebe array vazio
 * sem feedback claro.
 *
 * NÃO inventa dados de negócio: devolve placeholders explicitamente
 * marcados como `degraded: true`.
 */
function fallbackKpis(user = {}, _ctx = {}) {
  const profile = user?.dashboard_profile || user?.role || 'colaborador';
  return [
    {
      id: 'sovereign_kpi_state',
      key: 'sovereign_kpi_state',
      title: 'KPIs indisponíveis no momento',
      value: null,
      unit: null,
      status: 'degraded',
      degraded: true,
      runtime_source: 'z_kpi_fallback_runtime',
      profile,
      meta: { reason: 'no_kpis_returned_by_source', non_blocking: true }
    }
  ];
}

module.exports = { fallbackKpis };
