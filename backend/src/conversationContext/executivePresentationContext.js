'use strict';

/**
 * CERT-VOICE-02 — Executive Presentation Context
 * Domínio cognitivo de apresentação executiva (não altera permissões).
 */

const presentationContextSessionStore = require('./presentationContextSessionStore');
const { isExecutiveUser } = require('./executiveConversationContext');
const presentationObservability = require('./presentationContextObservability');

const PRESENTATION_LEVELS = Object.freeze({
  executive: {
    id: 'executive',
    label: 'Executive Presentation',
    audience: 'external',
    privacy_level: 'high',
    verbosity: 'minimal',
    speech_style: 'presentation_formal',
    allow_details: false,
    allow_names: false,
    allow_values: false,
    allow_drilldown: false
  },
  internal: {
    id: 'internal',
    label: 'Internal Presentation',
    audience: 'internal',
    privacy_level: 'medium',
    verbosity: 'short',
    speech_style: 'presentation_professional',
    allow_details: true,
    allow_names: false,
    allow_values: true,
    allow_drilldown: false
  },
  board: {
    id: 'board',
    label: 'Board Presentation',
    audience: 'board',
    privacy_level: 'medium',
    verbosity: 'short',
    speech_style: 'boardroom_formal',
    allow_details: true,
    allow_names: true,
    allow_values: true,
    allow_drilldown: true
  },
  investor: {
    id: 'investor',
    label: 'Investor Presentation',
    audience: 'investor',
    privacy_level: 'high',
    verbosity: 'minimal',
    speech_style: 'institutional_formal',
    allow_details: false,
    allow_names: false,
    allow_values: false,
    allow_drilldown: false
  }
});

const LEVEL_DETECT_PATTERNS = Object.freeze({
  board: [
    /\b(conselho|diretoria|board|sala\s+de\s+comando)\b/i,
    /\breuni[aã]o\s+de\s+diretoria\b/i
  ],
  investor: [/\binvestidor(es)?\b/i, /\broad\s*show\b/i],
  internal: [/\breuni[aã]o\s+interna\b/i, /\bequipe\s+interna\b/i, /\bcom\s+a\s+equipe\b/i],
  executive: [/\bapresenta[cç][ãa]o\s+institucional\b/i, /\bpara\s+terceiros\b/i]
});

const PRESENTATION_ENABLE_PATTERNS = [
  /\b(vamos\s+)?(iniciar|começar|entrar\s+em)\s+(uma\s+)?apresenta[cç][ãa]o\b/i,
  /\bmodo\s+apresenta[cç][ãa]o\b/i,
  /\b(entrar|ativar)\s+(em\s+)?modo\s+apresenta[cç][ãa]o\b/i,
  /\bvou\s+apresentar\b/i,
  /\b(apresente|apresentar)\s+(estes\s+)?indicadores\b/i,
  /\bpreparar\s+(a\s+)?apresenta[cç][ãa]o\b/i,
  /\bpreparar\s+reuni[aã]o\b/i
];

const PRESENTATION_DISABLE_PATTERNS = [
  /\b(sair|encerrar|desativar)\s+(do\s+)?modo\s+apresenta[cç][ãa]o\b/i,
  /\bfim\s+da\s+apresenta[cç][ãa]o\b/i,
  /\bterminamos\s+a\s+apresenta[cç][ãa]o\b/i
];

function defaultPresentationContext() {
  return {
    enabled: false,
    audience: null,
    presentation_level: null,
    privacy_level: 'normal',
    verbosity: 'short',
    speech_style: 'natural_direct',
    allow_details: true,
    allow_names: true,
    allow_values: true,
    allow_drilldown: true,
    source: null,
    updated_at: null
  };
}

function detectPresentationLevel(queryText = '') {
  const t = String(queryText || '').trim();
  for (const [level, patterns] of Object.entries(LEVEL_DETECT_PATTERNS)) {
    for (const re of patterns) {
      if (re.test(t)) return level;
    }
  }
  return 'executive';
}

function detectPresentationIntent(queryText = '') {
  const t = String(queryText || '').trim();
  if (!t) return { action: null, level: null };
  for (const re of PRESENTATION_DISABLE_PATTERNS) {
    if (re.test(t)) return { action: 'disable', level: null };
  }
  for (const re of PRESENTATION_ENABLE_PATTERNS) {
    if (re.test(t)) {
      return { action: 'enable', level: detectPresentationLevel(t) };
    }
  }
  return { action: null, level: null };
}

function buildPresentationContext(levelId = 'executive', overrides = {}) {
  const level = PRESENTATION_LEVELS[levelId] || PRESENTATION_LEVELS.executive;
  return {
    enabled: true,
    audience: overrides.audience || level.audience,
    presentation_level: level.id,
    privacy_level: level.privacy_level,
    verbosity: level.verbosity,
    speech_style: level.speech_style,
    allow_details: level.allow_details,
    allow_names: level.allow_names,
    allow_values: level.allow_values,
    allow_drilldown: level.allow_drilldown,
    source: overrides.source || 'engine',
    updated_at: new Date().toISOString()
  };
}

/**
 * Resolve presentation context: sessão server + pedido dashboard + deteção por frase.
 * @param {object} user
 * @param {{ queryText?: string, presentationRequested?: boolean, presentationLevel?: string, modoApresentacao?: boolean, channel?: string }} [opts]
 */
function resolveExecutivePresentationContext(user = {}, opts = {}) {
  const stored = presentationContextSessionStore.getPresentationSession(user);
  let ctx = stored ? { ...stored } : defaultPresentationContext();

  const intent = detectPresentationIntent(opts.queryText || '');
  if (intent.action === 'enable' && isExecutiveUser(user)) {
    const built = buildPresentationContext(intent.level || 'executive', {
      source: 'voice_phrase',
      audience: (PRESENTATION_LEVELS[intent.level] || PRESENTATION_LEVELS.executive).audience
    });
    ctx = presentationContextSessionStore.setPresentationSession(user, built);
    presentationObservability.recordPresentationEnabled(built, opts.channel);
  } else if (intent.action === 'disable') {
    ctx = defaultPresentationContext();
    ctx.source = 'voice_phrase';
    presentationContextSessionStore.clearPresentationSession(user);
    presentationObservability.recordPresentationDisabled(opts.channel);
  } else if (opts.presentationRequested === true || opts.modoApresentacao === true) {
    const level = String(opts.presentationLevel || 'executive').toLowerCase();
    const wasEnabled = Boolean(stored?.enabled);
    ctx = buildPresentationContext(
      PRESENTATION_LEVELS[level] ? level : 'executive',
      { source: 'dashboard' }
    );
    presentationContextSessionStore.setPresentationSession(user, ctx);
    if (!wasEnabled) presentationObservability.recordPresentationEnabled(ctx, 'dashboard');
  } else if (opts.presentationRequested === false) {
    const wasEnabled = Boolean(stored?.enabled);
    ctx = defaultPresentationContext();
    ctx.source = 'dashboard';
    presentationContextSessionStore.clearPresentationSession(user);
    if (wasEnabled) presentationObservability.recordPresentationDisabled('dashboard');
  }

  if (ctx.enabled) {
    presentationObservability.recordPresentationUsage(ctx);
  }

  return ctx;
}

function buildPresentationPromptBlock(presentationContext = {}) {
  if (!presentationContext?.enabled) return '';

  const lines = [
    '## Executive Presentation Context (CERT-VOICE-02)',
    'O executivo está APRESENTANDO informações para terceiros ou em contexto formal.',
    `- Nível: ${presentationContext.presentation_level || 'executive'}`,
    `- Audiência: ${presentationContext.audience || 'external'}`,
    `- Privacidade: ${presentationContext.privacy_level}`,
    `- Verbosidade: ${presentationContext.verbosity}`,
    `- Estilo: ${presentationContext.speech_style}`,
    presentationContext.allow_values === false
      ? '- NÃO cite valores numéricos detalhados; use sínteses («indicador estável», «atenção moderada»).'
      : '- Valores: apenas agregados e consolidados.',
    presentationContext.allow_names === false
      ? '- NÃO cite nomes de pessoas.'
      : '- Nomes: só se indispensável e autorizado pelo contexto.',
    presentationContext.allow_details === false
      ? '- Sem detalhes operacionais; visão estratégica apenas.'
      : '- Detalhes limitados ao nível da apresentação.',
    presentationContext.allow_drilldown === false
      ? '- Não convide drill-down; sugira gráficos/KPIs em vez de listas.'
      : '- Drill-down permitido dentro da governança.',
    '- SmartPanel: priorize gráficos, KPIs, tendências e comparativos; evite listas extensas ou registos individuais.',
    'IMPORTANTE: isto altera apenas ESTILO e EXPOSIÇÃO verbal/visual — não altera permissões nem dados autorizados.'
  ];
  return lines.join('\n');
}

function applyPresentationPanelHints(plan = {}, presentationContext = {}) {
  if (!presentationContext?.enabled || !plan) return plan;
  const out = { ...plan };
  const preferTypes = new Set(['chart', 'kpi_cards', 'comparison', 'indicator', 'mixed']);
  if (!preferTypes.has(out.type) && presentationContext.allow_drilldown === false) {
    out.type = 'chart';
  }
  if (presentationContext.allow_drilldown === false && Array.isArray(out.datasets)) {
    out.datasets = out.datasets.filter(
      (d) => !/^(chat|records|messages|conversations)$/i.test(String(d))
    );
    if (!out.datasets.length) out.datasets = ['kpis', 'summary'];
  }
  if (presentationContext.allow_values === false && out.type === 'table') {
    out.type = 'kpi_cards';
  }
  if (presentationContext.allow_details === false && out.narrative) {
    out.narrative = String(out.narrative).slice(0, 400);
  }
  out.presentation_context_applied = true;
  presentationObservability.recordSensitiveDataHidden();
  return out;
}

module.exports = {
  PRESENTATION_LEVELS,
  defaultPresentationContext,
  detectPresentationLevel,
  detectPresentationIntent,
  buildPresentationContext,
  resolveExecutivePresentationContext,
  buildPresentationPromptBlock,
  applyPresentationPanelHints,
  getStoredPresentation: presentationContextSessionStore.getPresentationSession,
  setStoredPresentation: presentationContextSessionStore.setPresentationSession,
  clearStoredPresentation: presentationContextSessionStore.clearPresentationSession
};
