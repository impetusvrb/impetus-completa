'use strict';

/**
 * Papéis fixos do Conselho Cognitivo IMPETUS.
 * Regras de negócio: cada motor tem fronteira explícita (evita drift e disputa de papel).
 */

const PIPELINE_VERSION = process.env.COGNITIVE_PIPELINE_VERSION || 'cognitive_council_v2';

const Provider = Object.freeze({
  GPT: 'openai',
  CLAUDE: 'anthropic',
  GEMINI: 'google_gemini'
});

/** Papel semântico (não confundir com JWT role do usuário) */
const AI_ROLES = Object.freeze({
  GPT: 'interface_conversacional',
  CLAUDE: 'analise_profunda',
  GEMINI: 'percepcao_multimodal'
});

/**
 * Restrições duras por motor — aplicadas nos prompts do orquestrador.
 */
const ROLE_CONSTRAINTS = Object.freeze({
  [AI_ROLES.GPT]: [
    'Nunca executar raciocínio técnico profundo isolado sem insumos do dossiê (Claude/percepção).',
    'Nunca inferir causa raiz apenas por estilo conversacional.',
    'Sempre responder em linguagem operacional adequada ao perfil do usuário.',
    'Se o dossiê estiver incompleto, declarar limitações explicitamente.'
  ],
  [AI_ROLES.CLAUDE]: [
    'Nunca produzir resposta final dirigida ao usuário final.',
    'Saída deve ser estruturada (JSON ou texto técnico) para consumo interno.',
    'Nunca decidir sozinho ações críticas sem marcação para validação humana quando risk_level alto.'
  ],
  [AI_ROLES.GEMINI]: [
    'Nunca emitir recomendação final nem decisão operacional.',
    'Extrair apenas percepções factuais e atributos visuais estruturados.'
  ]
});

/** Intenções suportadas pelo classificador determinístico (extensível) */
const INTENT = Object.freeze({
  DIAGNOSTICO_OPERACIONAL: 'diagnostico_operacional',
  ANALISE_MULTIMODAL: 'analise_multimodal',
  CONSULTA_DADOS: 'consulta_dados',
  GENERICO_ASSISTIDO: 'generico_assistido'
});

module.exports = {
  PIPELINE_VERSION,
  Provider,
  AI_ROLES,
  ROLE_CONSTRAINTS,
  INTENT
};
