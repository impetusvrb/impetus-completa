/**
 * CONTROLE HIERÁRQUICO COM FILTRO DE DADOS POR NÍVEL
 * Mesmo módulo = mesmas funcionalidades. Dados = filtrados por vínculo hierárquico.
 *
 * DIRETOR (1): Todos os dados da empresa
 * GERENTE (2): Apenas departamentos sob sua gestão + equipes vinculadas
 * COORDENADOR (3): Apenas seu departamento + subordinados diretos
 * SUPERVISOR (4): Apenas sua equipe direta
 * COLABORADOR (5): Apenas seus próprios dados
 */
const db = require('../db');

const HIERARCHY_DIRETOR = 1;
const HIERARCHY_GERENTE = 2;
const HIERARCHY_COORDENADOR = 3;
const HIERARCHY_SUPERVISOR = 4;
const HIERARCHY_COLABORADOR = 5;

/**
 * Resolve o escopo hierárquico do usuário (department_ids e user_ids permitidos)
 * @param {Object} user - req.user (id, company_id, department_id, hierarchy_level, supervisor_id)
 * @returns {Promise<{scopeLevel, managedDepartmentIds, allowedUserIds, isFullAccess}>}
 */
async function resolveHierarchyScope(user) {
  if (!user || !user.company_id) {
    return { scopeLevel: 'none', managedDepartmentIds: [], allowedUserIds: [], isFullAccess: false };
  }

  const level = user.hierarchy_level ?? 5;
  const userId = user.id;
  const departmentId = user.department_id;

  // DIRETOR: acesso completo
  if (level <= HIERARCHY_DIRETOR) {
    return {
      scopeLevel: 'full',
      managedDepartmentIds: null,
      allowedUserIds: null,
      isFullAccess: true
    };
  }

  // COLABORADOR (5): apenas próprio usuário
  if (level === HIERARCHY_COLABORADOR) {
    return {
      scopeLevel: 'individual',
      managedDepartmentIds: departmentId ? [departmentId] : [],
      allowedUserIds: [userId],
      isFullAccess: false
    };
  }

  // SUPERVISOR (4): equipe direta (subordinados com supervisor_id = user)
  if (level === HIERARCHY_SUPERVISOR) {
    const subordinateIds = await getDirectSubordinateIds(userId);
    return {
      scopeLevel: 'supervisor',
      managedDepartmentIds: departmentId ? [departmentId] : [],
      allowedUserIds: [userId, ...subordinateIds],
      isFullAccess: false
    };
  }

  // GERENTE: departamentos onde manager_id = user.id (e subdepartamentos)
  if (level === HIERARCHY_GERENTE) {
    const managedDeptIds = await getManagedDepartmentIds(userId);
    if (managedDeptIds.length === 0 && departmentId) {
      return {
        scopeLevel: 'coordinator',
        managedDepartmentIds: [departmentId],
        allowedUserIds: [userId, ...(await getDirectSubordinateIds(userId))],
        isFullAccess: false
      };
    }
    const allowedUserIds = await getUserIdsInDepartments(managedDeptIds);
    return {
      scopeLevel: 'manager',
      managedDepartmentIds: managedDeptIds,
      allowedUserIds: [...new Set([userId, ...allowedUserIds])],
      isFullAccess: false
    };
  }

  // COORDENADOR: seu departamento + subordinados diretos
  if (level === HIERARCHY_COORDENADOR) {
    const subordinateIds = await getDirectSubordinateIds(userId);
    const deptIds = departmentId ? [departmentId] : [];
    const userIdsInDept = deptIds.length ? await getUserIdsInDepartments(deptIds) : [];
    const allowedUserIds = [...new Set([userId, ...subordinateIds, ...userIdsInDept])];
    return {
      scopeLevel: 'coordinator',
      managedDepartmentIds: deptIds,
      allowedUserIds,
      isFullAccess: false
    };
  }

  return {
    scopeLevel: 'individual',
    managedDepartmentIds: departmentId ? [departmentId] : [],
    allowedUserIds: [userId],
    isFullAccess: false
  };
}

async function getDirectSubordinateIds(supervisorId) {
  try {
    const r = await db.query(
      'SELECT id FROM users WHERE supervisor_id = $1 AND deleted_at IS NULL',
      [supervisorId]
    );
    return r.rows.map((row) => row.id);
  } catch (err) {
    if (err.message?.includes('supervisor_id')) return [];
    throw err;
  }
}

async function getManagedDepartmentIds(managerId) {
  try {
    const r = await db.query(`
      WITH RECURSIVE dept_tree AS (
        SELECT id FROM departments WHERE manager_id = $1 AND active = true
        UNION ALL
        SELECT d.id FROM departments d
        JOIN dept_tree dt ON d.parent_department_id = dt.id
        WHERE d.active = true
      )
      SELECT id FROM dept_tree
    `, [managerId]);
    return r.rows.map((row) => row.id);
  } catch (err) {
    if (err.message?.includes('manager_id')) return [];
    return [];
  }
}

async function getUserIdsInDepartments(departmentIds) {
  if (!departmentIds || departmentIds.length === 0) return [];
  try {
    const r = await db.query(
      'SELECT id FROM users WHERE department_id = ANY($1) AND deleted_at IS NULL',
      [departmentIds]
    );
    return r.rows.map((row) => row.id);
  } catch {
    return [];
  }
}

/**
 * Retorna condição WHERE e params para filtrar por escopo hierárquico
 * @param {Object} scope - resultado de resolveHierarchyScope
 * @param {Object} opts - { tableAlias, senderColumn, departmentColumn, createdByColumn, paramOffset }
 */
function buildWhereFromScope(scope, opts = {}) {
  const {
    tableAlias = 't',
    senderColumn = 'sender_id',
    departmentColumn = 'department_id',
    createdByColumn = 'created_by',
    paramOffset = 1
  } = opts;

  if (scope.isFullAccess) {
    return { where: '', params: [], paramOffset };
  }

  const conditions = [];
  const params = [];
  let offset = paramOffset;

  if (scope.allowedUserIds && scope.allowedUserIds.length > 0) {
    conditions.push(`(${tableAlias}.${senderColumn} = ANY($${offset}) OR ${tableAlias}.${createdByColumn} = ANY($${offset}))`);
    params.push(scope.allowedUserIds);
    offset++;
  }

  if (scope.managedDepartmentIds && scope.managedDepartmentIds.length > 0 && departmentColumn) {
    conditions.push(`(${tableAlias}.${departmentColumn} = ANY($${offset}) OR ${tableAlias}.${departmentColumn} IS NULL)`);
    params.push(scope.managedDepartmentIds);
    offset++;
  }

  if (conditions.length === 0) {
    return { where: '1=0', params: [], paramOffset: offset };
  }

  return {
    where: conditions.join(' AND '),
    params,
    paramOffset: offset
  };
}

/**
 * Para communications: filtro por sender_id, recipient_id ou recipient_department_id
 * Lógica: usuário vê comunicação se for enviador/recipiente OU se for para depto sob seu escopo
 */
function buildCommunicationsFilter(scope, companyId, opts = {}) {
  const { tableAlias = 'c', paramOffset = 1 } = opts;

  const base = `${tableAlias}.company_id = $${paramOffset}`;
  const params = [companyId];
  let offset = paramOffset + 1;

  if (scope.isFullAccess) {
    return { whereClause: base, params, paramOffset: offset };
  }

  const scopeConditions = [];

  if (scope.allowedUserIds && scope.allowedUserIds.length > 0) {
    scopeConditions.push(`(${tableAlias}.sender_id = ANY($${offset}) OR ${tableAlias}.recipient_id = ANY($${offset}))`);
    params.push(scope.allowedUserIds);
    offset++;
  }

  // Só usar department para níveis que gerenciam equipe (não para COLABORADOR)
  if (
    scope.scopeLevel !== 'individual' &&
    scope.managedDepartmentIds &&
    scope.managedDepartmentIds.length > 0
  ) {
    scopeConditions.push(`(${tableAlias}.recipient_department_id = ANY($${offset}))`);
    params.push(scope.managedDepartmentIds);
    offset++;
  }

  if (scopeConditions.length === 0) {
    return { whereClause: `${base} AND 1=0`, params, paramOffset: offset };
  }

  const scopeClause = scopeConditions.length === 1
    ? scopeConditions[0]
    : `(${scopeConditions.join(' OR ')})`;

  return {
    whereClause: `${base} AND ${scopeClause}`,
    params,
    paramOffset: offset
  };
}

/**
 * Para proposals: filtro por reporter_id (created_by) e department_id
 */
function buildProposalsFilter(scope, companyId, opts = {}) {
  const { tableAlias = 'p', paramOffset = 1 } = opts;

  const base = `${tableAlias}.company_id = $${paramOffset}`;
  const params = [companyId];
  let offset = paramOffset + 1;

  if (scope.isFullAccess) {
    return { whereClause: base, params, paramOffset: offset };
  }

  const scopeConditions = [];
  if (scope.allowedUserIds?.length > 0) {
    scopeConditions.push(`${tableAlias}.reporter_id = ANY($${offset})`);
    params.push(scope.allowedUserIds);
    offset++;
  }
  if (scope.scopeLevel !== 'individual' && scope.managedDepartmentIds?.length > 0) {
    scopeConditions.push(`${tableAlias}.department_id = ANY($${offset})`);
    params.push(scope.managedDepartmentIds);
    offset++;
  }

  if (scopeConditions.length === 0) {
    return { whereClause: `${base} AND 1=0`, params, paramOffset: offset };
  }

  const scopeClause = scopeConditions.join(' OR ');
  return {
    whereClause: `${base} AND (${scopeClause})`,
    params,
    paramOffset: offset
  };
}

module.exports = {
  resolveHierarchyScope,
  buildWhereFromScope,
  buildCommunicationsFilter,
  buildProposalsFilter,
  getDirectSubordinateIds,
  getManagedDepartmentIds
};
