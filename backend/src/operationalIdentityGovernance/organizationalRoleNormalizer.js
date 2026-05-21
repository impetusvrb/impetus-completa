'use strict';

/**
 * Mapeamento canónico cargo/função → domínio + hierarquia (Phase Z.13).
 * Não altera cadastro; normaliza leitura runtime.
 */
const CANONICAL_ROLE_MAPPINGS = Object.freeze([
  {
    id: 'coordenador_qualidade',
    patterns: [/coordenador.*qualidade/i, /quality.*coordinat/i, /coordinator.*quality/i],
    domain_axis: 'quality',
    hierarchy_tier: 'coordination',
    hierarchy_level: 3,
    functional_role: 'coordenação',
    department_hint: 'qualidade'
  },
  {
    id: 'tecnico_sst',
    patterns: [/t[eé]cnico.*sst/i, /sst.*t[eé]cnico/i, /technician.*safety/i],
    domain_axis: 'safety',
    hierarchy_tier: 'operational',
    hierarchy_level: 5,
    functional_role: 'operacional',
    department_hint: 'sst'
  },
  {
    id: 'gerente_rh',
    patterns: [/gerente.*rh/i, /hr.*manager/i, /recursos humanos.*gerente/i],
    domain_axis: 'hr',
    hierarchy_tier: 'management',
    hierarchy_level: 2,
    functional_role: 'executivo',
    department_hint: 'rh'
  },
  {
    id: 'coordenador_ambiental',
    patterns: [/coordenador.*ambient/i, /environment.*coordinat/i],
    domain_axis: 'environmental',
    hierarchy_tier: 'coordination',
    hierarchy_level: 3,
    functional_role: 'coordenação',
    department_hint: 'ambiental'
  },
  {
    id: 'operador_producao',
    patterns: [/operador/i, /operator/i],
    domain_axis: 'production',
    hierarchy_tier: 'operational',
    hierarchy_level: 5,
    functional_role: 'operacional',
    department_hint: 'produção'
  },
  {
    id: 'gerente_executivo',
    patterns: [/ceo/i, /diretor/i, /director/i, /presidente/i],
    domain_axis: 'executive',
    hierarchy_tier: 'executive',
    hierarchy_level: 1,
    functional_role: 'executivo',
    department_hint: null
  }
]);

function normalizeOrganizationalRole(user = {}, ctx = {}) {
  const blob = [
    user.job_title,
    user.cargo,
    user.function,
    user.funcao,
    ctx.job_title,
    ctx.functional_role,
    user.department,
    ctx.department
  ]
    .filter(Boolean)
    .join(' ');

  for (const row of CANONICAL_ROLE_MAPPINGS) {
    if (row.patterns.some((p) => p.test(blob))) {
      return {
        matched: true,
        mapping_id: row.id,
        domain_axis: row.domain_axis,
        hierarchy_tier: row.hierarchy_tier,
        hierarchy_level: row.hierarchy_level,
        functional_role: row.functional_role,
        department_hint: row.department_hint,
        source: 'canonical_mapping'
      };
    }
  }

  return { matched: false, source: 'unmapped' };
}

module.exports = { CANONICAL_ROLE_MAPPINGS, normalizeOrganizationalRole };
