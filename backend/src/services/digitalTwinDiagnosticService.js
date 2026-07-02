'use strict';

/**
 * GÊMEO DIGITAL APLICADO — Serviço de Diagnóstico
 *
 * Orquestra: dados → Gemini Industrial → diagnóstico → visual → procedimento → memória
 * Consome dados existentes (manuia_machines, manuia_sensors, work_orders) sem duplicação.
 */

const db = require('../db');
const geminiEngine = require('./geminiIndustrialEngine');

const CRITICALITY_COLORS = {
  normal: 'green',
  low: 'green',
  medium: 'yellow',
  high: 'orange',
  critical: 'red'
};

/**
 * Busca dados de sensores e contexto da máquina para diagnóstico.
 */
async function gatherMachineContext(companyId, machineId) {
  const machineR = await db.query(
    `SELECT id, code, name, sector, line_name, metadata
     FROM manuia_machines WHERE id = $1 AND company_id = $2 AND active = true`,
    [machineId, companyId]
  );
  if (!machineR.rows?.length) return null;
  const machine = machineR.rows[0];

  let sensors = [];
  try {
    const sR = await db.query(
      `SELECT id, sensor_type, name, unit, current_value, min_threshold, max_threshold, status, last_reading_at
       FROM manuia_sensors WHERE machine_id = $1 ORDER BY sensor_type`,
      [machineId]
    );
    sensors = sR.rows || [];
  } catch { /* tabela pode não existir */ }

  let recentEvents = [];
  try {
    const eR = await db.query(
      `SELECT id, event_type, severity, description, sensor_id, created_at
       FROM manuia_emergency_events WHERE machine_id = $1 AND company_id = $2
       ORDER BY created_at DESC LIMIT 10`,
      [machineId, companyId]
    );
    recentEvents = eR.rows || [];
  } catch { /* ok */ }

  let recentOrders = [];
  try {
    const woR = await db.query(
      `SELECT id, title, type, status, created_at
       FROM work_orders WHERE company_id = $1 AND machine_name ILIKE $2
       ORDER BY created_at DESC LIMIT 5`,
      [companyId, `%${machine.name}%`]
    );
    recentOrders = woR.rows || [];
  } catch { /* ok */ }

  return {
    machine,
    sensors,
    sensorData: sensors.reduce((acc, s) => {
      acc[s.sensor_type] = {
        value: s.current_value,
        unit: s.unit,
        status: s.status,
        min: s.min_threshold,
        max: s.max_threshold,
        last_reading: s.last_reading_at
      };
      return acc;
    }, {}),
    recentEvents,
    recentOrders
  };
}

/**
 * Busca memória industrial de falhas similares.
 */
async function queryMemory(companyId, machineId, failureType, limit = 5) {
  try {
    const r = await db.query(
      `SELECT failure_type, component, root_cause, solution_applied, repair_time_minutes, effectiveness, tags
       FROM digital_twin_memory
       WHERE company_id = $1
         AND (machine_id = $2 OR machine_id IS NULL)
         AND (failure_type ILIKE $3 OR $3 = '')
       ORDER BY created_at DESC LIMIT $4`,
      [companyId, machineId, `%${failureType || ''}%`, limit]
    );
    return r.rows || [];
  } catch {
    return [];
  }
}

/**
 * Executa diagnóstico completo para uma máquina.
 */
async function runFullDiagnostic(companyId, userId, machineId, opts = {}) {
  const { triggerSource = 'manual', triggerData = {}, imageBase64 = null } = opts;

  if (!geminiEngine.isAvailable()) {
    return {
      ok: false,
      error: 'Motor Gemini Industrial indisponível. Configure GEMINI_API_KEY ou GOOGLE_API_KEY.',
      code: 'GEMINI_UNAVAILABLE'
    };
  }

  const ctx = await gatherMachineContext(companyId, machineId);
  if (!ctx) {
    return { ok: false, error: 'Máquina não encontrada ou inativa.', code: 'MACHINE_NOT_FOUND' };
  }

  const memoryHints = await queryMemory(
    companyId, machineId,
    triggerData.failure_type || triggerData.symptom || ''
  );

  const diagnosis = await geminiEngine.analyzeSensorDiagnostic(
    ctx.sensorData,
    { machine: ctx.machine, recentEvents: ctx.recentEvents, recentOrders: ctx.recentOrders },
    memoryHints
  );

  let imageDiagnosis = null;
  if (imageBase64) {
    imageDiagnosis = await geminiEngine.analyzeImageDiagnostic(imageBase64, ctx.machine);
  }

  const component = diagnosis.affected_component || imageDiagnosis?.detected_component || 'indeterminado';
  const criticality = diagnosis.criticality || 'low';

  const [visualDescription, maintenanceProcedure] = await Promise.all([
    geminiEngine.generateVisualDescription(component, diagnosis, 'exploded_view'),
    geminiEngine.generateMaintenanceProcedure(component, diagnosis, ctx.machine)
  ]);

  let trendAnalysis = null;
  if (ctx.sensors.length > 0) {
    trendAnalysis = await geminiEngine.analyzeTrend(ctx.sensorData, ctx.machine);
  }

  const insertR = await db.query(
    `INSERT INTO digital_twin_diagnostics
      (company_id, machine_id, user_id, trigger_source, trigger_data,
       diagnosis, visual_type, visual_prompt, visual_description,
       maintenance_procedure, trend_snapshot, criticality, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'active')
     RETURNING id, created_at`,
    [
      companyId, machineId, userId,
      triggerSource,
      JSON.stringify({ ...triggerData, image_diagnosis: imageDiagnosis }),
      JSON.stringify(diagnosis),
      'ai_generated',
      visualDescription?.title || null,
      JSON.stringify(visualDescription),
      JSON.stringify(maintenanceProcedure),
      JSON.stringify(trendAnalysis || {}),
      criticality
    ]
  );

  const diagnosticId = insertR.rows[0].id;

  const visualTypes = ['exploded_view', 'highlight', 'comparison'];
  const visualAssets = [];
  for (const vt of visualTypes) {
    let vd = vt === 'exploded_view' ? visualDescription : null;
    if (!vd) {
      vd = await geminiEngine.generateVisualDescription(component, diagnosis, vt);
    }
    try {
      const vaR = await db.query(
        `INSERT INTO digital_twin_visual_assets
          (company_id, diagnostic_id, asset_type, description, prompt_used, content_text, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [
          companyId, diagnosticId, vt,
          vd.title || vt,
          vd.ai_generated_disclaimer || '',
          JSON.stringify(vd),
          JSON.stringify({ component, criticality })
        ]
      );
      visualAssets.push({ id: vaR.rows[0].id, type: vt, data: vd });
    } catch (e) {
      console.warn('[DIGITAL_TWIN_VISUAL]', vt, e?.message);
    }
  }

  console.info('[DIGITAL_TWIN_DIAGNOSTIC]', JSON.stringify({
    id: diagnosticId,
    machine: ctx.machine.name,
    component,
    criticality,
    confidence: diagnosis.confidence,
    trigger: triggerSource
  }));

  return {
    ok: true,
    diagnostic: {
      id: diagnosticId,
      machine: ctx.machine,
      diagnosis,
      imageDiagnosis,
      visualDescription,
      visualAssets,
      maintenanceProcedure,
      trendAnalysis,
      criticality,
      criticality_color: CRITICALITY_COLORS[criticality] || 'green',
      memoryHints,
      created_at: insertR.rows[0].created_at
    }
  };
}

/**
 * Lista diagnósticos de uma empresa/máquina.
 */
async function listDiagnostics(companyId, { machineId, status, limit = 20, offset = 0 } = {}) {
  const conditions = ['d.company_id = $1'];
  const params = [companyId];
  let idx = 2;

  if (machineId) {
    conditions.push(`d.machine_id = $${idx++}`);
    params.push(machineId);
  }
  if (status) {
    conditions.push(`d.status = $${idx++}`);
    params.push(status);
  }

  const where = conditions.join(' AND ');
  const r = await db.query(
    `SELECT d.id, d.machine_id, d.trigger_source, d.criticality, d.status,
            d.diagnosis->>'probable_cause' AS probable_cause,
            d.diagnosis->>'affected_component' AS affected_component,
            d.diagnosis->>'confidence' AS confidence,
            d.diagnosis->>'recommended_action' AS recommended_action,
            m.name AS machine_name, m.sector, m.line_name,
            d.created_at, d.resolved_at
     FROM digital_twin_diagnostics d
     LEFT JOIN manuia_machines m ON m.id = d.machine_id
     WHERE ${where}
     ORDER BY d.created_at DESC
     LIMIT $${idx++} OFFSET $${idx++}`,
    [...params, limit, offset]
  );
  return r.rows || [];
}

/**
 * Busca diagnóstico completo por ID.
 */
async function getDiagnosticById(companyId, diagnosticId) {
  const r = await db.query(
    `SELECT d.*, m.name AS machine_name, m.code AS machine_code, m.sector, m.line_name
     FROM digital_twin_diagnostics d
     LEFT JOIN manuia_machines m ON m.id = d.machine_id
     WHERE d.id = $1 AND d.company_id = $2`,
    [diagnosticId, companyId]
  );
  if (!r.rows?.length) return null;

  const diag = r.rows[0];

  const vaR = await db.query(
    `SELECT id, asset_type, description, content_text, metadata, created_at
     FROM digital_twin_visual_assets WHERE diagnostic_id = $1 ORDER BY created_at`,
    [diagnosticId]
  );

  return {
    ...diag,
    visual_assets: vaR.rows || []
  };
}

/**
 * Resolve diagnóstico e registra na memória industrial.
 */
async function resolveDiagnostic(companyId, diagnosticId, resolution) {
  const {
    solution_applied,
    repair_time_minutes,
    effectiveness = 'unknown',
    notes = ''
  } = resolution;

  const diagR = await db.query(
    `UPDATE digital_twin_diagnostics
     SET status = 'resolved', resolved_at = now(), updated_at = now()
     WHERE id = $1 AND company_id = $2
     RETURNING id, machine_id, diagnosis, criticality`,
    [diagnosticId, companyId]
  );
  if (!diagR.rows?.length) return { ok: false, error: 'Diagnóstico não encontrado' };

  const diag = diagR.rows[0];
  const diagnosis = typeof diag.diagnosis === 'string' ? JSON.parse(diag.diagnosis) : diag.diagnosis;

  await db.query(
    `INSERT INTO digital_twin_memory
      (company_id, machine_id, diagnostic_id, failure_type, component,
       sensor_signature, root_cause, solution_applied, repair_time_minutes, effectiveness, tags)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [
      companyId,
      diag.machine_id,
      diagnosticId,
      diagnosis?.failure_mode || diagnosis?.probable_cause || 'unknown',
      diagnosis?.affected_component || 'unknown',
      JSON.stringify({}),
      diagnosis?.probable_cause || '',
      solution_applied || '',
      repair_time_minutes || null,
      effectiveness,
      JSON.stringify([diag.criticality, notes].filter(Boolean))
    ]
  );

  console.info('[DIGITAL_TWIN_RESOLVED]', JSON.stringify({
    id: diagnosticId,
    component: diagnosis?.affected_component,
    effectiveness,
    repair_minutes: repair_time_minutes
  }));

  return { ok: true };
}

/**
 * Dashboard do Gêmeo Digital — KPIs agregados.
 */
async function getDashboardKpis(companyId) {
  const queries = {
    total: `SELECT COUNT(*)::int AS c FROM digital_twin_diagnostics WHERE company_id = $1`,
    active: `SELECT COUNT(*)::int AS c FROM digital_twin_diagnostics WHERE company_id = $1 AND status = 'active'`,
    critical: `SELECT COUNT(*)::int AS c FROM digital_twin_diagnostics WHERE company_id = $1 AND status = 'active' AND criticality IN ('high', 'critical')`,
    resolved: `SELECT COUNT(*)::int AS c FROM digital_twin_diagnostics WHERE company_id = $1 AND status = 'resolved'`,
    memory: `SELECT COUNT(*)::int AS c FROM digital_twin_memory WHERE company_id = $1`,
    avgRepair: `SELECT COALESCE(AVG(repair_time_minutes), 0)::int AS c FROM digital_twin_memory WHERE company_id = $1 AND repair_time_minutes IS NOT NULL`
  };

  const results = {};
  for (const [key, sql] of Object.entries(queries)) {
    try {
      const r = await db.query(sql, [companyId]);
      results[key] = r.rows[0]?.c || 0;
    } catch {
      results[key] = 0;
    }
  }

  return {
    total_diagnostics: results.total,
    active_diagnostics: results.active,
    critical_alerts: results.critical,
    resolved_diagnostics: results.resolved,
    memory_entries: results.memory,
    avg_repair_time_minutes: results.avgRepair
  };
}

module.exports = {
  runFullDiagnostic,
  listDiagnostics,
  getDiagnosticById,
  resolveDiagnostic,
  getDashboardKpis,
  gatherMachineContext,
  queryMemory,
  CRITICALITY_COLORS
};
