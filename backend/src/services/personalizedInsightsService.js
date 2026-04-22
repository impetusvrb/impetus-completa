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
 * @returns {Promise<string>}
 */
async function getInsightsInstructions(profileCode, user) {
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
  let structuralHint = '';
  try {
    const structuralOrgContext = require('./structuralOrgContextService');
    structuralHint = await structuralOrgContext.getInsightsInstructionSuffix(user);
  } catch (_) {
    /* opcional */
  }
  if (structuralHint) {
    instructions += `Reforço (Base Estrutural / cargo formal): ${structuralHint}. `;
  }
  instructions += `Seja objetivo. Exemplo de estilo: "${mode.example}"`;
  return instructions;
}

/**
 * Gera contexto para o smartSummary adaptar ao perfil
 * Usado pelo smartSummary.buildSmartSummary
 */
async function getSmartSummaryContext(user) {
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
  const level = user?.hierarchy_level ?? 5;
  const profileLabel = config.profile_config?.label || config.profile_code || '';

  const maxItems = level <= 1 ? 10 : level <= 3 ? 8 : 5;
  return rawInsights.slice(0, maxItems).map((ins, i) => ({
    ...ins,
    profile_context: profileLabel || undefined,
    priority: level <= 1 ? (ins.severity === 'alto' ? 'crítica' : ins.severity || 'alta') : (i < 3 ? 'alta' : 'média')
  }));
}

/**
 * Texto de insight mais rico a partir de um KPI dinâmico (sem alterar fontes de dados).
 */
function buildInsightSummaryForKpi(k, user) {
  const title = (k.title || 'Indicador').trim();
  const val = k.value != null ? String(k.value) : '—';
  const kkey = `${k.key || ''} ${k.id || ''}`.toLowerCase();
  const cfg = require('./dashboardProfileResolver').getDashboardConfigForUser(user);
  const pLabel = cfg.profile_config?.label || cfg.profile_code || 'perfil atual';

  if (/open_work|ativos|maintenance|manuten|os abert|critical_asset|máquinas|compressor/.test(kkey)) {
    return `${title}: ${val}. Leitura alinhada a manutenção e ativos (${pLabel}).`;
  }
  if (/nc|qualid|conform|auditor|inspe|desvio|não conform/.test(kkey)) {
    return `${title}: ${val}. Contexto de qualidade e conformidade (${pLabel}).`;
  }
  if (/produ|meta|turno|linha|eficien|perda|parada|gargalo/.test(kkey)) {
    return `${title}: ${val}. Foco em produção e ritmo operacional (${pLabel}).`;
  }
  if (/intera|comunic|proposta|insight/.test(kkey)) {
    return `${title}: ${val}. Acompanhamento de fluxo e pendências (${pLabel}).`;
  }
  return `${title}: ${val}.`;
}

function severityFromKpi(k) {
  const c = (k.color || '').toLowerCase();
  if (c === 'red') return 'alto';
  if (c === 'orange' || c === 'amber') return 'médio';
  return 'informativo';
}

/**
 * Camada de explicabilidade determinística para insights derivados de KPIs (sem chamada LLM).
 */
function buildExplanationLayerForKpi(k, user) {
  const sev = severityFromKpi(k);
  const title = (k.title || 'Indicador').trim();
  const val = k.value != null ? String(k.value) : '—';
  const cfg = require('./dashboardProfileResolver').getDashboardConfigForUser(user);
  const profileLabel = cfg.profile_config?.label || cfg.profile_code || 'perfil atual';

  const facts_used = [
    `Indicador "${title}" com valor apresentado no painel: ${val}.`,
    k.key ? `Chave interna do KPI: ${String(k.key)}.` : null,
    k.id != null ? `Referência do cartão: ${String(k.id)}.` : null,
    k.color ? `Estado visual no dashboard: ${String(k.color)}.` : null
  ].filter(Boolean);

  const confidence_score = sev === 'alto' ? 66 : sev === 'médio' ? 78 : 88;

  const limitations = [];
  if (k.meta == null && k.details == null) {
    limitations.push('Detalhe expandido do KPI não incluído neste cartão — apenas valor e rótulo.');
  }

  return {
    facts_used,
    business_rules: [
      'IMPETUS — Insight gerado a partir de KPIs dinâmicos do dashboard (regra de transparência: sem inferir sensores ou OS não expostos).',
      `Priorização adaptada ao perfil: ${profileLabel}.`
    ],
    confidence_score,
    limitations,
    reasoning_trace: `Factos: o texto do insight espelha o valor e o tipo de indicador visíveis ao utilizador. Severidade (${sev}) deriva da cor/meta do cartão. Não há modelo generativo neste passo — apenas regras de composição e perfil.`
  };
}

module.exports = {
  getInsightsInstructions,
  getSmartSummaryContext,
  adaptInsightsToProfile,
  buildInsightSummaryForKpi,
  buildExplanationLayerForKpi,
  severityFromKpi,
  INSIGHTS_MODES
};
