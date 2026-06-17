'use strict';

/**
 * Séries temporais e agregados para gráficos do Centro de Comando.
 * Dados reais (BD), escopo por company_id + hierarquia; personalização por perfil estrutural.
 */
const db = require('../db');
const hierarchicalFilter = require('./hierarchicalFilter');
const dashboardProfileResolver = require('./dashboardProfileResolver');
const industrialCostService = require('./industrialCostService');

const MONTHS_PT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function clampInt(v, min, max, fallback) {
  const n = parseInt(v, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function formatMonthLabel(ts) {
  const d = ts instanceof Date ? ts : new Date(ts);
  if (Number.isNaN(d.getTime())) return '-';
  return `${MONTHS_PT[d.getMonth()]}/${String(d.getFullYear()).slice(-2)}`;
}

function formatWeekLabel(ts) {
  const d = ts instanceof Date ? ts : new Date(ts);
  if (Number.isNaN(d.getTime())) return '-';
  const day = d.getDate();
  const mon = MONTHS_PT[d.getMonth()];
  return `S${day} ${mon}`;
}

function scaffoldMonths(months) {
  const out = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push({
      label: formatMonthLabel(d),
      periodo: d.toISOString(),
      valor: 0,
      total: 0,
      count: 0
    });
  }
  return out;
}

function mergeMonthlyScaffold(scaffold, rows, valueKey = 'total') {
  const byKey = new Map();
  for (const row of rows || []) {
    const d = new Date(row.ts || row.periodo);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    byKey.set(key, parseInt(row[valueKey] ?? row.total ?? row.valor ?? 0, 10));
  }
  return scaffold.map((s) => {
    const d = new Date(s.periodo);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const v = byKey.get(key);
    return v != null ? { ...s, valor: v, total: v, count: v } : s;
  });
}

function userCanSeeFinancialValues(user) {
  const perms = new Set(Array.isArray(user?.permissions) ? user.permissions : []);
  if (perms.has('*') || perms.has('VIEW_FINANCIAL') || perms.has('VIEW_STRATEGIC')) return true;
  const role = String(user?.role || '').toLowerCase();
  if (role === 'financeiro' || role === 'admin') return true;
  const cfg = dashboardProfileResolver.getDashboardConfigForUser(user);
  const area = String(cfg?.functional_area || '').toLowerCase();
  const code = String(cfg?.profile_code || '').toLowerCase();
  if (area.includes('financ') || code.includes('finance')) return true;
  const level = user?.hierarchy_level;
  if (level != null && level <= 2 && role === 'diretor') return true;
  return false;
}

function normalizeFunctionalAxis(user, cfg) {
  const sp = user?.structural_profile || {};
  let axis = String(
    sp.eixo_primario || sp.functional_axis || user?.functional_axis || cfg?.functional_area || 'operacional'
  )
    .toLowerCase()
    .replace(/^eixo_/, '');
  if (axis === 'hr' || axis === 'humano') return 'humano';
  if (axis === 'executive' || axis === 'executivo') return 'executivo';
  return axis || 'operacional';
}

function resolveChartProfile(user) {
  const cfg = dashboardProfileResolver.getDashboardConfigForUser(user);
  const axis = normalizeFunctionalAxis(user, cfg);
  const code = String(cfg?.profile_code || user?.dashboard_profile || '').toLowerCase();
  const role = String(user?.role || '').toLowerCase();
  const dept = String(user?.department || user?.departamento || '').toLowerCase();

  const hrDashboard =
    code.includes('hr') ||
    code.includes('rh') ||
    role === 'rh' ||
    dept.includes('rh') ||
    dept.includes('pessoas') ||
    dept.includes('recursos humanos') ||
    axis === 'humano' || axis === 'hr';

  const financeDashboard =
    role === 'financeiro' ||
    code.includes('finance') ||
    axis === 'financeiro' ||
    dept.includes('financ');

  const productionFocus =
    axis === 'producao' ||
    axis === 'operacional' ||
    dept.includes('produ') ||
    dept.includes('oper') ||
    ['ceo', 'diretor', 'gerente'].includes(role);

  return {
    profile_code: code,
    functional_axis: axis,
    hr_dashboard: hrDashboard,
    finance_dashboard: financeDashboard,
    production_focus: productionFocus,
    can_see_costs: userCanSeeFinancialValues(user)
  };
}

async function getCommunicationsMonthlyTrend(scope, companyId, months) {
  const filter = hierarchicalFilter.buildCommunicationsFilter(scope, companyId);
  const idx = filter.params.length + 1;
  const r = await db.query(
    `
    SELECT date_trunc('month', c.created_at AT TIME ZONE 'UTC') AS ts,
           COUNT(*)::int AS total
    FROM communications c
    WHERE ${filter.whereClause}
      AND c.created_at >= (date_trunc('month', now()) - ($${idx}::int - 1) * interval '1 month')
    GROUP BY 1
    ORDER BY 1
  `,
    [...filter.params, months]
  );
  return r.rows;
}

async function getProposalsMonthlyTrend(scope, companyId, months) {
  if (!scope || !companyId) return [];
  const monthsIdx = 1;
  let sql;
  let params;
  if (scope.isFullAccess) {
    sql = `
      SELECT date_trunc('month', p.created_at AT TIME ZONE 'UTC') AS ts,
             COUNT(*)::int AS total
      FROM proposals p
      WHERE p.company_id = $1
        AND p.created_at >= (date_trunc('month', now()) - ($2::int - 1) * interval '1 month')
      GROUP BY 1 ORDER BY 1
    `;
    params = [companyId, months];
  } else {
    const filter = hierarchicalFilter.buildProposalsFilter(scope, companyId);
    const idx = filter.params.length + 1;
    sql = `
      SELECT date_trunc('month', p.created_at AT TIME ZONE 'UTC') AS ts,
             COUNT(*)::int AS total
      FROM proposals p
      WHERE ${filter.whereClause}
        AND p.created_at >= (date_trunc('month', now()) - ($${idx}::int - 1) * interval '1 month')
      GROUP BY 1 ORDER BY 1
    `;
    params = [...filter.params, months];
  }
  void monthsIdx;
  const r = await db.query(sql, params);
  return r.rows;
}

async function getProductionWeeklyTrend(companyId, weeks) {
  try {
    const r = await db.query(
      `
      SELECT date_trunc('week', shift_date::timestamp) AS ts,
             SUM(COALESCE(produced_qty, 0))::float AS produzido,
             SUM(COALESCE(target_qty, 0))::float AS meta
      FROM production_shift_data
      WHERE company_id = $1
        AND shift_date >= (current_date - ($2::int * 7))
      GROUP BY 1
      ORDER BY 1
    `,
      [companyId, weeks]
    );
    return r.rows;
  } catch (e) {
    if (e.message?.includes('production_shift_data')) return [];
    throw e;
  }
}

async function getPulseClimateWeekly(companyId, weeks) {
  const weeksN = clampInt(weeks, 4, 16, 8);
  try {
    const r = await db.query(
      `
      SELECT date_trunc('week', e.self_completed_at AT TIME ZONE 'UTC') AS ts,
        COUNT(*)::int AS n,
        ROUND(AVG((e.fixed_scores->>'efficiency')::numeric)::numeric, 1) AS efficiency,
        ROUND(AVG((e.fixed_scores->>'confidence')::numeric)::numeric, 1) AS confidence,
        ROUND(AVG((e.fixed_scores->>'proactivity')::numeric)::numeric, 1) AS proactivity,
        ROUND(AVG((e.fixed_scores->>'synergy')::numeric)::numeric, 1) AS synergy
      FROM pulse_evaluations e
      WHERE e.company_id = $1
        AND e.status = 'completed'
        AND e.self_completed_at IS NOT NULL
        AND e.self_completed_at >= now() - ($2::int || ' days')::interval
      GROUP BY 1
      ORDER BY 1
    `,
      [companyId, weeksN * 7]
    );
    return r.rows;
  } catch (e) {
    if (e.message?.includes('pulse_evaluations')) return [];
    throw e;
  }
}

async function getImpactByEventType(companyId, days = 30) {
  try {
    const r = await db.query(
      `
      SELECT COALESCE(event_type, 'outros') AS origin,
             SUM(COALESCE(calculated_impact, 0))::float AS total
      FROM industrial_cost_impact_events
      WHERE company_id = $1
        AND created_at >= now() - ($2::int || ' days')::interval
      GROUP BY 1
      ORDER BY total DESC
      LIMIT 8
    `,
      [companyId, days]
    );
    return r.rows;
  } catch (e) {
    if (e.message?.includes('industrial_cost_impact')) return [];
    throw e;
  }
}

/**
 * GET /dashboard/trend — série principal personalizada
 */
async function getTrendForUser(user, months = 6) {
  const companyId = user?.company_id;
  if (!companyId) {
    return { ok: true, data: [], meta: { has_real_data: false, source: 'empty' } };
  }

  const monthsN = clampInt(months, 1, 24, 6);
  const scope = await hierarchicalFilter.resolveHierarchyScope(user);
  const chartProfile = resolveChartProfile(user);
  const scaffold = scaffoldMonths(monthsN);

  let rows = [];
  let seriesKey = 'communications';
  let title = 'Interações no período';
  let subtitle = 'Comunicações registradas por mês';

  if (chartProfile.hr_dashboard) {
    rows = await getCommunicationsMonthlyTrend(scope, companyId, monthsN);
    seriesKey = 'communications_hr';
    title = 'Engajamento da equipe';
    subtitle = 'Interações e registros por mês (escopo do seu perfil)';
  } else if (chartProfile.finance_dashboard) {
    const propRows = await getProposalsMonthlyTrend(scope, companyId, monthsN);
    if (propRows.length) {
      rows = propRows;
      seriesKey = 'proposals';
      title = 'Demandas e propostas';
      subtitle = 'Volume mensal de propostas abertas no escopo';
    } else {
      rows = await getCommunicationsMonthlyTrend(scope, companyId, monthsN);
    }
  } else if (chartProfile.production_focus) {
    const comms = await getCommunicationsMonthlyTrend(scope, companyId, monthsN);
    const prod = await getProductionWeeklyTrend(companyId, Math.min(monthsN * 4, 12));
    if (prod.length) {
      const data = prod.map((row) => ({
        label: formatWeekLabel(row.ts),
        periodo: row.ts,
        valor: Math.round(parseFloat(row.produzido) || 0),
        total: Math.round(parseFloat(row.produzido) || 0),
        meta: Math.round(parseFloat(row.meta) || 0),
        series: 'production_weekly'
      }));
      const hasReal = data.some((d) => d.valor > 0);
      return {
        ok: true,
        data,
        trend: data,
        meta: {
          title: 'Produção semanal',
          subtitle: 'Quantidade produzida vs meta por semana',
          series_key: 'production_weekly',
          profile_axis: chartProfile.functional_axis,
          has_real_data: hasReal,
          source: 'production_shift_data'
        }
      };
    }
    rows = comms;
    title = 'Atividade operacional';
    subtitle = 'Comunicações e registros por mês';
  } else {
    rows = await getCommunicationsMonthlyTrend(scope, companyId, monthsN);
  }

  const data = mergeMonthlyScaffold(scaffold, rows);
  const hasReal = data.some((d) => (d.valor || 0) > 0);

  return {
    ok: true,
    data,
    trend: data,
    meta: {
      title,
      subtitle,
      series_key: seriesKey,
      profile_axis: chartProfile.functional_axis,
      has_real_data: hasReal,
      source: hasReal ? 'database' : 'scaffold'
    }
  };
}

/**
 * Produção vs demanda (barras) — últimas semanas com dados reais
 */
async function getProductionDemandSeries(user, weeks = 8) {
  const companyId = user?.company_id;
  if (!companyId) return { ok: true, data: [], meta: { has_real_data: false } };

  const weeksN = clampInt(weeks, 4, 16, 8);
  const rows = await getProductionWeeklyTrend(companyId, weeksN);

  const data = rows.map((row, i) => ({
    nome: formatWeekLabel(row.ts),
    label: formatWeekLabel(row.ts),
    periodo: row.ts,
    produção: Math.round(parseFloat(row.produzido) || 0),
    producao: Math.round(parseFloat(row.produzido) || 0),
    demanda: Math.round(parseFloat(row.meta) || 0),
    meta: Math.round(parseFloat(row.meta) || 0)
  }));

  if (!data.length) {
    const commsScope = await hierarchicalFilter.resolveHierarchyScope(user);
    const comms = await getCommunicationsMonthlyTrend(commsScope, companyId, 3);
    const fallback = comms.slice(-weeksN).map((row, i) => ({
      nome: formatMonthLabel(row.ts),
      label: formatMonthLabel(row.ts),
      produção: parseInt(row.total || 0, 10),
      producao: parseInt(row.total || 0, 10),
      demanda: Math.max(parseInt(row.total || 0, 10), 1),
      meta: Math.max(parseInt(row.total || 0, 10), 1),
      series: 'communications_proxy'
    }));
    return {
      ok: true,
      data: fallback,
      meta: {
        title: 'Atividade vs referência',
        subtitle: 'Sem dados de produção MES — série derivada de interações',
        has_real_data: fallback.some((d) => d.produção > 0),
        source: 'communications_proxy'
      }
    };
  }

  return {
    ok: true,
    data,
    meta: {
      title: 'Produção vs meta',
      subtitle: 'Turnos registrados por semana',
      has_real_data: data.some((d) => d.produção > 0),
      source: 'production_shift_data'
    }
  };
}

/**
 * Custos por origem — cadastro + impactos recentes
 */
async function getCostsByOriginForUser(user) {
  const companyId = user?.company_id;
  const chartProfile = resolveChartProfile(user);
  if (!companyId || !chartProfile.can_see_costs) {
    return {
      ok: true,
      data: [],
      origins: [],
      meta: { restricted: true, has_real_data: false }
    };
  }

  const byCat = await industrialCostService.getCostByOrigin(companyId);
  const impacts = await getImpactByEventType(companyId, 30);

  let data = byCat
    .filter((c) => (c.month || 0) > 0 || (c.day || 0) > 0)
    .map((c) => ({
      origin: c.label || c.category,
      setor: c.label || c.category,
      name: c.label || c.category,
      label: c.label || c.category,
      value: Math.round((c.month || c.day || c.hour || 0) * 100) / 100,
      total: Math.round((c.month || 0) * 100) / 100,
      custo: Math.round((c.month || 0) * 100) / 100
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  if (!data.length && impacts.length) {
    data = impacts.map((row) => ({
      origin: row.origin,
      setor: row.origin,
      name: row.origin,
      label: row.origin,
      value: Math.round(parseFloat(row.total) * 100) / 100,
      total: Math.round(parseFloat(row.total) * 100) / 100
    }));
  }

  return {
    ok: true,
    data,
    origins: data,
    meta: {
      has_real_data: data.length > 0,
      source: data.length ? 'industrial_cost' : 'empty',
      title: 'Custos por categoria'
    }
  };
}

/**
 * Clima Pulse RH — 4 dimensões por semana
 */
async function getPulseClimateChart(user, weeks = 8) {
  const companyId = user?.company_id;
  if (!companyId) return { ok: true, data: [], meta: { has_real_data: false } };

  const weeksN = clampInt(weeks, 4, 16, 8);
  const rows = await getPulseClimateWeekly(companyId, weeksN);

  const data = rows.map((row) => ({
    label: formatWeekLabel(row.ts),
    periodo: row.ts,
    n: row.n,
    efficiency: parseFloat(row.efficiency) || 0,
    confidence: parseFloat(row.confidence) || 0,
    proactivity: parseFloat(row.proactivity) || 0,
    synergy: parseFloat(row.synergy) || 0,
    media:
      [
        row.efficiency,
        row.confidence,
        row.proactivity,
        row.synergy
      ]
        .filter((v) => v != null)
        .reduce((s, v, _, arr) => s + parseFloat(v) / arr.length, 0) || 0
  }));

  return {
    ok: true,
    data,
    meta: {
      title: 'Clima da equipe (Pulse)',
      subtitle: 'Médias semanais — eficiência, confiança, proatividade e sinergia',
      has_real_data: data.some((d) => d.n > 0),
      source: 'pulse_evaluations'
    }
  };
}

/**
 * Pacote para pré-carregamento opcional
 */
async function safeChartPart(label, fn, fallback) {
  try {
    return await fn();
  } catch (err) {
    console.warn(`[dashboardChartData][${label}]`, err?.message ?? err);
    return fallback;
  }
}

async function getChartBundle(user) {
  const [trend, production, costs, pulse] = await Promise.all([
    safeChartPart('trend', () => getTrendForUser(user, 6), { ok: true, data: [], meta: { has_real_data: false } }),
    safeChartPart('production', () => getProductionDemandSeries(user, 8), { ok: true, data: [], meta: {} }),
    safeChartPart('costs', () => getCostsByOriginForUser(user), { ok: true, data: [], meta: {} }),
    safeChartPart('pulse', () => getPulseClimateChart(user, 8), { ok: true, data: [], meta: {} })
  ]);
  return {
    ok: true,
    profile: resolveChartProfile(user),
    trend,
    production_demand: production,
    costs_by_origin: costs,
    pulse_climate: pulse
  };
}

/**
 * Hidrata gráfico do painel IA (Claude/voz) com série real quando aplicável.
 */
async function enrichPanelChartOutput(user, output = {}, contextText = '') {
  const chartType = String(output.chartType || 'bar').toLowerCase();
  if (!['line', 'area', 'bar'].includes(chartType)) return output;

  const t = String(contextText || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
  const wantsTrend =
    /\b(tendencia|tendência|evolucao|evolução|grafico|gráfico|mensal|semanal|historico|histórico|interacoes|interações|producao|produção|pulse|clima)\b/.test(
      t
    );

  const datasets = Array.isArray(output.datasets) ? output.datasets : [];
  const allZero =
    datasets.length > 0 &&
    datasets.every((ds) => (Array.isArray(ds.data) ? ds.data : []).every((n) => !Number(n)));

  if (!wantsTrend && !allZero) return output;

  const trend = await getTrendForUser(user, 6);
  if (!trend.data?.some((d) => (d.valor || 0) > 0)) return output;

  return {
    ...output,
    labels: trend.data.map((d) => d.label),
    datasets: [
      {
        label: trend.meta?.title || 'Indicadores',
        data: trend.data.map((d) => d.valor ?? 0)
      }
    ],
    _enriched_from: 'dashboard_chart_data'
  };
}

/**
 * Linha para smart panel (dados reais).
 */
async function getPanelLineSeries(user) {
  const trend = await getTrendForUser(user, 6);
  return (trend.data || []).map((d) => ({ name: d.label, valor: d.valor ?? 0 }));
}

module.exports = {
  resolveChartProfile,
  getTrendForUser,
  getProductionDemandSeries,
  getCostsByOriginForUser,
  getPulseClimateChart,
  getChartBundle,
  enrichPanelChartOutput,
  getPanelLineSeries
};
