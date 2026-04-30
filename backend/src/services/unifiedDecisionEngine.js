'use strict';

/**
 * Motor de decisão unificado IMPETUS — camada aditiva.
 *
 * Ativação: UNIFIED_DECISION_ENGINE=true
 * Validação cognitiva extra (tríade sobre o veredito estruturado): UNIFIED_DECISION_USE_COUNCIL=true
 *
 * Não substitui executionLayer nem decisionEngineService; compõe e audita.
 */

const decisionEngineService = require('./decisionEngineService');
const { getUnifiedSessionContext } = require('./unifiedSessionContextService');
const { getStructuralKnowledge } = require('./structuralKnowledgeService');
const unifiedDecisionMetricsService = require('./unifiedDecisionMetricsService');
const aggregator = require('./unifiedMetricsAggregatorService');

const HUMAN_RISK_RANK = { critical: 4, high: 3, medium: 2, low: 1, none: 0 };
const HUMAN_RISK_KEYWORDS =
  /\b(emerg(ê|e)ncia|acidente|evacua|vazamento|inc(ê|e)ndio|explos|morte|falec|ferid|choque el(é|e)trico|arco el(é|e)trico|qu(í|i)mico t(ó|o)xico)\b/i;

function isEnabled() {
  return process.env.UNIFIED_DECISION_ENGINE === 'true';
}

/**
 * @param {unknown} text
 * @returns {boolean}
 */
function messageSuggestsHumanRisk(text) {
  const t = text != null ? String(text) : '';
  return HUMAN_RISK_KEYWORDS.test(t);
}

/**
 * Heurística leve para mapear texto livre → tipo do buildOptions (sem NLP pesado).
 * @param {unknown} text
 * @param {string} [explicitType]
 * @returns {string}
 */
function inferDecisionTypeFromMessage(text, explicitType) {
  if (explicitType && String(explicitType).trim()) return String(explicitType).trim();
  const t = (text != null ? String(text) : '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  if (/\b(pressao|compressor|ar comprimido|queda de pressao)\b/.test(t)) return 'pressure_drop';
  if (/\b(sobrecarga|burnout|esgotamento|turno extra|lota(c|ç)ao)\b/.test(t)) return 'overload';
  if (
    /\b(prejuizo|custo|orcamento|financeiro|risco financeiro|inadimpl|fluxo de caixa)\b/.test(t)
  ) {
    return 'financial_risk';
  }
  return 'general';
}

/**
 * @param {object} ctx
 */
function normalizeContext(ctx) {
  const c = ctx && typeof ctx === 'object' && !Array.isArray(ctx) ? ctx : {};
  const message =
    c.message != null
      ? String(c.message)
      : c.situation != null
        ? String(c.situation)
        : c.text != null
          ? String(c.text)
          : '';
  const type = inferDecisionTypeFromMessage(message, c.type);
  const situation =
    c.situation != null && String(c.situation).trim()
      ? String(c.situation).trim()
      : message
        ? `Contexto IMPETUS (${c.module || c.source || 'geral'}): ${message.slice(0, 500)}`
        : 'Situação não especificada — modo conservador.';

  return {
    raw: c,
    message,
    type,
    situation,
    company_id: c.company_id != null ? c.company_id : null,
    conversationId: c.conversationId != null ? c.conversationId : null,
    module: c.module != null ? String(c.module) : null
  };
}

function clamp01(x) {
  const n = Number(x);
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

const DEFAULT_SCORE_WEIGHTS = { risk: 0.4, complexity: 0.2, uncertainty: 0.2, impact: 0.2 };

/**
 * Ajuste conservador de pesos com base no buffer de métricas (sem efeitos colaterais externos).
 * @param {object} baseWeights
 * @param {object|null} metrics — getMetricsSnapshot
 */
function adjustWeightsDynamically(baseWeights, metrics) {
  const w = {
    risk: Number(baseWeights.risk) || DEFAULT_SCORE_WEIGHTS.risk,
    complexity: Number(baseWeights.complexity) || DEFAULT_SCORE_WEIGHTS.complexity,
    uncertainty: Number(baseWeights.uncertainty) || DEFAULT_SCORE_WEIGHTS.uncertainty,
    impact: Number(baseWeights.impact) || DEFAULT_SCORE_WEIGHTS.impact
  };
  const m = metrics && typeof metrics === 'object' ? metrics : {};
  const fr = Number(m.fallback_rate);
  if (Number.isFinite(fr) && fr > 0.2) {
    w.uncertainty += 0.1;
  }
  const latC = m.avg_latency && Number(m.avg_latency.cognitive);
  if (Number.isFinite(latC) && latC > 2000) {
    w.complexity -= 0.05;
  }
  const pu = m.pipeline_usage;
  if (pu && typeof pu === 'object') {
    const g = Number(pu.gpt) || 0;
    const c = Number(pu.cognitive) || 0;
    const tot = g + c;
    if (tot >= 8 && c / tot > 0.85) {
      w.uncertainty += 0.05;
    }
  }
  const sum = w.risk + w.complexity + w.uncertainty + w.impact;
  if (!sum || sum <= 0) return { ...DEFAULT_SCORE_WEIGHTS };
  return {
    risk: w.risk / sum,
    complexity: w.complexity / sum,
    uncertainty: w.uncertainty / sum,
    impact: w.impact / sum
  };
}

/**
 * Padrões temporais derivados de deriveTemporalInsights (somente leitura de estruturas).
 * @param {object|null} temporalInsights
 * @returns {{ cascade_detected: boolean, anomaly_spike: boolean, instability_level: number }}
 */
function analyzeTemporalPatterns(temporalInsights) {
  const empty = { cascade_detected: false, anomaly_spike: false, instability_level: 0 };
  if (!temporalInsights || typeof temporalInsights !== 'object') return empty;

  const anomalies = Array.isArray(temporalInsights.anomaly_patterns)
    ? temporalInsights.anomaly_patterns
    : [];
  const profiles = Array.isArray(temporalInsights.machine_profiles)
    ? temporalInsights.machine_profiles
    : [];

  const byEvent = new Map();
  for (const a of anomalies) {
    const et = a && a.event_type != null ? String(a.event_type) : '';
    const mid = a && a.machine_id != null ? String(a.machine_id) : '';
    if (!et || !mid) continue;
    if (!byEvent.has(et)) byEvent.set(et, new Set());
    byEvent.get(et).add(mid);
  }
  let cascade_detected = false;
  for (const s of byEvent.values()) {
    if (s.size >= 3) {
      cascade_detected = true;
      break;
    }
  }
  if (!cascade_detected) {
    const stressed = profiles.filter(
      (p) =>
        p &&
        (p.trend_direction === 'up' || (p.recurrence_score || 0) >= 0.5) &&
        (p.confidence_score || 0) >= 0.35
    );
    if (stressed.length >= 4) cascade_detected = true;
  }

  const tm =
    temporalInsights.trend_metrics && typeof temporalInsights.trend_metrics === 'object'
      ? temporalInsights.trend_metrics
      : { r_squared: 0, slope_per_week: 0 };
  const r2 = clamp01(Number(tm.r_squared) || 0);
  const slope = Number(tm.slope_per_week) || 0;

  const anomaly_spike =
    anomalies.length >= 2 ||
    (temporalInsights.trend_direction === 'up' &&
      (Number(temporalInsights.global_trend_confidence) || 0) > 0.55);

  let instability = 0;
  if (temporalInsights.trend_direction === 'unknown') instability += 0.22;
  instability += Math.min(0.38, (1 - r2) * 0.38);
  instability += Math.min(0.28, Math.abs(slope) * 0.06);
  instability += Math.min(0.18, anomalies.length * 0.035);
  instability = clamp01(instability);

  return {
    cascade_detected,
    anomaly_spike,
    instability_level: Math.round(instability * 1000) / 1000
  };
}

/**
 * Limiar dinâmico para roteamento da tríade (janela de métricas agregadas).
 * @param {object|null} metrics
 * @param {number} [base]
 */
function calibrateThresholds(metrics, base = 0.6) {
  let t = Number(base);
  if (!Number.isFinite(t)) t = 0.6;
  const m = metrics && typeof metrics === 'object' ? metrics : {};
  const avg = Number(m.avg_score);
  if (Number.isFinite(avg)) {
    if (avg < 0.4) t -= 0.05;
    if (avg > 0.7) t += 0.05;
  }
  const pu = m.pipeline_usage;
  if (pu && typeof pu === 'object') {
    const tot = (Number(pu.gpt) || 0) + (Number(pu.cognitive) || 0);
    if (tot >= 8 && (Number(pu.cognitive) || 0) / tot > 0.75) {
      t += 0.04;
    }
  }
  return Math.round(Math.min(0.85, Math.max(0.45, t)) * 1000) / 1000;
}

/**
 * Score 0–1 para recomendar pipeline (GPT vs cognitivo). Não executa acções.
 * @param {{ context: { norm: object, humanStress?: boolean, evaluated?: object }, temporal: object|null, knowledge: object[], weights?: object, temporalAnalysis?: object }} args
 * @returns {{ score: number, risk_level: 'LOW'|'MEDIUM'|'HIGH', components: { risk: number, complexity: number, uncertainty: number, impact: number } }}
 */
function computeDecisionScore({ context, temporal, knowledge, weights, temporalAnalysis }) {
  const norm = context && context.norm ? context.norm : normalizeContext({});
  const humanStress = !!(context && context.humanStress);
  const evaluated = context && context.evaluated ? context.evaluated : null;

  let risk = 0;
  if (humanStress) risk += 0.45;
  const chosen = evaluated && evaluated.chosen ? evaluated.chosen : null;
  const hr = chosen && chosen.humanRisk;
  const riskMap = { critical: 0.95, high: 0.7, medium: 0.45, low: 0.25, none: 0.12 };
  if (hr != null && riskMap[hr] != null) {
    risk = Math.max(risk, riskMap[hr]);
  }
  risk = clamp01(risk);
  if (temporal && temporal.trend_direction === 'up') {
    risk = clamp01(risk + 0.15);
  }
  if (temporal && temporal.trend_direction === 'unknown') {
    risk = clamp01(risk + 0.05);
  }

  let complexity = 0;
  const msgLen = norm.message ? String(norm.message).length : 0;
  if (msgLen > 500) complexity += 0.25;
  else if (msgLen > 200) complexity += 0.12;
  const recPat = Array.isArray(temporal?.recurring_patterns) ? temporal.recurring_patterns.length : 0;
  complexity += Math.min(0.35, recPat * 0.05);

  let uncertainty = 0.15;
  const klen = Array.isArray(knowledge) ? knowledge.length : 0;
  if (klen === 0) uncertainty += 0.25;
  else uncertainty -= Math.min(0.2, klen * 0.04);
  const histRows = temporal && temporal.history_rows_used != null ? Number(temporal.history_rows_used) : 0;
  if (histRows < 5) uncertainty += 0.1;
  if (temporal && temporal.trend_direction === 'unknown') uncertainty += 0.08;
  if (temporal && temporal.trend_direction === 'down') {
    uncertainty = clamp01(uncertainty - 0.06);
  }
  uncertainty = clamp01(uncertainty);

  let impact = 0.15;
  impact += Math.min(0.55, histRows / 500);
  const profiles = Array.isArray(temporal?.machine_profiles) ? temporal.machine_profiles.length : 0;
  impact += Math.min(0.25, profiles * 0.04);
  impact = clamp01(impact);

  let ta =
    temporalAnalysis && typeof temporalAnalysis === 'object'
      ? temporalAnalysis
      : analyzeTemporalPatterns(temporal);
  if (!ta || typeof ta !== 'object') {
    ta = { cascade_detected: false, anomaly_spike: false, instability_level: 0 };
  }
  if (ta.cascade_detected) risk = clamp01(risk + 0.2);
  if (ta.anomaly_spike) impact = clamp01(impact + 0.1);
  uncertainty = clamp01(uncertainty + clamp01(Number(ta.instability_level) || 0) * 0.15);

  const w0 =
    weights && typeof weights === 'object' ? weights : { ...DEFAULT_SCORE_WEIGHTS };
  const w = {
    risk: Number(w0.risk) || 0.25,
    complexity: Number(w0.complexity) || 0.25,
    uncertainty: Number(w0.uncertainty) || 0.25,
    impact: Number(w0.impact) || 0.25
  };
  const sumW = w.risk + w.complexity + w.uncertainty + w.impact;
  const wn =
    sumW > 0
      ? {
          risk: w.risk / sumW,
          complexity: w.complexity / sumW,
          uncertainty: w.uncertainty / sumW,
          impact: w.impact / sumW
        }
      : { ...DEFAULT_SCORE_WEIGHTS };

  const score = clamp01(
    risk * wn.risk + complexity * wn.complexity + uncertainty * wn.uncertainty + impact * wn.impact
  );
  let risk_level = 'MEDIUM';
  if (score < 0.3) risk_level = 'LOW';
  else if (score > 0.6) risk_level = 'HIGH';

  return {
    score,
    risk_level,
    components: { risk, complexity, uncertainty, impact }
  };
}

/**
 * Sinais para decisão: agregador opcional, sessão unificada, conhecimento estrutural.
 * @param {object|null} user
 * @param {object} norm
 */
async function loadDecisionSignals(user, norm) {
  const snapshot = { aggregator: null, session: null, knowledge: [] };

  try {
    const agg = require('./globalContextAggregatorService');
    if (agg && typeof agg.aggregate === 'function') {
      snapshot.aggregator = await agg.aggregate({ user, context: norm.raw });
    }
  } catch (_e) {
    /* opcional — não existe no projeto base */
  }

  if (user && user.company_id && user.id) {
    try {
      snapshot.session = await getUnifiedSessionContext(user);
    } catch (_e) {
      snapshot.session = null;
    }
  }

  const companyKey = user?.company_id ?? norm.company_id ?? null;
  snapshot.knowledge = await getStructuralKnowledge(
    companyKey != null ? String(companyKey) : null
  );

  return snapshot;
}

/**
 * Ajuste leve de scores com base em conhecimento estrutural e texto (sem executar acções).
 * Ordem de importância conceitual: segurança humana > risco operacional > impacto financeiro > consistência com conhecimento.
 * @param {object[]} options
 * @param {{ knowledge?: object[], sessionContext?: object, queryText?: string, humanStress?: boolean }} signals
 * @returns {object[]}
 */
function evaluateOptions(options, signals) {
  const knowledge = Array.isArray(signals.knowledge) ? signals.knowledge : [];
  const queryText = String(signals.queryText || '');
  const humanStress = !!signals.humanStress;
  if (!Array.isArray(options) || options.length === 0) return [];

  const knowledgeBlob = knowledge
    .map((k) => `${k.title || ''} ${k.summary || ''}`)
    .join(' ')
    .toLowerCase();

  const queryTokens = new Set(
    queryText
      .toLowerCase()
      .split(/\W+/)
      .filter((w) => w.length > 3)
  );

  return options.map((opt) => {
    const op = { ...opt };
    const scores =
      op.scores && typeof op.scores === 'object' && !Array.isArray(op.scores)
        ? { ...op.scores }
        : {
            people_safety: 5,
            health_wellbeing: 5,
            ethics_compliance: 5,
            financial: 5,
            operational: 5
          };

    let align = 0;
    const blob = `${op.label || ''} ${op.reason || ''}`.toLowerCase();
    for (const w of queryTokens) {
      if (w && blob.includes(w)) align += 0.12;
      if (w && knowledgeBlob.includes(w)) align += 0.08;
    }
    align = Math.min(2, align);
    op._knowledge_alignment = Number(align.toFixed(3));

    if (knowledge.length > 0) {
      const ethics0 = typeof scores.ethics_compliance === 'number' ? scores.ethics_compliance : 5;
      scores.ethics_compliance = Math.min(10, ethics0 + Math.min(1.5, 0.25 * knowledge.length + align * 0.3));
      const fin0 = typeof scores.financial === 'number' ? scores.financial : 5;
      scores.financial = Math.min(10, fin0 + align * 0.15);
    }

    if (humanStress) {
      const p0 = typeof scores.people_safety === 'number' ? scores.people_safety : 5;
      scores.people_safety = Math.min(10, p0 + 0.6);
      const op0 = typeof scores.operational === 'number' ? scores.operational : 5;
      scores.operational = Math.max(0, op0 - 0.2);
    }

    op.scores = scores;
    return op;
  });
}

/**
 * Escalonamento cognitivo quando há empate ou tensão entre risco humano declarado e score.
 * @param {object} evaluated — saída de decisionEngineService.evaluate
 */
function needsCognitiveEscalation(evaluated) {
  const opts = evaluated && Array.isArray(evaluated.options) ? evaluated.options : [];
  if (opts.length < 2) return false;

  const scores = opts.map((o) => (typeof o._score === 'number' ? o._score : 0)).sort((a, b) => b - a);
  if (scores.length >= 2 && scores[0] - scores[1] < 0.06) return true;

  const riskRank = (r) => ({ critical: 0, high: 1, medium: 2, low: 3, none: 4 }[r] ?? 2);
  const sorted = [...opts].sort((a, b) => (b._score || 0) - (a._score || 0));
  const top = sorted[0];
  const alt = sorted.find(
    (o) => o !== top && Math.abs((o._score || 0) - (top._score || 0)) < 0.12
  );
  if (top && alt && Math.abs(riskRank(top.humanRisk) - riskRank(alt.humanRisk)) >= 2) return true;

  return false;
}

/**
 * Critérios IMPETUS explícitos por opção (espelha pesos do motor clássico + regra de conflito).
 * @param {object[]} scored
 * @param {object} chosen
 * @param {boolean} humanStress
 */
function applyImpetusGovernance(scored, chosen, humanStress) {
  if (!Array.isArray(scored) || scored.length === 0) {
    return { chosen, governance_notes: ['Sem opções — fluxo conservador.'] };
  }

  const notes = [];
  const viable = scored.filter((o) => o && o.humanRisk !== 'critical');
  const pool = viable.length ? viable : scored;

  const ranked = pool.map((o) => ({
    opt: o,
    score: typeof o._score === 'number' ? o._score : 0,
    people: o.scores && typeof o.scores.people_safety === 'number' ? o.scores.people_safety : 0,
    hr: HUMAN_RISK_RANK[o.humanRisk] != null ? HUMAN_RISK_RANK[o.humanRisk] : 2
  }));

  const maxS = Math.max(...ranked.map((r) => r.score));
  const tops = ranked.filter((r) => r.score === maxS);

  let pick = tops[0].opt;
  if (tops.length > 1 || humanStress) {
    tops.sort((a, b) => {
      if (b.people !== a.people) return b.people - a.people;
      return a.hr - b.hr;
    });
    pick = tops[0].opt;
    if (humanStress) {
      notes.push('Estresse de segurança inferido no texto — desempate favorece people_safety e menor risco humano residual.');
    } else {
      notes.push('Empate de score — desempate pela opção mais segura para pessoas e menor risco residual declarado.');
    }
  }

  if (humanStress && pick.scores && pick.scores.people_safety < 7) {
    const safer = [...ranked].sort((a, b) => b.people - a.people)[0];
    if (safer && safer.opt !== pick) {
      notes.push('Correção de governança: priorização absoluta de segurança humana.');
      pick = safer.opt;
    }
  }

  return { chosen: pick, governance_notes: notes };
}

/**
 * @param {object} evaluated
 * @param {object} norm
 * @param {object|null} globalSnap
 */
function buildStructuredReasoning(evaluated, norm, globalSnap) {
  const lines = [];
  lines.push(evaluated.explanation || '');
  const sess = globalSnap?.session;
  if (sess?.last_intents?.length) {
    lines.push(`Sessão — intenções recentes: ${sess.last_intents.slice(0, 5).join(', ')}.`);
  } else if (sess?.intents?.length) {
    lines.push(`Sessão — intenções recentes: ${sess.intents.slice(0, 5).join(', ')}.`);
  }
  const kn = globalSnap?.knowledge;
  if (Array.isArray(kn) && kn.length > 0) {
    lines.push(`Conhecimento estrutural consultado: ${kn.length} documento(s) recente(s).`);
  }
  const tmp = globalSnap?.temporal;
  if (tmp && tmp.trend_direction != null) {
    lines.push(
      `Tendência temporal (histórico de correlação): ${tmp.trend_direction}; registos: ${tmp.history_rows_used ?? 0}.`
    );
  }
  return lines.filter(Boolean).join('\n').trim();
}

/**
 * @param {object} envelope
 * @returns {object}
 */
function stripForDossier(envelope) {
  if (!envelope || typeof envelope !== 'object') return {};
  return {
    source_engine: envelope.source_engine,
    decision: envelope.decision
      ? {
          label: envelope.decision.label,
          justification: envelope.decision.justification || envelope.decision.reason,
          humanRisk: envelope.decision.humanRisk
        }
      : null,
    reasoning: envelope.reasoning ? String(envelope.reasoning).slice(0, 4000) : '',
    criteria_scores: Array.isArray(envelope.criteria_scores)
      ? envelope.criteria_scores.slice(0, 12)
      : [],
    governance_notes: envelope.governance_notes || [],
    cognitive_validation: envelope.cognitive_validation ? true : false
  };
}

/**
 * Tríade apenas como validador do veredito estruturado (não duplica execution para o mesmo pedido do utilizador).
 */
async function runCognitiveValidationLayer({
  user,
  situation,
  evaluated,
  skipCognitiveInvocation,
  forceEscalation
}) {
  if (skipCognitiveInvocation) return null;
  if (process.env.UNIFIED_DECISION_USE_COUNCIL !== 'true' && !forceEscalation) return null;

  let orchestrator;
  try {
    orchestrator = require('../ai/cognitiveOrchestrator');
  } catch (_e) {
    return null;
  }

  if (!orchestrator || typeof orchestrator.runCognitiveCouncil !== 'function') return null;

  const requestText =
    `Validação IMPETUS (motor unificado): confirme se a decisão estruturada abaixo respeita prioridade absoluta de segurança humana, ética, conformidade, continuidade operacional e proteção financeira (nesta ordem de tensão com segurança primeiro). ` +
    `Responda em até 5 linhas: veredito (confirma ou sugere ajuste), risco residual, recomendação operacional prudente.\n\n` +
    `Situação: ${situation}\n` +
    `Decisão pré-selecionada: ${evaluated.chosen.label}\n` +
    `Justificativa: ${evaluated.chosen.justification || evaluated.chosen.reason || ''}`;

  try {
    const out = await orchestrator.runCognitiveCouncil({
      user: user || { id: null, company_id: null, role: null },
      requestText,
      input: { text: requestText },
      data: {
        contextual_data: {
          unified_validation: true,
          structured_decision: evaluated.chosen.label
        }
      },
      context: { source: 'unified_decision_engine' },
      module: 'unified_decision_validation',
      options: { skipRecursiveUnified: true, forceCrossValidation: false }
    });
    const result = out && out.result ? out.result : null;
    const answer =
      result && typeof result.answer === 'string'
        ? result.answer.slice(0, 2000)
        : result && typeof result.content === 'string'
          ? result.content.slice(0, 2000)
          : null;
    return { ok: !!(out && out.ok), answer, raw_ok: out?.ok };
  } catch (err) {
    console.warn('[unifiedDecisionEngine][cognitive_validation]', err?.message ?? err);
    return null;
  }
}

/**
 * @param {object} params
 * @param {object|null} [params.user]
 * @param {object} [params.context]
 * @param {object[]|null} [params.options] opções pré-montadas (candidatas), senão buildOptions pelo tipo
 * @param {string} [params.source]
 * @param {boolean} [params.skipCognitiveInvocation]
 */
async function decide(params) {
  if (!isEnabled()) {
    return {
      ok: false,
      skipped: true,
      reason: 'UNIFIED_DECISION_ENGINE desligado',
      source_engine: 'unified',
      fallback_used: true
    };
  }

  const user = params && params.user ? params.user : null;
  const source = params && params.source != null ? String(params.source) : 'unknown';
  const skipCognitiveInvocation =
    !!(
      params &&
      (params.skipCognitiveInvocation ||
        source === 'cognitive_orchestrator' ||
        (params.context && params.context.skipCognitiveInvocation))
    );

  try {
    console.info('[UNIFIED_DECISION_START]', { source });
    const t0 = Date.now();

    const norm = normalizeContext((params && params.context) || {});
    const signalBundle = await loadDecisionSignals(user, norm);

    if ((signalBundle.knowledge || []).length > 0) {
      console.info('[UNIFIED_KNOWLEDGE_USED]', {
        items: signalBundle.knowledge.length,
        company_id: user?.company_id ?? norm.company_id
      });
    }

    let temporalInsights = null;
    const temporalCompanyId = user?.company_id ?? norm.company_id;
    if (temporalCompanyId) {
      try {
        const correlationInsightsService = require('./correlationInsightsService');
        temporalInsights = await correlationInsightsService.deriveTemporalInsights(
          String(temporalCompanyId)
        );
        console.info('[UNIFIED_TEMPORAL_USED]', {
          trend: temporalInsights?.trend_direction,
          history_rows_used: temporalInsights?.history_rows_used ?? 0
        });
      } catch (tempErr) {
        console.warn('[TEMPORAL_INSIGHTS_FAIL]', tempErr?.message ?? tempErr);
      }
    }

    const globalSnap = {
      session: signalBundle.session,
      knowledge: signalBundle.knowledge,
      aggregator: signalBundle.aggregator,
      temporal: temporalInsights
    };

    let optionListRaw =
      params && Array.isArray(params.options) && params.options.length ? params.options : null;
    if (!optionListRaw) {
      const typeForEngine = norm.type === 'general' ? '__impetus_general__' : norm.type;
      optionListRaw = decisionEngineService.buildOptions({ type: typeForEngine });
    }

    const humanStress = messageSuggestsHumanRisk(norm.message);
    const optionList = evaluateOptions(optionListRaw, {
      knowledge: signalBundle.knowledge,
      sessionContext: signalBundle.session || {},
      queryText: norm.message,
      humanStress
    });

    let evaluated;
    try {
      evaluated = decisionEngineService.evaluate(norm.situation, optionList);
    } catch (err) {
      console.warn('[unifiedDecisionEngine][evaluate]', err?.message ?? err);
      const neutral = {
        ok: true,
        decision: {
          label: 'Manter observação e continuidade operacional prudente',
          justification: 'Fallback neutro: avaliação estruturada indisponível.',
          reason: '',
          humanRisk: 'low',
          scores: {}
        },
        reasoning: 'Motor unificado em modo conservador.',
        options_considered: [],
        signals: {
          knowledge_used: (signalBundle.knowledge || []).length > 0,
          session_used: signalBundle.session != null
        },
        criteria_scores: [],
        source_engine: 'unified',
        governance_notes: ['evaluate_indisponível'],
        cognitive_validation: null,
        fallback_used: true,
        meta: {
          source,
          decision_type_inferred: norm.type,
          global_context_keys: {
            has_aggregator: !!signalBundle.aggregator,
            has_session: !!signalBundle.session,
            has_knowledge: (signalBundle.knowledge || []).length > 0,
            has_temporal: temporalInsights != null
          }
        }
      };
      console.info('[UNIFIED_DECISION_RESULT]', {
        source,
        decision_label: neutral.decision.label,
        fallback: true
      });
      unifiedDecisionMetricsService.recordFallbackMetric({
        reason: 'evaluate_failed',
        pipeline: 'fallback',
        user_id: user?.id,
        company_id: user?.company_id
      });
      unifiedDecisionMetricsService.recordLatencyMetric({
        latency_ms: Date.now() - t0,
        source,
        phase: 'decide_evaluate_error'
      });
      return {
        ...neutral,
        control_signals: {
          should_alert: false,
          requires_attention: false,
          safe_mode: true
        }
      };
    }

    const companyIdForMetrics = user?.company_id ?? norm.company_id ?? null;

    const metricsSnapshot = aggregator.getMetricsSnapshot(companyIdForMetrics);
    try {
      console.info('[UNIFIED_METRICS_SNAPSHOT]', JSON.stringify(metricsSnapshot));
    } catch (_e) {
      console.info('[UNIFIED_METRICS_SNAPSHOT]', metricsSnapshot);
    }

    const triadCapPct = Math.min(
      100,
      Math.max(0, parseInt(process.env.UNIFIED_TRIAD_MAX_PERCENT || '20', 10))
    );
    const routed =
      (metricsSnapshot.pipeline_usage?.gpt || 0) +
      (metricsSnapshot.pipeline_usage?.cognitive || 0);
    const cognitiveSharePct =
      routed > 0
        ? Math.round(
            (metricsSnapshot.pipeline_usage.cognitive / routed) * 1000
          ) / 10
        : 0;
    const forceDisableCognitive = routed >= 3 && cognitiveSharePct > triadCapPct;
    if (forceDisableCognitive) {
      console.info(
        '[UNIFIED_TRIAD_USAGE_CAP]',
        JSON.stringify({
          cognitive_usage: cognitiveSharePct,
          triadCapPct,
          total_routed: routed
        })
      );
    }

    const baseWeights = { ...DEFAULT_SCORE_WEIGHTS };
    const weights = adjustWeightsDynamically(baseWeights, metricsSnapshot);
    try {
      console.info('[UNIFIED_ADAPTIVE_WEIGHTS]', JSON.stringify(weights));
    } catch (_e) {
      console.info('[UNIFIED_ADAPTIVE_WEIGHTS]', weights);
    }

    const temporalAnalysis = analyzeTemporalPatterns(temporalInsights);
    try {
      console.info('[UNIFIED_TEMPORAL_ANALYSIS]', JSON.stringify(temporalAnalysis));
    } catch (_e) {
      console.info('[UNIFIED_TEMPORAL_ANALYSIS]', temporalAnalysis);
    }

    const dynamicThreshold = calibrateThresholds(metricsSnapshot);
    try {
      console.info(
        '[UNIFIED_DYNAMIC_THRESHOLD]',
        JSON.stringify({ dynamicThreshold, triadCapPct, forceDisableCognitive })
      );
    } catch (_e) {
      console.info('[UNIFIED_DYNAMIC_THRESHOLD]', {
        dynamicThreshold,
        triadCapPct,
        forceDisableCognitive
      });
    }

    const scoreResult = computeDecisionScore({
      context: { norm, humanStress, evaluated },
      temporal: temporalInsights,
      knowledge: signalBundle.knowledge || [],
      weights,
      temporalAnalysis
    });
    console.info(
      '[UNIFIED_DECISION_SCORE]',
      JSON.stringify({
        score: scoreResult.score,
        risk_level: scoreResult.risk_level,
        components: scoreResult.components
      })
    );

    const useTriadeEnv = process.env.UNIFIED_DECISION_USE_TRIADE === 'true';
    const pipeline =
      useTriadeEnv && scoreResult.score > dynamicThreshold && !forceDisableCognitive
        ? 'cognitive'
        : 'gpt';
    const cognitive_pipeline = pipeline === 'cognitive';
    console.info('[UNIFIED_PIPELINE_SELECTED]', {
      pipeline,
      score: scoreResult.score,
      useTriadeEnv,
      dynamicThreshold,
      triad_cap_applied: forceDisableCognitive
    });
    unifiedDecisionMetricsService.recordPipelineUsage({
      pipeline,
      source,
      user_id: user?.id,
      company_id: user?.company_id
    });

    const tieBreakEscalation = needsCognitiveEscalation(evaluated);
    const gov = applyImpetusGovernance(evaluated.options || [], evaluated.chosen, humanStress);
    const finalChosen = gov.chosen;

    let cognitive_validation = null;
    if (!skipCognitiveInvocation) {
      cognitive_validation = await runCognitiveValidationLayer({
        user,
        situation: norm.situation,
        evaluated: { ...evaluated, chosen: finalChosen },
        skipCognitiveInvocation,
        forceEscalation: cognitive_pipeline || tieBreakEscalation
      });
    }

    const criteria_scores = (evaluated.options || []).map((o) => ({
      label: o.label,
      _score: o._score,
      scores: o.scores || {},
      humanRisk: o.humanRisk || null,
      _knowledge_alignment: o._knowledge_alignment
    }));

    const reasoning = [
      buildStructuredReasoning({ ...evaluated, chosen: finalChosen }, norm, globalSnap),
      ...gov.governance_notes,
      cognitive_validation && cognitive_validation.answer
        ? `Validação tríade (resumo): ${cognitive_validation.answer}`
        : ''
    ]
      .filter(Boolean)
      .join('\n\n');

    const controlSignals = {
      should_alert: scoreResult.score > 0.7,
      requires_attention: scoreResult.score > 0.5,
      safe_mode: true
    };

    let operationalReadonlySummary = null;
    if (scoreResult.score > 0.7) {
      try {
        const operationalDecisionEngine = require('./operationalDecisionEngine');
        const odeOut = operationalDecisionEngine.evaluateOperationalDecisions(
          { immediate_actions: [], short_term_actions: [], preventive_actions: [] },
          {
            company_id: companyIdForMetrics != null ? String(companyIdForMetrics) : '',
            user_id: user?.id != null ? String(user.id) : '',
            temporal_insights: temporalInsights || {},
            unified_read_only: true,
            control_signals: controlSignals
          }
        );
        operationalReadonlySummary = {
          triggers_n: Array.isArray(odeOut.triggers) ? odeOut.triggers.length : 0,
          alerts_n: Array.isArray(odeOut.alerts) ? odeOut.alerts.length : 0,
          recommended_n: Array.isArray(odeOut.recommended_actions)
            ? odeOut.recommended_actions.length
            : 0
        };
        console.info('[UNIFIED_ODE_READONLY]', JSON.stringify(operationalReadonlySummary));
      } catch (odeErr) {
        console.warn('[UNIFIED_ODE_READONLY_FAIL]', odeErr?.message ?? odeErr);
      }
    }

    const out = {
      ok: true,
      decision: {
        label: finalChosen.label,
        justification: finalChosen.justification || finalChosen.reason || '',
        reason: finalChosen.reason || '',
        humanRisk: finalChosen.humanRisk,
        scores: finalChosen.scores || {}
      },
      reasoning,
      options_considered: (evaluated.options || []).map((o) => ({
        label: o.label,
        reason: o.reason || '',
        humanRisk: o.humanRisk,
        _score: o._score
      })),
      signals: {
        knowledge_used: (signalBundle.knowledge || []).length > 0,
        session_used: signalBundle.session != null,
        temporal_used: temporalInsights != null
      },
      criteria_scores,
      source_engine: 'unified',
      governance_notes: gov.governance_notes,
      cognitive_validation: cognitive_validation
        ? { ok: cognitive_validation.ok, summary: cognitive_validation.answer }
        : null,
      fallback_used: false,
      control_signals: controlSignals,
      meta: {
        source,
        decision_type_inferred: norm.type,
        global_context_keys: {
          has_aggregator: !!signalBundle.aggregator,
          has_session: !!signalBundle.session,
          has_knowledge: (signalBundle.knowledge || []).length > 0,
          has_temporal: temporalInsights != null
        },
        cognitive_escalation: cognitive_pipeline,
        decision_score: scoreResult.score,
        risk_level: scoreResult.risk_level,
        pipeline_recommended: pipeline,
        temporal_insights_used: temporalInsights != null,
        score_components: scoreResult.components,
        cognitive_escalation_tiebreak: tieBreakEscalation && !cognitive_pipeline,
        dynamic_threshold: dynamicThreshold,
        triad_cap_percent: triadCapPct,
        triad_cap_applied: forceDisableCognitive,
        temporal_analysis: temporalAnalysis,
        adaptive_weights: weights,
        operational_readonly_summary: operationalReadonlySummary
      }
    };

    const latencyMs = Date.now() - t0;
    unifiedDecisionMetricsService.recordLatencyMetric({
      latency_ms: latencyMs,
      source,
      phase: 'decide_total',
      pipeline: cognitive_pipeline ? 'cognitive' : 'gpt',
      user_id: user?.id,
      company_id: user?.company_id
    });
    unifiedDecisionMetricsService.recordDecisionMetric({
      pipeline,
      latency_ms: latencyMs,
      fallback: false,
      cognitive_used: cognitive_pipeline,
      decision_confidence: scoreResult.score,
      risk_level: scoreResult.risk_level,
      user_id: user?.id,
      company_id: user?.company_id
    });

    try {
      console.info(
        '[UNIFIED_DECISION_STATS]',
        JSON.stringify(aggregator.getDecisionStats(companyIdForMetrics))
      );
    } catch (_e) {
      console.info('[UNIFIED_DECISION_STATS]', aggregator.getDecisionStats(companyIdForMetrics));
    }

    console.info('[UNIFIED_DECISION_RESULT]', {
      source,
      decision_label: finalChosen.label,
      knowledge_items: (signalBundle.knowledge || []).length,
      session_active: signalBundle.session != null
    });

    return out;
  } catch (err) {
    console.warn('[UNIFIED_DECISION_FAIL]', err?.message ?? err);
    unifiedDecisionMetricsService.recordFallbackMetric({
      reason: err && err.message ? String(err.message) : 'unified_decide_exception',
      pipeline: 'fallback',
      user_id: user && user.id,
      company_id: user && user.company_id
    });
    return {
      ok: false,
      decision: null,
      reasoning: '',
      options_considered: [],
      signals: { knowledge_used: false, session_used: false },
      source_engine: 'unified',
      fallback_used: true,
      error: err && err.message ? String(err.message) : 'unified_decision_exception',
      control_signals: {
        should_alert: false,
        requires_attention: true,
        safe_mode: true
      }
    };
  }
}

module.exports = {
  isEnabled,
  decide,
  stripForDossier,
  inferDecisionTypeFromMessage,
  computeDecisionScore,
  adjustWeightsDynamically,
  analyzeTemporalPatterns,
  calibrateThresholds,
  __test__: {
    normalizeContext,
    applyImpetusGovernance,
    messageSuggestsHumanRisk,
    evaluateOptions,
    needsCognitiveEscalation,
    clamp01,
    adjustWeightsDynamically,
    analyzeTemporalPatterns,
    calibrateThresholds
  }
};
