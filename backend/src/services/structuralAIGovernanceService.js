'use strict';

/**
 * Governança IA unificada — Base Estrutural + utilizador.
 * Fonte única para Chat Impetus, painel ao vivo (realtime), módulo Impetus IA e chat interno.
 *
 * Regra:
 * - Identidade e dados da organização/pessoa → só com cadastro estrutural + permissões.
 * - Conhecimento geral (metodologias, “como fazer análise de gestão”) → liberado, sem inventar dados do tenant.
 */

const {
  enrichUserForDashboardAsync,
  buildStructuralAiPromptBlock
} = require('./structuralUserProfileService');
const dashboardProfileResolver = require('./dashboardProfileResolver');
const dashboardAccessService = require('./dashboardAccessService');
const moduleAccessGovernanceEngine = require('./moduleAccessGovernanceEngine');

const GENERAL_KNOWLEDGE_PATTERNS = [
  /\bcomo fazer\b/i,
  /\bcomo realizar\b/i,
  /\bcomo conduzir\b/i,
  /\bo que [eé]\b/i,
  /\bdefini[cç][aã]o de\b/i,
  /\bmetodologia\b/i,
  /\bframework\b/i,
  /\bboas pr[aá]ticas\b/i,
  /\ban[aá]lise de gest[aã]o\b/i,
  /\bgest[aã]o\b.*\b(teoria|conceito|m[eé]todo)\b/i,
  /\bswot\b/i,
  /\b5w2h\b/i,
  /\bpdca\b/i,
  /\bplanilha\b.*\b(modelo|exemplo)\b/i,
  /\bno google\b/i,
  /\bna internet\b/i,
  /\bem geral\b/i,
  /\bestudo de caso\b/i,
  /\bpasso a passo\b/i
];

const OPERATIONAL_SIGNAL_PATTERNS = [
  /\b(nossa|minha|nosso|meu)\s+(empresa|planta|f[aá]brica|setor|equipe|departamento)\b/i,
  /\bimpetus\b/i,
  /\b(painel|dashboard|centro de comando)\b/i,
  /\b(kpi|indicador|alerta|nc|n[aã]o conform|lote|ordem de servi[cç]o)\b/i,
  /\b(produ[cç][aã]o|manuten[cç][aã]o|qualidade|rh|financeiro)\b.*\b(aqui|hoje|agora|ontem)\b/i,
  /\b(base estrutural|cadastro|cargo|permiss[aã]o)\b/i,
  /\b(conversa|mensagem|chat)\b.*\b(equipe|colega|setor)\b/i,
  /\b(dados|n[uú]mero|total|quantos)\b.*\b(sistema|relat[oó]rio)\b/i,
  /\btelemetria\b/i,
  /\bfornecedor\b.*\b(aprovad|reprovad|auditoria)\b/i
];

/**
 * @param {string} queryText
 * @returns {{ intent: 'operational_data'|'general_knowledge'|'mixed', confidence: number, signals: string[] }}
 */
function classifyQueryIntent(queryText = '') {
  const t = String(queryText || '').trim();
  if (!t) {
    return { intent: 'mixed', confidence: 0.4, signals: ['empty'] };
  }

  let general = 0;
  let operational = 0;
  const signals = [];

  for (const re of GENERAL_KNOWLEDGE_PATTERNS) {
    if (re.test(t)) {
      general += 1;
      signals.push(`general:${re.source.slice(0, 24)}`);
    }
  }
  for (const re of OPERATIONAL_SIGNAL_PATTERNS) {
    if (re.test(t)) {
      operational += 1;
      signals.push(`operational:${re.source.slice(0, 24)}`);
    }
  }

  if (operational > 0 && general === 0) {
    return { intent: 'operational_data', confidence: Math.min(0.95, 0.55 + operational * 0.12), signals };
  }
  if (general > 0 && operational === 0) {
    return { intent: 'general_knowledge', confidence: Math.min(0.92, 0.5 + general * 0.1), signals };
  }
  if (general > 0 && operational > 0) {
    return { intent: 'mixed', confidence: 0.65, signals };
  }
  return { intent: 'mixed', confidence: 0.5, signals: ['default_mixed'] };
}

function buildAccessPolicyBlock(enrichedUser, channel) {
  const sp = enrichedUser?.structural_profile || {};
  const config = dashboardProfileResolver.getDashboardConfigForUser(enrichedUser);
  const depth = dashboardAccessService.getIADataDepth(enrichedUser);
  const modules = dashboardAccessService.getAllowedModules(enrichedUser);

  const lines = [
    '## Política de acesso IA (Base Estrutural + permissões)',
    `- Canal: ${channel || 'n/d'}.`,
    `- Perfil motor: ${config.profile_code || '—'} (${config.profile_config?.label || ''}).`,
    `- Cadastro estrutural completo: ${sp.structural_complete === true ? 'sim' : 'não — respostas operacionais limitadas'}.`,
    `- Profundidade de dados: ${depth}.`,
    `- Módulos autorizados: ${modules.length ? modules.join(', ') : 'nenhum listado'}.`,
    '- Dados de outras pessoas, outros departamentos ou outras empresas: proibido salvo permissão explícita no cadastro.',
    '- Conversas privadas de terceiros: não aceder nem inferir; só contexto desta sessão e do âmbito do utilizador.',
    '- Números, estados de linha, stocks, NC, lotes: só se vierem do bloco «DADOS INTERNOS» ou contexto operacional injectado; caso contrário diga que não encontrou no sistema.'
  ];

  return `${lines.join('\n')}\n`;
}

function buildIntentPolicyBlock(intent) {
  if (intent === 'general_knowledge') {
    return [
      '## Modo da pergunta: CONHECIMENTO GERAL (liberado)',
      'Pode explicar métodos, frameworks e boas práticas de gestão/indústria (como numa consulta educativa).',
      'Não invente KPIs, alertas, nomes de colegas, estados de máquinas ou factos desta empresa.',
      'Se a pergunta misturar teoria com «os nossos números», peça para reformular a parte operacional ou use só dados injectados.'
    ].join('\n');
  }
  if (intent === 'operational_data') {
    return [
      '## Modo da pergunta: DADOS OPERACIONAIS (restrito)',
      'Responda apenas com base na identidade estrutural abaixo e nos dados internos fornecidos neste pedido.',
      'Proibido supor métricas, conversas ou eventos que não constem no contexto autorizado.'
    ].join('\n');
  }
  return [
    '## Modo da pergunta: MISTO',
    'Separe: (1) conceitos gerais — pode explicar; (2) dados desta empresa — só com fonte no sistema.'
  ].join('\n');
}

/**
 * Pacote completo para injecção em prompts IA.
 * @param {object} user
 * @param {{ channel?: string, queryText?: string, companyId?: string }} opts
 */
async function buildAIGovernancePackage(user, opts = {}) {
  const channel = opts.channel || 'impetus_ia';
  const queryText = opts.queryText || '';
  const intentPack = classifyQueryIntent(queryText);

  let enrichedUser = user || {};
  try {
    enrichedUser = await enrichUserForDashboardAsync(user || {});
  } catch (err) {
    console.warn('[STRUCTURAL_AI_GOV] enrich:', err?.message ?? err);
  }

  const structuralBlock = buildStructuralAiPromptBlock(enrichedUser.structural_profile);
  const accessPolicyBlock = buildAccessPolicyBlock(enrichedUser, channel);
  const intentPolicyBlock = buildIntentPolicyBlock(intentPack.intent);

  const allowOperationalData =
    intentPack.intent !== 'general_knowledge' &&
    (intentPack.intent === 'operational_data' ||
      intentPack.intent === 'mixed' ||
      OPERATIONAL_SIGNAL_PATTERNS.some((re) => re.test(queryText)));

  let moduleGovernance = null;
  try {
    moduleGovernance = await moduleAccessGovernanceEngine.resolveForUser(enrichedUser);
  } catch (_) {
    moduleGovernance = null;
  }

  const systemAppend = [
    structuralBlock,
    accessPolicyBlock,
    intentPolicyBlock,
    moduleGovernance?.governance_message
      ? `## Governança de módulos\n${moduleGovernance.governance_message}`
      : ''
  ]
    .filter(Boolean)
    .join('\n\n');

  return {
    enrichedUser,
    intent: intentPack.intent,
    intent_confidence: intentPack.confidence,
    allow_operational_data: allowOperationalData,
    allow_general_knowledge: true,
    structural_complete: enrichedUser.structural_profile?.structural_complete === true,
    structural_block: structuralBlock,
    access_policy_block: accessPolicyBlock,
    intent_policy_block: intentPolicyBlock,
    system_append: systemAppend,
    profile_code: dashboardProfileResolver.resolveDashboardProfile(enrichedUser)
  };
}

module.exports = {
  classifyQueryIntent,
  buildAccessPolicyBlock,
  buildIntentPolicyBlock,
  buildAIGovernancePackage
};
