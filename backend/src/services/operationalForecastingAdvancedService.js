/**
 * IMPETUS - Previsão Operacional e Financeira Avançada
 * Gestão antecipada: projeções 7/10/14/30 dias, lucro/prejuízo, simulação de decisões
 * Integra Digital Twin: produção, máquinas, custos, energia, manutenção, tarefas
 */
const db = require('../db');
const industrialCost = require('./industrialCostService');
const financialLeakage = require('./financialLeakageDetectorService');
const industrialOperationalMap = require('./industrialOperationalMapService');
const ai = require('./ai');
let hrIntelligence;
let anomalyDetection;
let qualityIntelligence;
let warehouseIntelligence;
try { hrIntelligence = require('./hrIntelligenceService'); } catch (_) {}
try { anomalyDetection = require('./operationalAnomalyDetectionService'); } catch (_) {}
try { qualityIntelligence = require('./qualityIntelligenceService'); } catch (_) {}
try { warehouseIntelligence = require('./warehouseIntelligenceService'); } catch (_) {}

const PROJECTION_DAYS = [7, 10, 14, 30];

async function getForecastingConfig(companyId) {
  let r = await db.query('SELECT * FROM company_forecasting_config WHERE company_id = $1', [companyId]);
  if (!r.rows?.[0]) {
    await db.query(`
      INSERT INTO company_forecasting_config (company_id) VALUES ($1)
      ON CONFLICT (company_id) DO NOTHING
    `, [companyId]).catch(() => {});
    r = await db.query('SELECT * FROM company_forecasting_config WHERE company_id = $1', [companyId]);
  }
  const row = r.rows?.[0] || {};
  return {
    revenue_per_day: parseFloat(row.revenue_per_day) || 0,
    revenue_per_month: parseFloat(row.revenue_per_month) || 0,
    efficiency_baseline: parseFloat(row.efficiency_baseline) || 75,
    production_capacity_utilization: parseFloat(row.production_capacity_utilization) || 80
  };
}

/**
 * Coleta dados do Digital Twin para projeção
 */
async function collectDigitalTwinData(companyId) {
  const hrImpactPromise = hrIntelligence?.getTeamImpactForForecasting
    ? hrIntelligence.getTeamImpactForForecasting(companyId).catch(() => null)
    : Promise.resolve(null);
  const anomalyImpactPromise = anomalyDetection?.getAnomalyImpactForForecasting
    ? anomalyDetection.getAnomalyImpactForForecasting(companyId, 7).catch(() => null)
    : Promise.resolve(null);
  const qualityImpactPromise = qualityIntelligence?.getQualityImpactForForecasting
    ? qualityIntelligence.getQualityImpactForForecasting(companyId, 7).catch(() => null)
    : Promise.resolve(null);
  const warehouseImpactPromise = warehouseIntelligence?.getWarehouseImpactForForecasting
    ? warehouseIntelligence.getWarehouseImpactForForecasting(companyId).catch(() => null)
    : Promise.resolve(null);

  const [
    machineEvents,
    costSummary,
    leakMap,
    offline,
    predictions,
    workOrders,
    taskCount,
    impactEvents,
    tpmCount,
    plcSamples,
    hrImpact,
    anomalyImpact,
    qualityImpact,
    warehouseImpact
  ] = await Promise.all([
    db.query(`SELECT event_type, severity, machine_identifier, line_name, created_at FROM machine_detected_events WHERE company_id = $1 AND created_at > now() - INTERVAL '7 days'`, [companyId]),
    industrialCost.getExecutiveCostSummary(companyId, 'day'),
    financialLeakage.getLeakMap(companyId, true).catch(() => []),
    industrialOperationalMap.getOfflineEquipment(companyId).catch(() => []),
    industrialOperationalMap.getFailurePredictions(companyId, 15).catch(() => []),
    db.query(`SELECT COUNT(*) as total FROM work_orders WHERE company_id = $1 AND status IN ('open','in_progress')`, [companyId]).catch(() => ({ rows: [{ total: 0 }] })),
    db.query(`SELECT COUNT(*) as total FROM tasks t WHERE t.company_id = $1 AND t.status NOT IN ('done','cancelled')`, [companyId]).catch(() => ({ rows: [{ total: 0 }] })),
    db.query(`SELECT COALESCE(SUM(calculated_impact), 0) as total FROM industrial_cost_impact_events WHERE company_id = $1 AND created_at >= now() - INTERVAL '7 days'`, [companyId]),
    db.query(`SELECT COUNT(*) as total FROM tpm_incidents WHERE company_id = $1 AND incident_date >= CURRENT_DATE - 7`, [companyId]).catch(() => ({ rows: [{ total: 0 }] })),
    db.query(`SELECT COUNT(*) as total FROM plc_collected_data WHERE company_id = $1 AND collected_at >= now() - INTERVAL '1 day'`, [companyId]).catch(() => ({ rows: [{ total: 0 }] })),
    hrImpactPromise,
    anomalyImpactPromise,
    qualityImpactPromise,
    warehouseImpactPromise
  ]);

  const evs = machineEvents.rows || [];
  const paradas = evs.filter(e => ['machine_stopped', 'compressor_offline'].includes(e.event_type)).length;
  const highSev = evs.filter(e => ['high', 'critical'].includes(e.severity)).length;

  return {
    machine_events_7d: evs.length,
    paradas_7d: paradas,
    high_severity: highSev,
    cost_per_day: costSummary?.operational?.per_day || 0,
    cost_per_month: costSummary?.operational?.per_month || 0,
    impact_7d: parseFloat(impactEvents.rows?.[0]?.total || 0),
    leak_total_30d: (leakMap || []).reduce((s, l) => s + (l.impact_30d || 0), 0),
    offline_count: (offline || []).length,
    predictions_count: (predictions || []).length,
    work_orders_open: parseInt(workOrders.rows?.[0]?.total || 0, 10),
    tasks_pending: parseInt(taskCount.rows?.[0]?.total || 0, 10),
    tpm_incidents_7d: parseInt(tpmCount.rows?.[0]?.total || 0, 10),
    plc_samples_24h: parseInt(plcSamples.rows?.[0]?.total || 0, 10),
    efficiency_factor: Math.max(20, 85 - highSev * 3 - (offline || []).length * 5 - paradas * 2) / 100,
    team_productivity_factor: hrImpact?.productivity_factor ?? 1,
    presence_compliance: hrImpact?.presence_compliance ?? 100,
    fatigue_risk: hrImpact?.fatigue_risk ?? 0,
    anomaly_count_7d: anomalyImpact?.anomaly_count ?? 0,
    anomaly_risk_factor: anomalyImpact?.risk_factor ?? 0,
    quality_factor: qualityImpact?.quality_factor ?? 1,
    conformity_rate: qualityImpact?.conformity_rate ?? 100,
    stock_risk_factor: warehouseImpact?.stock_risk_factor ?? 1
  };
}

/**
 * Projeções estendidas para 7, 10, 14, 30 dias
 */
async function getExtendedProjections(companyId) {
  const [config, twin, costProj7, costProj30, leakProj7, leakProj30] = await Promise.all([
    getForecastingConfig(companyId),
    collectDigitalTwinData(companyId),
    industrialCost.getProjectedLoss(companyId, 24 * 7).catch(() => ({ projected_loss: 0 })),
    industrialCost.getProjectedLoss(companyId, 24 * 30).catch(() => ({ projected_loss: 0 })),
    financialLeakage.getProjectedImpact(companyId, 7, true).catch(() => ({ projected_impact: 0 })),
    financialLeakage.getProjectedImpact(companyId, 30, true).catch(() => ({ projected_impact: 0 }))
  ]);

  const costDay = twin.cost_per_day || (twin.cost_per_month || 0) / 30;
  const lossRatePerDay = (twin.impact_7d || 0) / 7 || costDay * 0.15;

  const teamFactor = twin.team_productivity_factor ?? 1;
  const anomalyPenalty = 1 - (twin.anomaly_risk_factor ?? 0);
  const qualityMult = twin.quality_factor ?? 1;
  const effectiveEfficiency = Math.min(1, twin.efficiency_factor * teamFactor * anomalyPenalty * qualityMult);

  const projections = PROJECTION_DAYS.map((days) => {
    const costProjected = costDay * days;
    const lossFromEvents = Math.max(
      (costProj7?.projected_loss || 0) * (days / 7),
      (leakProj7?.projected_impact || 0) * (days / 7)
    );
    const efficiencyMult = Math.pow(effectiveEfficiency, days / 30);
    const productionProjected = efficiencyMult * 100;

    return {
      days,
      label: `${days} dias`,
      production_index: Math.round(productionProjected),
      cost_operational: Math.round(costProjected),
      cost_losses: Math.round(lossFromEvents),
      cost_total: Math.round(costProjected + lossFromEvents),
      risk_stop: Math.min(100, Math.round(20 + twin.paradas_7d * 3 + twin.high_severity * 5)),
      efficiency: Math.round(effectiveEfficiency * 100 * efficiencyMult)
    };
  });

  return {
    projections,
    digital_twin_snapshot: {
      machine_events_7d: twin.machine_events_7d,
      paradas_7d: twin.paradas_7d,
      work_orders_open: twin.work_orders_open,
      offline_count: twin.offline_count,
      tpm_incidents_7d: twin.tpm_incidents_7d,
      presence_compliance: twin.presence_compliance,
      fatigue_risk: twin.fatigue_risk,
      anomaly_count_7d: twin.anomaly_count_7d,
      conformity_rate: twin.conformity_rate
    }
  };
}

/**
 * Projeção Lucro ou Prejuízo (receita - custos)
 */
async function getProfitLossProjection(companyId, days = 14) {
  const [config, twin, costProj, leakProj] = await Promise.all([
    getForecastingConfig(companyId),
    collectDigitalTwinData(companyId),
    industrialCost.getProjectedLoss(companyId, 24 * days).catch(() => ({ projected_loss: 0 })),
    financialLeakage.getProjectedImpact(companyId, days, true).catch(() => ({ projected_impact: 0 }))
  ]);

  const revenueDay = config.revenue_per_day || (config.revenue_per_month || 0) / 30;
  const costDay = twin.cost_per_day || (twin.cost_per_month || 0) / 30;
  const lossDay = (twin.impact_7d || 0) / 7 || costDay * 0.1;

  const receita = Math.round(revenueDay * days);
  const custosOperacionais = Math.round(costDay * days);
  const perdasEventos = Math.round(Math.max(costProj?.projected_loss || 0, leakProj?.projected_impact || 0));
  const custosTotal = custosOperacionais + perdasEventos;
  const resultado = receita - custosTotal;
  const lucroOuPrejuizo = resultado >= 0 ? 'lucro' : 'prejuizo';

  return {
    days,
    receita_estimada: receita,
    custos_operacionais_estimados: custosOperacionais,
    perdas_eventos: perdasEventos,
    custos_total: custosTotal,
    resultado_projetado: Math.abs(resultado),
    tipo_resultado: lucroOuPrejuizo,
    principais_fatores: await getCriticalFactors(companyId)
  };
}

/**
 * Identificação automática de causas que impactam a projeção
 */
async function getCriticalFactors(companyId) {
  const [twin, leakMap, machineByLine] = await Promise.all([
    collectDigitalTwinData(companyId),
    financialLeakage.getLeakMap(companyId, true).catch(() => []),
    db.query(`
      SELECT machine_identifier, line_name, COUNT(*) as cnt
      FROM machine_detected_events
      WHERE company_id = $1 AND created_at > now() - INTERVAL '7 days'
      GROUP BY machine_identifier, line_name
      ORDER BY cnt DESC LIMIT 5
    `, [companyId])
  ]);

  const factors = [];

  if (twin.paradas_7d > 2) {
    factors.push({ tipo: 'queda_produtividade', descricao: 'Aumento de paradas de máquinas', impacto: 'alto', setor: 'Produção' });
  }
  if (twin.high_severity > 1) {
    factors.push({ tipo: 'aumento_falhas', descricao: 'Eventos de alta criticidade recorrentes', impacto: 'alto', setor: 'Manutenção' });
  }
  if (twin.offline_count > 0) {
    factors.push({ tipo: 'equipamentos_offline', descricao: `${twin.offline_count} equipamento(s) sem monitoramento`, impacto: 'médio`, setor: 'Operacional' });
  }
  if ((leakMap || []).some(l => (l.impact_30d || 0) > 5000)) {
    factors.push({ tipo: 'desperdicio_materia', descricao: 'Perdas detectadas no mapa de vazamento', impacto: 'alto', setor: 'Produção' });
  }
  if (twin.work_orders_open > 3) {
    factors.push({ tipo: 'atrasos_manutencao', descricao: `${twin.work_orders_open} ordem(ns) de serviço em aberto`, impacto: 'médio`, setor: 'Manutenção' });
  }
  if (twin.predictions_count > 2) {
    factors.push({ tipo: 'gargalos_producao', descricao: `${twin.predictions_count} previsões de falha`, impacto: 'médio`, setor: 'Produção' });
  }

  const machines = (machineByLine.rows || []).map(r => ({
    machine: r.machine_identifier,
    line: r.line_name,
    event_count: parseInt(r.cnt, 10),
    descricao: `Máquina ${r.machine_identifier || r.line_name} com ${r.cnt} eventos`
  }));

  return { factors, setores_criticos: [...new Set(factors.map(f => f.setor))], maquinas_baixo_desempenho: machines };
}

/**
 * Simulação de decisão - recalcula projeção com cenário alternativo
 */
async function simulateDecision(companyId, decision) {
  const { action, value, unit } = decision;
  const base = await getProfitLossProjection(companyId, value?.days || 14);
  const days = value?.days || 14;

  let adjReceita = base.receita_estimada;
  let adjCustos = base.custos_total;
  let scenario_desc = '';
  let impact_desc = '';

  switch (action) {
    case 'aumentar_producao':
      const pct = (parseFloat(value?.percent) || 10) / 100;
      adjReceita = Math.round(base.receita_estimada * (1 + pct));
      scenario_desc = `Aumentar produção em ${(pct * 100).toFixed(0)}%`;
      impact_desc = `Receita projetada: R$ ${adjReceita.toLocaleString('pt-BR')}`;
      break;
    case 'parar_maquina_manutencao':
      adjCustos = Math.round(base.custos_total * 1.15);
      scenario_desc = 'Parar máquina para manutenção preventiva';
      impact_desc = 'Custos sobem ~15% no período, mas reduz risco de parada não programada.';
      break;
    case 'reduzir_desperdicio':
      const reduc = (parseFloat(value?.percent) || 20) / 100;
      adjCustos = Math.round(base.custos_total * (1 - reduc * 0.3));
      scenario_desc = `Reduzir desperdício em ${(reduc * 100).toFixed(0)}%`;
      impact_desc = `Custos projetados: R$ ${adjCustos.toLocaleString('pt-BR')}`;
      break;
    case 'alterar_turno':
      adjReceita = Math.round(base.receita_estimada * 1.1);
      adjCustos = Math.round(base.custos_total * 1.05);
      scenario_desc = 'Alterar turno de equipe (mais produtividade, custo extra)';
      impact_desc = 'Receita +10%, Custos +5%. Resultado tende a melhorar.';
      break;
    case 'aumentar_eficiencia':
      const eff = (parseFloat(value?.percent) || 15) / 100;
      adjReceita = Math.round(base.receita_estimada * (1 + eff * 0.8));
      adjCustos = Math.round(base.custos_total * (1 - eff * 0.2));
      scenario_desc = `Aumentar eficiência da linha em ${(eff * 100).toFixed(0)}%`;
      impact_desc = `Receita +${(eff * 80).toFixed(0)}%, Custos -${(eff * 20).toFixed(0)}%`;
      break;
    default:
      scenario_desc = 'Cenário base';
  }

  const resultado = adjReceita - adjCustos;
  const tipo = resultado >= 0 ? 'lucro' : 'prejuizo';

  return {
    scenario: scenario_desc,
    impact_description: impact_desc,
    receita_projetada: adjReceita,
    custos_projetados: adjCustos,
    resultado_projetado: Math.abs(resultado),
    tipo_resultado: tipo,
    comparativo_base: {
      receita_original: base.receita_estimada,
      custos_original: base.custos_total,
      delta_receita: adjReceita - base.receita_estimada,
      delta_custos: adjCustos - base.custos_total
    }
  };
}

/**
 * Persiste/atualiza config de receita
 */
async function updateForecastingConfig(companyId, data) {
  await db.query(`
    INSERT INTO company_forecasting_config (company_id, revenue_per_day, revenue_per_month, efficiency_baseline, production_capacity_utilization, updated_at)
    VALUES ($1, $2, $3, $4, $5, now())
    ON CONFLICT (company_id) DO UPDATE SET
      revenue_per_day = COALESCE(EXCLUDED.revenue_per_day, company_forecasting_config.revenue_per_day),
      revenue_per_month = COALESCE(EXCLUDED.revenue_per_month, company_forecasting_config.revenue_per_month),
      efficiency_baseline = COALESCE(EXCLUDED.efficiency_baseline, company_forecasting_config.efficiency_baseline),
      production_capacity_utilization = COALESCE(EXCLUDED.production_capacity_utilization, company_forecasting_config.production_capacity_utilization),
      updated_at = now()
  `, [
    companyId,
    data.revenue_per_day ?? null,
    data.revenue_per_month ?? null,
    data.efficiency_baseline ?? null,
    data.production_capacity_utilization ?? null
  ]);
}

module.exports = {
  PROJECTION_DAYS,
  getForecastingConfig,
  collectDigitalTwinData,
  getExtendedProjections,
  getProfitLossProjection,
  getCriticalFactors,
  simulateDecision,
  updateForecastingConfig
};
