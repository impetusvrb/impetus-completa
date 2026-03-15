/**
 * IMPETUS - Mapa Inteligente da Indústria
 * Centro estratégico de monitoramento para CEOs e Diretores
 * Estrutura: Empresa → Unidade → Setor → Linha → Equipamento → Processo
 */
const db = require('../db');
const industrialOperationalMap = require('./industrialOperationalMapService');
const centralAI = require('./centralIndustryAIService');

function isExecutive(user) {
  const role = (user?.role || '').toLowerCase();
  const h = user?.hierarchy_level ?? 5;
  return role === 'ceo' || role === 'diretor' || h <= 1;
}

/**
 * Calcula status visual: normal | attention | critical | unknown
 */
function computeStatus(healthIndex, alertsCount, offlineCount) {
  if (healthIndex == null && !alertsCount && !offlineCount) return 'unknown';
  if (alertsCount > 3 || offlineCount > 2 || (healthIndex != null && healthIndex < 40)) return 'critical';
  if (alertsCount > 0 || offlineCount > 0 || (healthIndex != null && healthIndex < 70)) return 'attention';
  return 'normal';
}

/**
 * Monta estrutura hierárquica e dados do mapa
 */
async function getIndustryMap(companyId, user) {
  if (!companyId || !user) return null;
  if (!isExecutive(user)) return null;

  const [
    company,
    departments,
    factoryMap,
    centralPayload,
    workOrders,
    financialEstimates
  ] = await Promise.all([
    getCompanyInfo(companyId),
    getDepartmentsWithLines(companyId),
    industrialOperationalMap.getFactoryMap(companyId).catch(() => ({ linhas: [], offline_equipment: [], recent_events: [] })),
    centralAI.getCentralIntelligence(companyId, user).catch(() => ({ sectors: [], alerts: { items: [] }, insights: [] })),
    getWorkOrdersSummary(companyId),
    getFinancialLossEstimates(companyId)
  ]);

  const sectors = centralPayload?.sectors || [];
  const alerts = centralPayload?.alerts?.items || [];
  const insights = centralPayload?.insights || [];
  const offlineEquipment = factoryMap?.offline_equipment || [];
  const recentEvents = factoryMap?.recent_events || [];

  // Montar setores com saúde e status
  const sectorMap = new Map();
  for (const s of sectors) {
    const healthIndex = computeHealthIndex(s);
    const sectorAlerts = alerts.filter((a) => (a.sector_key || a.sector || '').includes(s.key));
    const criticalCount = sectorAlerts.filter((a) => ['critical', 'high', 'alta'].includes(String(a.severity || '').toLowerCase())).length;
    const status = computeStatus(healthIndex, criticalCount, 0);
    sectorMap.set(s.key, {
      key: s.key,
      name: s.name,
      status,
      health_index: healthIndex,
      responsible: null,
      indicators: s.indicators || {},
      alerts_count: sectorAlerts.length,
      event_history: []
    });
  }

  // Enriquecer com linhas de produção e equipamentos
  const linhas = (factoryMap?.linhas || []).map((l) => ({
    id: l.id,
    name: l.name,
    code: l.code,
    responsible: l.responsavel || l.responsible_name,
    status: (l.maquinas || []).some((m) => m.is_offline) ? 'attention' : 'normal',
    health_index: 75,
    equipments: (l.maquinas || []).map((m) => ({
      id: m.id,
      name: m.name,
      status: m.is_offline ? 'critical' : (m.status === 'ok' || m.status === 'normal' ? 'normal' : 'attention'),
      last_read: m.last_read
    })),
    event_history: []
  }));

  // Departamentos como setores estruturais
  const deptSectors = (departments || []).map((d) => ({
    id: d.id,
    name: d.name,
    type: 'department',
    lines_count: d.lines_count || 0,
    status: sectorMap.get('production')?.status || 'unknown'
  }));

  // Diagnósticos inteligentes (insights prioritários)
  const diagnostics = insights.slice(0, 8).map((i) => ({
    type: i.type,
    title: i.title,
    description: i.description,
    severity: i.severity || 'medium',
    sector: null,
    probable_cause: null,
    operational_impact: i.description,
    financial_impact_estimate: null,
    resolution_priority: i.severity === 'high' ? 1 : 2,
    route: i.route
  }));

  // Perdas financeiras estimadas
  const lossItems = financialEstimates || [];

  return {
    company: {
      id: companyId,
      name: company?.name || 'Empresa',
      status: sectors.some((s) => sectorMap.get(s.key)?.status === 'critical') ? 'attention' : 'normal'
    },
    structure: {
      unidades: [{ id: companyId, name: company?.name || 'Unidade Principal', sectors: sectors.map((s) => sectorMap.get(s.key) || { key: s.key, name: s.name, status: 'unknown' }) }],
      setores: sectors.map((s) => sectorMap.get(s.key) || { ...s, status: 'unknown' }),
      linhas,
      departamentos: deptSectors
    },
    critical_sectors: sectors.filter((s) => sectorMap.get(s.key)?.status === 'critical').map((s) => s.name),
    operational_alerts: alerts.slice(0, 15),
    diagnostics,
    financial_losses: lossItems,
    offline_equipment: offlineEquipment.slice(0, 10),
    risk_forecasts: recentEvents.filter((e) => ['predicted_failure', 'overheating', 'vibration_alert'].includes(e.event_type)).slice(0, 5),
    work_orders_summary: workOrders,
    last_updated: new Date().toISOString()
  };
}

async function getCompanyInfo(companyId) {
  try {
    const r = await db.query('SELECT id, name FROM companies WHERE id = $1', [companyId]);
    return r.rows?.[0] || null;
  } catch {
    return null;
  }
}

async function getDepartmentsWithLines(companyId) {
  try {
    const r = await db.query(`
      SELECT d.id, d.name, (SELECT COUNT(*) FROM production_lines pl WHERE pl.department_id = d.id AND pl.active) as lines_count
      FROM departments d
      WHERE d.company_id = $1 AND d.active
      ORDER BY d.name
    `, [companyId]);
    return r.rows || [];
  } catch {
    return [];
  }
}

function computeHealthIndex(sector) {
  if (!sector?.indicators) return 80;
  const ind = sector.indicators;
  let score = 100;
  if (ind.events_24h > 20) score -= 40;
  else if (ind.events_24h > 5) score -= 20;
  if (ind.pending > 10) score -= 30;
  else if (ind.pending > 3) score -= 15;
  if (ind.below_min_count > 5) score -= 25;
  if (ind.delay_index > 15 || ind.absence_index > 10) score -= 20;
  return Math.max(0, Math.min(100, score));
}

async function getWorkOrdersSummary(companyId) {
  try {
    const r = await db.query(`
      SELECT status, COUNT(*) as total
      FROM work_orders
      WHERE company_id = $1
      GROUP BY status
    `, [companyId]);
    return r.rows?.reduce((acc, row) => { acc[row.status] = parseInt(row.total, 10); return acc; }, {}) || {};
  } catch {
    return {};
  }
}

async function getFinancialLossEstimates(companyId) {
  try {
    const r = await db.query(`
      SELECT machine_identifier, machine_name, description, severity, created_at
      FROM machine_detected_events
      WHERE company_id = $1
        AND created_at > now() - INTERVAL '7 days'
        AND severity IN ('critical', 'high', 'alta')
      ORDER BY created_at DESC
      LIMIT 10
    `, [companyId]);
    return (r.rows || []).map((row) => ({
      source: row.machine_name || row.machine_identifier,
      description: row.description,
      severity: row.severity,
      estimated_impact: 'Avaliar impacto operacional',
      detected_at: row.created_at
    }));
  } catch {
    return [];
  }
}

module.exports = {
  getIndustryMap,
  isExecutive,
  computeStatus,
  computeHealthIndex
};
