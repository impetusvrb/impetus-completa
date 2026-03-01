/**
 * Filtros de dados do dashboard por hierarquia
 * Integrado com hierarchicalFilter (supervisor_id, manager_id) para controle real
 */
const userContext = require('./userContext');
const hierarchicalFilter = require('./hierarchicalFilter');

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
 * Retorna filtro de communications.
 * Aceita: getFilterContext(user) OU { ...req.hierarchyScope, companyId }
 */
function getCommunicationsFilter(ctxOrScope, tableAlias = 'c', paramOffset = 1) {
  if (!ctxOrScope) return { whereClause: '', params: [], paramOffset };
  const companyId = ctxOrScope.companyId ?? ctxOrScope.company_id;
  if (ctxOrScope.scopeLevel !== undefined && ctxOrScope.isFullAccess !== undefined && companyId) {
    return hierarchicalFilter.buildCommunicationsFilter(ctxOrScope, companyId, { tableAlias, paramOffset });
  }
  const ctx = ctxOrScope;
  if (!ctx.companyId) return { whereClause: '', params: [], paramOffset };
  const base = `${tableAlias}.company_id = $${paramOffset}`;
  let conditions = [base];
  const params = [ctx.companyId];
  let offset = paramOffset + 1;
  if (ctx.hierarchyLevel <= 1) return { whereClause: base, params, paramOffset: offset };
  if (ctx.hierarchyLevel >= 4) {
    conditions.push(`(${tableAlias}.sender_id = $${offset} OR ${tableAlias}.recipient_id = $${offset})`);
    params.push(ctx.userId);
    offset++;
    return { whereClause: conditions.join(' AND '), params, paramOffset: offset };
  }
  if ((ctx.hierarchyLevel === 2 || ctx.hierarchyLevel === 3) && ctx.departmentId) {
    conditions.push(`EXISTS (SELECT 1 FROM users u_s WHERE u_s.id = ${tableAlias}.sender_id AND u_s.department_id = $${offset})`);
    params.push(ctx.departmentId);
    offset++;
  }
  return { whereClause: conditions.join(' AND '), params, paramOffset: offset };
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
