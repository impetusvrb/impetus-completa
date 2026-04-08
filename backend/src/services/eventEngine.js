'use strict';

const dashboardKPIs = require('./dashboardKPIs');
const hierarchicalFilter = require('./hierarchicalFilter');

function asNumber(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function mapKpiToEvent(kpi, user) {
  const key = String(kpi?.key || kpi?.id || '').toLowerCase();
  const title = String(kpi?.title || 'Indicador');
  const value = asNumber(kpi?.value, 0);
  const growth = asNumber(kpi?.growth, 0);
  let eventType = 'indicador_operacional';
  let setor = String(user?.functional_area || user?.area || 'operacional');
  let criticality = 'low';
  let impact = Math.abs(growth) > 10 ? 'high' : 'medium';
  let requiresAction = false;

  if (key.includes('alert') || key.includes('critical')) { eventType = 'alerta_critico'; criticality = 'high'; impact = 'high'; requiresAction = true; }
  else if (key.includes('loss') || key.includes('refugo') || key.includes('desperd')) { eventType = 'perda_operacional'; setor = 'producao'; criticality = value > 20 ? 'high' : 'medium'; requiresAction = value > 10; }
  else if (key.includes('absen') || key.includes('turnover') || key.includes('team')) { eventType = 'pessoas_risco'; setor = 'rh'; criticality = value > 10 ? 'high' : 'medium'; requiresAction = value > 8; }
  else if (key.includes('work_order') || key.includes('mttr') || key.includes('availability')) { eventType = 'manutencao_desempenho'; setor = 'manutencao'; criticality = growth < -8 ? 'high' : 'medium'; requiresAction = true; }
  else if (key.includes('quality') || key.includes('nc') || key.includes('deviation')) { eventType = 'qualidade_desvio'; setor = 'qualidade'; criticality = value > 5 ? 'high' : 'medium'; requiresAction = value > 3; }
  else if (key.includes('cost') || key.includes('financial') || key.includes('margin')) { eventType = 'financeiro_desvio'; setor = 'financeiro'; criticality = growth > 8 ? 'high' : 'medium'; requiresAction = growth > 5; }

  const trendDirection = growth > 0 ? 'up' : growth < 0 ? 'down' : 'stable';
  return {
    id: `evt_${key || Math.random().toString(36).slice(2, 8)}`,
    type: eventType,
    setor,
    criticality,
    impact,
    timestamp: new Date().toISOString(),
    origin: 'kpi',
    profiles_relevant: ['ceo', 'diretor', 'gerente', 'coordenador', 'supervisor', 'colaborador'],
    requires_action: requiresAction,
    payload: {
      key,
      title,
      value: kpi?.value,
      growth: kpi?.growth,
      color: kpi?.color || 'blue',
      trend: trendDirection,
      interpretation:
        value === 0
          ? 'Sem volume suficiente para análise estatística nesta janela.'
          : growth > 10
            ? 'Crescimento relevante detectado no período recente.'
            : growth < -10
              ? 'Queda relevante detectada no período recente.'
              : 'Variação dentro do padrão operacional esperado.'
    }
  };
}

async function collectOperationalEvents(user) {
  const scope = await hierarchicalFilter.resolveHierarchyScope(user);
  const kpis = await dashboardKPIs.getDashboardKPIs(user, scope).catch(() => []);
  const events = (kpis || []).map((k) => mapKpiToEvent(k, user));
  if (!events.length) events.push({ id: 'evt_no_data', type: 'sem_dados', setor: String(user?.functional_area || 'operacional'), criticality: 'low', impact: 'low', timestamp: new Date().toISOString(), origin: 'system', profiles_relevant: ['*'], requires_action: false, payload: { message: 'Nenhum evento relevante detectado no momento.' } });
  return events;
}

module.exports = { collectOperationalEvents };
