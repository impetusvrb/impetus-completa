/**
 * Filtros de dados do dashboard por hierarquia
 * Estratégico (0,1): KPIs agregados - totais da empresa
 * Tático (2,3): Comparativos por área/departamento
 * Operacional (4,5): Apenas registros do próprio usuário
 */
const userContext = require('./userContext');

/**
 * @param {Object} user - req.user
 * @returns {Object} - { hierarchyLevel, scope, departmentId, userId, companyId }
 */
function getFilterContext(user) {
  if (!user) return null;
  const ctx = userContext.buildUserContext(user);
  const hierarchyLevel = ctx?.hierarchy_level ?? user.hierarchy_level ?? 5;

  return {
    hierarchyLevel,
    scope: ctx?.scope || 'individual',
    departmentId: user.department_id || null,
    area: ctx?.area || user.area || null,
    userId: user.id,
    companyId: user.company_id
  };
}

/**
 * Retorna condições SQL e params para filtrar communications por hierarquia
 * @param {Object} ctx - getFilterContext(user)
 * @param {string} tableAlias - ex: 'c' para communications c
 * @returns {Object} - { whereClause: string, params: any[], paramOffset: number }
 */
function getCommunicationsFilter(ctx, tableAlias = 'c', paramOffset = 1) {
  if (!ctx || !ctx.companyId) {
    return { whereClause: '', params: [], paramOffset };
  }

  const base = `${tableAlias}.company_id = $${paramOffset}`;
  let conditions = [base];
  const params = [ctx.companyId];
  let offset = paramOffset + 1;

  if (ctx.hierarchyLevel <= 1) {
    return { whereClause: base, params, paramOffset: offset };
  }

  if (ctx.hierarchyLevel >= 4) {
    conditions.push(`${tableAlias}.sender_id = $${offset}`);
    params.push(ctx.userId);
    offset++;
    return { whereClause: conditions.join(' AND '), params, paramOffset: offset };
  }

  if (ctx.hierarchyLevel === 2 || ctx.hierarchyLevel === 3) {
    if (ctx.departmentId) {
      conditions.push(`EXISTS (
        SELECT 1 FROM users u_sender
        WHERE u_sender.id = ${tableAlias}.sender_id
          AND u_sender.department_id = $${offset}
      )`);
      params.push(ctx.departmentId);
      offset++;
    }
    return { whereClause: conditions.join(' AND '), params, paramOffset: offset };
  }

  return { whereClause: base, params, paramOffset: offset };
}

/**
 * Tipo de visão por nível
 * @param {number} hierarchyLevel
 * @returns {'aggregated'|'comparative'|'detailed'}
 */
function getViewType(hierarchyLevel) {
  if (hierarchyLevel <= 1) return 'aggregated';
  if (hierarchyLevel <= 3) return 'comparative';
  return 'detailed';
}

module.exports = {
  getFilterContext,
  getCommunicationsFilter,
  getViewType
};
