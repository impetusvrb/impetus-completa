/**
 * IMPETUS - Inteligência Logística + Expedição Monitorada
 * Perfis por cargo, dashboard adaptativo, alertas, previsões, detecção de problemas
 */
const db = require('../db');

const DELAY_THRESHOLD_MINUTES = 30;
const VEHICLE_IDLE_HOURS = 4;
const DRIVER_OVERLOAD_EXPEDITIONS = 8;

/**
 * Perfil logístico por cargo/função
 * Operador: tarefas de carregamento, pedidos, alertas de carga
 * Motorista: rota, saída, alertas trânsito, alteração de rota
 * Supervisor: desempenho, atrasos, gargalos
 * Gerente: eficiência, custo por transporte, produtividade frota
 * Diretor/CEO: dados estratégicos, custo total, impacto no lucro, previsões
 */
function getLogisticsProfileForUser(user) {
  const role = (user.role || '').toLowerCase();
  const h = user.hierarchy_level ?? 5;
  const funcArea = (user.functional_area || '').toLowerCase();
  const funcDesc = ((user.role_description || user.job_description || '') + ' ' + (user.work_area || '')).toLowerCase();

  const isLogistica = /logística|logistica|expedição|expedicao|transporte|frota|entrega|motorista|carga/i.test(funcArea + funcDesc);

  if (role === 'ceo' || h <= 0) {
    return {
      level: 'ceo',
      receives: ['strategic_cost', 'transport_efficiency', 'logistics_impact_profit', 'demand_forecast'],
      dataDepth: 'strategic',
      target_role_level: 0
    };
  }
  if (role === 'diretor' || h <= 1) {
    return {
      level: 'diretor',
      receives: ['strategic_cost', 'transport_efficiency', 'fleet_productivity', 'bottleneck_analysis', 'demand_forecast'],
      dataDepth: 'tactical',
      target_role_level: 1
    };
  }
  if (role === 'gerente' || h <= 2 || isLogistica) {
    return {
      level: 'gerente',
      receives: ['logistic_performance', 'operational_delays', 'bottlenecks', 'fleet_efficiency', 'route_efficiency', 'cost_per_transport'],
      dataDepth: 'analytical',
      target_role_level: 2
    };
  }
  if (role === 'supervisor' || role === 'coordenador' || isLogistica) {
    return {
      level: 'supervisor',
      receives: ['expedition_tasks', 'logistic_performance', 'operational_delays', 'bottlenecks', 'fleet_status'],
      dataDepth: 'operational',
      target_role_level: 3
    };
  }
  if (/motorista|operador|expedição|carregamento/i.test(funcDesc) || isLogistica) {
    return {
      level: 'motorista',
      receives: ['route_info', 'departure_time', 'traffic_alerts', 'route_change', 'loading_tasks'],
      dataDepth: 'operational',
      target_role_level: 4
    };
  }
  if (isLogistica || /expedição|carregamento|preparar pedidos/i.test(funcDesc)) {
    return {
      level: 'operador',
      receives: ['loading_tasks', 'orders_to_prepare', 'load_error_alerts'],
      dataDepth: 'operational',
      target_role_level: 5
    };
  }
  return { level: 'colaborador', receives: [], dataDepth: null, target_role_level: 5 };
}

/**
 * Lista expedições recentes
 */
async function getRecentExpeditions(companyId, opts = {}) {
  const { limit = 50, status, driver_id, vehicle_id } = opts;
  let sql = `
    SELECT e.*, v.plate_or_id, v.vehicle_type, d.name as driver_name, r.name as route_name
    FROM logistics_expeditions e
    LEFT JOIN logistics_vehicles v ON v.id = e.vehicle_id
    LEFT JOIN logistics_drivers d ON d.id = e.driver_id
    LEFT JOIN logistics_routes r ON r.id = e.route_id
    WHERE e.company_id = $1
  `;
  const params = [companyId];
  if (status) { params.push(status); sql += ` AND e.status = $${params.length}`; }
  if (driver_id) { params.push(driver_id); sql += ` AND e.driver_id = $${params.length}`; }
  if (vehicle_id) { params.push(vehicle_id); sql += ` AND e.vehicle_id = $${params.length}`; }
  params.push(limit);
  sql += ` ORDER BY e.created_at DESC LIMIT $${params.length}`;
  const r = await db.query(sql, params);
  return r.rows || [];
}

/**
 * Indicadores logísticos (últimos N dias)
 */
async function calculateLogisticsIndicators(companyId, days = 30) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const r = await db.query(`
    SELECT
      COUNT(*) as deliveries_total,
      COUNT(*) FILTER (WHERE status = 'entregue' AND (actual_arrival_at <= estimated_arrival_at OR delay_minutes <= 0 OR delay_minutes IS NULL)) as deliveries_on_time,
      COUNT(*) FILTER (WHERE status IN ('entregue', 'atraso_detectado', 'problema_logistico') AND (delay_minutes > 0 OR actual_arrival_at > estimated_arrival_at)) as deliveries_delayed,
      AVG(EXTRACT(EPOCH FROM (COALESCE(actual_arrival_at, now()) - departure_at))/60) FILTER (WHERE departure_at IS NOT NULL) as avg_route_time_minutes,
      COALESCE(SUM(weight_kg), 0) as total_weight_kg
    FROM logistics_expeditions
    WHERE company_id = $1 AND created_at >= $2 AND departure_at IS NOT NULL
  `, [companyId, since]);

  const row = r.rows?.[0] || {};
  const total = parseInt(row.deliveries_total || 0, 10);
  const onTime = parseInt(row.deliveries_on_time || 0, 10);
  const delayed = parseInt(row.deliveries_delayed || 0, 10);
  const vehiclesInUse = await db.query(`
    SELECT COUNT(*) as c FROM logistics_vehicles WHERE company_id = $1 AND status = 'in_use' AND active
  `, [companyId]);
  const vehiclesTotal = await db.query(`
    SELECT COUNT(*) as c FROM logistics_vehicles WHERE company_id = $1 AND active
  `, [companyId]);
  const totalV = parseInt(vehiclesTotal.rows?.[0]?.c || 0, 10);
  const inUse = parseInt(vehiclesInUse.rows?.[0]?.c || 0, 10);

  return {
    deliveries_total: total,
    deliveries_on_time: onTime,
    deliveries_delayed: delayed,
    on_time_rate_pct: total > 0 ? Math.round((onTime / total) * 10000) / 100 : null,
    avg_route_time_minutes: row.avg_route_time_minutes ? Math.round(parseFloat(row.avg_route_time_minutes) * 100) / 100 : null,
    fleet_utilization_pct: totalV > 0 ? Math.round((inUse / totalV) * 10000) / 100 : null,
    total_weight_kg: parseFloat(row.total_weight_kg || 0, 10)
  };
}

/**
 * Detecção de expedições atrasadas
 */
async function detectDelayedExpeditions(companyId) {
  const r = await db.query(`
    SELECT e.*, v.plate_or_id, d.name as driver_name, r.name as route_name
    FROM logistics_expeditions e
    LEFT JOIN logistics_vehicles v ON v.id = e.vehicle_id
    LEFT JOIN logistics_drivers d ON d.id = e.driver_id
    LEFT JOIN logistics_routes r ON r.id = e.route_id
    WHERE e.company_id = $1 AND e.status IN ('em_transito', 'em_carregamento')
      AND e.estimated_arrival_at < now()
      AND (e.delay_minutes IS NULL OR e.delay_minutes < $2)
  `, [companyId, DELAY_THRESHOLD_MINUTES]);
  return r.rows || [];
}

/**
 * Frota sobrecarregada (veículos com carga acima da capacidade - via telemetria ou expedições)
 */
async function detectOverloadedVehicles(companyId) {
  const r = await db.query(`
    SELECT v.*, lt.load_weight_kg, v.capacity_kg
    FROM logistics_vehicles v
    JOIN logistics_telemetry lt ON lt.vehicle_id = v.id
    WHERE v.company_id = $1 AND v.active AND v.capacity_kg > 0
      AND lt.recorded_at > now() - interval '24 hours'
      AND lt.load_weight_kg > v.capacity_kg * 1.05
    ORDER BY lt.recorded_at DESC
  `, [companyId]);
  return r.rows || [];
}

/**
 * Motoristas com excesso de expedições no dia
 */
async function detectOverloadedDrivers(companyId, maxPerDay = DRIVER_OVERLOAD_EXPEDITIONS) {
  const today = new Date().toISOString().slice(0, 10);
  const r = await db.query(`
    SELECT d.id, d.name, COUNT(e.id) as expedition_count
    FROM logistics_drivers d
    JOIN logistics_expeditions e ON e.driver_id = d.id
    WHERE d.company_id = $1 AND d.active
      AND e.departure_at::date = $2
    GROUP BY d.id, d.name
    HAVING COUNT(e.id) >= $3
  `, [companyId, today, maxPerDay]);
  return r.rows || [];
}

/**
 * Rotas com atraso recorrente
 */
async function detectRecurrentDelayedRoutes(companyId, minDelays = 2) {
  const r = await db.query(`
    SELECT r.id, r.name, COUNT(e.id) as delay_count
    FROM logistics_routes r
    JOIN logistics_expeditions e ON e.route_id = r.id
    WHERE r.company_id = $1 AND r.active
      AND e.status IN ('entregue', 'atraso_detectado', 'problema_logistico')
      AND e.delay_minutes > 0
      AND e.actual_arrival_at > now() - interval '30 days'
    GROUP BY r.id, r.name
    HAVING COUNT(e.id) >= $2
  `, [companyId, minDelays]);
  return r.rows || [];
}

/**
 * Cria alerta logístico
 */
async function createLogisticsAlert(companyId, alert) {
  const r = await db.query(`
    INSERT INTO logistics_alerts (company_id, alert_type, severity, title, description, ai_analysis, ai_recommendations,
      entity_type, entity_id, expedition_id, vehicle_id, route_id, driver_id, metrics, target_role_level, target_functional_area)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
    RETURNING *
  `, [
    companyId, alert.alert_type, alert.severity || 'medium', alert.title, alert.description || null, alert.ai_analysis || null,
    JSON.stringify(alert.ai_recommendations || []),
    alert.entity_type || null, alert.entity_id || null, alert.expedition_id || null, alert.vehicle_id || null,
    alert.route_id || null, alert.driver_id || null, JSON.stringify(alert.metrics || {}),
    alert.target_role_level ?? 5, alert.target_functional_area || null
  ]);
  const row = r.rows?.[0];
  if (row) {
    const eventDispatch = require('./manuiaApp/manuiaEventDispatchService');
    eventDispatch.scheduleDispatch('[MANUIA_DISPATCH_LOGISTICS]', () =>
      eventDispatch.dispatchFromLogisticsAlert(companyId, row)
    );
  }
  return row;
}

/**
 * Detecta e cria alertas automáticos
 */
async function detectAndCreateLogisticsAlerts(companyId) {
  const alerts = [];
  const [delayed, overloaded, overloadedDrivers, recurrentRoutes] = await Promise.all([
    detectDelayedExpeditions(companyId),
    detectOverloadedVehicles(companyId),
    detectOverloadedDrivers(companyId),
    detectRecurrentDelayedRoutes(companyId)
  ]);

  for (const exp of delayed) {
    const exists = await db.query(`
      SELECT id FROM logistics_alerts
      WHERE company_id = $1 AND expedition_id = $2 AND alert_type = 'delivery_delay' AND acknowledged = false AND created_at > now() - interval '6 hours'
    `, [companyId, exp.id]);
    if (!exists.rows?.length) {
      await db.query(`
        UPDATE logistics_expeditions SET status = 'atraso_detectado', delay_minutes = EXTRACT(EPOCH FROM (now() - estimated_arrival_at))/60 WHERE id = $1
      `, [exp.id]).catch((err) => {
        console.warn('[logisticsIntelligenceService][expedition_delay_update]', err?.message ?? err);
      });
      alerts.push(await createLogisticsAlert(companyId, {
        alert_type: 'delivery_delay',
        severity: 'high',
        title: `Entrega atrasada: ${exp.order_ref || exp.id}`,
        description: `Expedição em atraso. Motorista: ${exp.driver_name || 'N/A'}. Rota: ${exp.route_name || 'N/A'}.`,
        ai_analysis: 'Atraso detectado em relação à previsão de chegada.',
        ai_recommendations: ['Verificar com motorista', 'Considerar rota alternativa'],
        expedition_id: exp.id,
        entity_type: 'expedition',
        entity_id: exp.id,
        target_role_level: 3,
        metrics: { expedition_id: exp.id }
      }));
    }
  }

  for (const v of overloaded) {
    const exists = await db.query(`
      SELECT id FROM logistics_alerts
      WHERE company_id = $1 AND vehicle_id = $2 AND alert_type = 'vehicle_overload' AND acknowledged = false AND created_at > now() - interval '24 hours'
    `, [companyId, v.id]);
    if (!exists.rows?.length) {
      alerts.push(await createLogisticsAlert(companyId, {
        alert_type: 'vehicle_overload',
        severity: 'critical',
        title: `Veículo sobrecarregado: ${v.plate_or_id}`,
        description: `Carga (${v.load_weight_kg} kg) excede capacidade (${v.capacity_kg} kg).`,
        ai_recommendations: ['Redistribuir carga', 'Usar veículo maior'],
        vehicle_id: v.id,
        entity_type: 'vehicle',
        entity_id: v.id,
        target_role_level: 2,
        metrics: { load_kg: v.load_weight_kg, capacity_kg: v.capacity_kg }
      }));
    }
  }

  for (const d of overloadedDrivers) {
    const exists = await db.query(`
      SELECT id FROM logistics_alerts
      WHERE company_id = $1 AND driver_id = $2 AND alert_type = 'driver_overload' AND acknowledged = false AND created_at > now() - interval '24 hours'
    `, [companyId, d.id]);
    if (!exists.rows?.length) {
      alerts.push(await createLogisticsAlert(companyId, {
        alert_type: 'driver_overload',
        severity: 'medium',
        title: `Motorista acima do limite de jornada: ${d.name}`,
        description: `${d.name} possui ${d.expedition_count} expedições no dia.`,
        ai_recommendations: ['Redistribuir entregas', 'Verificar jornada'],
        driver_id: d.id,
        entity_type: 'driver',
        entity_id: d.id,
        target_role_level: 3,
        metrics: { expedition_count: parseInt(d.expedition_count, 10) }
      }));
    }
  }

  for (const rt of recurrentRoutes) {
    const exists = await db.query(`
      SELECT id FROM logistics_alerts
      WHERE company_id = $1 AND route_id = $2 AND alert_type = 'recurrent_route_delay' AND acknowledged = false AND created_at > now() - interval '7 days'
    `, [companyId, rt.id]);
    if (!exists.rows?.length) {
      alerts.push(await createLogisticsAlert(companyId, {
        alert_type: 'recurrent_route_delay',
        severity: 'medium',
        title: `Rota com atraso recorrente: ${rt.name}`,
        description: `${rt.name}: ${rt.delay_count} atrasos nos últimos 30 dias.`,
        ai_recommendations: ['Analisar rota alternativa', 'Revisar horários'],
        route_id: rt.id,
        entity_type: 'route',
        entity_id: rt.id,
        target_role_level: 2,
        metrics: { delay_count: parseInt(rt.delay_count, 10) }
      }));
    }
  }

  await saveLogisticsSnapshot(companyId);
  return alerts;
}

/**
 * Salva snapshot para memória logística
 */
async function saveLogisticsSnapshot(companyId) {
  const indicators = await calculateLogisticsIndicators(companyId, 1);
  await db.query(`
    INSERT INTO logistics_snapshots (company_id, snapshot_date, deliveries_total, deliveries_on_time, deliveries_delayed,
      avg_route_time_minutes, fleet_utilization_pct, total_weight_kg, bottleneck_count)
    VALUES ($1, CURRENT_DATE, $2, $3, $4, $5, $6, $7, 0)
    ON CONFLICT (company_id, snapshot_date) DO UPDATE SET
      deliveries_total = EXCLUDED.deliveries_total,
      deliveries_on_time = EXCLUDED.deliveries_on_time,
      deliveries_delayed = EXCLUDED.deliveries_delayed,
      avg_route_time_minutes = EXCLUDED.avg_route_time_minutes,
      fleet_utilization_pct = EXCLUDED.fleet_utilization_pct,
      total_weight_kg = EXCLUDED.total_weight_kg
  `, [
    companyId,
    indicators.deliveries_total,
    indicators.deliveries_on_time,
    indicators.deliveries_delayed,
    indicators.avg_route_time_minutes,
    indicators.fleet_utilization_pct,
    indicators.total_weight_kg
  ]).catch((err) => {
    console.warn('[logisticsIntelligenceService][logistics_snapshot_upsert]', err?.message ?? err);
  });
}

/**
 * Dashboard filtrado por perfil
 */
async function getLogisticsDashboardForUser(companyId, user) {
  const profile = getLogisticsProfileForUser(user);
  if (profile.receives.length === 0) {
    return { profile_level: 'none', receives: [], message: 'Sem acesso ao módulo de logística' };
  }

  const h = user.hierarchy_level ?? 5;

  const [expeditions, alerts, indicators, vehicles, routes] = await Promise.all([
    profile.receives.some(x => ['loading_tasks', 'route_info', 'expedition_tasks', 'logistic_performance'].includes(x))
      ? getRecentExpeditions(companyId, { limit: 30 })
      : [],
    db.query(`
      SELECT la.*, e.order_ref, v.plate_or_id, r.name as route_name, d.name as driver_name
      FROM logistics_alerts la
      LEFT JOIN logistics_expeditions e ON e.id = la.expedition_id
      LEFT JOIN logistics_vehicles v ON v.id = la.vehicle_id
      LEFT JOIN logistics_routes r ON r.id = la.route_id
      LEFT JOIN logistics_drivers d ON d.id = la.driver_id
      WHERE la.company_id = $1 AND la.acknowledged = false
      AND (la.target_role_level IS NULL OR la.target_role_level >= $2)
      ORDER BY la.created_at DESC
      LIMIT 30
    `, [companyId, h]),
    (profile.dataDepth === 'analytical' || profile.dataDepth === 'tactical' || profile.dataDepth === 'strategic')
      ? calculateLogisticsIndicators(companyId, 30)
      : null,
    profile.receives.some(x => ['fleet_status', 'fleet_efficiency', 'transport_efficiency'].includes(x))
      ? db.query(`SELECT id, plate_or_id, vehicle_type, status, capacity_kg FROM logistics_vehicles WHERE company_id = $1 AND active ORDER BY plate_or_id`, [companyId])
      : [],
    profile.receives.includes('route_efficiency')
      ? db.query(`SELECT id, name, distance_km, avg_duration_minutes, logistic_risk_level FROM logistics_routes WHERE company_id = $1 AND active ORDER BY name`, [companyId])
      : []
  ]);

  return {
    profile_level: profile.level,
    receives: profile.receives,
    expeditions,
    alerts: alerts.rows || [],
    indicators,
    vehicles: vehicles.rows || [],
    routes: routes.rows || []
  };
}

/**
 * Previsão logística simplificada (demanda, saturação)
 */
async function predictLogisticsDemand(companyId) {
  const r = await db.query(`
    SELECT DATE(departure_at) as d, COUNT(*) as cnt
    FROM logistics_expeditions
    WHERE company_id = $1 AND departure_at > now() - interval '30 days'
    GROUP BY DATE(departure_at)
    ORDER BY d DESC
    LIMIT 30
  `, [companyId]);
  const rows = r.rows || [];
  const avg = rows.length > 0 ? rows.reduce((s, x) => s + parseInt(x.cnt, 10), 0) / rows.length : 0;
  const vehiclesTotal = await db.query(`SELECT COUNT(*) as c FROM logistics_vehicles WHERE company_id = $1 AND active`, [companyId]);
  const totalV = parseInt(vehiclesTotal.rows?.[0]?.c || 0, 10);
  return {
    avg_daily_expeditions: Math.round(avg * 100) / 100,
    fleet_size: totalV,
    risk_insufficient_fleet: totalV > 0 && avg > totalV * 1.2 ? 'high' : totalV > 0 && avg > totalV ? 'medium' : 'low'
  };
}

module.exports = {
  getLogisticsProfileForUser,
  getLogisticsDashboardForUser,
  detectAndCreateLogisticsAlerts,
  getRecentExpeditions,
  calculateLogisticsIndicators,
  createLogisticsAlert,
  saveLogisticsSnapshot,
  predictLogisticsDemand,
  detectDelayedExpeditions
};
