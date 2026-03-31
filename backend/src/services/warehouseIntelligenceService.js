/**
 * IMPETUS - Inteligência de Almoxarifado
 * Distribuição por cargo/área, previsões, alertas, detecção de materiais parados
 */
const db = require('../db');
const warehouseService = require('./warehouseService');
let ai;
try { ai = require('./ai'); } catch (_) {}

const IDLE_DAYS_THRESHOLD = 60;
const CONSUMPTION_DAYS = 30;

/**
 * Perfil de almoxarifado por cargo/área
 * Operadores: estoque, entradas/saídas, alertas operacionais
 * Supervisores: estoque crítico, consumo por categoria, materiais parados
 * Gerentes/Diretores: análises estratégicas, custo, previsão compra, desperdício
 * CEO: visão global, impacto financeiro
 */
function getWarehouseProfileForUser(user) {
  const role = (user.role || '').toLowerCase();
  const h = user.hierarchy_level ?? 5;
  const funcArea = (user.functional_area || '').toLowerCase();
  const funcDesc = ((user.role_description || user.job_description || '') + ' ' + (user.work_area || '')).toLowerCase();

  const isAlmoxarifado = /almoxarifado|estoque|logística|compras|suprimentos/i.test(funcArea + funcDesc);

  if (role === 'ceo' || h <= 0) {
    return {
      level: 'ceo',
      receives: ['stock_overview', 'financial_impact', 'strategic_trends'],
      dataDepth: 'strategic'
    };
  }
  if (role === 'diretor' || h <= 1) {
    return {
      level: 'diretor',
      receives: ['stock_cost', 'purchase_forecast', 'waste_indicators', 'operational_risk'],
      dataDepth: 'tactical'
    };
  }
  if (role === 'gerente' || h <= 2 || isAlmoxarifado) {
    return {
      level: 'gerente',
      receives: ['critical_alerts', 'consumption_by_category', 'idle_materials', 'predictions', 'strategic_analysis'],
      dataDepth: 'analytical'
    };
  }
  if (role === 'supervisor' || role === 'coordenador' || isAlmoxarifado) {
    return {
      level: 'supervisor',
      receives: ['current_stock', 'movements', 'operational_alerts', 'consumption_alerts'],
      dataDepth: 'operational'
    };
  }
  if (isAlmoxarifado || /almoxarifado|estoque|recepção de materiais/i.test(funcDesc)) {
    return {
      level: 'operator',
      receives: ['current_stock', 'movements', 'operational_alerts'],
      dataDepth: 'operational'
    };
  }
  return { level: 'colaborador', receives: [], dataDepth: null };
}

/**
 * Lista movimentações recentes
 */
async function getRecentMovements(companyId, opts = {}) {
  const { limit = 50, material_id, movement_type } = opts;
  let sql = `
    SELECT wm.*, m.name as material_name, m.code as material_code, m.unit,
      u.name as user_name
    FROM warehouse_movements wm
    JOIN warehouse_materials m ON m.id = wm.material_id
    LEFT JOIN users u ON u.id = wm.user_id
    WHERE wm.company_id = $1
  `;
  const params = [companyId];
  if (material_id) { params.push(material_id); sql += ` AND wm.material_id = $${params.length}`; }
  if (movement_type) { params.push(movement_type); sql += ` AND wm.movement_type = $${params.length}`; }
  params.push(limit);
  sql += ` ORDER BY wm.created_at DESC LIMIT $${params.length}`;
  const r = await db.query(sql, params);
  return r.rows || [];
}

/**
 * Consumo por categoria (últimos 30 dias)
 */
async function getConsumptionByCategory(companyId, days = 30) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const r = await db.query(`
    SELECT c.name as category_name, c.id as category_id,
      COUNT(DISTINCT wm.material_id) as materials_count,
      COALESCE(SUM(CASE WHEN wm.movement_type IN ('saida','consumo_producao','consumo_manutencao') THEN ABS(wm.quantity) ELSE 0 END), 0) as total_consumed
    FROM warehouse_movements wm
    JOIN warehouse_materials m ON m.id = wm.material_id
    LEFT JOIN warehouse_material_categories c ON c.id = m.category_id
    WHERE wm.company_id = $1 AND wm.created_at >= $2
      AND wm.movement_type IN ('saida','consumo_producao','consumo_manutencao')
    GROUP BY c.id, c.name
    ORDER BY total_consumed DESC
  `, [companyId, since]);
  return r.rows || [];
}

/**
 * Detecta materiais parados (sem movimentação há X dias)
 */
async function detectIdleMaterials(companyId, minDaysIdle = IDLE_DAYS_THRESHOLD) {
  const since = new Date(Date.now() - minDaysIdle * 24 * 60 * 60 * 1000).toISOString();
  const r = await db.query(`
    SELECT m.id, m.name, m.code, m.unit, m.min_stock, m.ideal_stock,
      COALESCE(b.quantity, 0) as current_quantity,
      b.last_movement_at,
      EXTRACT(DAY FROM (now() - COALESCE(b.last_movement_at, m.created_at)))::integer as days_without_movement
    FROM warehouse_materials m
    LEFT JOIN warehouse_balances b ON b.material_id = m.id AND b.company_id = m.company_id
    WHERE m.company_id = $1 AND m.active
      AND (COALESCE(b.quantity, 0) > 0)
      AND (b.last_movement_at IS NULL OR b.last_movement_at < $2)
    ORDER BY days_without_movement DESC
  `, [companyId, since]);
  return r.rows || [];
}

/**
 * Calcula taxa de consumo diário por material (baseado em saídas/consumo)
 */
async function getConsumptionRate(companyId, materialId, days = CONSUMPTION_DAYS) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const r = await db.query(`
    SELECT COALESCE(SUM(ABS(quantity)), 0) as total_consumed
    FROM warehouse_movements
    WHERE company_id = $1 AND material_id = $2 AND created_at >= $3
      AND movement_type IN ('saida','consumo_producao','consumo_manutencao')
  `, [companyId, materialId, since]);
  const total = parseFloat(r.rows?.[0]?.total_consumed || 0, 10);
  return days > 0 ? total / days : 0;
}

/**
 * Previsão de necessidade de materiais
 */
async function predictMaterialNeeds(companyId) {
  const belowMin = await warehouseService.getMaterialsBelowMinStock(companyId);
  const r = await db.query(`
    SELECT m.id, m.name, m.code, m.unit, m.min_stock, m.ideal_stock,
      COALESCE(b.quantity, 0) as current_quantity
    FROM warehouse_materials m
    LEFT JOIN warehouse_balances b ON b.material_id = m.id AND b.company_id = m.company_id
    WHERE m.company_id = $1 AND m.active AND m.min_stock > 0
  `, [companyId]);
  const materials = r.rows || [];
  const predictions = [];
  const today = new Date().toISOString().slice(0, 10);

  for (const mat of materials) {
    const rate = await getConsumptionRate(companyId, mat.id, CONSUMPTION_DAYS);
    const qty = parseFloat(mat.current_quantity || 0, 10);
    const minStock = parseFloat(mat.min_stock || 0, 10);
    const idealStock = parseFloat(mat.ideal_stock || 0, 10);
    let daysUntilDepletion = null;
    let suggestedQty = null;
    let insightText = null;
    let riskLevel = 'low';

    if (qty <= minStock) {
      riskLevel = minStock > 0 ? 'critical' : 'high';
      suggestedQty = idealStock > 0 ? idealStock - qty : minStock - qty;
      insightText = `Estoque em nível crítico (${qty} ${mat.unit}). Recomenda-se compra de ${Math.ceil(suggestedQty)} ${mat.unit}.`;
    } else if (rate > 0) {
      daysUntilDepletion = Math.floor((qty - minStock) / rate);
      if (daysUntilDepletion <= 7) {
        riskLevel = 'high';
        suggestedQty = idealStock > 0 ? Math.max(0, idealStock - qty) : minStock * 2;
        insightText = `Com base no consumo atual, o ${mat.name} acabará em ~${daysUntilDepletion} dias. Recomenda-se compra de ${Math.ceil(suggestedQty)} ${mat.unit}.`;
      } else if (daysUntilDepletion <= 14) {
        riskLevel = 'medium';
        suggestedQty = idealStock > 0 ? Math.max(0, idealStock - qty) : null;
        insightText = suggestedQty ? `Reposição recomendada em até ${Math.ceil(suggestedQty)} ${mat.unit}.` : null;
      }
    }

    if (riskLevel !== 'low' || insightText || daysUntilDepletion !== null) {
      predictions.push({
        material_id: mat.id,
        material_name: mat.name,
        material_code: mat.code,
        unit: mat.unit,
        current_quantity: qty,
        min_stock: minStock,
        consumption_rate_per_day: rate,
        days_until_depletion: daysUntilDepletion,
        suggested_quantity: suggestedQty,
        insight_text: insightText,
        risk_level: riskLevel
      });
    }
  }

  return predictions;
}

/**
 * Calcula indicadores de almoxarifado
 */
async function calculateWarehouseIndicators(companyId, days = 30) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const belowMin = await warehouseService.getMaterialsBelowMinStock(companyId);
  const idle = await detectIdleMaterials(companyId, IDLE_DAYS_THRESHOLD);
  const moves = await db.query(`
    SELECT COUNT(*) as cnt,
      COALESCE(SUM(CASE WHEN movement_type IN ('saida','consumo_producao','consumo_manutencao') THEN ABS(quantity) ELSE 0 END), 0) as total_consumed
    FROM warehouse_movements WHERE company_id = $1 AND created_at >= $2
  `, [companyId, since]);

  const totalMats = await db.query(`SELECT COUNT(*) as c FROM warehouse_materials WHERE company_id = $1 AND active`, [companyId]);
  const indicators = {
    total_materials: parseInt(totalMats.rows?.[0]?.c || 0, 10),
    below_min_count: belowMin.length,
    idle_materials_count: idle.length,
    total_movements_30d: parseInt(moves.rows?.[0]?.cnt || 0, 10),
    total_consumed_30d: parseFloat(moves.rows?.[0]?.total_consumed || 0, 10)
  };

  await db.query(`
    INSERT INTO warehouse_snapshots (company_id, snapshot_date, total_materials, below_min_count, idle_materials_count, total_movements_30d, consumption_by_type)
    VALUES ($1, CURRENT_DATE, $2, $3, $4, $5, '{}')
    ON CONFLICT (company_id, snapshot_date) DO UPDATE SET
      total_materials = EXCLUDED.total_materials,
      below_min_count = EXCLUDED.below_min_count,
      idle_materials_count = EXCLUDED.idle_materials_count,
      total_movements_30d = EXCLUDED.total_movements_30d
  `, [companyId, indicators.total_materials, indicators.below_min_count, indicators.idle_materials_count, indicators.total_movements_30d]).catch(() => {});

  return indicators;
}

/**
 * Dashboard filtrado por perfil
 */
async function getWarehouseDashboardForUser(companyId, user) {
  const profile = getWarehouseProfileForUser(user);
  if (profile.receives.length === 0) {
    return { profile_level: 'none', receives: [], message: 'Sem acesso ao módulo de almoxarifado' };
  }

  const h = user.hierarchy_level ?? 5;

  const [belowMin, movements, alerts, predictions, indicators, consumptionByCat, idleMaterials] = await Promise.all([
    profile.receives.some(x => ['current_stock', 'operational_alerts', 'critical_alerts', 'stock_overview'].includes(x))
      ? warehouseService.getMaterialsBelowMinStock(companyId)
      : [],
    profile.receives.some(x => ['current_stock', 'movements'].includes(x))
      ? getRecentMovements(companyId, { limit: 30 })
      : [],
    db.query(`
      SELECT * FROM warehouse_alerts
      WHERE company_id = $1 AND acknowledged = false
      AND (target_role_level IS NULL OR target_role_level >= $2)
      ORDER BY created_at DESC LIMIT 20
    `, [companyId, h]),
    profile.receives.some(x => ['predictions', 'purchase_forecast'].includes(x))
      ? predictMaterialNeeds(companyId)
      : [],
    (profile.dataDepth === 'analytical' || profile.dataDepth === 'tactical' || profile.dataDepth === 'strategic')
      ? calculateWarehouseIndicators(companyId, 30)
      : null,
    profile.receives.includes('consumption_by_category')
      ? getConsumptionByCategory(companyId, 30)
      : [],
    profile.receives.includes('idle_materials')
      ? detectIdleMaterials(companyId)
      : []
  ]);

  const balances = profile.receives.some(x => ['current_stock', 'stock_overview'].includes(x))
    ? (await db.query(`
        SELECT b.*, m.name as material_name, m.code as material_code, m.unit, m.min_stock, m.ideal_stock
        FROM warehouse_balances b
        JOIN warehouse_materials m ON m.id = b.material_id
        WHERE b.company_id = $1 AND m.active
        ORDER BY b.quantity ASC
        LIMIT 50
      `, [companyId])).rows || []
    : [];

  return {
    profile_level: profile.level,
    receives: profile.receives,
    below_min_stock: belowMin,
    movements,
    alerts: alerts.rows || [],
    predictions,
    indicators,
    consumption_by_category: consumptionByCat,
    idle_materials: idleMaterials,
    balances
  };
}

/**
 * Cria alerta de almoxarifado
 */
async function createWarehouseAlert(companyId, alert) {
  const r = await db.query(`
    INSERT INTO warehouse_alerts (company_id, material_id, alert_type, severity, title, description, ai_analysis, ai_recommendations, entity_type, entity_id, metrics, target_role_level)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING *
  `, [
    companyId, alert.material_id || null, alert.alert_type, alert.severity || 'medium',
    alert.title, alert.description || null, alert.ai_analysis || null,
    JSON.stringify(alert.ai_recommendations || []),
    alert.entity_type || null, alert.entity_id || null,
    JSON.stringify(alert.metrics || {}), alert.target_role_level ?? 5
  ]);
  const row = r.rows?.[0];
  if (row) {
    const eventDispatch = require('./manuiaApp/manuiaEventDispatchService');
    eventDispatch.scheduleDispatch('[MANUIA_DISPATCH_WAREHOUSE]', () =>
      eventDispatch.dispatchFromWarehouseAlert(companyId, row)
    );
  }
  return row;
}

/**
 * Detecta e cria alertas automáticos
 */
async function detectAndCreateWarehouseAlerts(companyId) {
  const alerts = [];
  const belowMin = await warehouseService.getMaterialsBelowMinStock(companyId);
  const idle = await detectIdleMaterials(companyId, IDLE_DAYS_THRESHOLD);
  const predictions = await predictMaterialNeeds(companyId);
  const params = await warehouseService.getParams(companyId);

  for (const m of belowMin) {
    const exists = await db.query(`
      SELECT id FROM warehouse_alerts
      WHERE company_id = $1 AND material_id = $2 AND alert_type = 'below_min' AND acknowledged = false AND created_at > now() - interval '24 hours'
    `, [companyId, m.id]);
    if (!exists.rows?.length) {
      alerts.push(await createWarehouseAlert(companyId, {
        material_id: m.id,
        alert_type: 'below_min',
        severity: 'critical',
        title: `Estoque abaixo do mínimo: ${m.name}`,
        description: `${m.name} (${m.code}): saldo atual ${m.current_quantity} ${m.unit}, mínimo ${m.min_stock} ${m.unit}.`,
        target_role_level: 4,
        metrics: { current: m.current_quantity, min: m.min_stock }
      }));
    }
  }

  const highRisk = predictions.filter((p) => p.risk_level === 'high' || p.risk_level === 'critical');
  for (const p of highRisk) {
    const exists = await db.query(`
      SELECT id FROM warehouse_alerts
      WHERE company_id = $1 AND material_id = $2 AND alert_type = 'depletion_risk' AND acknowledged = false AND created_at > now() - interval '24 hours'
    `, [companyId, p.material_id]);
    if (!exists.rows?.length && p.insight_text) {
      alerts.push(await createWarehouseAlert(companyId, {
        material_id: p.material_id,
        alert_type: 'depletion_risk',
        severity: p.risk_level === 'critical' ? 'critical' : 'high',
        title: `Risco de falta: ${p.material_name}`,
        description: p.insight_text,
        ai_recommendations: p.suggested_quantity ? [`Comprar ${Math.ceil(p.suggested_quantity)} ${p.unit}`] : [],
        target_role_level: 4,
        metrics: { days_until_depletion: p.days_until_depletion, suggested_quantity: p.suggested_quantity }
      }));
    }
  }

  for (const m of idle.slice(0, 10)) {
    const exists = await db.query(`
      SELECT id FROM warehouse_alerts
      WHERE company_id = $1 AND material_id = $2 AND alert_type = 'idle_material' AND acknowledged = false AND created_at > now() - interval '7 days'
    `, [companyId, m.id]);
    if (!exists.rows?.length) {
      let analysis = null;
      if (ai?.chatCompletion) {
        try {
          analysis = await ai.chatCompletion(
            `Material parado: ${m.name} (${m.code}). Sem movimentação há ${m.days_without_movement} dias. Saldo: ${m.current_quantity} ${m.unit}. Sugira 2-3 ações (redistribuir, descartar, reaproveitar).`,
            { max_tokens: 150 }
          );
          if (String(analysis).startsWith('FALLBACK:')) analysis = null;
        } catch (_) {}
      }
      alerts.push(await createWarehouseAlert(companyId, {
        material_id: m.id,
        alert_type: 'idle_material',
        severity: 'medium',
        title: `Material parado: ${m.name}`,
        description: `${m.name} sem movimentação há ${m.days_without_movement} dias. Saldo: ${m.current_quantity} ${m.unit}.`,
        ai_analysis: analysis,
        target_role_level: 3,
        metrics: { days_without_movement: m.days_without_movement, quantity: m.current_quantity }
      }));
    }
  }

  return alerts.filter(Boolean);
}

/**
 * Salva previsões para histórico
 */
async function savePredictionsSnapshot(companyId) {
  const predictions = await predictMaterialNeeds(companyId);
  const today = new Date().toISOString().slice(0, 10);
  for (const p of predictions.filter((x) => x.risk_level !== 'low')) {
    await db.query(`
      INSERT INTO warehouse_predictions (company_id, material_id, prediction_date, current_quantity, min_stock, ideal_stock, consumption_rate_per_day, days_until_depletion, suggested_quantity, insight_text, risk_level)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `, [
      companyId, p.material_id, today, p.current_quantity, p.min_stock,
      p.ideal_stock ?? 0, p.consumption_rate_per_day || 0, p.days_until_depletion,
      p.suggested_quantity, p.insight_text, p.risk_level
    ]).catch(() => {});
  }
}

/**
 * Impacto do almoxarifado para BI/previsão
 */
async function getWarehouseImpactForForecasting(companyId) {
  const indicators = await calculateWarehouseIndicators(companyId, 7);
  const belowMin = await warehouseService.getMaterialsBelowMinStock(companyId);
  return {
    below_min_count: indicators.below_min_count,
    idle_count: indicators.idle_materials_count,
    stock_risk_factor: indicators.below_min_count > 5 ? 0.9 : indicators.below_min_count > 0 ? 0.95 : 1
  };
}

module.exports = {
  getWarehouseProfileForUser,
  getRecentMovements,
  getConsumptionByCategory,
  detectIdleMaterials,
  predictMaterialNeeds,
  calculateWarehouseIndicators,
  getWarehouseDashboardForUser,
  createWarehouseAlert,
  detectAndCreateWarehouseAlerts,
  savePredictionsSnapshot,
  getWarehouseImpactForForecasting
};
