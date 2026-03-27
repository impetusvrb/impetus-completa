/**
 * INSIGHTS PERSONALIZADOS POR PERFIL
 * Adapta tom, profundidade, foco e prioridade dos insights da IA
 * conforme role + area + job_title + preferences
 */
const { getProfile } = require('../config/dashboardProfiles');
const userContext = require('./userContext');

/** Modos de insight e suas características */
const INSIGHTS_MODES = {
  strategic_executive: {
    tone: 'estratégico',
    depth: 'consolidated',
    focus: ['decisões', 'tendências globais', 'riscos estratégicos'],
    example: 'Operação 6% abaixo da meta semanal. Linha 2 concentrou paradas. 4 ações críticas vencidas.'
  },
  strategic_analytical: {
    tone: 'analítico',
    depth: 'consolidated',
    focus: ['dados consolidados', 'conclusões', 'comparativos'],
    example: 'Produção consolidada estável. Setor X com 12% de perdas acima da média.'
  },
  analytical_tactical: {
    tone: 'analítico-tático',
    depth: 'detailed',
    focus: ['análise do setor', 'ações táticas', 'eficiencia'],
    example: 'Meta x Realizado: 94%. Gargalos na linha 2. Perdas em setup.'
  },
  operational_tactical: {
    tone: 'operacional',
    depth: 'detailed',
    focus: ['status operacional', 'pendências', 'tarefas'],
    example: '8 propostas em andamento. 3 insights prioritários. Interações do departamento: 24.'
  },
  technical_tactical: {
    tone: 'técnico',
    depth: 'operational',
    focus: ['ações diretas', 'linguagem técnica', 'execução'],
    example: 'Linha 2 abaixo da meta no turno B. Paradas em setup e abastecimento.'
  },
  practical_operational: {
    tone: 'prático',
    depth: 'operational',
    focus: ['informações práticas', 'execução', 'alertas'],
    example: 'Compressor 03 com reincidência e preventiva vencida. Prioridade alta.'
  },
  objective_practical: {
    tone: 'objetivo',
    depth: 'operational',
    focus: ['conciso', 'essencial', 'ações imediatas'],
    example: '4 não conformidades hoje. Setor envase concentrou desvios.'
  }
};

/**
 * Retorna instruções de prompt para a IA gerar insights personalizados
 * @param {string} profileCode
 * @param {Object} user
 * @returns {string}
 */
function getInsightsInstructions(profileCode, user) {
  const profile = getProfile(profileCode);
  const modeKey = profile.insights_mode || 'objective_practical';
  const mode = INSIGHTS_MODES[modeKey] || INSIGHTS_MODES.objective_practical;
  const ctx = userContext.buildUserContext(user);
  const combinedFocus = userContext.getCombinedFocus(ctx) || [];
  const aiContext = user?.ai_profile_context || {};
  const customFocus = aiContext.focus || [];

  let instructions = `Modo: ${mode.tone}. Profundidade: ${mode.depth}. `;
  instructions += `Foque em: ${mode.focus.join(', ')}. `;
  if (combinedFocus.length) {
    instructions += `Prioridades do cargo: ${combinedFocus.slice(0, 5).join(', ')}. `;
  }
  if (customFocus.length) {
    instructions += `Foco personalizado: ${customFocus.join(', ')}. `;
  }
  instructions += `Seja objetivo. Exemplo de estilo: "${mode.example}"`;
  return instructions;
}

/**
 * Gera contexto para o smartSummary adaptar ao perfil
 * Usado pelo smartSummary.buildSmartSummary
 */
function getSmartSummaryContext(user) {
  const dashboardProfileResolver = require('./dashboardProfileResolver');
  const config = dashboardProfileResolver.getDashboardConfigForUser(user);
  const profileCode = config.profile_code;
  return getInsightsInstructions(profileCode, user);
}

/**
 * Filtra/adapta insights brutos ao perfil (profundidade, relevância)
 * @param {Object} user
 * @param {Array} rawInsights
 * @returns {Array}
 */
function adaptInsightsToProfile(user, rawInsights) {
  if (!rawInsights || !Array.isArray(rawInsights)) return [];
  const config = require('./dashboardProfileResolver').getDashboardConfigForUser(user);
  const mode = config.profile_config?.insights_mode || 'objective_practical';
  const level = user?.hierarchy_level ?? 5;

  const maxItems = level <= 1 ? 10 : level <= 3 ? 8 : 5;
  return rawInsights.slice(0, maxItems).map((ins, i) => ({
    ...ins,
    priority: level <= 1 ? (ins.severity || 'alto') : (i < 3 ? 'alta' : 'média')
  }));
}

module.exports = {
  getInsightsInstructions,
  getSmartSummaryContext,
  adaptInsightsToProfile,
  INSIGHTS_MODES
};
