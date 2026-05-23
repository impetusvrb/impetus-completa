/**
 * organizationalIdentityEngine — Engine de Identidade Organizacional
 *
 * Núcleo do cadastro de cargos: validação relacional, código interno,
 * enriquecimento para IA, dashboard e governança.
 */
'use strict';

const db = require('../db');
const { isValidUUID } = require('../utils/security');

const HIERARCHY_LEVELS = Object.freeze([
  { value: 0, label: 'Presidência', code: 'PRES' },
  { value: 1, label: 'Diretoria', code: 'DIR' },
  { value: 2, label: 'Gerência', code: 'GER' },
  { value: 3, label: 'Coordenação', code: 'COORD' },
  { value: 4, label: 'Supervisão', code: 'SUP' },
  { value: 5, label: 'Operacional', code: 'OP' }
]);

const OPERATIONAL_SCOPES = Object.freeze(['estrategico', 'tatico', 'operacional', 'corporativo']);
const CRITICALITY_LEVELS = Object.freeze(['baixo', 'medio', 'alto', 'critico']);
const SENSITIVITY_LEVELS = Object.freeze(['publico_interno', 'restrito', 'confidencial', 'executivo']);
const MAX_SCOPE_LIMITS = Object.freeze([
  'proprio_setor',
  'proprio_departamento',
  'unidade_inteira',
  'empresa_inteira'
]);

function slugCodePart(name) {
  return String(name || 'CARGO')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 14) || 'CARGO';
}

function hierarchyCode(level) {
  const n = Number(level);
  const hit = HIERARCHY_LEVELS.find((h) => h.value === n);
  return hit ? hit.code : 'CRG';
}

/**
 * Gera código interno único por empresa (ex.: DIR_EXEC_001).
 */
async function generateInternalCode(companyId, name, hierarchyLevel) {
  const base = `${hierarchyCode(hierarchyLevel)}_${slugCodePart(name)}`;
  for (let seq = 1; seq <= 999; seq += 1) {
    const code = `${base}_${String(seq).padStart(3, '0')}`.slice(0, 40);
    const r = await db.query(
      `SELECT 1 FROM company_roles
       WHERE company_id = $1 AND internal_code = $2 AND active = true LIMIT 1`,
      [companyId, code]
    );
    if (!r.rows.length) return code;
  }
  return `${base}_${Date.now().toString(36).toUpperCase()}`.slice(0, 40);
}

async function assertDepartmentBelongs(companyId, departmentId) {
  if (!departmentId || !isValidUUID(String(departmentId))) {
    return { ok: false, error: 'Departamento principal é obrigatório (cadastro oficial).' };
  }
  const r = await db.query(
    `SELECT id, name, description FROM departments
     WHERE id = $1 AND company_id = $2 AND active = true`,
    [departmentId, companyId]
  );
  if (!r.rows.length) {
    return { ok: false, error: 'Departamento inválido ou inativo.' };
  }
  return { ok: true, row: r.rows[0] };
}

async function assertSectorBelongs(companyId, sectorId, departmentId) {
  if (!sectorId || !isValidUUID(String(sectorId))) {
    return { ok: false, error: 'Setor principal é obrigatório (cadastro oficial).' };
  }
  const r = await db.query(
    `SELECT id, name, description, department_id FROM company_sectors
     WHERE id = $1 AND company_id = $2 AND active = true`,
    [sectorId, companyId]
  );
  if (!r.rows.length) {
    return { ok: false, error: 'Setor inválido ou inativo.' };
  }
  if (departmentId && String(r.rows[0].department_id) !== String(departmentId)) {
    return {
      ok: false,
      error: 'O setor selecionado não pertence ao departamento informado.'
    };
  }
  return { ok: true, row: r.rows[0] };
}

async function assertOrganizationalUnit(companyId, unitId) {
  if (!unitId) return { ok: true, row: null };
  if (!isValidUUID(String(unitId))) {
    return { ok: false, error: 'Unidade organizacional inválida.' };
  }
  const r = await db.query(
    `SELECT id, name, unit_type FROM organizational_units
     WHERE id = $1 AND company_id = $2 AND active = true`,
    [unitId, companyId]
  );
  if (!r.rows.length) {
    return { ok: false, error: 'Unidade organizacional inválida ou inativa.' };
  }
  return { ok: true, row: r.rows[0] };
}

async function assertSuperiorRole(companyId, superiorId, selfId, hierarchyLevel) {
  if (!superiorId) return { ok: true, row: null };
  if (!isValidUUID(String(superiorId))) {
    return { ok: false, error: 'Cargo superior direto inválido.' };
  }
  if (selfId && String(superiorId) === String(selfId)) {
    return { ok: false, error: 'Um cargo não pode ser superior de si mesmo.' };
  }
  const r = await db.query(
    `SELECT id, name, hierarchy_level, direct_superior_role_id
     FROM company_roles WHERE id = $1 AND company_id = $2 AND active = true`,
    [superiorId, companyId]
  );
  if (!r.rows.length) {
    return { ok: false, error: 'Cargo superior direto não encontrado.' };
  }
  const supLevel = r.rows[0].hierarchy_level;
  const myLevel = hierarchyLevel;
  if (supLevel != null && myLevel != null && supLevel >= myLevel) {
    return {
      ok: false,
      error: 'O cargo superior deve estar em nível hierárquico acima (número menor).'
    };
  }
  if (selfId) {
    const cycle = await db.query(
      `WITH RECURSIVE chain AS (
         SELECT id, direct_superior_role_id, 1 AS depth
         FROM company_roles WHERE id = $1 AND company_id = $2
         UNION ALL
         SELECT cr.id, cr.direct_superior_role_id, chain.depth + 1
         FROM company_roles cr
         INNER JOIN chain ON cr.id = chain.direct_superior_role_id
         WHERE chain.depth < 20 AND cr.company_id = $2
       )
       SELECT 1 FROM chain WHERE id = $3 LIMIT 1`,
      [superiorId, companyId, selfId]
    );
    if (cycle.rows.length) {
      return { ok: false, error: 'Hierarquia circular detectada no cargo superior.' };
    }
  }
  return { ok: true, row: r.rows[0] };
}

function truncateVarchar(value, maxLen) {
  const t = String(value || '').trim();
  if (!t) return null;
  return t.length > maxLen ? t.slice(0, maxLen) : t;
}

/** Separa texto longo (colunas TEXT) de rótulo curto (varchar 80). */
function splitParticipationFields(shortField, longField, maxLen = 80) {
  const shortRaw = String(shortField || '').trim();
  const longRaw = String(longField || '').trim();
  if (longRaw) {
    return {
      longText: longRaw,
      shortLabel: truncateVarchar(shortRaw, maxLen)
    };
  }
  if (shortRaw.length > maxLen) {
    return { longText: shortRaw, shortLabel: null };
  }
  return { longText: shortRaw || null, shortLabel: shortRaw || null };
}

function normalizeRoleBody(body) {
  const b = body && typeof body === 'object' ? { ...body } : {};
  const bool = (v, def = false) => {
    if (v === true || v === 'true' || v === 1 || v === '1') return true;
    if (v === false || v === 'false' || v === 0 || v === '0') return false;
    return def;
  };
  const arr = (v) => {
    if (v == null || v === '') return [];
    if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
    return String(v).split(/[\n,]/).map((x) => x.trim()).filter(Boolean);
  };
  const hl = b.hierarchy_level;
  const hierarchyLevel =
    hl === '' || hl === undefined || hl === null
      ? null
      : Math.max(0, Math.min(5, parseInt(hl, 10)));

  return {
    name: String(b.name || '').trim(),
    description: b.description != null ? String(b.description).trim() : null,
    hierarchy_level: Number.isFinite(hierarchyLevel) ? hierarchyLevel : null,
    work_area: b.work_area != null ? String(b.work_area).trim() : null,
    department_id: b.department_id || null,
    sector_id: b.sector_id || null,
    organizational_unit_id: b.organizational_unit_id || null,
    direct_superior_role_id: b.direct_superior_role_id || null,
    operational_scope: b.operational_scope ? String(b.operational_scope).trim().toLowerCase() : null,
    organizational_function: b.organizational_function != null
      ? String(b.organizational_function).trim()
      : (b.description != null ? String(b.description).trim() : null),
    operational_context: b.operational_context != null ? String(b.operational_context).trim() : null,
    criticality_level: b.criticality_level ? String(b.criticality_level).trim().toLowerCase() : null,
    main_responsibilities: arr(b.main_responsibilities),
    critical_responsibilities: arr(b.critical_responsibilities),
    recommended_permissions: arr(b.recommended_permissions),
    approval_domains: arr(b.approval_domains),
    ...(() => {
      const ap = splitParticipationFields(
        b.approval_participation_role,
        b.approval_role,
        80
      );
      const es = splitParticipationFields(
        b.escalation_participation_role,
        b.escalation_role,
        80
      );
      return {
        approval_role: ap.longText,
        approval_participation_role: ap.shortLabel,
        escalation_role: es.longText,
        escalation_participation_role: es.shortLabel
      };
    })(),
    operation_role: b.operation_role != null ? String(b.operation_role).trim() : null,
    leadership_type: b.leadership_type != null ? String(b.leadership_type).trim() : null,
    communication_profile: b.communication_profile != null
      ? String(b.communication_profile).trim()
      : null,
    decision_level: b.decision_level != null ? String(b.decision_level).trim() : null,
    decision_frequency: b.decision_frequency != null ? String(b.decision_frequency).trim() : null,
    visible_themes: arr(b.visible_themes),
    hidden_themes: arr(b.hidden_themes),
    sensitivity_level: b.sensitivity_level ? String(b.sensitivity_level).trim().toLowerCase() : null,
    access_strategic_data: bool(b.access_strategic_data),
    access_financial_data: bool(b.access_financial_data),
    access_hr_data: bool(b.access_hr_data),
    access_critical_indicators: bool(b.access_critical_indicators),
    requires_document_validation: bool(b.requires_document_validation),
    requires_hierarchical_approval: bool(b.requires_hierarchical_approval),
    allow_manual_creation: bool(b.allow_manual_creation, true),
    can_view_other_departments: bool(b.can_view_other_departments),
    max_scope_limit: b.max_scope_limit ? String(b.max_scope_limit).trim().toLowerCase() : null,
    dashboard_functional_hint:
      b.dashboard_functional_hint != null && String(b.dashboard_functional_hint).trim() !== ''
        ? String(b.dashboard_functional_hint).trim().slice(0, 32)
        : null,
    notes: b.notes != null ? String(b.notes).trim() : null,
    internal_code: b.internal_code ? String(b.internal_code).trim().toUpperCase() : null
  };
}

/**
 * Valida payload de cargo antes de persistir.
 */
async function validateRolePayload(companyId, body, opts = {}) {
  const errors = [];
  const normalized = normalizeRoleBody(body);
  const roleId = opts.roleId || null;
  const strictStructural = opts.strictStructural !== false;

  if (!normalized.name || normalized.name.length < 2) {
    errors.push({ path: 'name', message: 'Nome do cargo é obrigatório (mín. 2 caracteres).' });
  }
  if (normalized.hierarchy_level === null || Number.isNaN(normalized.hierarchy_level)) {
    errors.push({ path: 'hierarchy_level', message: 'Nível hierárquico é obrigatório.' });
  }

  let dept = { ok: true, row: null };
  let sec = { ok: true, row: null };
  if (strictStructural) {
    dept = await assertDepartmentBelongs(companyId, normalized.department_id);
    if (!dept.ok) errors.push({ path: 'department_id', message: dept.error });
    sec = await assertSectorBelongs(
      companyId,
      normalized.sector_id,
      normalized.department_id
    );
    if (!sec.ok) errors.push({ path: 'sector_id', message: sec.error });
  }

  const unit = await assertOrganizationalUnit(companyId, normalized.organizational_unit_id);
  if (!unit.ok) errors.push({ path: 'organizational_unit_id', message: unit.error });

  const sup = await assertSuperiorRole(
    companyId,
    normalized.direct_superior_role_id,
    roleId,
    normalized.hierarchy_level
  );
  if (!sup.ok) errors.push({ path: 'direct_superior_role_id', message: sup.error });

  if (
    normalized.operational_scope &&
    !OPERATIONAL_SCOPES.includes(normalized.operational_scope)
  ) {
    errors.push({ path: 'operational_scope', message: 'Escopo operacional inválido.' });
  }
  if (
    normalized.criticality_level &&
    !CRITICALITY_LEVELS.includes(normalized.criticality_level)
  ) {
    errors.push({ path: 'criticality_level', message: 'Grau de criticidade inválido.' });
  }
  if (
    normalized.sensitivity_level &&
    !SENSITIVITY_LEVELS.includes(normalized.sensitivity_level)
  ) {
    errors.push({ path: 'sensitivity_level', message: 'Nível de sensibilidade inválido.' });
  }
  if (normalized.max_scope_limit && !MAX_SCOPE_LIMITS.includes(normalized.max_scope_limit)) {
    errors.push({ path: 'max_scope_limit', message: 'Limite de escopo inválido.' });
  }

  if (errors.length) {
    return { ok: false, errors, normalized };
  }
  return { ok: true, normalized, department: dept?.row, sector: sec?.row, unit: unit.row, superior: sup.row };
}

/**
 * Carrega cargo enriquecido com departamento, setor, unidade e subordinados.
 */
async function loadEnrichedRole(companyId, roleId) {
  if (!roleId || !companyId) return null;
  try {
    const r = await db.query(
      `SELECT r.*,
              d.name AS department_name, d.description AS department_description,
              s.name AS sector_name, s.description AS sector_description,
              ou.name AS organizational_unit_name, ou.unit_type AS organizational_unit_type,
              sup.name AS direct_superior_name
       FROM company_roles r
       LEFT JOIN departments d ON d.id = r.department_id AND d.company_id = r.company_id
       LEFT JOIN company_sectors s ON s.id = r.sector_id AND s.company_id = r.company_id
       LEFT JOIN organizational_units ou ON ou.id = r.organizational_unit_id AND ou.company_id = r.company_id
       LEFT JOIN company_roles sup ON sup.id = r.direct_superior_role_id
       WHERE r.id = $1 AND r.company_id = $2`,
      [roleId, companyId]
    );
    const row = r.rows[0];
    if (!row) return null;
    const subs = await db.query(
      `SELECT id, name, internal_code, hierarchy_level
       FROM company_roles
       WHERE company_id = $1 AND active = true AND direct_superior_role_id = $2
       ORDER BY hierarchy_level NULLS LAST, name`,
      [companyId, roleId]
    );
    row.subordinate_roles = subs.rows || [];
    return row;
  } catch (e) {
    console.warn('[ORG_IDENTITY_ENGINE] loadEnrichedRole:', e.message);
    return null;
  }
}

function buildIdentityPromptBlock(enriched) {
  if (!enriched) return '';
  const lines = [];
  lines.push('## Identidade organizacional oficial (Base Estrutural)');
  if (enriched.internal_code) lines.push(`- Código interno: ${enriched.internal_code}`);
  lines.push(`- Cargo: ${enriched.name}`);
  if (enriched.department_name) {
    lines.push(`- Departamento: ${enriched.department_name}`);
  }
  if (enriched.sector_name) {
    lines.push(`- Setor: ${enriched.sector_name}`);
  }
  if (enriched.organizational_unit_name) {
    lines.push(`- Unidade: ${enriched.organizational_unit_name}`);
  }
  if (enriched.direct_superior_name) {
    lines.push(`- Superior direto: ${enriched.direct_superior_name}`);
  }
  if (enriched.organizational_function) {
    lines.push(`- Função organizacional: ${enriched.organizational_function}`);
  }
  if (enriched.operational_context) {
    lines.push(`- Contexto operacional: ${enriched.operational_context}`);
  }
  if (Array.isArray(enriched.subordinate_roles) && enriched.subordinate_roles.length) {
    lines.push(
      `- Cargos subordinados: ${enriched.subordinate_roles.map((s) => s.name).join(', ')}`
    );
  }
  return lines.join('\n');
}

module.exports = {
  HIERARCHY_LEVELS,
  OPERATIONAL_SCOPES,
  CRITICALITY_LEVELS,
  SENSITIVITY_LEVELS,
  MAX_SCOPE_LIMITS,
  normalizeRoleBody,
  validateRolePayload,
  generateInternalCode,
  loadEnrichedRole,
  buildIdentityPromptBlock,
  assertDepartmentBelongs,
  assertSectorBelongs
};
