'use strict';

/**
 * Deteção de intenção: heurístico clássico ({@link detectIntent}) e
 * variação semântica leve local ({@link detectIntentAdvanced}) — sem LLM / APIs.
 */

const GENERIC = () => ({ intent: 'generic', entities: {} });

const WEIGHT_STRONG = 3;
const WEIGHT_CONTEXT = 2;
const WEIGHT_PROXIMITY = 1;
/** Garante calibração de confiança ~0.3–0.9 para scores típicos (5–6 → ~0,8). */
const CONFIDENCE_SCORE_CAP = 6.5;

/**
 * Normalização alinhada ao heurístico: minúsculas e remoção de acentos (ASCII).
 * @param {string} s
 * @returns {string}
 */
function stripAccentsLower(s) {
  return String(s)
    .toLowerCase()
    .replace(/ã/g, 'a')
    .replace(/á|à|â/g, 'a')
    .replace(/é|ê/g, 'e')
    .replace(/í/g, 'i')
    .replace(/ó|ô/g, 'o')
    .replace(/ú/g, 'u')
    .replace(/ç/g, 'c');
}

/**
 * @param {string} norm
 * @returns {string[]}
 */
function simpleTokenize(norm) {
  return String(norm)
    .replace(/[^a-z0-9\u00C0-\u024F]+/g, ' ')
    .trim()
    .split(/\s+/)
    .map((t) => stripAccentsLower(t))
    .filter((t) => t.length > 0 && t.length < 64);
}

/**
 * Palavras de paragem mínimas (apenas 1 letra; bigrams úteis mantêm-se).
 */
const STOP = new Set(['o', 'a', 'os', 'as', 'de', 'da', 'do', 'das', 'dos', 'em', 'no', 'na', 'nos', 'nas', 'um', 'uma', 'e', 'ou', 'se', 'que', 'me', 'te', 'la', 'lo']);

/**
 * Léxicos: **fortes** (+3) e **contextuais** (+2) por intenção.
 * Alinhado ao domínio industrial / Conselho Cognitivo.
 */
const LEX = {
  get_user_role: {
    strong: new Set([
      'cargo',
      'funcao',
      'funca',
      'papel',
      'perfil',
      'permissao',
      'hierarquia',
      'superior',
      'subordinad',
      'aprovador'
    ]),
    contextual: new Set(['quem', 'qual', 'cujo', 'acesso', 'pode', 'posso', 'deveria', 'devem'])
  },
  get_machine_status: {
    strong: new Set([
      'maquina',
      'equipamento',
      'linha',
      'parada',
      'parado',
      'sensor',
      'oee',
      'falha',
      'vibrac',
      'lubrific',
      'compressor',
      'motor',
      'correia'
    ]),
    contextual: new Set([
      'status',
      'estado',
      'situacao',
      'como',
      'qual',
      'quando',
      'porque',
      'pergunta',
      'pronto',
      'funciona',
      'anda'
    ])
  },
  get_product_status: {
    strong: new Set(['produto', 'sku', 'lote', 'bloqueio', 'qualidade', 'defeito', 'retrabal', 'inspeca', 'nc', 'nqa']),
    contextual: new Set(['qual', 'como', 'reprovado', 'aprovado', 'status', 'embalagem', 'rastre', 'gargalo', 'rework'])
  },
  operational_overview: {
    strong: new Set(['situacao', 'situac', 'operacao', 'operac', 'planta', 'fabrica', 'unidade', 'geral', 'hoje', 'turno', 'kpi', 'pano', 'chao', 'frente', 'gargalo', 'fila', 'patio']),
    contextual: new Set(['como', 'qual', 'tudo', 'acontec', 'aconteceu', 'resum', 'panorama', 'visao', 'agora', 'entao', 'pergunto'])
  },
  get_user_profile: {
    strong: new Set(['perfil', 'cadastro', 'dados', 'papel', 'conta', 'identidade', 'vincul']),
    contextual: new Set(['meu', 'minha', 'meus', 'minhas', 'mostrar', 'ver', 'qual', 'dados', 'pessoal'])
  },
  get_work_orders: {
    strong: new Set(['ordem', 'ordens', 'servic', 'taref', 'manutenca', 'chamad', 'pendente', 'atribui', 'atribu']),
    contextual: new Set(['abertas', 'aberto', 'minhas', 'listar', 'os', 'recente', 'estado', 'status'])
  },
  get_operational_metrics: {
    strong: new Set(['metrica', 'kpi', 'indicad', 'painel', 'estatist', 'resum', 'totaliz']),
    contextual: new Set(['operac', 'fabrica', 'planta', 'falha', 'ativos', 'chao', 'unidade', 'turno', 'janela'])
  }
};

function tokenMatchesSet(tok, set) {
  if (set.has(tok)) return true;
  for (const w of set) {
    if (w.length > 2 && (tok.startsWith(w) || tok.includes(w))) return true;
  }
  return false;
}

function wordHitsIntent(tok, strongSet, contextSet) {
  if (tokenMatchesSet(tok, strongSet)) return 'strong';
  if (tokenMatchesSet(tok, contextSet)) return 'context';
  return null;
}

/**
 * Pontua palavra a palavra + proximidade (dois *hits* consecutivos no mesmo domínio = +1).
 * @param {string[]} tokens
 * @returns {Record<string, number>}
 */
function buildScores(tokens) {
  const intents = Object.keys(LEX);
  const scores = Object.fromEntries(intents.map((k) => [k, 0]));
  for (const rawTok of tokens) {
    if (STOP.has(rawTok)) continue;
    for (const intent of intents) {
      const { strong, contextual } = LEX[intent];
      const h = wordHitsIntent(rawTok, strong, contextual);
      if (h === 'strong') scores[intent] += WEIGHT_STRONG;
      else if (h === 'context') scores[intent] += WEIGHT_CONTEXT;
    }
  }

  for (let i = 0; i < tokens.length - 1; i += 1) {
    for (const intent of intents) {
      const { strong, contextual } = LEX[intent];
      const a = wordHitsIntent(tokens[i], strong, contextual);
      const b = wordHitsIntent(tokens[i + 1], strong, contextual);
      if (a && b) {
        scores[intent] += WEIGHT_PROXIMITY;
      }
    }
  }

  return scores;
}

/**
 * Mapeia score bruto → confiança [0,1] (não requer soma=1; interpretável e estável).
 * @param {number} s
 * @returns {number}
 */
function scoreToConfidence(s) {
  if (s <= 0) return 0;
  return Math.min(0.99, Math.round(100 * (s / (s + CONFIDENCE_SCORE_CAP))) / 100);
}

/**
 * Extrai entidades reutilizando a lógica do heurístico (nomes, tags de máquina, produto).
 * @param {string} text
 * @param {string} lower
 * @param {string} norm
 * @returns {Record<string, string>}
 */
function extractEntitiesLikeHeuristic(text, lower, norm) {
  const entities = {};

  if (
    lower.includes('cargo') ||
    lower.includes('função') ||
    norm.includes('funcao')
  ) {
    const mDe = text.match(/\b(?:de|do|da)\s+([A-Za-zÀ-ÿ]{2,}(?:\s+[A-Za-zÀ-ÿ]+)?)/i);
    if (mDe) {
      entities.person_name = mDe[1].trim();
    }
  }

  if (
    lower.includes('máquina') ||
    lower.includes('maquina') ||
    norm.includes('maquina') ||
    lower.includes('equipamento') ||
    norm.includes('equipamento')
  ) {
    const mTag = text.match(
      /\b(?:máquina|maquina|equipamento)\s*[:\s#-]*\s*([A-Za-z0-9][A-Za-z0-9._-]*)/i
    );
    if (mTag) {
      entities.machine_id = mTag[1].trim();
    }
  }

  if (
    lower.includes('produto') ||
    norm.includes('produto') ||
    lower.includes('bloqueio') ||
    norm.includes('bloqueio')
  ) {
    const mProd = text.match(/\bproduto\s*[:\s#-]*\s*(\S+)/i);
    if (mProd) {
      entities.product = mProd[1].replace(/[,;.]$/, '');
    }
    const mBloc = text.match(/\bbloqueio\s+(?:de|do|da)?\s*(\S+)/i);
    if (mBloc && !entities.product) {
      entities.product = mBloc[1].replace(/[,;.]$/, '');
    }
  }

  return entities;
}

/**
 * @param {string|null|undefined} message
 * @returns {{ intent: string, entities: Record<string, string> }}
 */
function detectIntent(message) {
  if (message == null || typeof message !== 'string') {
    return GENERIC();
  }
  const text = message.trim();
  if (!text) {
    return GENERIC();
  }

  const lower = text.toLowerCase();
  const norm = stripAccentsLower(text);

  const entities = {};

  const hasSelfProfileIntent =
    /\b(meu|minha)\s+(perfil|cadastro|dados|cargo|papel|funca)\b/i.test(text) ||
    /\bperfil\s+do\s+utilizad/i.test(lower) ||
    /^(qual|quais)\s+/.test(lower.trim()) && /\bmeu\s+cargo\b/.test(lower);
  if (hasSelfProfileIntent) {
    return { intent: 'get_user_profile', entities: {} };
  }

  const hasWorkOrdersIntent =
    lower.includes('ordem de servi') ||
    lower.includes('ordens de servi') ||
    lower.includes('os abertas') ||
    (lower.includes('minhas') && (/\bos\b/.test(lower) || lower.includes('tarefa'))) ||
    lower.includes('ordens pendentes');
  if (hasWorkOrdersIntent) {
    return { intent: 'get_work_orders', entities: {} };
  }

  const hasOpMetricsIntent =
    lower.includes('métricas operacionais') ||
    lower.includes('metricas operacionais') ||
    lower.includes('indicadores operacionais') ||
    lower.includes('kpi operacional') ||
    lower.includes('kpis operacionais') ||
    (lower.includes('kpi') && (lower.includes('fábrica') || lower.includes('fabrica') || lower.includes('planta'))) ||
    (lower.includes('indicador') && (lower.includes('operac') || norm.includes('operac')));
  if (hasOpMetricsIntent) {
    return { intent: 'get_operational_metrics', entities: {} };
  }

  const hasUserRole = lower.includes('cargo') || lower.includes('função') || norm.includes('funcao');
  const hasMachine =
    lower.includes('máquina') ||
    lower.includes('maquina') ||
    norm.includes('maquina') ||
    lower.includes('equipamento') ||
    norm.includes('equipamento');
  const hasProduct =
    lower.includes('produto') ||
    norm.includes('produto') ||
    lower.includes('bloqueio') ||
    norm.includes('bloqueio');

  if (hasUserRole) {
    const mDe = text.match(/\b(?:de|do|da)\s+([A-Za-zÀ-ÿ]{2,}(?:\s+[A-Za-zÀ-ÿ]+)?)/i);
    if (mDe) {
      entities.person_name = mDe[1].trim();
    }
    return { intent: 'get_user_role', entities };
  }

  const broadOperationalOverview =
    lower.includes('situação') ||
    norm.includes('situacao') ||
    lower.includes('operação') ||
    norm.includes('operacao') ||
    lower.includes('status geral') ||
    lower.includes('o que está acontecendo') ||
    norm.includes('o que esta acontecendo');

  if (broadOperationalOverview) {
    return { intent: 'operational_overview', entities: {} };
  }

  if (hasMachine) {
    const mTag = text.match(
      /\b(?:máquina|maquina|equipamento)\s*[:\s#-]*\s*([A-Za-z0-9][A-Za-z0-9._-]*)/i
    );
    if (mTag) {
      entities.machine_id = mTag[1].trim();
    }
    return { intent: 'get_machine_status', entities };
  }

  if (hasProduct) {
    const mProd = text.match(/\bproduto\s*[:\s#-]*\s*(\S+)/i);
    if (mProd) {
      entities.product = mProd[1].replace(/[,;.]$/, '');
    }
    const mBloc = text.match(/\bbloqueio\s+(?:de|do|da)?\s*(\S+)/i);
    if (mBloc && !entities.product) {
      entities.product = mBloc[1].replace(/[,;.]$/, '');
    }
    return { intent: 'get_product_status', entities };
  }

  return GENERIC();
}

/**
 * Deteção **semântica leve** (pontuação + múltiplas intenções) — sem APIs externas.
 * Opcional: usar quando precisar de ranking e confidências, mantendo {@link detectIntent} no fluxo legado.
 *
 * @param {string|null|undefined} message
 * @returns {{
 *   intents: Array<{ intent: string, confidence: number }>,
 *   entities: Record<string, string>
 * }}
 */
function detectIntentAdvanced(message) {
  if (message == null || typeof message !== 'string' || !String(message).trim()) {
    return { intents: [{ intent: 'generic', confidence: 1 }], entities: {} };
  }
  const text = message.trim();
  const lower = text.toLowerCase();
  const norm = stripAccentsLower(text);
  const tokens = simpleTokenize(norm);

  if (tokens.length === 0) {
    return { intents: [{ intent: 'generic', confidence: 1 }], entities: {} };
  }

  const scores = buildScores(tokens);
  const entities = extractEntitiesLikeHeuristic(text, lower, norm);

  const ranked = Object.entries(scores)
    .filter(([, s]) => s > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([intent, s]) => ({
      intent,
      confidence: scoreToConfidence(s)
    }));

  if (ranked.length === 0) {
    return { intents: [{ intent: 'generic', confidence: 1 }], entities: {} };
  }

  return { intents: ranked, entities };
}

const WEAK_FOLLOWUP_MAX_TOKENS = 5;
const WEAK_FOLLOWUP_CONFIDENCE = 0.4;

/** Sinais linguísticos de preocupação / visão geral (sem chamar modelos). */
const IMPLICIT_OPERATIONAL_PATTERNS = [
  { name: 'como_estamos', re: /como\s+estamos\b/i },
  { name: 'como_andamos', re: /como\s+andamos\b/i },
  { name: 'como_vamos', re: /como\s+vamos\b/i },
  { name: 'situacao_geral', re: /situa[çc][aã]o\s+geral|panorama(\s+geral)?/i },
  { name: 'visao_geral', re: /vis[aã]o\s+geral/i },
  { name: 'isso_ruim', re: /(isso|tudo|anda)\s+(est[áa]|t[aá]|ficou)\s+(ruim|mal|p[ée]ssim|horr[íi]vel|complicad)/i },
  { name: 'ta_ruim', re: /\bt[áa]\s+ruim\b|\best[áa]\s+mal\b/i },
  { name: 'tem_problema', re: /tem(\s+alg[uo]m)?\s+problema|h[áa]\s+problema|existe(\s+alg[uo]m)?\s+problema/i },
  { name: 'o_que_aconteceu', re: /o\s+que\s+([eé]?\s+)?(que\s+)?(est[áa]\s+)?acontecendo|o\s+que\s+se\s+passa/i }
];

/**
 * Última intenção não genérica (para continuidade multi-turno).
 * @param {string[]|null|undefined} list
 * @returns {string|null}
 */
function getLastRelevantIntent(list) {
  const arr = Array.isArray(list) ? list : [];
  for (let i = arr.length - 1; i >= 0; i -= 1) {
    const x = arr[i] != null ? String(arr[i]).trim() : '';
    if (x && x !== 'generic') {
      return x;
    }
  }
  return null;
}

/**
 * Follow-up fraco: poucas palavras e sem entidades fortes novas (sem máquina/produto/pessoa explícita).
 * @param {string} text
 * @param {Record<string, string>} ent
 * @param {string[]} tokens
 * @returns {boolean}
 */
function isShortFollowupWithoutNewEntities(text, ent, tokens) {
  if (tokens.length > WEAK_FOLLOWUP_MAX_TOKENS) {
    return false;
  }
  if (ent && (ent.machine_id || ent.product || ent.person_name)) {
    return false;
  }
  if (ent && Object.keys(ent).length > 0) {
    return false;
  }
  const t = String(text);
  if (/\b(?:m[áa]quina|equipamento)\s*[:#-]?\s*[A-Za-z0-9._-]{2,}/i.test(t)) {
    return false;
  }
  if (/\bproduto\s*[:#-]?\s*\S{2,}/i.test(t)) {
    return false;
  }
  if (
    /\b(kpi|m[eé]tric|indicad|situa[çc](?:ao|ão)|opera[çc](?:ao|ão)\s+geral|planta|f[aá]brica|lote|sku|ordem|bloqueio|defeito|retrabal|produto\s+novo|status\s+geral)\b/i.test(
      t
    )
  ) {
    return false;
  }
  return true;
}

/**
 * Deteta pedidos de visão geral / estado operacional por frases, sem API externa.
 * Só produz intenção quando a classificação avançada não traz intenção de domínio clara
 * (generic ou confidência < 0,5) e o texto sinaliza contexto operacional.
 *
 * @param {string|null|undefined} message
 * @param {null|{ last_intents?: string[], last_entities?: object }|undefined} _sessionContext
 * @param {{ intents: Array<{ intent: string, confidence: number }>, entities?: object }|null|undefined} [advancedResult] — reutilizar {@link detectIntentAdvanced} (evita duplicar o trabalho)
 * @returns {null|{ intent: 'operational_overview', reason: string }}
 */
function inferImplicitOperationalIntent(message, _sessionContext, advancedResult) {
  void _sessionContext;
  if (message == null || typeof message !== 'string' || !String(message).trim()) {
    return null;
  }
  const text = String(message).trim();
  const adv = advancedResult != null ? advancedResult : detectIntentAdvanced(text);
  const top = adv.intents && adv.intents[0] ? adv.intents[0] : { intent: 'generic', confidence: 0 };
  const conf = typeof top.confidence === 'number' && Number.isFinite(top.confidence) ? top.confidence : 0;
  for (const { name, re } of IMPLICIT_OPERATIONAL_PATTERNS) {
    if (re.test(text)) {
      if (top.intent && top.intent !== 'generic' && conf >= 0.5) {
        return null;
      }
      return { intent: 'operational_overview', reason: name };
    }
  }
  return null;
}

/**
 * Usa o resultado de {@link detectIntentAdvanced} e, quando o sinal for fraco,
 * herda a última intenção/entidades da sessão (multi-turno seguro, sem API externa).
 *
 * @param {string|null|undefined} message
 * @param {null|{ last_intents?: string[], last_entities?: object }|undefined} sessionContext
 * @param {{ intents: Array<{ intent: string, confidence: number }>, entities?: object }|null|undefined} [precomputedAdvanced]
 * @returns {{ intent: string, entities: Record<string, string> }}
 */
function detectIntentWithContext(message, sessionContext, precomputedAdvanced) {
  const sc =
    sessionContext && typeof sessionContext === 'object' && !Array.isArray(sessionContext)
      ? sessionContext
      : null;
  const lastIntents = sc && Array.isArray(sc.last_intents) ? sc.last_intents : [];
  const lastEnt =
    sc && sc.last_entities && typeof sc.last_entities === 'object' && !Array.isArray(sc.last_entities)
      ? sc.last_entities
      : {};
  const lastRelevant = getLastRelevantIntent(lastIntents);

  if (message == null || typeof message !== 'string' || !String(message).trim()) {
    if (lastRelevant) {
      const entOut = { ...lastEnt };
      return { intent: lastRelevant, entities: entOut };
    }
    return GENERIC();
  }

  const text = String(message).trim();
  const norm = stripAccentsLower(text);
  const adv = precomputedAdvanced != null ? precomputedAdvanced : detectIntentAdvanced(text);
  const top = adv.intents && adv.intents[0] ? adv.intents[0] : { intent: 'generic', confidence: 0 };
  let intent = top.intent;
  let conf = typeof top.confidence === 'number' && Number.isFinite(top.confidence) ? top.confidence : 0;
  const entities = { ...adv.entities };
  const tokens = simpleTokenize(norm);

  const useSessionIntent =
    !!lastRelevant &&
    (conf < WEAK_FOLLOWUP_CONFIDENCE ||
      top.intent === 'generic' ||
      isShortFollowupWithoutNewEntities(text, entities, tokens));

  if (useSessionIntent) {
    intent = lastRelevant;
  }

  const hasNewEntities = Object.keys(entities).length > 0;
  const outEnt = (() => {
    if (hasNewEntities) {
      return { ...lastEnt, ...entities };
    }
    if (useSessionIntent) {
      return Object.keys(lastEnt).length > 0 ? { ...lastEnt } : {};
    }
    if (lastRelevant && intent === lastRelevant) {
      return Object.keys(lastEnt).length > 0 ? { ...lastEnt } : {};
    }
    return {};
  })();
  return { intent, entities: outEnt };
}

module.exports = {
  detectIntent,
  detectIntentAdvanced,
  detectIntentWithContext,
  inferImplicitOperationalIntent
};
