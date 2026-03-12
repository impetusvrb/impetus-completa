/**
 * IMPETUS - Inteligência de Qualidade Industrial
 * Distribuição por cargo, indicadores, alertas, análise IA, rastreabilidade
 */
const db = require('../db');
const ai = require('./ai');
let lotService;
try { lotService = require('./rawMaterialLotDetectionService'); } catch (_) {}

/**
 * Perfil de qualidade por cargo (o que cada nível recebe)
 */
function getQualityProfileForUser(user) {
  const role = (user.role || '').toLowerCase();
  const h = user.hierarchy_level ?? 5;
  const funcArea = (user.functional_area || '').toLowerCase();

  if (role === 'ceo' || h <= 0) {
    return {
      level: 'ceo',
      receives: ['financial_impact', 'quality_trends', 'strategic_impact'],
      dataDepth: 'strategic'
    };
  }
  if (role === 'diretor' || h <= 1) {
    return {
      level: 'diretor',
      receives: ['production_impact', 'rework_index', 'defect_waste', 'operational_risk'],
      dataDepth: 'tactical'
    };
  }
  if (role === 'gerente' || h <= 2 || funcArea === 'quality' || funcArea === 'qualidade') {
    return {
      level: 'gerente',
      receives: ['quality_indicators', 'failure_causes', 'defect_trends', 'supplier_performance', 'process_stability'],
      dataDepth: 'analytical'
    };
  }
  if (role === 'supervisor' || role === 'coordenador' || funcArea === 'quality' || funcArea === 'qualidade') {
    return {
      level: 'supervisor',
      receives: ['inspection_records', 'non_conformities', 'process_deviations', 'quality_alerts', 'defects_by_lot'],
      dataDepth: 'operational'
    };
  }
  return { level: 'colaborador', receives: [], dataDepth: null };
}

/**
 * Lista inspeções (filtrado por perfil)
 */
async function getInspections(companyId, opts = {}) {
  const { since, until, result, limit = 50 } = opts;
  let sql = `SELECT qi.*, rm.name as raw_material_name, rm.code as raw_material_code
    FROM quality_inspections qi
    LEFT JOIN raw_materials rm ON rm.id = qi.raw_material_id
    WHERE qi.company_id = $1`;
  const params = [companyId];
  if (since) { params.push(since); sql += ` AND qi.inspection_date >= $${params.length}`; }
  if (until) { params.push(until); sql += ` AND qi.inspection_date <= $${params.length}`; }
  if (result) { params.push(result); sql += ` AND qi.result = $${params.length}`; }
  params.push(limit || 50);
  sql += ` ORDER BY qi.inspection_date DESC, qi.created_at DESC LIMIT $${params.length}`;

  const r = await db.query(sql, params);
  return r.rows || [];
}

/**
 * Lista entradas de lote (recebimentos)
 */
async function getReceipts(companyId, opts = {}) {
  const { since, until, material_id, limit = 50 } = opts;
  let sql = `SELECT r.*, rm.name as raw_material_name, rm.code as raw_material_code
    FROM raw_material_receipts r
    LEFT JOIN raw_materials rm ON rm.id = r.raw_material_id
    WHERE r.company_id = $1`;
  const params = [companyId];
  if (since) { params.push(since); sql += ` AND r.receipt_date >= $${params.length}`; }
  if (until) { params.push(until); sql += ` AND r.receipt_date <= $${params.length}`; }
  if (material_id) { params.push(material_id); sql += ` AND r.raw_material_id = $${params.length}`; }
  params.push(limit || 50);
  sql += ` ORDER BY r.receipt_date DESC LIMIT $${params.length}`;

  const r = await db.query(sql, params);
  return r.rows || [];
}

/**
 * Calcula indicadores de qualidade
 */
async function calculateQualityIndicators(companyId, days = 30) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const r = await db.query(`
    SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE result = 'non_conforming') as non_conforming,
      COUNT(*) FILTER (WHERE result = 'conforming') as conforming,
      COALESCE(SUM(defects_count), 0) as total_defects,
      COALESCE(SUM(rework_count), 0) as total_rework
    FROM quality_inspections
    WHERE company_id = $1 AND inspection_date >= $2
  `, [companyId, since]);

  const tpm = await db.query(`
    SELECT COUNT(*) as cnt, COALESCE(SUM(losses_before + losses_during + losses_after), 0) as losses
    FROM tpm_incidents WHERE company_id = $1 AND incident_date >= $2
  `, [companyId, since]);

  const row = r.rows?.[0] || {};
  const total = parseInt(row.total || 0, 10);
  const conforming = parseInt(row.conforming || 0, 10);
  const totalDefects = parseInt(row.total_defects || 0, 10);
  const totalRework = parseInt(row.total_rework || 0, 10);
  const tpmCnt = parseInt(tpm.rows?.[0]?.cnt || 0, 10);
  const tpmLosses = parseInt(tpm.rows?.[0]?.losses || 0, 10);

  const conformityRate = total > 0 ? Math.round((conforming / total) * 10000) / 100 : 100;
  const defectIndex = total > 0 ? Math.round((totalDefects / total) * 10000) / 100 : 0;
  const reworkIndex = total > 0 ? Math.round((totalRework / total) * 10000) / 100 : 0;

  await db.query(`
    INSERT INTO quality_indicators_snapshot (company_id, snapshot_date, defect_index, rework_index, conformity_rate)
    VALUES ($1, CURRENT_DATE, $2, $3, $4)
    ON CONFLICT (company_id, snapshot_date) DO UPDATE SET
      defect_index = EXCLUDED.defect_index,
      rework_index = EXCLUDED.rework_index,
      conformity_rate = EXCLUDED.conformity_rate
  `, [companyId, defectIndex, reworkIndex, conformityRate]);

  return {
    defect_index: defectIndex,
    rework_index: reworkIndex,
    conformity_rate: conformityRate,
    total_inspections: total,
    total_defects: totalDefects,
    tpm_incidents: tpmCnt,
    tpm_losses: tpmLosses
  };
}

/**
 * Dashboard de qualidade filtrado por perfil
 */
async function getQualityDashboardForUser(companyId, user) {
  const profile = getQualityProfileForUser(user);
  if (profile.receives.length === 0) {
    return { profile_level: 'none', receives: [], message: 'Sem acesso ao módulo de qualidade' };
  }

  const [indicators, inspections, receipts, alerts, supplierRanking] = await Promise.all([
    ['supervisor', 'gerente', 'diretor', 'ceo'].includes(profile.level) ? calculateQualityIndicators(companyId, 30) : null,
    profile.receives.some(x => ['inspection_records', 'non_conformities', 'defects_by_lot'].includes(x))
      ? getInspections(companyId, { limit: 30 })
      : [],
    profile.receives.includes('inspection_records')
      ? getReceipts(companyId, { limit: 20 })
      : [],
    db.query(`
      SELECT * FROM quality_alerts
      WHERE company_id = $1 AND acknowledged = false
      AND (target_role_level IS NULL OR target_role_level >= $2)
      ORDER BY created_at DESC LIMIT 15
    `, [companyId, user.hierarchy_level ?? 5]),
    (profile.receives.includes('supplier_performance') && lotService)
      ? lotService.getSupplierRanking(companyId)
      : []
  ]);

  return {
    profile_level: profile.level,
    receives: profile.receives,
    indicators: profile.dataDepth === 'analytical' || profile.dataDepth === 'tactical' || profile.dataDepth === 'strategic' ? indicators : null,
    inspections: profile.receives.some(x => ['inspection_records', 'non_conformities'].includes(x)) ? inspections : [],
    receipts: profile.receives.includes('inspection_records') ? receipts : [],
    alerts: alerts.rows || [],
    supplier_ranking: Array.isArray(supplierRanking) ? supplierRanking : []
  };
}

/**
 * Gera análise de causa pela IA
 */
async function analyzeQualityCause(companyId, context) {
  try {
    const prompt = `Análise de qualidade industrial. Contexto: ${JSON.stringify(context).slice(0, 800)}

Identifique possíveis causas (lote, fornecedor, máquina, operador, processo) e sugira 3-5 ações. Seja objetivo.`;
    const res = await ai.chatCompletion(prompt, { max_tokens: 400 });
    return (res && !String(res).startsWith('FALLBACK:')) ? String(res).trim() : null;
  } catch (_) {
    return null;
  }
}

/**
 * Cria alerta de qualidade e distribui por cargo
 */
async function createQualityAlert(companyId, alert) {
  const r = await db.query(`
    INSERT INTO quality_alerts (company_id, alert_type, severity, title, description, ai_analysis, ai_recommendations, entity_type, entity_id, lot_number, supplier_name, raw_material_id, product_id, target_role_level, metrics)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    RETURNING *
  `, [
    companyId, alert.alert_type, alert.severity || 'medium', alert.title, alert.description || null,
    alert.ai_analysis || null, JSON.stringify(alert.ai_recommendations || []),
    alert.entity_type || null, alert.entity_id || null, alert.lot_number || null, alert.supplier_name || null,
    alert.raw_material_id || null, alert.product_id || null,
    alert.target_role_level ?? 5, JSON.stringify(alert.metrics || {})
  ]);
  return r.rows?.[0];
}

/**
 * Detecta padrões e cria alertas automáticos
 */
async function detectAndCreateQualityAlerts(companyId) {
  const indicators = await calculateQualityIndicators(companyId, 14);
  const prev = await db.query(`
    SELECT defect_index, rework_index, conformity_rate FROM quality_indicators_snapshot
    WHERE company_id = $1 AND snapshot_date = CURRENT_DATE - 14
  `, [companyId]).then((r) => r.rows?.[0]);

  const alerts = [];
  if (prev && indicators.defect_index > (prev.defect_index || 0) * 1.3) {
    const analysis = await analyzeQualityCause(companyId, { defect_increase: indicators.defect_index, previous: prev.defect_index });
    alerts.push(await createQualityAlert(companyId, {
      alert_type: 'defect_increase',
      severity: 'high',
      title: 'Aumento anormal de defeitos',
      description: `Índice de defeitos subiu de ${prev.defect_index}% para ${indicators.defect_index}%`,
      ai_analysis: analysis,
      target_role_level: 3,
      metrics: indicators
    }));
  }
  if (indicators.conformity_rate < 90 && indicators.total_inspections >= 5) {
    alerts.push(await createQualityAlert(companyId, {
      alert_type: 'low_conformity',
      severity: 'medium',
      title: 'Taxa de conformidade abaixo de 90%',
      description: `Conformidade atual: ${indicators.conformity_rate}%`,
      target_role_level: 3,
      metrics: indicators
    }));
  }

  return alerts.filter(Boolean);
}

/**
 * Impacto da qualidade para BI/Previsão
 */
async function getQualityImpactForForecasting(companyId, days = 7) {
  const ind = await calculateQualityIndicators(companyId, days);
  return {
    conformity_rate: ind.conformity_rate,
    defect_index: ind.defect_index,
    rework_index: ind.rework_index,
    quality_factor: (ind.conformity_rate || 100) / 100,
    waste_estimate: (ind.defect_index || 0) * 0.01 + (ind.rework_index || 0) * 0.005
  };
}

/**
 * Registra inspeção
 */
async function recordInspection(companyId, data) {
  const r = await db.query(`
    INSERT INTO quality_inspections (company_id, inspection_date, inspection_type, raw_material_id, lot_number, product_id, machine_used, operator_id, operator_name, result, defects_count, rework_count, defects_description, corrective_action, inspector_id, source_type, source_id)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
    RETURNING *
  `, [
    companyId, data.inspection_date || new Date().toISOString().slice(0, 10), data.inspection_type || null,
    data.raw_material_id || null, data.lot_number || null, data.product_id || null, data.machine_used || null,
    data.operator_id || null, data.operator_name || null, data.result || 'conforming',
    data.defects_count ?? 0, data.rework_count ?? 0, data.defects_description || null, data.corrective_action || null,
    data.inspector_id || null, data.source_type || null, data.source_id || null
  ]);
  return r.rows?.[0];
}

/**
 * Registra recebimento de lote
 */
async function recordReceipt(companyId, data) {
  const r = await db.query(`
    INSERT INTO raw_material_receipts (company_id, raw_material_id, lot_number, supplier_name, receipt_date, quantity, unit, inspector_id, inspection_result, inspection_notes, inspected_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING *
  `, [
    companyId, data.raw_material_id || null, data.lot_number, data.supplier_name || null,
    data.receipt_date || new Date().toISOString().slice(0, 10), data.quantity, data.unit || 'UN',
    data.inspector_id || null, data.inspection_result || 'pending', data.inspection_notes || null,
    data.inspection_result ? new Date() : null
  ]);
  return r.rows?.[0];
}

module.exports = {
  getQualityProfileForUser,
  getInspections,
  getReceipts,
  calculateQualityIndicators,
  getQualityDashboardForUser,
  analyzeQualityCause,
  createQualityAlert,
  detectAndCreateQualityAlerts,
  getQualityImpactForForecasting,
  recordInspection,
  recordReceipt
};
