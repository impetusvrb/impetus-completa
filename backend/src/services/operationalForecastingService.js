/**
 * IMPETUS - Centro de Previsão Operacional
 * Analisa estado atual e projeta cenários futuros
 * Dados: operacionais, sensores, conversas, registros de produção
 */
const db = require('../db');
const industrialOperationalMap = require('./industrialOperationalMapService');
const machineSafety = require('./machineSafetyService');
const industrialCost = require('./industrialCostService');
const financialLeakage = require('./financialLeakageDetectorService');

const TIMELINE_POINTS = ['agora', '2h', '1d', '2d', '2s']; // agora, 2h, 1 dia, 2 dias, 2 semanas

/** cálculo de projeção linear baseado em tendência atual */
function projectValue(base, trendPerHour, hours) {
  if (base == null) return null;
  const delta = (trendPerHour || 0) * hours;
  return Math.max(0, Math.min(100, base + delta));
}

/**
 * Projeções para gráficos (eficiencia, perdas, prejuízo, custo, produção, risco falhas)
 */
async function getProjections(companyId, metricType = 'eficiencia') {
  const [events, profiles, offline, predictions, workOrders] = await Promise.all([
    db.query(`SELECT event_type, severity, machine_identifier, created_at FROM machine_detected_events WHERE company_id = $1 AND created_at > now() - INTERVAL '7 days'`, [companyId]),
    db.query(`SELECT machine_identifier, temperature_avg, vibration_avg, sample_count FROM machine_operational_profiles WHERE company_id = $1`, [companyId]),
    industrialOperationalMap.getOfflineEquipment(companyId),
    industrialOperationalMap.getFailurePredictions(companyId, 20),
    db.query(`SELECT COUNT(*) as total FROM work_orders WHERE company_id = $1 AND status IN ('open','in_progress') AND created_at > now() - INTERVAL '7 days'`, [companyId]).catch(() => ({ rows: [{ total: 0 }] }))
  ]);

  const evs = events.rows || [];
  const highSeverity = evs.filter((e) => ['high', 'critical'].includes(e.severity)).length;
  const paradasCount = evs.filter((e) => ['machine_stopped', 'compressor_offline'].includes(e.event_type)).length;
  const predCount = predictions.length;

  let basePrejuizo = (paradasCount * 1500) + (highSeverity * 800) + (predCount * 500);
  try {
    const costProj = await industrialCost.getProjectedLoss(companyId, 2);
    if (costProj?.projected_loss > 0 && costProj?.baseline_24h > 0) {
      basePrejuizo = Math.round(costProj.baseline_24h / 24 * 2);
    }
  } catch (_) {}

  const totalMachines = profiles.rows?.length || 1;
  const offlineCount = offline.length;
  const baseEficiencia = Math.max(20, 85 - (highSeverity * 3) - (offlineCount * 5) - (paradasCount * 2));
  const basePerdas = Math.min(100, (paradasCount * 4) + (highSeverity * 2) + (offlineCount * 3));
  const baseRisco = Math.min(100, predCount * 15 + highSeverity * 5);

  const hoursMap = { agora: 0, '2h': 2, '1d': 24, '2d': 48, '2s': 336 };
  const trendEfic = -0.1;
  const trendPerdas = 0.05;
  const trendRisco = predCount > 0 ? 0.08 : 0.02;

  const buildSeries = (base, trend, hoursMap) =>
    TIMELINE_POINTS.map((p) => ({
      point: p,
      value: p === 'agora' ? base : projectValue(base, trend, hoursMap[p] || 0),
      label: p === 'agora' ? 'Agora' : p === '2h' ? '2 horas' : p === '1d' ? '1 dia' : p === '2d' ? '2 dias' : '2 semanas'
    }));

  const metrics = {
    eficiencia: buildSeries(baseEficiencia, trendEfic, hoursMap),
    perdas: buildSeries(basePerdas, trendPerdas, hoursMap),
    prejuizo: TIMELINE_POINTS.map((p) => ({
      point: p,
      value: p === 'agora' ? basePrejuizo : Math.round(basePrejuizo * (1 + (hoursMap[p] || 0) / 48 * 0.5)),
      label: p === 'agora' ? 'Agora' : p === '2h' ? '2 horas' : p === '1d' ? '1 dia' : p === '2d' ? '2 dias' : '2 semanas'
    })),
    custo_operacional: buildSeries(70 + (highSeverity * 2), 0.02, hoursMap),
    producao: buildSeries(baseEficiencia, trendEfic, hoursMap),
    risco_falhas: buildSeries(baseRisco, trendRisco, hoursMap)
  };

  return { metric: metricType, series: metrics[metricType] || metrics.eficiencia, timeline: TIMELINE_POINTS };
}

/**
 * Alertas inteligentes agregados
 */
async function getIntelligentAlerts(companyId, limit = 15) {
  const [events, offline, interventions] = await Promise.all([
    db.query(`
      SELECT id, event_type, machine_identifier, machine_name, line_name, description, severity, sensor_values, created_at
      FROM machine_detected_events
      WHERE company_id = $1 AND created_at > now() - INTERVAL '3 days'
      ORDER BY CASE severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2 ELSE 3 END, created_at DESC
      LIMIT $2
    `, [companyId, limit]),
    industrialOperationalMap.getOfflineEquipment(companyId),
    machineSafety.listActiveInterventions(companyId)
  ]);

  const alerts = [];
  const evMap = {
    machine_stopped: { impacto: 'Linha parada - perda de produção', acao: 'Verificar equipamento e registrar intervenção se manutenção' },
    overheating: { impacto: 'Risco de dano - possível parada', acao: 'Revisar refrigeração e carga' },
    low_oil: { impacto: 'Risco de quebra', acao: 'Repor óleo imediatamente' },
    vibration_alert: { impacto: 'Desgaste acelerado', acao: 'Inspeção de manutenção' },
    pressure_low: { impacto: 'Queda de produtividade', acao: 'Verificar linha de ar/fluido' },
    compressor_offline: { impacto: 'Sistema auxiliar parado', acao: 'Ligar reserva ou registrar manutenção' },
    predicted_failure: { impacto: 'Previsão de falha', acao: 'Programar manutenção preventiva' }
  };

  for (const e of events.rows || []) {
    const info = evMap[e.event_type] || { impacto: 'Evento operacional', acao: 'Verificar equipamento' };
    alerts.push({
      id: e.id,
      type: e.event_type,
      machine: e.machine_name || e.machine_identifier,
      line: e.line_name,
      description: e.description || e.event_type,
      time: e.created_at,
      severity: e.severity,
      impact: info.impacto,
      suggestion: info.acao
    });
  }

  for (const o of offline) {
    alerts.push({
      id: `offline-${o.machine_identifier}`,
      type: 'equipment_offline',
      machine: o.machine_name || o.machine_identifier,
      description: 'Equipamento sem leitura recente',
      time: o.last_seen || new Date().toISOString(),
      severity: 'medium',
      impact: 'Dados de monitoramento indisponíveis',
      suggestion: 'Verificar conexão do equipamento'
    });
  }

  return alerts.slice(0, limit);
}

/**
 * Simulação: continuar operando como está
 */
async function simulateFuture(companyId, scenarioHours = 48) {
  const [projections, alerts, health] = await Promise.all([
    getProjections(companyId, 'eficiencia'),
    getIntelligentAlerts(companyId, 5),
    getCompanyHealth(companyId)
  ]);

  const lastEff = projections.series[projections.series.length - 1]?.value ?? 75;
  const lastPerdas = (await getProjections(companyId, 'perdas')).series[projections.series.length - 1]?.value ?? 15;
  let lastPrej = (await getProjections(companyId, 'prejuizo')).series[projections.series.length - 1]?.value ?? 0;
  try {
    const leakProj = await financialLeakage.getProjectedImpact(companyId, 2, true);
    if (leakProj?.projected_impact > 0) lastPrej = Math.max(lastPrej, leakProj.projected_impact);
  } catch (_) {}

  return {
    scenario: `Operação mantida por ${scenarioHours}h`,
    efficiency_projection: lastEff,
    production_loss_projection: lastPerdas,
    estimated_loss: lastPrej,
    critical_alerts: alerts.filter((a) => a.severity === 'critical' || a.severity === 'high').length,
    suggestion: lastEff < 60 ? 'Priorizar resolução de paradas e falhas críticas.' : lastPerdas > 25 ? 'Atenção a perdas produtivas - revisar gargalos.' : 'Operação dentro dos limites esperados.'
  };
}

/**
 * Saúde da empresa (visão executiva)
 */
async function getCompanyHealth(companyId) {
  const [events, offline, predictions, interventions, workOrders] = await Promise.all([
    db.query(`SELECT event_type, severity FROM machine_detected_events WHERE company_id = $1 AND created_at > now() - INTERVAL '7 days'`, [companyId]),
    industrialOperationalMap.getOfflineEquipment(companyId),
    industrialOperationalMap.getFailurePredictions(companyId, 10),
    machineSafety.listActiveInterventions(companyId),
    db.query(`SELECT COUNT(*) as open_count FROM work_orders WHERE company_id = $1 AND status IN ('open','in_progress')`, [companyId]).catch(() => ({ rows: [{ open_count: 0 }] }))
  ]);

  const evs = events.rows || [];
  const critical = evs.filter((e) => e.severity === 'critical').length;
  const high = evs.filter((e) => e.severity === 'high').length;
  const paradas = evs.filter((e) => ['machine_stopped', 'compressor_offline'].includes(e.event_type)).length;

  const baseEff = Math.max(30, 90 - critical * 8 - high * 3 - offline.length * 5 - paradas * 2);
  const risco = Math.min(100, (critical * 20) + (high * 8) + (predictions.length * 5));
  const prejuizoEvitavel = (critical * 2000) + (high * 800) + (paradas * 500);

  let gargalo = null;
  if (paradas > 3 || critical > 1) {
    const machines = evs.reduce((acc, e) => { acc[e.machine_identifier] = (acc[e.machine_identifier] || 0) + 1; return acc; }, {});
    const top = Object.entries(machines).sort((a, b) => b[1] - a[1])[0];
    if (top) gargalo = `Equipamento ${top[0]} com ${top[1]} eventos`;
  }

  let prejuizoEvitavelFinal = prejuizoEvitavel;
  try {
    const costProj = await industrialCost.getProjectedLoss(companyId, 24);
    if (costProj?.projected_loss > 0) prejuizoEvitavelFinal = Math.max(prejuizoEvitavel, costProj.projected_loss);
    const leakProj = await financialLeakage.getProjectedImpact(companyId, 1, true);
    if (leakProj?.projected_impact > 0) prejuizoEvitavelFinal = Math.max(prejuizoEvitavelFinal, leakProj.projected_impact);
  } catch (_) {}

  return {
    eficiencia_geral: Math.round(baseEff),
    riscos_operacionais: risco,
    gargalos_producao: gargalo ? [gargalo] : [],
    prejuizo_evitavel: prejuizoEvitavelFinal,
    equipamentos_offline: offline.length,
    intervencoes_ativas: interventions.length,
    os_abertas: parseInt(workOrders.rows?.[0]?.open_count || 0, 10)
  };
}

module.exports = {
  getProjections,
  getIntelligentAlerts,
  simulateFuture,
  getCompanyHealth,
  TIMELINE_POINTS
};
