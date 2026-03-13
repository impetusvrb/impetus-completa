/**
 * IMPETUS - Cálculo de Impacto Financeiro de Eventos Operacionais
 * Utiliza custos cadastrados para calcular impacto automático
 */
const db = require('../db');
const industrialCost = require('./industrialCostService');

/**
 * Calcula impacto financeiro de um evento (ex: linha parada 1h)
 */
async function calculateEventImpact(companyId, event) {
  const {
    event_type,
    machine_identifier,
    machine_name,
    line_name,
    duration_hours = 1,
    source_event_id,
    source_type = 'machine_detected_event'
  } = event;

  const costs = await industrialCost.getCostsForImpact(companyId, machine_identifier, line_name);

  const hora = costs.cost_downtime_per_hour || 0;
  const prod = costs.cost_production_loss || 0;
  const labor = costs.cost_labor_associated || 0;

  const breakdown = {
    parada_maquina: hora * duration_hours,
    perda_producao: prod * (duration_hours / 8),
    mao_de_obra: labor * (duration_hours / 8)
  };

  const total = breakdown.parada_maquina + breakdown.perda_producao + breakdown.mao_de_obra;

  const impactId = await db.query(`
    INSERT INTO industrial_cost_impacts
      (company_id, event_type, machine_identifier, machine_name, line_name, duration_hours, total_impact, breakdown, source_event_id, source_type)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING id
  `, [
    companyId, event_type, machine_identifier, machine_name, line_name,
    duration_hours, total, JSON.stringify(breakdown), source_event_id, source_type
  ]);

  return {
    id: impactId.rows?.[0]?.id,
    total_impact: total,
    breakdown,
    duration_hours
  };
}

/**
 * Lista impactos recentes (para relatórios)
 */
async function listRecentImpacts(companyId, limit = 50) {
  const r = await db.query(`
    SELECT * FROM industrial_cost_impacts
    WHERE company_id = $1
    ORDER BY created_at DESC
    LIMIT $2
  `, [companyId, limit]);
  return r.rows || [];
}

/**
 * Soma de impactos por origem (máquinas paradas, retrabalho, etc.)
 */
async function getImpactByOrigin(companyId, sinceDays = 7) {
  const r = await db.query(`
    SELECT
      COALESCE(event_type, 'outros') as origin,
      COUNT(*) as count,
      SUM(total_impact) as total
    FROM industrial_cost_impacts
    WHERE company_id = $1 AND created_at > now() - INTERVAL '1 day' * $2
    GROUP BY COALESCE(event_type, 'outros')
    ORDER BY total DESC
  `, [companyId, sinceDays]);

  const labels = {
    machine_stopped: 'Máquinas paradas',
    compressor_offline: 'Compressor offline',
    overheating: 'Superaquecimento',
    low_oil: 'Nível óleo baixo',
    vibration_alert: 'Alerta vibração',
    pressure_low: 'Pressão baixa',
    predicted_failure: 'Previsão de falha',
    outros: 'Outros'
  };

  return (r.rows || []).map((x) => ({
    origin: x.origin,
    label: labels[x.origin] || x.origin,
    count: parseInt(x.count, 10),
    total: parseFloat(x.total) || 0
  }));
}

/**
 * Relatório: maior causa de perda operacional hoje
 */
async function getTopLossReport(companyId) {
  const r = await db.query(`
    SELECT event_type, machine_name, line_name, duration_hours, total_impact, description, created_at
    FROM industrial_cost_impacts
    WHERE company_id = $1 AND created_at >= CURRENT_DATE
    ORDER BY total_impact DESC
    LIMIT 1
  `, [companyId]);

  const row = r.rows?.[0];
  if (!row) return null;

  const sugerir = (tipo) => {
    const map = {
      machine_stopped: 'verificar gargalo no abastecimento de matéria-prima e estado do equipamento',
      compressor_offline: 'acionar reserva ou programar manutenção',
      overheating: 'revisar refrigeração e carga de trabalho',
      pressure_low: 'verificar linha de ar ou fluido'
    };
    return map[tipo] || 'verificar equipamento e registrar intervenção se necessário';
  };

  return {
    causa: row.machine_name || row.line_name || 'Equipamento',
    evento: row.event_type,
    tempo_parado_horas: parseFloat(row.duration_hours) || 0,
    impacto_financeiro: parseFloat(row.total_impact) || 0,
    sugestao_ia: sugerir(row.event_type)
  };
}

/**
 * Projeta prejuízo futuro baseado em impactos recentes e custos
 */
async function projectFutureLoss(companyId, hoursAhead = 48) {
  const [impacts, totals] = await Promise.all([
    listRecentImpacts(companyId, 100),
    industrialCost.getTotalsByPeriod(companyId)
  ]);

  const recent = impacts.filter((i) => {
    const d = new Date(i.created_at);
    return d >= new Date(Date.now() - 24 * 60 * 60 * 1000);
  });

  const totalImpact = recent.reduce((s, i) => s + (parseFloat(i.total_impact) || 0), 0);
  const totalHours = recent.reduce((s, i) => s + (parseFloat(i.duration_hours) || 1), 0);
  const avgImpactPerHour = recent.length && totalHours > 0
    ? totalImpact / totalHours
    : (totals.per_hour || 0) * 0.3;

  const projected = avgImpactPerHour * hoursAhead;
  return {
    hours_ahead: hoursAhead,
    projected_loss: Math.round(projected * 100) / 100,
    basis: recent.length ? 'eventos_recentes' : 'custos_cadastrados'
  };
}

module.exports = {
  calculateEventImpact,
  listRecentImpacts,
  getImpactByOrigin,
  getTopLossReport,
  projectFutureLoss
};
