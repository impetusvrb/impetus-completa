/**
 * INDICADORES DINÂMICOS PERSONALIZADOS
 * Gera KPIs por role + area (profile) + hierarchy_level.
 * DASHBOARD = HIERARQUIA + ÁREA + CARGO + PREFERÊNCIAS
 */
const db = require('../db');
const userContext = require('./userContext');
const hierarchicalFilter = require('./hierarchicalFilter');
const dashboardProfileResolver = require('./dashboardProfileResolver');

const ICON_MAP = {
  trending: 'TrendingUp',
  alert: 'AlertTriangle',
  message: 'MessageSquare',
  brain: 'Brain',
  map: 'MapPin',
  target: 'Target',
  users: 'Users',
  activity: 'Activity',
  zap: 'Zap'
};

/**
 * Executa query com filtro hierárquico para communications
 */
async function queryCommunications(scope, companyId, extraWhere = '') {
  const filter = hierarchicalFilter.buildCommunicationsFilter(scope, companyId);
  const where = extraWhere ? `${filter.whereClause} AND ${extraWhere}` : filter.whereClause;
  const r = await db.query(
    `SELECT COUNT(*) as total FROM communications c WHERE ${where}`,
    filter.params
  );
  return parseInt(r.rows[0]?.total || 0, 10);
}

/**
 * Executa query com filtro hierárquico para proposals
 */
async function queryProposals(scope, companyId, extraWhere = '') {
  if (!scope || !companyId) return 0;
  const statusFilter = extraWhere ? extraWhere.replace(/^p\./, '') : '';
  if (scope.isFullAccess) {
    const where = statusFilter ? `company_id = $1 AND ${statusFilter}` : 'company_id = $1';
    const r = await db.query(`SELECT COUNT(*) as total FROM proposals WHERE ${where}`, [companyId]);
    return parseInt(r.rows[0]?.total || 0, 10);
  }
  const filter = hierarchicalFilter.buildProposalsFilter(scope, companyId);
  const where = statusFilter ? `${filter.whereClause} AND p.${statusFilter}` : filter.whereClause;
  const r = await db.query(`SELECT COUNT(*) as total FROM proposals p WHERE ${where}`, filter.params);
  return parseInt(r.rows[0]?.total || 0, 10);
}

/**
 * Tasks: filtro por company (tasks não tem vínculo user direto)
 */
async function queryTasks(companyId, extraWhere = '') {
  if (!companyId) return 0;
  const where = extraWhere ? `company_id = $1 AND ${extraWhere}` : 'company_id = $1';
  try {
    const r = await db.query(`SELECT COUNT(*) as total FROM tasks WHERE ${where}`, [companyId]);
    return parseInt(r.rows[0]?.total || 0, 10);
  } catch (e) {
    if (e.message?.includes('company_id')) return 0;
    throw e;
  }
}

/**
 * Monitored points: por department quando restrito
 */
async function queryMonitoredPoints(scope, companyId) {
  if (!companyId) return 0;
  if (scope?.isFullAccess) {
    const r = await db.query('SELECT COUNT(*) as total FROM monitored_points WHERE company_id = $1 AND active = true', [companyId]);
    return parseInt(r.rows[0]?.total || 0, 10);
  }
  const deptIds = scope?.managedDepartmentIds;
  if (!deptIds?.length) {
    const r = await db.query('SELECT COUNT(*) as total FROM monitored_points WHERE company_id = $1 AND active = true', [companyId]);
    return parseInt(r.rows[0]?.total || 0, 10);
  }
  const r = await db.query(
    'SELECT COUNT(*) as total FROM monitored_points WHERE company_id = $1 AND active = true AND (department_id = ANY($2) OR department_id IS NULL)',
    [companyId, deptIds]
  );
  return parseInt(r.rows[0]?.total || 0, 10);
}

/**
 * Crescimento semanal (communications)
 */
async function getCommsGrowth(scope, companyId) {
  const filter = hierarchicalFilter.buildCommunicationsFilter(scope, companyId);
  const r = await db.query(`
    SELECT
      COUNT(*) FILTER (WHERE c.created_at >= now() - INTERVAL '1 week') as current,
      COUNT(*) FILTER (WHERE c.created_at >= now() - INTERVAL '2 weeks' AND c.created_at < now() - INTERVAL '1 week') as previous
    FROM communications c
    WHERE ${filter.whereClause}
  `, filter.params);
  const current = parseInt(r.rows[0]?.current || 0, 10);
  const previous = parseInt(r.rows[0]?.previous || 0, 10);
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

/**
 * KPIs específicos de manutenção (work_orders, preventivas, ativos)
 */
async function getMaintenanceKpis(scope, companyId, userId) {
  const kpis = [];
  try {
    const [openWo, criticalAssets, points] = await Promise.all([
      db.query(`SELECT COUNT(*) as c FROM work_orders WHERE company_id = $1 AND status IN ('open','in_progress','waiting_parts','waiting_support') AND (assigned_to = $2 OR assigned_to IS NULL)`, [companyId, userId]).catch(() => ({ rows: [{ c: 0 }] })),
      db.query(`SELECT COUNT(*) as c FROM monitored_points WHERE company_id = $1 AND active = true AND (operational_status IN ('maintenance','failure') OR criticality = 'critical')`, [companyId]).catch(() => ({ rows: [{ c: 0 }] })),
      queryMonitoredPoints(scope, companyId)
    ]);
    kpis.push({ id: 'open_work_orders', key: 'open_work_orders', title: 'OS abertas', value: parseInt(openWo.rows[0]?.c || 0), color: 'blue', route: '/diagnostic', icon: 'target' });
    kpis.push({ id: 'critical_assets', key: 'critical_assets', title: 'Ativos críticos', value: parseInt(criticalAssets.rows[0]?.c || 0), color: 'red', route: '/app/monitored-points', icon: 'alert' });
    kpis.push({ id: 'monitored_points', key: 'monitored_points', title: 'Pontos monitorados', value: points, color: 'teal', route: '/app/monitored-points', icon: 'map' });
  } catch (e) {
    if (!e.message?.includes('does not exist')) console.warn('[DASHBOARD_KPIS] maintenance:', e.message);
  }
  return kpis;
}

/**
 * KPIs específicos de qualidade (propostas/NC, auditorias)
 */
async function getQualityKpis(scope, companyId) {
  const [proposals, insights] = await Promise.all([
    queryProposals(scope, companyId, "p.status NOT IN ('done','rejected')"),
    queryCommunications(scope, companyId, "c.ai_priority <= 2")
  ]);
  return [
    { id: 'open_nc', key: 'open_nc', title: 'Não conformidades abertas', value: proposals, color: 'red', route: '/app/proacao', icon: 'alert' },
    { id: 'operational_insights', key: 'operational_insights', title: 'Insights prioritários', value: insights, color: 'teal', route: '/app/chatbot', icon: 'brain' }
  ];
}

/**
 * Gera KPIs dinâmicos baseados em user + scope + profile
 */
async function getDashboardKPIs(user, hierarchyScope) {
  if (!user?.company_id) return [];
  const companyId = user.company_id;
  const scope = hierarchyScope || await hierarchicalFilter.resolveHierarchyScope(user);
  const ctx = userContext.buildUserContext(user);
  const level = user.hierarchy_level ?? ctx?.hierarchy_level ?? 5;
  const jobFocus = ctx?.job_focus || [];
  const role = (user.role || '').toLowerCase();
  const config = dashboardProfileResolver.getDashboardConfigForUser(user);
  const profileCode = config.profile_code;
  const functionalArea = config.functional_area || '';

  const kpis = [];

  try {
    if (level <= 1) {
      // DIRETOR / CEO: Indicadores estratégicos
      const [comms, alerts, growth, proposals, points] = await Promise.all([
        queryCommunications(scope, companyId, "c.created_at >= now() - INTERVAL '1 week'"),
        queryCommunications(scope, companyId, "c.ai_priority = 1"),
        getCommsGrowth(scope, companyId),
        queryProposals(scope, companyId, "p.status NOT IN ('done','rejected')"),
        queryMonitoredPoints(scope, companyId)
      ]);
      kpis.push(
        { id: 'k1', title: 'Interações (semana)', value: comms, growth, color: 'blue', route: '/app/operacional', icon: 'message' },
        { id: 'k2', title: 'Alertas críticos', value: alerts, color: 'red', route: '/app/chatbot', icon: 'alert' },
        { id: 'k3', title: 'Crescimento semanal', value: `${growth}%`, color: growth >= 0 ? 'green' : 'orange', icon: 'trending' },
        { id: 'k4', title: 'Propostas em aberto', value: proposals, color: 'purple', route: '/app/proacao', icon: 'target' },
        { id: 'k5', title: 'Pontos monitorados', value: points, color: 'teal', route: '/app/monitored-points', icon: 'map' }
      );
    } else if (level === 2) {
      // GERENTE
      const [insights, proposalsAbertas, comms, points] = await Promise.all([
        queryCommunications(scope, companyId, "c.ai_priority <= 2 AND c.created_at >= now() - INTERVAL '7 days'"),
        queryProposals(scope, companyId, "p.status NOT IN ('done','rejected')"),
        queryCommunications(scope, companyId, "c.created_at >= now() - INTERVAL '1 week'"),
        queryMonitoredPoints(scope, companyId)
      ]);
      kpis.push(
        { id: 'k1', title: 'Insights prioritários', value: insights, color: 'teal', route: '/app/chatbot', icon: 'brain' },
        { id: 'k2', title: 'Propostas pendentes', value: proposalsAbertas, color: 'purple', route: '/app/proacao', icon: 'target' },
        { id: 'k3', title: 'Interações (setor)', value: comms, color: 'blue', route: '/app/operacional', icon: 'message' }
      );
      if (jobFocus.some(f => ['nao_conformidades', 'indicadores_qualidade', 'auditorias'].includes(f))) {
        kpis.push({ id: 'k4', title: 'Não conformidades', value: proposalsAbertas, color: 'orange', route: '/app/proacao', icon: 'alert' });
      }
      kpis.push({ id: 'k5', title: 'Pontos monitorados', value: points, color: 'blue', route: '/app/monitored-points', icon: 'map' });
    } else if (level === 3) {
      // COORDENADOR - KPIs base + área quando aplicável
      const [comms, proposals, insights] = await Promise.all([
        queryCommunications(scope, companyId, "c.created_at >= now() - INTERVAL '7 days'"),
        queryProposals(scope, companyId, "p.status NOT IN ('done','rejected')"),
        queryCommunications(scope, companyId, "c.ai_priority <= 2")
      ]);
      if (['maintenance', 'manutencao'].includes(functionalArea) || /maintenance|manutencao/.test(profileCode)) {
        const maintKpis = await getMaintenanceKpis(scope, companyId, user.id);
        kpis.push(...maintKpis);
      }
      if (['quality', 'qualidade'].includes(functionalArea) || /quality|qualidade/.test(profileCode)) {
        const qualityKpis = await getQualityKpis(scope, companyId);
        kpis.push(...qualityKpis);
      }
      kpis.push(
        { id: 'k1', title: 'Interações do departamento', value: comms, color: 'blue', route: '/app/operacional', icon: 'message' },
        { id: 'k2', title: 'Propostas em andamento', value: proposals, color: 'purple', route: '/app/proacao', icon: 'target' },
        { id: 'k3', title: 'Insights operacionais', value: insights, color: 'teal', route: '/app/chatbot', icon: 'brain' }
      );
    } else if (level === 4) {
      // SUPERVISOR - KPIs por área (maintenance, quality, production)
      if (['maintenance', 'manutencao'].includes(functionalArea) || /maintenance|manutencao/.test(profileCode)) {
        const maintKpis = await getMaintenanceKpis(scope, companyId, user.id);
        kpis.push(...maintKpis);
        const [comms, proposals] = await Promise.all([
          queryCommunications(scope, companyId, "c.created_at >= now() - INTERVAL '7 days'"),
          queryProposals(scope, companyId, "p.status NOT IN ('done','rejected')")
        ]);
        kpis.push(
          { id: 'k_comms', title: 'Interações da equipe', value: comms, color: 'blue', route: '/app/operacional', icon: 'message' },
          { id: 'k_proposals', title: 'Tarefas pendentes (equipe)', value: proposals, color: 'purple', route: '/app/proacao', icon: 'target' }
        );
      } else if (['quality', 'qualidade'].includes(functionalArea) || /quality|qualidade/.test(profileCode)) {
        const qualityKpis = await getQualityKpis(scope, companyId);
        kpis.push(...qualityKpis);
        const [comms, proposals] = await Promise.all([
          queryCommunications(scope, companyId, "c.created_at >= now() - INTERVAL '7 days'"),
          queryProposals(scope, companyId, "p.status NOT IN ('done','rejected')")
        ]);
        kpis.push(
          { id: 'k_comms', title: 'Interações da equipe', value: comms, color: 'blue', route: '/app/operacional', icon: 'message' },
          { id: 'k_proposals', title: 'Tarefas pendentes (equipe)', value: proposals, color: 'purple', route: '/app/proacao', icon: 'target' }
        );
      } else {
        const [comms, proposals, insights] = await Promise.all([
          queryCommunications(scope, companyId, "c.created_at >= now() - INTERVAL '7 days'"),
          queryProposals(scope, companyId, "p.status NOT IN ('done','rejected')"),
          queryCommunications(scope, companyId, "c.ai_priority <= 2")
        ]);
        kpis.push(
          { id: 'k1', title: 'Interações da equipe', value: comms, color: 'blue', route: '/app/operacional', icon: 'message' },
          { id: 'k2', title: 'Tarefas pendentes (equipe)', value: proposals, color: 'purple', route: '/app/proacao', icon: 'target' },
          { id: 'k3', title: 'Alertas operacionais', value: insights, color: 'orange', route: '/app/chatbot', icon: 'alert' }
        );
      }
    } else {
      // COLABORADOR (5) - KPIs por área (manutenção vê OS, qualidade vê NC)
      if (['maintenance', 'manutencao'].includes(functionalArea) || /maintenance|manutencao/.test(profileCode)) {
        const maintKpis = await getMaintenanceKpis(scope, companyId, user.id);
        const [comms, proposals] = await Promise.all([
          queryCommunications(scope, companyId, "c.created_at >= now() - INTERVAL '30 days'"),
          queryProposals(scope, companyId, "status NOT IN ('done','rejected')")
        ]);
        kpis.push(...maintKpis);
        kpis.push(
          { id: 'k_comms', title: 'Minhas interações', value: comms, color: 'blue', route: '/app/operacional', icon: 'message' },
          { id: 'k_proposals', title: 'Minhas propostas', value: proposals, color: 'purple', route: '/app/proacao', icon: 'target' }
        );
      } else {
        const [comms, proposals] = await Promise.all([
          queryCommunications(scope, companyId, "c.created_at >= now() - INTERVAL '30 days'"),
          queryProposals(scope, companyId, "status NOT IN ('done','rejected')")
        ]);
        kpis.push(
          { id: 'k1', title: 'Minhas interações', value: comms, color: 'blue', route: '/app/operacional', icon: 'message' },
          { id: 'k2', title: 'Minhas propostas', value: proposals, color: 'purple', route: '/app/proacao', icon: 'target' }
        );
      }
    }

    return kpis.map(k => ({ ...k, icon_key: k.icon, growth: k.growth ?? null }));
  } catch (err) {
    console.error('[DASHBOARD_KPIS_ERROR]', err);
    return [];
  }
}

module.exports = {
  getDashboardKPIs,
  ICON_MAP
};
