'use strict';

const flagsZP0 = require('../../../config/phaseZP0FeatureFlags');
const { loadProductionTenantSignals } = require('../bridge/productionSignalLoader');

const EXECUTIVE_LEAK = /ebitda|faturamento|lucro|margem|turnover|absenteismo|esg board/i;

function isProductionNativeKpiProfile(profileCode = '', functionalArea = '') {
  const pc = String(profileCode || '').toLowerCase();
  const fa = String(functionalArea || '').toLowerCase();
  return flagsZP0.isPilotProfile(pc) || fa === 'production' || fa === 'producao' || pc.includes('pcp');
}

async function buildProductionNativeKpis(user = {}, ctx = {}) {
  const signals = await loadProductionTenantSignals(user, { ...ctx, mock_signals: ctx.mock_signals });
  const op = signals.operational || {};
  const oee = signals.oee_context || {};

  const kpis = [
    {
      id: 'production_oee_contextual',
      key: 'production_oee_contextual',
      title: 'OEE contextual',
      value: oee.weighted_oee != null ? `${oee.weighted_oee}%` : '—',
      color: 'cyan',
      route: '/app/industrial',
      icon: 'activity'
    },
    {
      id: 'production_throughput',
      key: 'production_throughput',
      title: 'Throughput turno',
      value: op.throughput ?? 0,
      color: 'blue',
      route: '/app/industrial',
      icon: 'trending'
    },
    {
      id: 'production_downtime',
      key: 'production_downtime',
      title: 'Downtime proxy',
      value: op.downtime_proxy ?? 0,
      color: 'amber',
      icon: 'alert'
    },
    {
      id: 'production_scrap',
      key: 'production_scrap',
      title: 'Scrap / perdas',
      value: op.scrap_qty ?? 0,
      color: 'red',
      icon: 'target'
    },
    {
      id: 'production_efficiency',
      key: 'production_efficiency',
      title: 'Eficiência turno',
      value: op.efficiency_pct != null ? `${op.efficiency_pct}%` : '—',
      color: 'green',
      icon: 'zap'
    },
    {
      id: 'production_stability',
      key: 'production_stability',
      title: 'Estabilidade',
      value: op.stability_index ?? 0,
      color: 'teal',
      icon: 'activity'
    },
    {
      id: 'production_critical_lines',
      key: 'production_critical_lines',
      title: 'Linhas críticas',
      value: op.lines_active ?? 0,
      color: 'orange',
      icon: 'map'
    },
    {
      id: 'production_availability',
      key: 'production_availability',
      title: 'Disponibilidade sensores',
      value: signals.raw?.monitored?.total ?? 0,
      color: 'purple',
      icon: 'brain'
    }
  ];

  return kpis.filter((k) => !EXECUTIVE_LEAK.test(k.title));
}

module.exports = { isProductionNativeKpiProfile, buildProductionNativeKpis };
