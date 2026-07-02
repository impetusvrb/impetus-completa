'use strict';

/**
 * Perfil estrutural unificado — função (role), cargo (job_title), departamento,
 * descrição (hr_responsibilities) e cargo formal (company_roles).
 * Fonte única para dashboard, KPIs contextualizados e IA do cockpit.
 */

const db = require('../db');
const { loadRoleRow } = require('./structuralOrgContextService');
const orgIdentity = require('./organizationalIdentityEngine');
const { mergeStructuralBaseIntoUser } = require('./structuralDashboardBridge');
const { interpretProfileContext, normalizeText } = require('./profileContextInterpreter');

const ROLE_LABEL_PT = Object.freeze({
  colaborador: 'Colaborador',
  supervisor: 'Supervisor',
  coordenador: 'Coordenador',
  gerente: 'Gerente',
  diretor: 'Diretor',
  ceo: 'CEO',
  rh: 'Recursos Humanos',
  financeiro: 'Financeiro',
  admin: 'Administrador'
});

function truncate(s, n) {
  const t = (s == null ? '' : String(s)).trim();
  if (!t) return '';
  return t.length > n ? `${t.slice(0, n)}…` : t;
}

/**
 * Normaliza aliases (cargo→job_title, funcao→role) para motores de dashboard/IA.
 */
function normalizeStructuralUser(user = {}) {
  const role = String(user.role || 'colaborador').trim().toLowerCase();
  const jobTitle = String(user.job_title || user.cargo || '').trim();
  const department = String(
    user.department_resolved_name ||
      user.department_name ||
      user.department ||
      user.departamento ||
      ''
  ).trim();
  const functionalArea = String(user.functional_area || user.area || department || '').trim();
  const description = String(
    user.hr_responsibilities ||
      user.descricao_funcional ||
      user.descricao ||
      user.description ||
      user.bio ||
      ''
  ).trim();

  return {
    ...user,
    role,
    funcao: role,
    funcao_label: ROLE_LABEL_PT[role] || role,
    job_title: jobTitle || null,
    cargo: jobTitle || null,
    department: department || null,
    departamento: department || null,
    functional_area: functionalArea || null,
    area: user.area || functionalArea || null,
    hr_responsibilities: description || null,
    descricao: description || user.descricao || null
  };
}

function _formatRoleResponsibilities(roleRow) {
  if (!roleRow) return '';
  const parts = [];
  if (roleRow.name) parts.push(String(roleRow.name));
  if (roleRow.work_area) parts.push(String(roleRow.work_area));
  if (roleRow.description) parts.push(String(roleRow.description));
  const main = Array.isArray(roleRow.main_responsibilities) ? roleRow.main_responsibilities.join(' ') : '';
  const crit = Array.isArray(roleRow.critical_responsibilities) ? roleRow.critical_responsibilities.join(' ') : '';
  if (main) parts.push(main);
  if (crit) parts.push(crit);
  if (roleRow.operation_role) parts.push(String(roleRow.operation_role));
  if (roleRow.dashboard_functional_hint) parts.push(String(roleRow.dashboard_functional_hint));
  return parts.join(' ');
}

/**
 * Texto consolidado para keyword-scoring (interpretProfileContext).
 */
function buildStructuralInterpretationText(user, companyRoleRow) {
  const u = normalizeStructuralUser(user);
  const chunks = [
    u.funcao_label,
    u.role,
    u.job_title,
    u.department,
    u.functional_area,
    u.hr_responsibilities,
    u.company_role_name,
    _formatRoleResponsibilities(companyRoleRow)
  ];
  return chunks.filter(Boolean).join(' ');
}

/**
 * Resumo estruturado exposto na API (/dashboard/me).
 */
function buildStructuralProfileSummary(user, companyRoleRow, interpreted) {
  const u = normalizeStructuralUser(user);
  const interp = interpreted || interpretProfileContext({ ...u, _structural_interpretation_text: buildStructuralInterpretationText(u, companyRoleRow) });
  return {
    funcao: u.role,
    funcao_label: u.funcao_label,
    cargo: u.job_title || u.cargo || null,
    departamento:
      u.sector_resolved_name && u.department_resolved_name
        ? `${u.department_resolved_name} · ${u.sector_resolved_name}`
        : u.department || u.functional_area || null,
    setor: u.sector_resolved_name || u.setor || null,
    area_funcional: u.functional_area || null,
    descricao: u.hr_responsibilities ? truncate(u.hr_responsibilities, 500) : null,
    descricao_usada_no_motor: interp.signals?.used_description === true,
    dashboard_profile: u.dashboard_profile || null,
    cargo_estrutural: companyRoleRow
      ? {
          id: companyRoleRow.id,
          nome: companyRoleRow.name || null,
          area_atuacao: companyRoleRow.work_area || null,
          nivel_hierarquia: companyRoleRow.hierarchy_level ?? null
        }
      : u.company_role_id
        ? { id: u.company_role_id, nome: u.company_role_name || null }
        : null,
    eixo_primario: interp.primary_axis || null,
    eixos: Array.isArray(interp.axes) ? interp.axes.slice(0, 6) : [],
    responsabilidades_detectadas: Array.isArray(interp.responsibilities) ? interp.responsibilities : [],
    confianca_interpretacao: interp.confidence ?? null
  };
}

/**
 * Bloco curto para prompts de IA (dashboard chat, resumos).
 */
function buildStructuralAiPromptBlock(summary) {
  if (!summary) return '';
  const lines = [
    '## Perfil estrutural do utilizador (autoridade para personalizar resposta)',
    `- Função (role): ${summary.funcao_label || summary.funcao || 'n/d'}`,
    summary.cargo ? `- Cargo: ${summary.cargo}` : null,
    summary.departamento ? `- Departamento / setor: ${summary.departamento}` : null,
    summary.area_funcional ? `- Área funcional: ${summary.area_funcional}` : null,
    summary.descricao ? `- O que faz (descrição): ${summary.descricao}` : null,
    summary.cargo_estrutural?.nome ? `- Cargo formal (Base Estrutural): ${summary.cargo_estrutural.nome}` : null,
    summary.eixo_primario ? `- Eixo operacional principal: ${summary.eixo_primario.replace('eixo_', '')}` : null,
    summary.responsabilidades_detectadas?.length
      ? `- Focos detectados: ${summary.responsabilidades_detectadas.join(', ')}`
      : null,
    'Responda com indicadores, alertas e linguagem adequados a esta função. Não trate o utilizador como perfil genérico se os dados acima forem específicos.'
  ].filter(Boolean);
  return `${lines.join('\n')}\n`;
}

/**
 * Carrega campos de BD + cargo formal e devolve utilizador enriquecido.
 */
async function enrichUserForDashboardAsync(user) {
  if (!user) return normalizeStructuralUser({});
  let merged = normalizeStructuralUser(user);

  if (user.id) {
    try {
      const extra = await db.query(
        `SELECT u.role, u.job_title, u.department, u.functional_area, u.hr_responsibilities,
                u.dashboard_profile, u.company_role_id, u.hierarchy_level, u.area,
                u.department_id,
                cr.name AS company_role_name, cr.dashboard_functional_hint,
                cr.hierarchy_level AS company_role_hierarchy_level,
                d.name AS department_resolved_name
         FROM users u
         LEFT JOIN company_roles cr ON cr.id = u.company_role_id AND cr.company_id = u.company_id
         LEFT JOIN departments d ON d.id = u.department_id
         WHERE u.id = $1`,
        [user.id]
      );
      if (extra.rows?.length) {
        merged = normalizeStructuralUser({ ...merged, ...extra.rows[0] });
      }
    } catch (err) {
      console.warn('[STRUCTURAL_PROFILE] users load:', err.message);
    }
  }

  let companyRoleRow = null;
  if (merged.company_id && merged.company_role_id) {
    try {
      companyRoleRow = await orgIdentity.loadEnrichedRole(merged.company_id, merged.company_role_id);
      if (!companyRoleRow) {
        companyRoleRow = await loadRoleRow(merged.company_id, merged.company_role_id);
      }
    } catch (err) {
      console.warn('[STRUCTURAL_PROFILE] company_role:', err.message);
    }
  }

  merged = mergeStructuralBaseIntoUser(merged, companyRoleRow);

  const interpretationText = buildStructuralInterpretationText(merged, companyRoleRow);
  merged._structural_interpretation_text = interpretationText;
  merged.structural_profile = buildStructuralProfileSummary(merged, companyRoleRow);
  if (companyRoleRow) {
    merged.structural_profile.departamento_oficial = companyRoleRow.department_name || null;
    merged.structural_profile.setor_oficial = companyRoleRow.sector_name || null;
    merged.structural_profile.structural_complete =
      !!(merged.company_role_id && companyRoleRow.department_id && companyRoleRow.sector_id);
  }

  const hierarchyResolver = require('./hierarchyResolver');
  merged = hierarchyResolver.applyCanonicalHierarchy(merged);

  return merged;
}

module.exports = {
  ROLE_LABEL_PT,
  normalizeStructuralUser,
  buildStructuralInterpretationText,
  buildStructuralProfileSummary,
  buildStructuralAiPromptBlock,
  enrichUserForDashboardAsync
};
