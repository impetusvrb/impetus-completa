/**
 * CONTEXTO ORGANIZACIONAL DO USUÁRIO
 * buildUserContext(user) - Motor de inteligência organizacional
 * Define: escopo de dados, tipo de informação, profundidade, linguagem
 */

const AREA_LEVELS = {
  'Direção': 1,
  'Gerência': 2,
  'Coordenação': 3,
  'Supervisão': 4,
  'Colaborador': 5
};

const AREA_SCOPES = {
  'Direção': 'global',
  'Gerência': 'sector',
  'Coordenação': 'sector',
  'Supervisão': 'team',
  'Colaborador': 'individual'
};

const AREA_LANGUAGE = {
  'Direção': 'strategic',
  'Gerência': 'analytical',
  'Coordenação': 'operational',
  'Supervisão': 'practical',
  'Colaborador': 'objective'
};

const AREA_FOCUS = {
  'Direção': ['visao_global', 'comparativo_setores', 'riscos_estrategicos', 'tendencias', 'impacto_financeiro', 'decisoes_pendentes'],
  'Gerência': ['dados_setor', 'performance_setor', 'alertas_relevantes', 'eficiencia'],
  'Coordenação': ['status_operacional', 'pendencias', 'tarefas', 'ocorrencias'],
  'Supervisão': ['dados_equipe', 'ocorrencias_recentes', 'execucao_turno'],
  'Colaborador': ['tarefas_individuais', 'alertas_pessoais', 'comunicacao_direta']
};

const { interpretProfileContext } = require('./profileContextInterpreter');

const JOB_TITLE_KEYWORDS = {
  financeiro: ['indicadores_financeiros', 'custos_operacionais', 'impacto_financeiro_falhas'],
  pcm: ['mtbf', 'mttr', 'backlog', 'equipamentos_criticos'],
  manutenção: ['mtbf', 'mttr', 'backlog', 'equipamentos_criticos'],
  manutencao: ['mtbf', 'mttr', 'backlog', 'equipamentos_criticos'],
  produção: ['eficiencia', 'produtividade', 'gargalos'],
  producao: ['eficiencia', 'produtividade', 'gargalos'],
  rh: ['indicadores_equipe', 'ausencias', 'turnover'],
  'recursos humanos': ['indicadores_equipe', 'ausencias', 'turnover'],
  qualidade: ['nao_conformidades', 'indicadores_qualidade', 'auditorias'],
  industrial: ['oee', 'produtividade', 'gargalos']
};

/**
 * Normaliza department: trim, lowercase, remover espaços duplicados
 */
function normalizeDepartment(value) {
  if (!value || typeof value !== 'string') return null;
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Resolve área a partir de role/hierarchy_level (fallback)
 */
function resolveArea(user) {
  if (user?.area && AREA_LEVELS[user.area] !== undefined) return user.area;
  const h = user?.hierarchy_level ?? user?.hierarchyLevel ?? 5;
  const role = (user?.role || '').toLowerCase();
  if (role === 'ceo') return 'Direção';
  if (h <= 1) return 'Direção';
  if (h === 2) return 'Gerência';
  if (h === 3) return 'Coordenação';
  if (h === 4) return 'Supervisão';
  return 'Colaborador';
}

/**
 * Resolve hierarchy_level (0=CEO, 1-5 conforme área)
 */
function resolveHierarchyLevel(user, area) {
  if (user?.role === 'ceo') return 0;
  return AREA_LEVELS[area] ?? 5;
}

/**
 * Extrai prioridades do job_title (IA analisa texto)
 */
function getJobTitleFocus(jobTitle) {
  if (!jobTitle || typeof jobTitle !== 'string') return [];
  const lower = jobTitle.toLowerCase().trim();
  const priorities = [];
  for (const [keyword, focus] of Object.entries(JOB_TITLE_KEYWORDS)) {
    if (lower.includes(keyword)) priorities.push(...focus);
  }
  return [...new Set(priorities)];
}

function getDescriptionFocus(description) {
  if (!description || typeof description !== 'string') return [];
  try {
    const ctx = interpretProfileContext({ hr_responsibilities: description });
    const map = {
      pessoas: ['indicadores_equipe', 'ausencias', 'turnover'],
      producao: ['eficiencia', 'produtividade', 'gargalos'],
      maquina: ['mtbf', 'mttr', 'backlog', 'equipamentos_criticos'],
      qualidade: ['nao_conformidades', 'indicadores_qualidade', 'auditorias'],
      custo: ['indicadores_financeiros', 'custos_operacionais'],
      estoque: ['inventario', 'reposicao'],
      seguranca: ['acidentes', 'risco', 'epi'],
      laboratorio: ['amostras', 'laudos']
    };
    const out = [];
    for (const r of ctx.responsibilities || []) {
      if (map[r]) out.push(...map[r]);
    }
    if (ctx.primary_axis) {
      const axisMap = {
        eixo_humano: ['indicadores_equipe'],
        eixo_manutencao: ['mtbf', 'mttr', 'backlog'],
        eixo_qualidade: ['nao_conformidades', 'indicadores_qualidade'],
        eixo_financeiro: ['indicadores_financeiros', 'custos_operacionais'],
        eixo_operacional: ['eficiencia', 'produtividade', 'gargalos'],
        eixo_seguranca: ['acidentes', 'risco']
      };
      if (axisMap[ctx.primary_axis]) out.push(...axisMap[ctx.primary_axis]);
    }
    return [...new Set(out)];
  } catch {
    return [];
  }
}

/**
 * buildUserContext(user)
 * Retorna contexto completo para personalização de dashboard e IA
 */
function buildUserContext(user) {
  if (!user) return null;

  const area = resolveArea(user);
  const hierarchyLevel = resolveHierarchyLevel(user, area);
  const jobTitle = (user.job_title || user.cargo || '').trim() || null;
  const department =
    normalizeDepartment(user.department) ||
    normalizeDepartment(user.department_resolved_name) ||
    normalizeDepartment(user.functional_area) ||
    null;
  const description = (user.hr_responsibilities || user.descricao || '').trim() || null;
  const role = (user.role || '').toLowerCase() || null;

  const scope = AREA_SCOPES[area] || 'individual';
  const language = AREA_LANGUAGE[area] || 'objective';
  const areaFocus = AREA_FOCUS[area] || AREA_FOCUS['Colaborador'];
  const jobFocus = getJobTitleFocus(jobTitle);
  const descriptionFocus = getDescriptionFocus(description);
  const combinedFocus = [...new Set([...areaFocus, ...jobFocus, ...descriptionFocus])];

  const structural = user.structural_profile || null;

  return {
    area,
    hierarchy_level: hierarchyLevel,
    role,
    funcao: role,
    job_title: jobTitle,
    cargo: jobTitle,
    department,
    functional_area: user.functional_area || user.area || null,
    hr_responsibilities: description,
    dashboard_profile: user.dashboard_profile || null,
    scope,
    language,
    area_focus: areaFocus,
    job_focus: jobFocus,
    description_focus: descriptionFocus,
    focus: combinedFocus,
    structural_profile: structural,
    primary_axis: structural?.eixo_primario || null,
    data_depth: hierarchyLevel <= 1 ? 'consolidated' : hierarchyLevel <= 3 ? 'detailed' : 'operational',
    language_instruction: getLanguageInstructions({ language })
  };
}

/**
 * Retorna instruções de prompt para adaptar linguagem da IA
 */
function getLanguageInstructions(ctx) {
  if (!ctx) return '';
  const lang = ctx.language || 'objective';
  const map = {
    strategic: 'Responda de forma estratégica e resumida. Foque em decisões e tendências globais.',
    analytical: 'Responda de forma analítica. Apresente dados consolidados e conclusões.',
    operational: 'Responda de forma operacional. Detalhes de status e pendências.',
    practical: 'Responda de forma prática. Ações diretas e ocorrências recentes.',
    objective: 'Responda de forma objetiva. Informações diretas e concisas.'
  };
  return map[lang] || map.objective;
}

/**
 * Retorna foco prioritário combinado (área + cargo)
 */
function getCombinedFocus(ctx) {
  if (!ctx) return [];
  const areaFocus = ctx.area_focus || [];
  const jobFocus = ctx.job_focus || [];
  return [...new Set([...areaFocus, ...jobFocus])];
}

/**
 * Verifica se usuário pode acessar dados de escopo X
 */
function canAccessScope(userCtx, requestedScope) {
  if (!userCtx) return false;
  const order = ['individual', 'team', 'sector', 'global'];
  const userLevel = order.indexOf(userCtx.scope) || 0;
  const reqLevel = order.indexOf(requestedScope) || 0;
  return userLevel >= reqLevel;
}

module.exports = {
  AREA_LEVELS,
  AREA_SCOPES,
  AREA_LANGUAGE,
  AREA_FOCUS,
  normalizeDepartment,
  buildUserContext,
  getLanguageInstructions,
  getCombinedFocus,
  canAccessScope,
  getJobTitleFocus
};
