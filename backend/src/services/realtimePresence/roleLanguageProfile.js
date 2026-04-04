/**
 * Perfis de linguagem e postura por hierarquia — IMPETUS decide; Akool só renderiza.
 */

const ROLE_TIER = {
  ceo: 'ceo',
  director: 'director',
  manager: 'manager',
  supervisor: 'supervisor',
  operational: 'operational',
  unknown: 'unknown'
};

function normalizeRole(user) {
  const r = String(user?.role || '').toLowerCase();
  const title = String(user?.job_title || user?.cargo || '').toLowerCase();
  const dept = String(user?.department || '').toLowerCase();

  if (r === 'ceo' || /chief executive|presidente|diretor geral/i.test(title)) return ROLE_TIER.ceo;
  if (r === 'gerente' || /diretor|director/i.test(title) || r === 'director') {
    return /diretor de|director/i.test(title) ? ROLE_TIER.director : ROLE_TIER.manager;
  }
  if (r === 'coordenador' || r === 'supervisor' || /supervisor|coordenador/i.test(title)) {
    return ROLE_TIER.supervisor;
  }
  if (r === 'operador' || r === 'colaborador' || r === 'mecanico' || r === 'eletricista') {
    return ROLE_TIER.operational;
  }
  if (dept && !title) return ROLE_TIER.operational;
  return ROLE_TIER.unknown;
}

function profileForTier(tier) {
  const map = {
    [ROLE_TIER.ceo]: {
      language: 'firme, direta, estratégica; foco em decisão, impacto e risco.',
      visual_posture: 'executive',
      pace: 'measured'
    },
    [ROLE_TIER.director]: {
      language: 'analítica e consolidada; cenários, impacto e trade-offs.',
      visual_posture: 'executive',
      pace: 'steady'
    },
    [ROLE_TIER.manager]: {
      language: 'tática; plano de ação, responsáveis e prazos.',
      visual_posture: 'technical',
      pace: 'balanced'
    },
    [ROLE_TIER.supervisor]: {
      language: 'prática; execução, prioridade e segurança.',
      visual_posture: 'technical',
      pace: 'responsive'
    },
    [ROLE_TIER.operational]: {
      language: 'simples e direta; passos claros e tarefa.',
      visual_posture: 'instructional',
      pace: 'quick'
    },
    [ROLE_TIER.unknown]: {
      language: 'clara e respeitosa; adaptar ao contexto.',
      visual_posture: 'calm',
      pace: 'balanced'
    }
  };
  return map[tier] || map[ROLE_TIER.unknown];
}

module.exports = { ROLE_TIER, normalizeRole, profileForTier };
