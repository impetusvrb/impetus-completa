/**
 * SERVIÇO DE DASHBOARD OPERACIONAL PARA MANUTENÇÃO
 * Dados técnicos: OS, preventivas, máquinas em atenção, intervenções
 * Usado pelo perfil mecânico/eletricista/eletromecânico
 */
const db = require('../db');

/**
 * Resumo técnico do dia (cabeçalho)
 */
async function getTechnicalSummary(companyId, userId) {
  const today = new Date().toISOString().slice(0, 10);

  const [osOpen, preventivesToday, machinesAttention, interventionsToday, callsWaiting] = await Promise.all([
    db.query(`
      SELECT COUNT(*) as total FROM work_orders
      WHERE company_id = $1 AND status IN ('open', 'in_progress', 'waiting_parts', 'waiting_support')
        AND (assigned_to = $2 OR assigned_to IS NULL)
    `, [companyId, userId]),
    db.query(`
      SELECT COUNT(*) as total FROM maintenance_preventives
      WHERE company_id = $1 AND scheduled_date = $2::date AND status IN ('pending', 'overdue', 'in_progress')
        AND (assigned_to = $3 OR assigned_to IS NULL)
    `, [companyId, today, userId]),
    db.query(`
      SELECT COUNT(*) as total FROM monitored_points
      WHERE company_id = $1 AND active = true
        AND (operational_status IN ('maintenance', 'failure') OR criticality = 'critical')
    `, [companyId]),
    db.query(`
      SELECT COUNT(*) as total FROM technical_interventions
      WHERE company_id = $1 AND intervention_date::date = $2::date AND technician_id = $3
    `, [companyId, today, userId]),
    db.query(`
      SELECT COUNT(*) as total FROM work_orders
      WHERE company_id = $1 AND status = 'waiting_support' AND assigned_to = $2
    `, [companyId, userId])
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
      : 'Nenhuma pendência técnica no momento.'
  };
}

/**
 * Cards técnicos (contagens)
 */
async function getTechnicalCards(companyId, userId) {
  const today = new Date().toISOString().slice(0, 10);

  const [osOpen, preventives, pendencies, machines, interventions, calls, parts] = await Promise.all([
    db.query(`SELECT COUNT(*) as c FROM work_orders WHERE company_id = $1 AND status IN ('open','in_progress','waiting_parts','waiting_support') AND (assigned_to = $2 OR assigned_to IS NULL)`, [companyId, userId]),
    db.query(`SELECT COUNT(*) as c FROM maintenance_preventives WHERE company_id = $1 AND scheduled_date = $2::date AND status IN ('pending','overdue','in_progress')`, [companyId, today]),
    db.query(`SELECT COUNT(*) as c FROM work_orders WHERE company_id = $1 AND status IN ('open','in_progress') AND assigned_to = $2`, [companyId, userId]),
    db.query(`SELECT COUNT(*) as c FROM monitored_points WHERE company_id = $1 AND active = true AND (operational_status IN ('maintenance','failure') OR criticality = 'critical')`, [companyId]),
    db.query(`SELECT COUNT(*) as c FROM technical_interventions WHERE company_id = $1 AND intervention_date::date = $2::date AND technician_id = $3`, [companyId, today, userId]),
    db.query(`SELECT COUNT(*) as c FROM work_orders WHERE company_id = $1 AND status = 'waiting_support' AND assigned_to = $2`, [companyId, userId]),
    db.query(`SELECT COUNT(*) as c FROM technical_interventions ti WHERE company_id = $1 AND intervention_date::date = $2::date AND technician_id = $3 AND jsonb_array_length(COALESCE(parts_replaced,'[]'::jsonb)) > 0`, [companyId, today, userId])
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
  return r.rows;
}

/**
 * Máquinas em atenção
 */
async function getMachinesInAttention(companyId, limit = 15) {
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
  return r.rows;
}

/**
 * Últimas intervenções
 */
async function getLastInterventions(companyId, limit = 10) {
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
  return r.rows;
}

/**
 * Preventivas do dia
 */
async function getPreventivesToday(companyId, userId, limit = 15) {
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
  return r.rows;
}

/**
 * Falhas recorrentes (por equipamento)
 */
async function getRecurringFailures(companyId, limit = 10) {
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
  return r.rows;
}

module.exports = {
  getTechnicalSummary,
  getTechnicalCards,
  getMyTasksToday,
  getMachinesInAttention,
  getLastInterventions,
  getPreventivesToday,
  getRecurringFailures
};
