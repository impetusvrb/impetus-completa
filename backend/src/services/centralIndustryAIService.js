/**
 * IMPETUS - IA Central da Indústria
 * Cérebro central que coleta, processa e distribui informações de todos os setores.
 * CEO, Diretores, Gerentes e Profissionais recebem apenas dados relevantes.
 */
const db = require('../db');

// Importações opcionais - módulos podem não existir
let warehouseIntel, logisticsIntel, hrIntel, qualityIntel;
let operationalForecastingAdvanced, operationalAlerts;
try { warehouseIntel = require('./warehouseIntelligenceService'); } catch (_) {}
try { logisticsIntel = require('./logisticsIntelligenceService'); } catch (_) {}
try { hrIntel = require('./hrIntelligenceService'); } catch (_) {}
try { qualityIntel = require('./qualityIntelligenceService'); } catch (_) {}
try { operationalForecastingAdvanced = require('./operationalForecastingAdvancedService'); } catch (_) {}
try { operationalAlerts = require('./operationalAlertsService'); } catch (_) {}

/**
 * Determina nível do cargo para distribuição de informações
 */
function getRoleLevel(user) {
  const role = (user?.role || '').toLowerCase();
  const h = user?.hierarchy_level ?? 5;
  if (role === 'ceo' || h <= 0) return 'ceo';
  if (role === 'diretor' || role === 'admin' || h <= 1) return 'diretor';
  if (role === 'gerente' || role === 'coordenador' || h <= 2) return 'gerente';
  if (role === 'supervisor' || h <= 3) return 'supervisor';
  return 'profissional';
}

/**
 * Agrega alertas de todos os setores (unificado)
 */
async function getUnifiedAlerts(companyId, user) {
  const h = user?.hierarchy_level ?? 5;
  const alerts = [];
  const maxAge = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  try {
    // Warehouse
    if (warehouseIntel) {
      const r = await db.query(`
        SELECT id, alert_type, severity, title, description, target_role_level, created_at, 'warehouse' as sector
        FROM warehouse_alerts
        WHERE company_id = $1 AND acknowledged = false AND created_at >= $2
        AND (target_role_level IS NULL OR target_role_level >= $3)
        ORDER BY created_at DESC LIMIT 15
      `, [companyId, maxAge, h]);
      (r.rows || []).forEach(row => alerts.push({ ...row, sector: 'almoxarifado', sector_key: 'warehouse' }));
    }

    // Logistics
    if (logisticsIntel) {
      const r = await db.query(`
        SELECT id, alert_type, severity, title, description, target_role_level, created_at
        FROM logistics_alerts
        WHERE company_id = $1 AND acknowledged = false AND created_at >= $2
        AND (target_role_level IS NULL OR target_role_level >= $3)
        ORDER BY created_at DESC LIMIT 15
      `, [companyId, maxAge, h]);
      (r.rows || []).forEach(row => alerts.push({ ...row, sector: 'logística', sector_key: 'logistics' }));
    }

    // Quality
    try {
      const r = await db.query(`
        SELECT id, alert_type, severity, title, description, target_role_level, created_at
        FROM quality_alerts
        WHERE company_id = $1 AND acknowledged = false AND created_at >= $2
        AND (target_role_level IS NULL OR target_role_level >= $3)
        ORDER BY created_at DESC LIMIT 15
      `, [companyId, maxAge, h]);
      (r.rows || []).forEach(row => alerts.push({ ...row, sector: 'qualidade', sector_key: 'quality' }));
    } catch (_) {}

    // HR
    try {
      const r = await db.query(`
        SELECT id, alert_type, severity, title, description, created_at
        FROM hr_alerts
        WHERE company_id = $1 AND acknowledged = false AND created_at >= $2
        ORDER BY created_at DESC LIMIT 15
      `, [companyId, maxAge]);
      (r.rows || []).forEach(row => alerts.push({ ...row, sector: 'rh', sector_key: 'hr' }));
    } catch (_) {}

    // Operational (máquina parada, tarefa atrasada, etc.)
    try {
      const r = await db.query(`
        SELECT id, tipo_alerta as alert_type, severidade as severity, titulo as title, mensagem as description, created_at
        FROM operational_alerts
        WHERE company_id = $1 AND (resolvido = false OR resolvido IS NULL) AND created_at >= $2
        ORDER BY created_at DESC LIMIT 15
      `, [companyId, maxAge]);
      (r.rows || []).forEach(row => alerts.push({
        id: row.id,
        alert_type: row.alert_type,
        severity: row.severity || 'media',
        title: row.title,
        description: row.description,
        created_at: row.created_at,
        sector: 'produção',
        sector_key: 'operational'
      }));
    } catch (_) {}
  } catch (err) {
    console.warn('[CENTRAL_AI] getUnifiedAlerts:', err?.message);
  }

  // Ordenar por severidade (critical > high > medium > low) e data
  const severityOrder = { critical: 0, alta: 0, high: 1, medium: 2, media: 2, low: 3, baixa: 3 };
  alerts.sort((a, b) => {
    const sa = severityOrder[a.severity] ?? 2;
    const sb = severityOrder[b.severity] ?? 2;
    if (sa !== sb) return sa - sb;
    return new Date(b.created_at) - new Date(a.created_at);
  });

  return alerts.slice(0, 50);
}

/**
 * Status consolidado por setor
 */
async function getSectorStatus(companyId, user) {
  const sectors = [];

  try {
    // RH
    if (hrIntel?.getIndicators) {
      try {
        const ind = await hrIntel.getIndicators(companyId, 7);
        const risk = (ind.delay_index || 0) > 15 || (ind.absence_index || 0) > 10 ? 'alert' : 'ok';
        sectors.push({ key: 'rh', name: 'RH', status: risk, indicators: { delay_index: ind.delay_index, absence_index: ind.absence_index } });
      } catch (_) { sectors.push({ key: 'rh', name: 'RH', status: 'unknown' }); }
    }

    // Almoxarifado
    if (warehouseIntel?.calculateWarehouseIndicators) {
      try {
        const ind = await warehouseIntel.calculateWarehouseIndicators(companyId, 7);
        const risk = (ind.below_min_count || 0) > 5 ? 'alert' : (ind.below_min_count || 0) > 0 ? 'warning' : 'ok';
        sectors.push({ key: 'warehouse', name: 'Almoxarifado', status: risk, indicators: ind });
      } catch (_) { sectors.push({ key: 'warehouse', name: 'Almoxarifado', status: 'unknown' }); }
    }

    // Qualidade
    if (qualityIntel?.calculateQualityIndicators) {
      try {
        const ind = await qualityIntel.calculateQualityIndicators(companyId, 7);
        sectors.push({ key: 'quality', name: 'Qualidade', status: 'ok', indicators: ind });
      } catch (_) { sectors.push({ key: 'quality', name: 'Qualidade', status: 'unknown' }); }
    }

    // Logística
    if (logisticsIntel?.calculateLogisticsIndicators) {
      try {
        const ind = await logisticsIntel.calculateLogisticsIndicators(companyId, 7);
        const risk = (ind.deliveries_delayed || 0) > (ind.deliveries_total || 0) * 0.2 ? 'alert' : 'ok';
        sectors.push({ key: 'logistics', name: 'Logística', status: risk, indicators: ind });
      } catch (_) { sectors.push({ key: 'logistics', name: 'Logística', status: 'unknown' }); }
    }

    // Produção/Industrial
    try {
      const [evs, orders] = await Promise.all([
        db.query(`SELECT COUNT(*) as c FROM machine_detected_events WHERE company_id = $1 AND created_at > now() - INTERVAL '24 hours'`, [companyId]),
        db.query(`SELECT COUNT(*) as c FROM work_orders WHERE company_id = $1 AND status IN ('open','in_progress')`, [companyId])
      ]);
      const evCount = parseInt(evs.rows?.[0]?.c || 0, 10);
      const woCount = parseInt(orders.rows?.[0]?.c || 0, 10);
      const risk = evCount > 20 ? 'alert' : evCount > 5 ? 'warning' : 'ok';
      sectors.push({ key: 'production', name: 'Produção', status: risk, indicators: { events_24h: evCount, work_orders_open: woCount } });
    } catch (_) { sectors.push({ key: 'production', name: 'Produção', status: 'unknown' }); }

    // Manutenção
    try {
      const r = await db.query(`
        SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status IN ('open','in_progress')) as pending
        FROM work_orders WHERE company_id = $1
      `, [companyId]);
      const total = parseInt(r.rows?.[0]?.total || 0, 10);
      const pending = parseInt(r.rows?.[0]?.pending || 0, 10);
      const risk = pending > 10 ? 'alert' : pending > 3 ? 'warning' : 'ok';
      sectors.push({ key: 'maintenance', name: 'Manutenção', status: risk, indicators: { total, pending } });
    } catch (_) { sectors.push({ key: 'maintenance', name: 'Manutenção', status: 'unknown' }); }
  } catch (err) {
    console.warn('[CENTRAL_AI] getSectorStatus:', err?.message);
  }

  return sectors;
}

/**
 * Previsões estratégicas (CEO e Diretores)
 */
async function getStrategicPredictions(companyId, user) {
  const level = getRoleLevel(user);
  if (level !== 'ceo' && level !== 'diretor') return null;

  try {
    if (operationalForecastingAdvanced?.getExtendedProjections) {
      const proj = await operationalForecastingAdvanced.getExtendedProjections(companyId);
      return {
        type: 'extended_projections',
        projections: proj?.projections || [],
        digital_twin_snapshot: proj?.digital_twin_snapshot
      };
    }
  } catch (err) {
    console.warn('[CENTRAL_AI] getStrategicPredictions:', err?.message);
  }
  return null;
}

/**
 * Insights consolidados (cross-sector)
 */
async function getCentralInsights(companyId, user) {
  const insights = [];
  const level = getRoleLevel(user);

  try {
    const [alerts, sectors] = await Promise.all([
      getUnifiedAlerts(companyId, user),
      getSectorStatus(companyId, user)
    ]);

    const criticalCount = alerts.filter(a => ['critical', 'alta', 'high'].includes(a.severity)).length;
    const sectorsAlert = sectors.filter(s => s.status === 'alert').length;

    if (criticalCount > 0) {
      insights.push({
        type: 'critical_alerts',
        severity: 'high',
        title: `${criticalCount} alerta(s) crítico(s) precisam de atenção`,
        description: 'Revise os alertas unificados e priorize as ações.',
        route: '/app/cerebro-operacional'
      });
    }

    if (sectorsAlert > 0) {
      insights.push({
        type: 'sectors_at_risk',
        severity: 'medium',
        title: `${sectorsAlert} setor(es) em alerta`,
        description: sectors.filter(s => s.status === 'alert').map(s => s.name).join(', '),
        route: '/app'
      });
    }

    // Insight de integração
    if (level === 'ceo' || level === 'diretor') {
      insights.push({
        type: 'central_ai_active',
        severity: 'low',
        title: 'IA Central ativa',
        description: 'Todos os setores estão conectados. Dados em tempo real disponíveis.',
        route: '/app'
      });
    }
  } catch (err) {
    console.warn('[CENTRAL_AI] getCentralInsights:', err?.message);
  }

  return insights;
}

/**
 * Inteligência central completa - payload unificado por cargo
 */
async function getCentralIntelligence(companyId, user) {
  if (!companyId || !user) {
    return { role_level: 'profissional', message: 'Empresa ou usuário não definido' };
  }

  const roleLevel = getRoleLevel(user);

  const [alerts, sectors, predictions, insights] = await Promise.all([
    getUnifiedAlerts(companyId, user),
    getSectorStatus(companyId, user),
    getStrategicPredictions(companyId, user),
    getCentralInsights(companyId, user)
  ]);

  const payload = {
    role_level: roleLevel,
    role_description: {
      ceo: 'Visão global da indústria, alertas estratégicos, previsões financeiras e operacionais',
      diretor: 'Insights setoriais, alertas críticos, análise de desempenho e previsão de impactos',
      gerente: 'Dashboards consolidados, alertas de desempenho da equipe e do setor',
      supervisor: 'Monitoramento em tempo real, alertas operacionais do setor',
      profissional: 'Dados operacionais específicos, alertas de tarefas, suporte no rastreio'
    }[roleLevel],
    alerts: {
      total: alerts.length,
      critical: alerts.filter(a => ['critical', 'alta', 'high'].includes(a.severity)).length,
      items: alerts.slice(0, 30)
    },
    sectors,
    insights,
    predictions: predictions || undefined,
    integrated_sectors: ['rh', 'warehouse', 'quality', 'logistics', 'production', 'maintenance'].filter(k =>
      sectors.some(s => s.key === k)
    )
  };

  return payload;
}

module.exports = {
  getRoleLevel,
  getUnifiedAlerts,
  getSectorStatus,
  getStrategicPredictions,
  getCentralInsights,
  getCentralIntelligence
};
