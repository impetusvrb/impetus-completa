/**
 * IMPETUS - Centro de Custos Industriais
 * Cadastro de custos pelo Admin, cálculo de impacto pela IA
 * CEO/Diretores: relatórios financeiros | Outros: apenas alertas sem valores
 */
const db = require('../db');

const CATEGORIES = [
  { id: 'maquinas', label: 'Máquinas' },
  { id: 'linhas_producao', label: 'Linhas de produção' },
  { id: 'funcionarios', label: 'Funcionários' },
  { id: 'energia', label: 'Energia' },
  { id: 'materia_prima', label: 'Matéria-prima' },
  { id: 'retrabalho', label: 'Retrabalho' },
  { id: 'manutencao', label: 'Manutenção' },
  { id: 'custos_fixos', label: 'Custos fixos da empresa' }
];

function getCategories() {
  return CATEGORIES;
}

/**
 * Lista itens de custo (Admin)
 */
async function listCostItems(companyId) {
  const r = await db.query(`
    SELECT c.*, cat.label as category_label
    FROM industrial_cost_items c
    LEFT JOIN industrial_cost_categories cat ON cat.id = c.category_id
    WHERE c.company_id = $1 AND c.active = true
    ORDER BY cat.display_order, c.name
  `, [companyId]);
  return r.rows || [];
}

/**
 * Cria/atualiza item de custo (Admin)
 */
async function upsertCostItem(companyId, data) {
  const {
    id, name, sector, category_id,
    cost_per_hour, cost_per_day, cost_per_month, cost_per_year,
    cost_downtime_per_hour, cost_production_loss, cost_rework, cost_labor_associated,
    machine_identifier, line_identifier
  } = data;

  const vals = [
    companyId, name || 'Item', sector, category_id || 'maquinas',
    parseFloat(cost_per_hour) || 0, parseFloat(cost_per_day) || 0,
    parseFloat(cost_per_month) || 0, parseFloat(cost_per_year) || 0,
    parseFloat(cost_downtime_per_hour) || 0, parseFloat(cost_production_loss) || 0,
    parseFloat(cost_rework) || 0, parseFloat(cost_labor_associated) || 0,
    machine_identifier || null, line_identifier || null
  ];

  if (id) {
  await db.query(`
      UPDATE industrial_cost_items SET
        name = $2, sector = $3, category_id = $4,
        cost_per_hour = $5, cost_per_day = $6, cost_per_month = $7, cost_per_year = $8,
        cost_downtime_per_hour = $9, cost_production_loss = $10, cost_rework = $11, cost_labor_associated = $12,
        machine_identifier = $13, line_identifier = $14, updated_at = now()
      WHERE id = $15 AND company_id = $1
    `, [...vals.slice(1), id]);
    return { id, updated: true };
  }

  const r = await db.query(`
    INSERT INTO industrial_cost_items (company_id, name, sector, category_id,
      cost_per_hour, cost_per_day, cost_per_month, cost_per_year,
      cost_downtime_per_hour, cost_production_loss, cost_rework, cost_labor_associated,
      machine_identifier, line_identifier)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    RETURNING id
  `, vals);
  return { id: r.rows[0]?.id, created: true };
}

/**
 * Remove item (Admin) - soft delete
 */
async function deleteCostItem(companyId, itemId) {
  await db.query(`UPDATE industrial_cost_items SET active = false, updated_at = now() WHERE id = $1 AND company_id = $2`, [itemId, companyId]);
  return { ok: true };
}

/**
 * Calcula impacto financeiro de evento operacional (ex: linha parada X horas)
 */
async function calculateEventImpact(companyId, event) {
  const {
    event_type, machine_identifier, line_identifier, duration_hours = 1,
    production_loss = false, rework = false
  } = event;

  const items = await listCostItems(companyId);
  let total = 0;
  const breakdown = {};

  const matchMachine = (item) =>
    (machine_identifier && item.machine_identifier === machine_identifier) ||
    (line_identifier && item.line_identifier === line_identifier) ||
    (!item.machine_identifier && !item.line_identifier);

  for (const item of items) {
    if (!matchMachine(item) && !['energia', 'funcionarios', 'custos_fixos'].includes(item.category_id)) continue;
    let add = 0;
    if (event_type === 'machine_stopped' || event_type === 'compressor_offline' || event_type === 'downtime') {
      add = (parseFloat(item.cost_downtime_per_hour) || parseFloat(item.cost_per_hour) || 0) * (duration_hours || 1);
    }
    if (production_loss) {
      add += parseFloat(item.cost_production_loss) || 0;
    }
    if (rework) {
      add += parseFloat(item.cost_rework) || 0;
    }
    if (add > 0) {
      total += add;
      breakdown[item.name] = add;
    }
  }

  const fallback = total === 0 && items.length === 0
    ? (duration_hours || 1) * 500
    : total;

  const impact = total > 0 ? total : fallback;

  await db.query(`
    INSERT INTO industrial_cost_impact_events (company_id, event_type, machine_identifier, line_identifier, duration_hours, calculated_impact, impact_breakdown, description)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
  `, [companyId, event_type || 'downtime', machine_identifier, line_identifier, duration_hours || 1, impact, JSON.stringify(breakdown), event.description || null]);

  return { impact, breakdown };
}

/**
 * Resumo financeiro executivo (CEO/Diretores)
 */
async function getExecutiveCostSummary(companyId, period = 'day') {
  const items = await listCostItems(companyId);
  const byCategory = {};
  let totalHour = 0; let totalDay = 0; let totalMonth = 0; let totalYear = 0;

  for (const i of items) {
    const cat = i.category_id || 'outros';
    if (!byCategory[cat]) byCategory[cat] = { hour: 0, day: 0, month: 0, year: 0, label: CATEGORIES.find((c) => c.id === cat)?.label || cat };
    byCategory[cat].hour += parseFloat(i.cost_per_hour) || 0;
    byCategory[cat].day += parseFloat(i.cost_per_day) || 0;
    byCategory[cat].month += parseFloat(i.cost_per_month) || 0;
    byCategory[cat].year += parseFloat(i.cost_per_year) || 0;
    totalHour += parseFloat(i.cost_per_hour) || 0;
    totalDay += parseFloat(i.cost_per_day) || 0;
    totalMonth += parseFloat(i.cost_per_month) || 0;
    totalYear += parseFloat(i.cost_per_year) || 0;
  }

  const r = await db.query(`
    SELECT 
      SUM(calculated_impact) FILTER (WHERE created_at >= now() - INTERVAL '1 hour') as impact_1h,
      SUM(calculated_impact) FILTER (WHERE created_at >= now() - INTERVAL '1 day') as impact_1d,
      SUM(calculated_impact) FILTER (WHERE created_at >= now() - INTERVAL '7 days') as impact_7d
    FROM industrial_cost_impact_events
    WHERE company_id = $1
  `, [companyId]);
  const imp = r.rows[0] || {};

  return {
    operational: { per_hour: totalHour, per_day: totalDay, per_month: totalMonth, per_year: totalYear },
    by_origin: Object.entries(byCategory).map(([k, v]) => ({ category: k, ...v })),
    impact_from_events: {
      last_hour: parseFloat(imp.impact_1h) || 0,
      last_day: parseFloat(imp.impact_1d) || 0,
      last_7d: parseFloat(imp.impact_7d) || 0
    }
  };
}

/**
 * Origem de custos (para gráficos)
 */
async function getCostByOrigin(companyId) {
  const items = await listCostItems(companyId);
  const byCat = {};
  for (const i of items) {
    const cat = i.category_id || 'outros';
    if (!byCat[cat]) byCat[cat] = { category: cat, label: CATEGORIES.find((c) => c.id === cat)?.label || cat, hour: 0, day: 0, month: 0 };
    byCat[cat].hour += parseFloat(i.cost_per_hour) || 0;
    byCat[cat].day += parseFloat(i.cost_per_day) || 0;
    byCat[cat].month += parseFloat(i.cost_per_month) || 0;
  }
  return Object.values(byCat);
}

/**
 * Relatório inteligente: maior causa de perda hoje
 */
async function getTopLossReport(companyId) {
  const r = await db.query(`
    SELECT event_type, machine_identifier, line_identifier, description, duration_hours, calculated_impact, created_at
    FROM industrial_cost_impact_events
    WHERE company_id = $1 AND created_at >= now() - INTERVAL '1 day'
    ORDER BY calculated_impact DESC
    LIMIT 5
  `, [companyId]);
  const rows = r.rows || [];
  const top = rows[0];
  return {
    top_loss: top ? {
      cause: top.description || top.event_type,
      machine: top.machine_identifier || top.line_identifier,
      duration_hours: parseFloat(top.duration_hours) || 0,
      impact: parseFloat(top.calculated_impact) || 0,
      created_at: top.created_at
    } : null,
    recent_impacts: rows
  };
}

/**
 * Prejuízo projetado (para integração com Centro de Previsão)
 */
async function getProjectedLoss(companyId, hoursAhead = 48) {
  const items = await listCostItems(companyId);
  const avgHourCost = items.reduce((s, i) => s + (parseFloat(i.cost_downtime_per_hour) || parseFloat(i.cost_per_hour) || 0), 0) / Math.max(1, items.length);
  const r = await db.query(`
    SELECT COUNT(*) as events_24h, COALESCE(SUM(calculated_impact), 0) as total_24h
    FROM industrial_cost_impact_events
    WHERE company_id = $1 AND created_at >= now() - INTERVAL '1 day'
  `, [companyId]);
  const ev24 = parseInt(r.rows[0]?.events_24h || 0);
  const total24 = parseFloat(r.rows[0]?.total_24h || 0);
  const ratePerHour = ev24 > 0 ? total24 / 24 : avgHourCost * 0.1;
  const projected = Math.round(ratePerHour * hoursAhead);
  return { projected_loss: projected, hours_ahead: hoursAhead, baseline_24h: total24 };
}

module.exports = {
  getCategories,
  listCostItems,
  upsertCostItem,
  deleteCostItem,
  calculateEventImpact,
  getExecutiveCostSummary,
  getCostByOrigin,
  getTopLossReport,
  getProjectedLoss,
  CATEGORIES
};
