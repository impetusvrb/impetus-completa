/**
 * IMPETUS - Serviço de dados do Dashboard de Manutenção
 * Fornece summary, cards, tasks, machines, interventions, preventives e recurring failures.
 * Usa consultas defensivas (tabelas podem não existir em ambientes mínimos).
 */
const db = require('../db');
const dashboardProfileResolver = require('./dashboardProfileResolver');
const hierarchicalFilter = require('./hierarchicalFilter');

const MAINTENANCE_PROFILE_PATTERN = /maintenance|manuten|mecan|eletric|technician_maintenance|manager_maintenance|coordinator_maintenance|supervisor_maintenance/;

/**
 * Determina se o usuário tem perfil de manutenção (operacional ou gerencial)
 */
function isMaintenanceProfile(user) {
  if (!user) return false;
  const role = (user.role || '').toLowerCase();
  const area = (user.functional_area || user.area || '').toLowerCase();
  const profile = (user.dashboard_profile || '').toLowerCase();
  return (
    MAINTENANCE_PROFILE_PATTERN.test(role) ||
    MAINTENANCE_PROFILE_PATTERN.test(area) ||
    MAINTENANCE_PROFILE_PATTERN.test(profile)
  );
}

/**
 * Query segura: retorna [] ou default se tabela não existir
 */
async function safeQuery(sql, params = [], fallback = []) {
  try {
    const r = await db.query(sql, params);
    return r.rows || fallback;
  } catch (e) {
    if (e.message?.includes('does not exist')) return fallback;
    throw e;
  }
}

/**
 * GET /summary — is_maintenance + frase_resumo + dados agregados
 */
async function getSummary(user) {
  const isMaintenance = isMaintenanceProfile(user);
  if (!isMaintenance) {
    return { is_maintenance: false };
  }

  const companyId = user.company_id;
  if (!companyId) {
    return {
      is_maintenance: true,
      summary: { frase_resumo: 'Dashboard de manutenção carregado.', mtbf: 0, mttr: 0, os_abertas: 0, work_orders_open: 0 }
    };
  }

  try {
    const [woCount, mpCount] = await Promise.all([
      safeQuery(
        `SELECT COUNT(*) as c FROM work_orders 
         WHERE company_id = $1 AND status IN ('open','in_progress','waiting_parts','waiting_support')`,
        [companyId],
        [{ c: 0 }]
      ),
      safeQuery(
        `SELECT COUNT(*) as c FROM monitored_points 
         WHERE company_id = $1 AND active = true 
         AND (operational_status IN ('maintenance','failure') OR criticality = 'critical')`,
        [companyId],
        [{ c: 0 }]
      )
    ]);

    const osAbertas = parseInt(woCount[0]?.c || 0, 10);
    const maquinasAtencao = parseInt(mpCount[0]?.c || 0, 10);
    const frase = osAbertas > 0 || maquinasAtencao > 0
      ? `${osAbertas} OS aberta(s), ${maquinasAtencao} máquina(s) em atenção.`
      : 'Todas as máquinas operando dentro dos parâmetros.';

    return {
      is_maintenance: true,
      summary: {
        frase_resumo: frase,
        os_abertas: osAbertas,
        work_orders_open: osAbertas,
        maquinas_atencao: maquinasAtencao,
        mtbf: 0,
        mttr: 0
      }
    };
  } catch (e) {
    return {
      is_maintenance: true,
      summary: { frase_resumo: 'Dashboard de manutenção carregado.', mtbf: 0, mttr: 0, os_abertas: 0, work_orders_open: 0 }
    };
  }
}

/**
 * GET /cards — cards com valores agregados (ordens_abertas, preventivas_dia, etc.)
 */
async function getCards(user) {
  const isMaintenance = isMaintenanceProfile(user);
  if (!isMaintenance) return { is_maintenance: false };

  const companyId = user.company_id;
  const userId = user.id;
  const today = new Date().toISOString().slice(0, 10);

  const defaults = {
    is_maintenance: true,
    cards: {
      ordens_abertas: 0,
      preventivas_dia: 0,
      pendencias_turno: 0,
      maquinas_atencao: 0,
      intervencoes_concluidas: 0,
      chamados_aguardando: 0,
      pecas_utilizadas: 0
    }
  };

  if (!companyId) return defaults;

  try {
    const [
      ordensAbertas,
      preventivasDia,
      maquinasAtencao,
      intervencoesHoje,
      chamadosAguardando
    ] = await Promise.all([
      safeQuery(
        `SELECT COUNT(*) as c FROM work_orders 
         WHERE company_id = $1 AND status IN ('open','in_progress','waiting_parts','waiting_support') 
         AND (assigned_to = $2 OR assigned_to IS NULL)`,
        [companyId, userId],
        [{ c: 0 }]
      ),
      safeQuery(
        `SELECT COUNT(*) as c FROM maintenance_preventives 
         WHERE company_id = $1 AND DATE(scheduled_date) = $2`,
        [companyId, today],
        [{ c: 0 }]
      ),
      safeQuery(
        `SELECT COUNT(*) as c FROM monitored_points 
         WHERE company_id = $1 AND active = true 
         AND (operational_status IN ('maintenance','failure') OR criticality = 'critical')`,
        [companyId],
        [{ c: 0 }]
      ),
      safeQuery(
        `SELECT COUNT(*) as c FROM technical_interventions 
         WHERE company_id = $1 AND DATE(intervention_date) = $2`,
        [companyId, today],
        [{ c: 0 }]
      ),
      safeQuery(
        `SELECT COUNT(*) as c FROM work_orders 
         WHERE company_id = $1 AND status = 'waiting_support'`,
        [companyId],
        [{ c: 0 }]
      )
    ]);

    defaults.cards = {
      ordens_abertas: parseInt(ordensAbertas[0]?.c || 0, 10),
      preventivas_dia: parseInt(preventivasDia[0]?.c || 0, 10),
      pendencias_turno: parseInt(ordensAbertas[0]?.c || 0, 10),
      maquinas_atencao: parseInt(maquinasAtencao[0]?.c || 0, 10),
      intervencoes_concluidas: parseInt(intervencoesHoje[0]?.c || 0, 10),
      chamados_aguardando: parseInt(chamadosAguardando[0]?.c || 0, 10),
      pecas_utilizadas: 0
    };

    return defaults;
  } catch (e) {
    return defaults;
  }
}

/**
 * GET /my-tasks — tarefas atribuídas ao usuário (work_orders)
 */
async function getMyTasks(user) {
  const isMaintenance = isMaintenanceProfile(user);
  if (!isMaintenance) return { tasks: [] };

  const companyId = user.company_id;
  const userId = user.id;
  if (!companyId || !userId) return { tasks: [] };

  try {
    const rows = await safeQuery(
      `SELECT id, title, status, priority, machine_name, line_name as sector, created_at
       FROM work_orders 
       WHERE company_id = $1 AND (assigned_to = $2 OR assigned_to IS NULL)
       AND status IN ('open','in_progress','waiting_parts')
       ORDER BY 
         CASE priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
         created_at ASC
       LIMIT 50`,
      [companyId, userId],
      []
    );

    return {
      tasks: rows.map(r => ({
        id: r.id,
        title: r.title,
        status: r.status,
        priority: r.priority || 'medium',
        machine_name: r.machine_name,
        sector: r.sector,
        created_at: r.created_at
      }))
    };
  } catch (e) {
    return { tasks: [] };
  }
}

/**
 * GET /machines-attention — monitored_points em atenção
 */
async function getMachinesAttention(user) {
  const isMaintenance = isMaintenanceProfile(user);
  if (!isMaintenance) return { machines: [] };

  const companyId = user.company_id;
  if (!companyId) return { machines: [] };

  try {
    const scope = await hierarchicalFilter.resolveHierarchyScope(user);
    const deptIds = scope?.managedDepartmentIds;

    let sql = `SELECT id, name, code, operational_status, criticality
                FROM monitored_points mp
                WHERE company_id = $1 AND active = true 
                AND (operational_status IN ('maintenance','failure') OR criticality = 'critical')`;
    const params = [companyId];

    if (deptIds?.length) {
      sql += ` AND (department_id = ANY($2) OR department_id IS NULL)`;
      params.push(deptIds);
    }
    sql += ` ORDER BY criticality = 'critical' DESC, operational_status DESC LIMIT 30`;

    const rows = await safeQuery(sql, params, []);
    return {
      machines: rows.map(r => ({
        id: r.id,
        name: r.name,
        code: r.code,
        operational_status: r.operational_status,
        criticality: r.criticality || 'medium',
        open_failures: 0
      }))
    };
  } catch (e) {
    return { machines: [] };
  }
}

/**
 * GET /interventions — últimas intervenções técnicas
 */
async function getInterventions(user) {
  const isMaintenance = isMaintenanceProfile(user);
  if (!isMaintenance) return { interventions: [] };

  const companyId = user.company_id;
  if (!companyId) return { interventions: [] };

  try {
    const rows = await safeQuery(
      `SELECT ti.id, ti.machine_name, ti.sector, ti.action_taken, ti.intervention_date,
              u.name as technician_name
       FROM technical_interventions ti
       LEFT JOIN users u ON u.id = ti.technician_id
       WHERE ti.company_id = $1
       ORDER BY ti.intervention_date DESC
       LIMIT 20`,
      [companyId],
      []
    );

    return {
      interventions: rows.map(r => ({
        id: r.id,
        machine_name: r.machine_name,
        sector: r.sector,
        action_taken: r.action_taken,
        intervention_date: r.intervention_date,
        technician_name: r.technician_name
      }))
    };
  } catch (e) {
    return { interventions: [] };
  }
}

/**
 * GET /preventives — preventivas do dia
 */
async function getPreventives(user) {
  const isMaintenance = isMaintenanceProfile(user);
  if (!isMaintenance) return { preventives: [] };

  const companyId = user.company_id;
  if (!companyId) return { preventives: [] };

  const today = new Date().toISOString().slice(0, 10);

  try {
    const rows = await safeQuery(
      `SELECT id, title, machine_name, sector, preventive_type, status, scheduled_date
       FROM maintenance_preventives
       WHERE company_id = $1 AND DATE(scheduled_date) = $2
       ORDER BY scheduled_date ASC
       LIMIT 30`,
      [companyId, today],
      []
    );

    return {
      preventives: rows.map(r => ({
        id: r.id,
        title: r.title,
        machine_name: r.machine_name,
        sector: r.sector,
        preventive_type: r.preventive_type || 'preventive',
        status: r.status || 'scheduled',
        scheduled_date: r.scheduled_date
      }))
    };
  } catch (e) {
    return { preventives: [] };
  }
}

/**
 * GET /recurring-failures — falhas recorrentes (agrupamento por máquina/tipo)
 */
async function getRecurringFailures(user) {
  const isMaintenance = isMaintenanceProfile(user);
  if (!isMaintenance) return { failures: [] };

  const companyId = user.company_id;
  if (!companyId) return { failures: [] };

  try {
    const rows = await safeQuery(
      `SELECT machine_name, COUNT(*) as occurrences, MAX(intervention_date) as last_date
       FROM technical_interventions
       WHERE company_id = $1 AND intervention_date >= now() - INTERVAL '90 days'
       GROUP BY machine_name
       HAVING COUNT(*) >= 2
       ORDER BY occurrences DESC
       LIMIT 15`,
      [companyId],
      []
    );

    return {
      failures: rows.map(r => ({
        machine_name: r.machine_name,
        occurrences: parseInt(r.occurrences || 0, 10),
        last_date: r.last_date
      }))
    };
  } catch (e) {
    return { failures: [] };
  }
}

module.exports = {
  isMaintenanceProfile,
  getSummary,
  getCards,
  getMyTasks,
  getMachinesAttention,
  getInterventions,
  getPreventives,
  getRecurringFailures
};
