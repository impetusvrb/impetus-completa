'use strict';

/**
 * Motor de contexto organizacional legítimo — espelho do cadastro real.
 * Pipeline: utilizador autenticado → gestão de usuários (BD) → base estrutural (company_roles).
 * Proíbe títulos compostos artificiais na identidade exibida ao utilizador.
 */

const db = require('../db');
const structuralUserProfileService = require('./structuralUserProfileService');
const { loadRoleRow } = require('./structuralOrgContextService');
const { ROLE_LABEL_PT } = structuralUserProfileService;

const SLASH_PATTERN = /\s*\/\s*/;
const ARTIFICIAL_TITLE_PATTERNS = [
  /^ceo\s*\/\s*/i,
  /^diretor\s*\/\s*/i,
  /executivo\s*\/\s*supervisor/i,
  /supervisor\s*\/\s*industrial/i,
  /gestor\s+operacional\s+executivo/i
];

function isArtificialCombinedTitle(text) {
  const t = String(text || '').trim();
  if (!t) return false;
  if (!SLASH_PATTERN.test(t)) return false;
  return ARTIFICIAL_TITLE_PATTERNS.some((p) => p.test(t)) || t.split('/').length > 2;
}

/**
 * Escolhe o cargo oficial: prioridade Base Estrutural (company_roles.name).
 */
function resolveOfficialCargo(user, companyRoleRow) {
  const structural = companyRoleRow?.name ? String(companyRoleRow.name).trim() : '';
  const jobTitle = user?.job_title ? String(user.job_title).trim() : '';

  if (structural) return structural;
  if (jobTitle && !isArtificialCombinedTitle(jobTitle)) return jobTitle;
  if (jobTitle) return jobTitle;
  return null;
}

/**
 * Função organizacional: operation_role da base estrutural ou descrição curta — nunca o label do perfil dashboard.
 */
function resolveOrganizationalFunction(user, companyRoleRow) {
  if (companyRoleRow?.operation_role) {
    return String(companyRoleRow.operation_role).trim();
  }
  const desc = companyRoleRow?.description ? String(companyRoleRow.description).trim() : '';
  if (desc && desc.length <= 120) return desc;
  const hr = user?.hr_responsibilities ? String(user.hr_responsibilities).trim() : '';
  if (hr) {
    const first = hr.split(/[.\n]/).map((s) => s.trim()).find(Boolean);
    if (first && first.length <= 160) return first;
  }
  return null;
}

/**
 * Função no sistema (role cadastrado) — separada do cargo.
 */
function resolveSystemRoleLabel(user) {
  const role = String(user?.role || '').trim().toLowerCase();
  return ROLE_LABEL_PT[role] || (role ? role.replace(/_/g, ' ') : null);
}

const AREA_LABELS = {
  production: 'Produção',
  maintenance: 'Manutenção',
  quality: 'Qualidade',
  operations: 'Operações',
  pcp: 'PCP',
  hr: 'RH',
  finance: 'Financeiro',
  admin: 'Administração'
};

function resolveAreaFuncionalLabel(functionalArea) {
  const fa = functionalArea != null && functionalArea !== '' ? String(functionalArea).toLowerCase() : '';
  return AREA_LABELS[fa] || (fa || null);
}

/**
 * Valida coerência do contexto — não bloqueia renderização leve; sinaliza inconsistências.
 */
function validateOrganizationalContext(ctx) {
  const issues = [];
  const warnings = [];

  if (!ctx.nome) issues.push({ code: 'missing_name', message: 'Nome do utilizador não configurado.' });
  if (!ctx.cargo) issues.push({ code: 'missing_cargo', message: 'Cargo não configurado (Base Estrutural ou cadastro).' });
  if (!ctx.departamento && !ctx.setor) {
    warnings.push({ code: 'missing_department', message: 'Departamento/setor não vinculado no cadastro.' });
  }

  if (ctx.job_title_raw && isArtificialCombinedTitle(ctx.job_title_raw) && ctx.cargo_estrutural_nome) {
    warnings.push({
      code: 'artificial_job_title',
      message: 'Campo cargo no cadastro usa combinação artificial; exibição usa o cargo da Base Estrutural.'
    });
  }

  if (ctx.cargo && isArtificialCombinedTitle(ctx.cargo) && !ctx.cargo_estrutural_nome) {
    issues.push({ code: 'artificial_cargo', message: 'Cargo com nomenclatura composta inválida; configure o cargo na Base Estrutural.' });
  }

  if (ctx.hierarchy_level != null && ctx.funcao_sistema) {
    const role = String(ctx.role || '').toLowerCase();
    if (ctx.hierarchy_level >= 5 && ['ceo', 'diretor', 'gerente'].includes(role)) {
      warnings.push({
        code: 'hierarchy_role_mismatch',
        message: 'Nível hierárquico inconsistente com a função declarada.'
      });
    }
  }

  const critical = issues.length > 0;
  return {
    valid: !critical,
    issues,
    warnings,
    validation_message: critical
      ? 'Dados estruturais inconsistentes ou não configurados.'
      : null
  };
}

/**
 * Pipeline principal — deve ser chamada antes de personalizar dashboard/IA.
 * @param {object} user — req.user (id + company_id mínimo)
 * @returns {Promise<object>}
 */
async function buildOrganizationalContext(user) {
  if (!user?.id) {
    return {
      valid: false,
      validation_message: 'Dado estrutural não configurado',
      issues: [{ code: 'no_user', message: 'Utilizador não identificado.' }]
    };
  }

  const enriched = await structuralUserProfileService.enrichUserForDashboardAsync(user);
  let companyRoleRow = null;
  if (enriched.company_id && enriched.company_role_id) {
    companyRoleRow = await loadRoleRow(enriched.company_id, enriched.company_role_id);
  }

  let departmentName = companyRoleRow?.department_name
    || enriched.department_resolved_name
    || enriched.department
    || null;
  if (!departmentName && enriched.department_id) {
    try {
      const dr = await db.query('SELECT name FROM departments WHERE id = $1 LIMIT 1', [enriched.department_id]);
      departmentName = dr.rows?.[0]?.name || null;
    } catch {
      /* ignore */
    }
  }
  const sectorName = companyRoleRow?.sector_name || null;

  const cargo = resolveOfficialCargo(enriched, companyRoleRow);
  const funcaoOrganizacional = resolveOrganizationalFunction(enriched, companyRoleRow);
  const funcaoSistema = resolveSystemRoleLabel(enriched);
  const departamento = departmentName;
  const setor = sectorName || departmentName;
  const areaFuncional = enriched.functional_area || null;
  const areaLabel = resolveAreaFuncionalLabel(areaFuncional);

  const ctx = {
    user_id: enriched.id,
    company_id: enriched.company_id,
    nome: enriched.name || enriched.email?.split('@')[0] || null,
    email: enriched.email || null,
    cargo,
    funcao_organizacional: funcaoOrganizacional,
    funcao_sistema: funcaoSistema,
    setor,
    departamento,
    area_funcional: areaFuncional,
    area_funcional_label: areaLabel,
    hierarchy_level: enriched.hierarchy_level ?? null,
    role: enriched.role || null,
    company_role_id: enriched.company_role_id || null,
    cargo_estrutural_nome: companyRoleRow?.name || null,
    cargo_estrutural_id: companyRoleRow?.id || null,
    cargo_estrutural_codigo: companyRoleRow?.internal_code || null,
    setor_estrutural: sectorName,
    departamento_estrutural: companyRoleRow?.department_name || null,
    job_title_raw: enriched.job_title || null,
    descricao_funcional: enriched.hr_responsibilities
      ? String(enriched.hr_responsibilities).trim().slice(0, 500)
      : null,
    unidade: enriched.plant_name || enriched.unit_name || null,
    structural_profile: enriched.structural_profile || null,
    source: companyRoleRow ? 'user_management_and_structural_base' : 'user_management_only',
    loaded_at: new Date().toISOString()
  };

  const validation = validateOrganizationalContext(ctx);
  return {
    ...ctx,
    ...validation,
    display: {
      nome: ctx.nome,
      cargo: ctx.cargo || 'Dado estrutural não configurado',
      funcao: ctx.funcao_organizacional || ctx.funcao_sistema || 'Dado estrutural não configurado',
      funcao_sistema: ctx.funcao_sistema,
      setor: ctx.setor || 'Dado estrutural não configurado',
      departamento: ctx.departamento || 'Dado estrutural não configurado',
      area_funcional: ctx.area_funcional_label || null,
      hierarchy_level: ctx.hierarchy_level,
      unidade: ctx.unidade
    }
  };
}

module.exports = {
  buildOrganizationalContext,
  validateOrganizationalContext,
  resolveOfficialCargo,
  isArtificialCombinedTitle
};
