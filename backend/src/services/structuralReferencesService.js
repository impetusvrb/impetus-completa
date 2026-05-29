'use strict';

/**
 * Referências da Base Estrutural — dropdowns do cadastro de cargos.
 * Consultas isoladas (allSettled), filtro por company_id e bootstrap de unidade matriz.
 */
const db = require('../db');
const orgIdentity = require('./organizationalIdentityEngine');

async function safeQuery(label, sql, params) {
  try {
    const r = await db.query(sql, params);
    return { ok: true, rows: r.rows || [] };
  } catch (err) {
    if (err.code === '42P01') {
      return { ok: true, rows: [], skipped: true };
    }
    console.warn(`[STRUCTURAL_REFERENCES] ${label}:`, err.message);
    return { ok: false, rows: [], error: err.message };
  }
}

/**
 * Garante ao menos uma unidade organizacional ativa (matriz) por empresa.
 * Necessário para dropdown e governança multi-site sem cadastro circular com setor.
 */
async function ensureDefaultOrganizationalUnit(companyId) {
  if (!companyId) return null;
  const existing = await safeQuery(
    'organizational_units_check',
    `SELECT id, name, unit_type FROM organizational_units
     WHERE company_id = $1 AND active = true ORDER BY name LIMIT 1`,
    [companyId]
  );
  if (existing.rows.length) return existing.rows[0];

  const companyRow = await safeQuery(
    'company_name',
    'SELECT name, trade_name FROM companies WHERE id = $1 LIMIT 1',
    [companyId]
  );
  const baseName =
    companyRow.rows[0]?.trade_name?.trim() ||
    companyRow.rows[0]?.name?.trim() ||
    'Empresa';
  const unitName = `${baseName} — Matriz`;

  try {
    const ins = await db.query(
      `INSERT INTO organizational_units (company_id, name, code, unit_type, description)
       VALUES ($1, $2, 'MATRIZ', 'matriz', $3)
       RETURNING id, name, unit_type`,
      [companyId, unitName, 'Unidade principal gerada automaticamente para cadastro estrutural.']
    );
    if (ins.rows[0]) return ins.rows[0];
  } catch (err) {
    if (err.code !== '42P01') {
      console.warn('[STRUCTURAL_REFERENCES] ensureDefaultOrganizationalUnit:', err.message);
    }
    return null;
  }

  const again = await safeQuery(
    'organizational_units_recheck',
    `SELECT id, name, unit_type FROM organizational_units
     WHERE company_id = $1 AND active = true ORDER BY name LIMIT 1`,
    [companyId]
  );
  return again.rows[0] || null;
}

/**
 * Carrega todas as referências para formulários da Base Estrutural.
 */
async function loadStructuralReferences(companyId) {
  if (!companyId) {
    return { ok: false, error: 'Empresa não identificada', data: null };
  }

  await ensureDefaultOrganizationalUnit(companyId);

  const tasks = await Promise.all([
    safeQuery(
      'departments',
      'SELECT id, name FROM departments WHERE company_id = $1 AND active = true ORDER BY name',
      [companyId]
    ),
    safeQuery(
      'production_lines',
      'SELECT id, name, code FROM production_lines WHERE company_id = $1 AND active = true ORDER BY name',
      [companyId]
    ),
    safeQuery(
      'processes',
      'SELECT id, name FROM company_processes WHERE company_id = $1 AND active = true ORDER BY name',
      [companyId]
    ),
    safeQuery(
      'products',
      'SELECT id, name, code FROM company_products WHERE company_id = $1 AND active = true ORDER BY name',
      [companyId]
    ),
    safeQuery(
      'assets',
      'SELECT id, name, code_patrimonial FROM assets WHERE company_id = $1 AND active = true ORDER BY name',
      [companyId]
    ),
    safeQuery(
      'users',
      `SELECT id, name, role FROM users
       WHERE company_id = $1 AND active = true AND deleted_at IS NULL ORDER BY name`,
      [companyId]
    ),
    safeQuery(
      'roles',
      `SELECT id, name, hierarchy_level FROM company_roles
       WHERE company_id = $1 AND active = true ORDER BY hierarchy_level NULLS LAST, name`,
      [companyId]
    ),
    safeQuery(
      'shifts',
      `SELECT id, name FROM shifts WHERE company_id = $1 AND active = true
       ORDER BY start_time NULLS LAST`,
      [companyId]
    ),
    safeQuery(
      'checklists',
      'SELECT id, name FROM checklist_templates WHERE company_id = $1 ORDER BY name',
      [companyId]
    ),
    safeQuery(
      'sectors',
      `SELECT id, name, department_id::text AS department_id FROM company_sectors
       WHERE company_id = $1 AND active = true ORDER BY name`,
      [companyId]
    ),
    safeQuery(
      'organizational_units',
      `SELECT id, name, unit_type FROM organizational_units
       WHERE company_id = $1 AND active = true ORDER BY name`,
      [companyId]
    )
  ]);

  const [
    depts,
    lines,
    processes,
    products,
    assets,
    users,
    roles,
    shifts,
    checklists,
    sectors,
    units
  ] = tasks;

  const failed = tasks.filter((t) => t.ok === false);
  const data = {
    departments: depts.rows,
    productionLines: lines.rows,
    processes: processes.rows,
    products: products.rows,
    assets: assets.rows,
    users: users.rows,
    roles: roles.rows,
    shifts: shifts.rows,
    checklists: checklists.rows,
    sectors: sectors.rows.map((row) => ({
      ...row,
      department_id: row.department_id != null ? String(row.department_id) : null
    })),
    organizationalUnits: units.rows,
    hierarchyLevels: orgIdentity.HIERARCHY_LEVELS,
    operationalScopes: orgIdentity.OPERATIONAL_SCOPES,
    criticalityLevels: orgIdentity.CRITICALITY_LEVELS,
    sensitivityLevels: orgIdentity.SENSITIVITY_LEVELS,
    maxScopeLimits: orgIdentity.MAX_SCOPE_LIMITS,
    functionalAreas: [
      { id: 'executive', label: 'Diretoria / Executivo' },
      { id: 'operations', label: 'Operações' },
      { id: 'finance', label: 'Financeiro' },
      { id: 'hr', label: 'RH / Pessoas' },
      { id: 'production', label: 'Produção' },
      { id: 'maintenance', label: 'Manutenção' },
      { id: 'quality', label: 'Qualidade' },
      { id: 'environmental', label: 'Meio Ambiente' },
      { id: 'logistics', label: 'Logística' }
    ],
    _meta: {
      sectorsCount: sectors.rows.length,
      organizationalUnitsCount: units.rows.length,
      departmentsCount: depts.rows.length,
      partialErrors: failed.map((f) => f.error).filter(Boolean)
    }
  };

  return {
    ok: failed.length === 0 || depts.rows.length > 0,
    data,
    error: failed.length ? 'Algumas referências não puderam ser carregadas.' : null
  };
}

module.exports = {
  loadStructuralReferences,
  ensureDefaultOrganizationalUnit,
  safeQuery
};
