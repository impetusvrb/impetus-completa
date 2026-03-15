/**
 * Serviço de visibilidade do dashboard
 * CEO (hierarchy 0) e Diretor (hierarchy 1) sempre veem tudo.
 * Níveis 2-5 são configuráveis pelo Diretor.
 */
const db = require('../db');

const DEFAULT_SECTIONS = {
  operational_interactions: true,
  ai_insights: true,
  monitored_points: true,
  proposals: true,
  trend_chart: true,
  points_chart: true,
  insights_list: true,
  recent_interactions: true,
  smart_summary: true,
  plc_alerts: true,
  kpi_request: true,
  communication_panel: true
};

/**
 * Retorna as seções visíveis para o usuário
 * @param {number} hierarchyLevel - 0=CEO, 1=Diretor, 2=Gerente, 3=Coordenador, 4=Supervisor, 5=Colaborador
 * @param {string} companyId
 * @returns {Promise<Object>} - { sectionKey: boolean, ... }
 */
async function getVisibilityForUser(hierarchyLevel, companyId) {
  if (!companyId) return { ...DEFAULT_SECTIONS };

  // CEO (0) e Diretor (1) sempre têm acesso total
  if (hierarchyLevel === 0 || hierarchyLevel === 1) {
    return { ...DEFAULT_SECTIONS };
  }

  const level = Math.min(Math.max(hierarchyLevel, 2), 5);
  const r = await db.query(
    'SELECT sections FROM dashboard_visibility_config WHERE company_id = $1 AND hierarchy_level = $2',
    [companyId, level]
  );

  if (r.rows.length === 0) {
    return { ...DEFAULT_SECTIONS };
  }

  const configured = r.rows[0].sections || {};
  return { ...DEFAULT_SECTIONS, ...configured };
}

/**
 * Lista configurações de visibilidade da empresa (para Diretor editar)
 */
async function listConfigs(companyId) {
  const r = await db.query(
    `SELECT hierarchy_level, sections, updated_at 
     FROM dashboard_visibility_config 
     WHERE company_id = $1 
     ORDER BY hierarchy_level ASC`,
    [companyId]
  );
  return r.rows;
}

/**
 * Salva configuração de visibilidade para um nível
 * @param {string} companyId
 * @param {number} hierarchyLevel - 2 a 5
 * @param {Object} sections - { sectionKey: boolean, ... }
 */
async function saveConfig(companyId, hierarchyLevel, sections) {
  if (hierarchyLevel < 2 || hierarchyLevel > 5) {
    throw new Error('hierarchy_level deve ser entre 2 e 5');
  }

  const merged = { ...DEFAULT_SECTIONS, ...sections };

  await db.query(`
    INSERT INTO dashboard_visibility_config (company_id, hierarchy_level, sections, updated_at)
    VALUES ($1, $2, $3, now())
    ON CONFLICT (company_id, hierarchy_level)
    DO UPDATE SET sections = $3, updated_at = now()
  `, [companyId, hierarchyLevel, JSON.stringify(merged)]);
}

module.exports = {
  DEFAULT_SECTIONS,
  getVisibilityForUser,
  listConfigs,
  saveConfig
};
