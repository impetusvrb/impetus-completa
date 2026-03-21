/**
 * SERVIÇO DE DASHBOARD OPERACIONAL PARA MANUTENÇÃO
 * Dados técnicos: OS, preventivas, máquinas em atenção, intervenções
 * Usado pelo perfil mecânico/eletricista/eletromecânico
 */
const db = require('../db');

/** Executa query com fallback em tabela/coluna inexistente */
async function safeQuery(sql, params, defaultValue = { rows: [{ total: 0, c: 0 }] }) {
  try {
    return await db.query(sql, params);
  } catch (err) {
    if (/does not exist|relation.*does not exist|column.*does not exist/i.test(err.message || '')) return defaultValue;
    throw err;
  }
}

const MTBF_MTTR_DAYS = 30;
const MTBF_MTTR_DEF = { rows: [{ mttr_h: null, n: 0 }] };

/**
 * Calcula MTBF (Mean Time Between Failures) e MTTR (Mean Time to Repair)
 * MTBF (h): período em horas / número de falhas (últimos 30 dias)
 * MTTR (h): média do tempo de reparo em horas
 * Usa work_orders, technical_interventions e equipment_failures com safeQuery
 */
async function getMTBFandMTTR(companyId) {
  const periodHours = MTBF_MTTR_DAYS * 24;
  let mtbf = null;
  let mttr = null;

  // MTTR: work_orders com started_at e completed_at (mais preciso)
  const mttrFromWO = await safeQuery(`
    SELECT ROUND(AVG(EXTRACT(EPOCH FROM (completed_at - COALESCE(started_at, created_at))) / 3600)::numeric, 1) as mttr_h,
           COUNT(*) as n
    FROM work_orders
    WHERE company_id = $1 AND status IN ('resolved', 'closed')
      AND completed_at IS NOT NULL AND (started_at IS NOT NULL OR created_at IS NOT NULL)
      AND completed_at > COALESCE(started_at, created_at)
      AND created_at >= now() - interval '${MTBF_MTTR_DAYS} days'
  `, [companyId], MTBF_MTTR_DEF);
  if (mttrFromWO.rows[0]?.n > 0 && mttrFromWO.rows[0].mttr_h != null) {
    mttr = parseFloat(mttrFromWO.rows[0].mttr_h);
  }

  // MTTR fallback: technical_interventions.execution_minutes
  if (mttr == null || isNaN(mttr)) {
    const mttrFromTI = await safeQuery(`
      SELECT ROUND(AVG(execution_minutes) / 60.0, 1) as mttr_h, COUNT(*) as n
      FROM technical_interventions
      WHERE company_id = $1 AND execution_minutes > 0
        AND intervention_date >= now() - interval '${MTBF_MTTR_DAYS} days'
    `, [companyId], MTBF_MTTR_DEF);
    if (mttrFromTI.rows[0]?.n > 0 && mttrFromTI.rows[0].mttr_h != null) {
      mttr = parseFloat(mttrFromTI.rows[0].mttr_h);
    }
  }

  // MTTR fallback: equipment_failures (resolved_at - reported_at)
  if (mttr == null || isNaN(mttr)) {
    const mttrFromEF = await safeQuery(`
      SELECT ROUND(AVG(EXTRACT(EPOCH FROM (resolved_at - reported_at)) / 3600)::numeric, 1) as mttr_h, COUNT(*) as n
      FROM equipment_failures
      WHERE company_id = $1 AND resolved_at IS NOT NULL AND resolved_at > reported_at
        AND reported_at >= now() - interval '${MTBF_MTTR_DAYS} days'
    `, [companyId], MTBF_MTTR_DEF);
    if (mttrFromEF.rows[0]?.n > 0 && mttrFromEF.rows[0].mttr_h != null) {
      mttr = parseFloat(mttrFromEF.rows[0].mttr_h);
    }
  }

  // MTBF: falhas nos últimos N dias
  const failuresCount = await safeQuery(`
    SELECT (
      (SELECT COUNT(*) FROM equipment_failures WHERE company_id = $1 AND reported_at >= now() - interval '${MTBF_MTTR_DAYS} days')
      +
      (SELECT COUNT(*) FROM technical_interventions WHERE company_id = $1 AND intervention_date >= now() - interval '${MTBF_MTTR_DAYS} days')
    ) as total
  `, [companyId], { rows: [{ total: 0 }] });
  const numFailures = parseInt(failuresCount.rows[0]?.total || 0);
  if (numFailures > 0) {
    mtbf = Math.round((periodHours / numFailures) * 10) / 10;
  }

  return {
    mtbf: mtbf != null && !isNaN(mtbf) ? mtbf : null,
    mttr: mttr != null && !isNaN(mttr) ? mttr : null
  };
}

/**
 * Resumo técnico do dia (cabeçalho)
 */
async function getTechnicalSummary(companyId, userId) {
  const today = new Date().toISOString().slice(0, 10);

  const [osOpen, preventivesToday, machinesAttention, interventionsToday, callsWaiting, mtbfMttr] = await Promise.all([
    safeQuery(`
      SELECT COUNT(*) as total FROM work_orders
      WHERE company_id = $1 AND status IN ('open', 'in_progress', 'waiting_parts', 'waiting_support')
        AND (assigned_to = $2 OR assigned_to IS NULL)
    `, [companyId, userId]),
    safeQuery(`
      SELECT COUNT(*) as total FROM maintenance_preventives
      WHERE company_id = $1 AND scheduled_date = $2::date AND status IN ('pending', 'overdue', 'in_progress')
        AND (assigned_to = $3 OR assigned_to IS NULL)
    `, [companyId, today, userId]),
    safeQuery(`
      SELECT COUNT(*) as total FROM monitored_points
      WHERE company_id = $1 AND active = true
        AND (operational_status IN ('maintenance', 'failure') OR criticality = 'critical')
    `, [companyId]),
    safeQuery(`
      SELECT COUNT(*) as total FROM technical_interventions
      WHERE company_id = $1 AND intervention_date::date = $2::date AND technician_id = $3
    `, [companyId, today, userId]),
    safeQuery(`
      SELECT COUNT(*) as total FROM work_orders
      WHERE company_id = $1 AND status = 'waiting_support' AND assigned_to = $2
    `, [companyId, userId]),
    getMTBFandMTTR(companyId)
  ]);

  const osAbertas = parseInt(osOpen.rows[0]?.total || 0);
  const preventivas = parseInt(preventivesToday.rows[0]?.total || 0);
  const maquinasAtencao = parseInt(machinesAttention.rows[0]?.total || 0);
  const concluidasHoje = parseInt(interventionsToday.rows[0]?.total || 0);
  const aguardandoApoio = parseInt(callsWaiting.rows[0]?.total || 0);

  const parts = [];
  if (osAbertas > 0) parts.push(`${osAbertas} ordem${osAbertas > 1 ? 'ns' : ''} de serviço aberta${osAbertas > 1 ? 's' : ''}`);
  if (preventivas > 0) parts.push(`${preventivas} preventiva${preventivas > 1 ? 's' : ''} do dia`);
  if (maquinasAtencao > 0) parts.push(`${maquinasAtencao} máquina${maquinasAtencao > 1 ? 's' : ''} em atenção`);
  if (aguardandoApoio > 0) parts.push(`${aguardandoApoio} chamado${aguardandoApoio > 1 ? 's' : ''} aguardando apoio`);

  return {
    os_abertas: osAbertas,
    preventivas_dia: preventivas,
    maquinas_atencao: maquinasAtencao,
    intervencoes_concluidas_hoje: concluidasHoje,
    chamados_aguardando_apoio: aguardandoApoio,
    frase_resumo: parts.length > 0
      ? `Hoje você tem ${parts.join(', ')}.`
      : 'Nenhuma pendência técnica no momento.',
    mtbf: mtbfMttr.mtbf ?? null,
    mttr: mtbfMttr.mttr ?? null,
    MTBF: mtbfMttr.mtbf ?? null,
    MTTR: mtbfMttr.mttr ?? null,
    work_orders_open: osAbertas
  };
}

/**
 * Cards técnicos (contagens)
 */
async function getTechnicalCards(companyId, userId) {
  const today = new Date().toISOString().slice(0, 10);
  const def = { rows: [{ c: 0 }] };

  const [osOpen, preventives, pendencies, machines, interventions, calls, parts] = await Promise.all([
    safeQuery(`SELECT COUNT(*) as c FROM work_orders WHERE company_id = $1 AND status IN ('open','in_progress','waiting_parts','waiting_support') AND (assigned_to = $2 OR assigned_to IS NULL)`, [companyId, userId], def),
    safeQuery(`SELECT COUNT(*) as c FROM maintenance_preventives WHERE company_id = $1 AND scheduled_date = $2::date AND status IN ('pending','overdue','in_progress')`, [companyId, today], def),
    safeQuery(`SELECT COUNT(*) as c FROM work_orders WHERE company_id = $1 AND status IN ('open','in_progress') AND assigned_to = $2`, [companyId, userId], def),
    safeQuery(`SELECT COUNT(*) as c FROM monitored_points WHERE company_id = $1 AND active = true AND (operational_status IN ('maintenance','failure') OR criticality = 'critical')`, [companyId], def),
    safeQuery(`SELECT COUNT(*) as c FROM technical_interventions WHERE company_id = $1 AND intervention_date::date = $2::date AND technician_id = $3`, [companyId, today, userId], def),
    safeQuery(`SELECT COUNT(*) as c FROM work_orders WHERE company_id = $1 AND status = 'waiting_support' AND assigned_to = $2`, [companyId, userId], def),
    safeQuery(`SELECT COUNT(*) as c FROM technical_interventions ti WHERE company_id = $1 AND intervention_date::date = $2::date AND technician_id = $3 AND jsonb_array_length(COALESCE(parts_replaced,'[]'::jsonb)) > 0`, [companyId, today, userId], def)
  ]);

  return {
    ordens_abertas: parseInt(osOpen.rows[0]?.c || 0),
    preventivas_dia: parseInt(preventives.rows[0]?.c || 0),
    pendencias_turno: parseInt(pendencies.rows[0]?.c || 0),
    maquinas_atencao: parseInt(machines.rows[0]?.c || 0),
    intervencoes_concluidas: parseInt(interventions.rows[0]?.c || 0),
    chamados_aguardando: parseInt(calls.rows[0]?.c || 0),
    pecas_utilizadas: parseInt(parts.rows[0]?.c || 0)
  };
}

/**
 * Minhas tarefas de hoje (OS atribuídas)
 */
async function getMyTasksToday(companyId, userId, limit = 20) {
  try {
  const today = new Date().toISOString().slice(0, 10);
  const r = await db.query(`
    SELECT wo.id, wo.title, wo.description, wo.type, wo.priority, wo.status,
           wo.sector, wo.line_name, wo.machine_name, wo.scheduled_at, wo.started_at,
           wo.equipment_id, wo.created_at,
           mp.name as equipment_name
    FROM work_orders wo
    LEFT JOIN monitored_points mp ON mp.id = wo.equipment_id
    WHERE wo.company_id = $1 AND (wo.assigned_to = $2 OR wo.assigned_to IS NULL)
      AND wo.status NOT IN ('closed', 'cancelled', 'resolved')
      AND (wo.scheduled_at::date = $3::date OR wo.scheduled_at IS NULL OR wo.created_at::date = $3::date)
    ORDER BY CASE wo.priority WHEN 'critical' THEN 1 WHEN 'urgent' THEN 2 WHEN 'high' THEN 3 ELSE 4 END, wo.scheduled_at NULLS LAST
    LIMIT $4
  `, [companyId, userId, today, limit]);
  return r.rows || [];
  } catch (err) {
    if (/does not exist/i.test(err.message || '')) return [];
    throw err;
  }
}

/**
 * Máquinas em atenção
 * Usa monitored_points quando existe; fallback para machine_monitoring_config + machine_detected_events
 */
async function getMachinesInAttention(companyId, limit = 15) {
  try {
    const r = await db.query(`
      SELECT mp.id, mp.code, mp.name, mp.operational_status, mp.criticality,
             mp.last_maintenance, mp.next_maintenance, mp.sector,
             (SELECT COUNT(*) FROM equipment_failures ef WHERE ef.equipment_id = mp.id AND ef.status NOT IN ('resolved','verified')) as open_failures
      FROM monitored_points mp
      WHERE mp.company_id = $1 AND mp.active = true
        AND (mp.operational_status IN ('maintenance', 'failure') OR mp.criticality = 'critical'
             OR mp.next_maintenance < now() OR exists (SELECT 1 FROM equipment_failures ef WHERE ef.equipment_id = mp.id AND ef.status NOT IN ('resolved','verified')))
      ORDER BY mp.criticality = 'critical' DESC, mp.operational_status DESC
      LIMIT $2
    `, [companyId, limit]);
    if (r.rows?.length > 0) return r.rows;
  } catch (_) { /* monitored_points pode não existir */ }

  /* Fallback: machine_monitoring_config + eventos recentes críticos */
  try {
    const fallback = await db.query(`
      SELECT m.id, m.machine_identifier as code, m.machine_name as name,
             CASE WHEN ev.id IS NOT NULL THEN 'failure' ELSE 'normal' END as operational_status,
             CASE WHEN ev.severity = 'critical' THEN 'critical' ELSE 'high' END as criticality,
             NULL::date as last_maintenance, NULL::date as next_maintenance, m.line_name as sector,
             1 as open_failures
      FROM machine_monitoring_config m
      LEFT JOIN LATERAL (
        SELECT id, severity FROM machine_detected_events
        WHERE company_id = $1 AND machine_identifier = m.machine_identifier
          AND created_at > now() - INTERVAL '7 days'
          AND severity IN ('high', 'critical')
        ORDER BY created_at DESC LIMIT 1
      ) ev ON true
      WHERE m.company_id = $1 AND (m.enabled IS NULL OR m.enabled = true)
        AND ev.id IS NOT NULL
      LIMIT $2
    `, [companyId, limit]);
    return (fallback.rows || []).map((row) => ({ ...row, id: row.id, equipment_id: row.id }));
  } catch (_) {}
  return [];
}

/**
 * Últimas intervenções
 */
async function getLastInterventions(companyId, limit = 10) {
  try {
  const r = await db.query(`
    SELECT ti.id, ti.machine_name, ti.sector, ti.action_taken, ti.result_obtained,
           ti.intervention_date, ti.final_status, ti.remaining_pendency,
           u.name as technician_name
    FROM technical_interventions ti
    LEFT JOIN users u ON u.id = ti.technician_id
    WHERE ti.company_id = $1
    ORDER BY ti.intervention_date DESC
    LIMIT $2
  `, [companyId, limit]);
  return r.rows || [];
  } catch (err) {
    if (/does not exist/i.test(err.message || '')) return [];
    throw err;
  }
}

/**
 * Preventivas do dia
 */
async function getPreventivesToday(companyId, userId, limit = 15) {
  try {
  const today = new Date().toISOString().slice(0, 10);
  const r = await db.query(`
    SELECT mprev.id, mprev.title, mprev.machine_name, mprev.sector, mprev.preventive_type,
           mprev.scheduled_date, mprev.scheduled_time, mprev.status, mprev.checklist,
           u.name as assigned_name
    FROM maintenance_preventives mprev
    LEFT JOIN users u ON u.id = mprev.assigned_to
    WHERE mprev.company_id = $1 AND mprev.scheduled_date = $2::date
      AND mprev.status IN ('pending', 'overdue', 'in_progress', 'completed')
      AND (mprev.assigned_to = $3 OR mprev.assigned_to IS NULL)
    ORDER BY mprev.scheduled_time NULLS LAST, mprev.status
    LIMIT $4
  `, [companyId, today, userId, limit]);
  return r.rows || [];
  } catch (err) {
    if (/does not exist/i.test(err.message || '')) return [];
    throw err;
  }
}

/**
 * Falhas recorrentes (por equipamento)
 */
async function getRecurringFailures(companyId, limit = 10) {
  try {
  const r = await db.query(`
    SELECT ef.equipment_id, mp.name as machine_name, mp.code,
           COUNT(*) as failure_count,
           array_agg(DISTINCT ef.failure_description) as descriptions
    FROM equipment_failures ef
    JOIN monitored_points mp ON mp.id = ef.equipment_id
    WHERE ef.company_id = $1 AND ef.equipment_id IS NOT NULL
      AND ef.reported_at >= now() - INTERVAL '90 days'
    GROUP BY ef.equipment_id, mp.name, mp.code
    HAVING COUNT(*) >= 2
    ORDER BY failure_count DESC
    LIMIT $2
  `, [companyId, limit]);
  return r.rows || [];
  } catch (err) {
    if (/does not exist/i.test(err.message || '')) return [];
    throw err;
  }
}

/**
 * Registro técnico do turno (com ou sem IA para estruturar)
 */
async function saveShiftTechnicalLog(companyId, userId, content, structuredData = {}, logType = 'turn_record') {
  const r = await db.query(`
    INSERT INTO shift_technical_logs (company_id, user_id, log_type, content, structured_data)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id, shift_date, created_at
  `, [companyId, userId, logType, content || '', JSON.stringify(structuredData || {})]);
  return r.rows?.[0];
}

/**
 * Lista registros de passagem de turno
 */
async function getShiftHandovers(companyId, userId, limit = 5) {
  try {
    const r = await db.query(`
      SELECT id, content, structured_data, shift_date, created_at
      FROM shift_technical_logs
      WHERE company_id = $1 AND user_id = $2 AND log_type IN ('turn_record', 'shift_handover')
      ORDER BY created_at DESC
      LIMIT $3
    `, [companyId, userId, limit]);
    return r.rows || [];
  } catch (err) {
    if (/does not exist/i.test(err.message || '')) return [];
    throw err;
  }
}

module.exports = {
  getTechnicalSummary,
  getTechnicalCards,
  getMyTasksToday,
  getMachinesInAttention,
  getLastInterventions,
  getPreventivesToday,
  getRecurringFailures,
  saveShiftTechnicalLog,
  getShiftHandovers
};
