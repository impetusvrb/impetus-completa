/**
 * IMPETUS - Motor de Decisão Inteligente
 * Garante que todas as IAs não escolham o caminho mais curto,
 * mas a decisão que gere o melhor resultado geral para a empresa,
 * para as pessoas e para a operação.
 *
 * Critérios (ordem): Segurança das pessoas > Saúde dos colaboradores >
 * Ética e conformidade > Proteção financeira > Continuidade operacional
 */
const ai = require('./ai');
const documentContext = require('./documentContext');

const CRITERIA_ORDER = [
  'seguranca_pessoas',
  'saude_colaboradores',
  'etica_conformidade',
  'protecao_financeira',
  'continuidade_operacional'
];

/** Pesos para scoring (alinhado com impetus-policy) */
const CRITERIA_WEIGHTS = {
  seguranca_pessoas: 0.35,
  saude_colaboradores: 0.20,
  etica_conformidade: 0.15,
  protecao_financeira: 0.15,
  continuidade_operacional: 0.15
};

/**
 * Retorna o bloco do framework de decisão para injeção em prompts
 * Todas as IAs do sistema devem receber este bloco ao sugerir ações ou decisões
 */
function getDecisionFrameworkBlock() {
  return `
## Motor de Decisão Inteligente IMPETUS (OBRIGATÓRIO)

PRINCÍPIO: A melhor decisão não é a mais rápida ou a mais fácil, mas a que protege as pessoas, respeita a ética e gera o melhor resultado sustentável para a empresa.

O QUE A IA NÃO DEVE ESCOLHER automaticamente: solução mais rápida, mais simples ou mais curta.
O QUE A IA DEVE ESCOLHER: solução mais inteligente e equilibrada.

CRITÉRIOS (ordem obrigatória de prioridade):
1. Segurança das pessoas - PRIORIDADE MÁXIMA. Qualquer risco para operadores, técnicos, colaboradores ou visitantes = priorizar segurança imediatamente. Nunca sugerir ações que exponham pessoas a perigos físicos, elétricos, químicos ou ergonômicos.
2. Saúde física e mental - Evitar sobrecarga, estresse desnecessário, condições inseguras. Respeitar o bem-estar das pessoas.
3. Ética e conformidade - Leis, normas de segurança, boas práticas industriais, ética empresarial. Nenhuma decisão pode violar normas.
4. Proteção financeira - Reduzir desperdícios, evitar prejuízos, danos em equipamentos, paradas inesperadas.
5. Continuidade operacional - Manter a operação funcionando, evitar paradas de produção, proteger a eficiência.

ANÁLISE DE MÚLTIPLOS CAMINHOS: Antes de agir, gere múltiplos caminhos possíveis. Analise cada um considerando risco, impacto financeiro, impacto na produção e impacto nas pessoas. Escolha o que melhor equilibra todos os critérios.

TRANSPARÊNCIA: Ao sugerir uma ação, SEMPRE explique: 1) Qual problema foi detectado. 2) Quais opções foram analisadas. 3) Por que aquela decisão foi escolhida.
`;
}

/**
 * Retorna contexto de sistema para IAs que usam messages[]
 * Inclui o Motor de Decisão para garantir conformidade em todas as respostas
 */
function buildSystemContextWithDecisionFramework(additionalContext = '') {
  const block = getDecisionFrameworkBlock();
  return `${block}${additionalContext ? `\n\n${additionalContext}` : ''}`.trim();
}

/**
 * Envolve um prompt de usuário com instrução de decisão
 * Use quando o serviço monta seu próprio prompt e precisa do framework
 */
function wrapPromptWithDecisionFramework(userPrompt, opts = {}) {
  const { prefix = '' } = opts;
  const block = getDecisionFrameworkBlock();
  return `${block}\n\n${prefix ? `${prefix}\n\n` : ''}${userPrompt}`.trim();
}

/**
 * Avalia uma situação com múltiplos caminhos e retorna decisão estruturada
 * Usado quando o sistema precisa de análise explícita multi-caminho
 *
 * @param {Object} opts
 * @param {string} opts.situation - Descrição da situação operacional
 * @param {string[]} opts.candidatePaths - Lista de possíveis ações
 * @param {Object} opts.context - Contexto adicional (companyId, equipamento, etc.)
 * @returns {Promise<Object>} { chosen_path, options_analyzed, reasoning, problem_detected }
 */
async function evaluateDecision(opts = {}) {
  const { situation, candidatePaths = [], context = {} } = opts;
  const companyId = context.companyId || null;
  const docContext = companyId
    ? await documentContext.buildAIContext({ companyId, queryText: situation })
    : '';

  const pathsList = Array.isArray(candidatePaths) && candidatePaths.length > 0
    ? candidatePaths
    : ['ignorar/reduzir', 'ação preventiva', 'parada programada', 'alerta manutenção', 'ação imediata'];

  const prompt = `${getDecisionFrameworkBlock()}
${docContext ? `\n${docContext.slice(0, 2000)}\n` : ''}

## Situação
${situation || 'Situação operacional requer decisão.'}

## Caminhos possíveis (analise cada um)
${pathsList.map((p, i) => `${i + 1}. ${typeof p === 'string' ? p : p.label || p.description || JSON.stringify(p)}`).join('\n')}

## Tarefa
Analise cada caminho considerando: risco para pessoas, impacto em colaboradores, conformidade, impacto financeiro, continuidade operacional.
Escolha a decisão mais equilibrada e explique.

Responda APENAS com JSON válido (sem markdown):
{
  "problem_detected": "descrição objetiva do problema",
  "options_analyzed": [{ "path": "descrição", "risk_people": "baixo|medio|alto", "impact_finance": "string breve", "conclusion": "string breve" }],
  "chosen_path": "descrição da decisão escolhida",
  "reasoning": "por que esta decisão foi escolhida (cite critérios)",
  "transparent_explanation": "texto em português para exibir ao usuário: problema, opções, decisão e justificativa"
}`;

  try {
    const raw = await ai.chatCompletion(prompt, { max_tokens: 1200, timeout: 25000 });
    if (!raw) return fallbackResult(situation, pathsList);

    const m = (raw || '').match(/\{[\s\S]*\}/);
    if (!m) return fallbackResult(situation, pathsList);

    const parsed = JSON.parse(m[0]);
    return {
      ok: true,
      problem_detected: parsed.problem_detected || situation,
      options_analyzed: parsed.options_analyzed || [],
      chosen_path: parsed.chosen_path || pathsList[0],
      reasoning: parsed.reasoning || '',
      transparent_explanation: parsed.transparent_explanation || parsed.reasoning || ''
    };
  } catch (err) {
    console.warn('[INTELLIGENT_DECISION] evaluateDecision:', err.message);
    return fallbackResult(situation, pathsList);
  }
}

function fallbackResult(situation, paths) {
  return {
    ok: false,
    problem_detected: situation,
    options_analyzed: paths.map((p) => ({ path: p, conclusion: 'Não analisado' })),
    chosen_path: paths[0] || 'Aguardar análise humana',
    reasoning: 'Motor de decisão indisponível. Revisão humana necessária.',
    transparent_explanation: `Situação: ${situation}. O sistema não conseguiu analisar automaticamente. Recomenda-se decisão humana com base nos critérios de segurança, ética e continuidade operacional.`
  };
}

/**
 * Enriquece uma recomendação existente com explicação transparente
 * Útil para plcAi, diagnostic, etc. quando já têm uma recommendation mas precisam da explicação
 */
async function enrichWithTransparentExplanation(recommendation, situation, context = {}) {
  const companyId = context.companyId || null;
  const docContext = companyId
    ? await documentContext.buildAIContext({ companyId, queryText: situation })
    : '';

  const prompt = `${getDecisionFrameworkBlock()}
${docContext ? `\n${docContext.slice(0, 1500)}\n` : ''}

Situação: ${situation}
Recomendação já gerada: ${recommendation}

Gere uma explicação transparente em 2-4 frases para o usuário:
1. Qual problema foi detectado
2. Por que esta recomendação foi escolhida (cite critérios: segurança, ética, proteção)
Responda em português, de forma clara e objetiva.`;

  try {
    const raw = await ai.chatCompletion(prompt, { max_tokens: 300, timeout: 10000 });
    return (raw || '').trim() || recommendation;
  } catch {
    return recommendation;
  }
}

/**
 * Decisão colaborativa quando múltiplas IAs/setores estão envolvidos
 * Ex.: manutenção + produção + segurança - compartilham análise e escolhem solução equilibrada
 * @param {Object} opts - { situation, perspectives: [{ source, analysis, recommendation }] }
 * @returns {Promise<Object>} { chosen, reasoning, consolidated }
 */
async function collaborativeEvaluate(opts = {}) {
  const { situation, perspectives = [], context = {} } = opts;
  if (perspectives.length === 0) {
    return evaluateDecision({ situation, candidatePaths: ['Aguardar análise humana'], context });
  }

  const docContext = context.companyId
    ? await documentContext.buildAIContext({ companyId: context.companyId, queryText: situation })
    : '';

  const perspectivesText = perspectives.map((p, i) =>
    `[${p.source || `Fonte ${i + 1}`}]: ${p.analysis || p.recommendation || ''}`
  ).join('\n');

  const prompt = `${getDecisionFrameworkBlock()}
${docContext ? `\n${docContext.slice(0, 1500)}\n` : ''}

## Situação
${situation}

## Análises de múltiplas fontes (manutenção, produção, segurança, etc.)
${perspectivesText}

## Tarefa
Consolide as análises. Escolha a solução com maior equilíbrio entre: segurança das pessoas, saúde dos colaboradores, ética, proteção financeira e continuidade operacional.

Responda APENAS com JSON válido:
{
  "chosen_recommendation": "descrição da decisão consolidada",
  "reasoning": "por que esta solução equilibra melhor os critérios",
  "transparent_explanation": "texto para o usuário: problema, análises consideradas, decisão e justificativa"
}`;

  try {
    const raw = await ai.chatCompletion(prompt, { max_tokens: 600, timeout: 15000 });
    const m = (raw || '').match(/\{[\s\S]*\}/);
    if (!m) return fallbackResult(situation, []);
    const parsed = JSON.parse(m[0]);
    return {
      ok: true,
      chosen_path: parsed.chosen_recommendation,
      reasoning: parsed.reasoning,
      transparent_explanation: parsed.transparent_explanation || parsed.reasoning,
      options_analyzed: perspectives.map((p) => ({ path: p.recommendation || p.analysis, source: p.source }))
    };
  } catch (err) {
    console.warn('[INTELLIGENT_DECISION] collaborativeEvaluate:', err.message);
    const first = perspectives[0]?.recommendation || perspectives[0]?.analysis || 'Aguardar decisão humana';
    return fallbackResult(situation, perspectives.map((p) => p.recommendation || p.analysis));
  }
}

module.exports = {
  getDecisionFrameworkBlock,
  buildSystemContextWithDecisionFramework,
  wrapPromptWithDecisionFramework,
  evaluateDecision,
  enrichWithTransparentExplanation,
  collaborativeEvaluate,
  CRITERIA_ORDER,
  CRITERIA_WEIGHTS
};
