'use strict';

const flagsZ26 = require('../../../config/phaseZ26FeatureFlags');
const { loadHrTenantSignals } = require('../bridge/hrTenantSignalLoader');

const EXECUTIVE_LEAK_TITLES = /ebitda|faturamento|lucro|margem|oee|uptime|producao do turno|eficiencia.*linha/i;

function isHrNativeKpiProfile(profileCode = '', functionalArea = '') {
  const pc = String(profileCode || '').toLowerCase();
  const fa = String(functionalArea || '').toLowerCase();
  return (
    flagsZ26.isPilotProfile(pc) ||
    pc === 'hr_management' ||
    fa === 'hr' ||
    fa === 'rh' ||
    pc.includes('_hr')
  );
}

async function buildHrNativeKpis(user = {}, ctx = {}) {
  const signals = await loadHrTenantSignals(user, { ...ctx, mock_signals: ctx.mock_signals });
  const op = signals.operational || {};

  const kpis = [
    {
      id: 'hr_turnover_risk',
      key: 'hr_turnover_risk',
      title: 'Risco turnover',
      value: op.turnover_risk_proxy ?? 0,
      color: 'amber',
      route: '/app/pulse-rh',
      icon: 'trending'
    },
    {
      id: 'hr_absenteeism',
      key: 'hr_absenteeism',
      title: 'Absenteísmo',
      value: `${op.absence_index ?? 0}%`,
      color: 'orange',
      route: '/app/pulse-rh',
      icon: 'alert'
    },
    {
      id: 'hr_training',
      key: 'hr_training',
      title: 'Treinamentos pendentes',
      value: op.training_overdue_proxy ?? 0,
      color: 'purple',
      route: '/app/pulse-rh',
      icon: 'target'
    },
    {
      id: 'hr_retention',
      key: 'hr_retention',
      title: 'Score retenção',
      value: op.retention_risk_score ?? 0,
      color: 'red',
      icon: 'activity'
    },
    {
      id: 'hr_open_positions',
      key: 'hr_open_positions',
      title: 'Vagas / pipeline',
      value: op.open_positions_proxy ?? 0,
      color: 'blue',
      icon: 'users'
    },
    {
      id: 'hr_pulse',
      key: 'hr_pulse',
      title: 'Pulse / clima',
      value: op.pulse_evaluations ?? 0,
      color: 'teal',
      route: '/app/pulse-rh',
      icon: 'brain'
    },
    {
      id: 'hr_workforce_health',
      key: 'hr_workforce_health',
      title: 'Saúde organizacional',
      value: `${Math.max(0, 100 - (op.retention_risk_score ?? 0) / 2)}%`,
      color: 'green',
      icon: 'activity'
    },
    {
      id: 'hr_headcount',
      key: 'hr_headcount',
      title: 'Colaboradores activos',
      value: op.active_headcount ?? 0,
      color: 'cyan',
      icon: 'users'
    }
  ];

  return kpis.filter((k) => !EXECUTIVE_LEAK_TITLES.test(k.title));
}

module.exports = { isHrNativeKpiProfile, buildHrNativeKpis };
