'use strict';

/**
 * Rollout seguro do Cognitive Controller no chat HTTP (dashboard).
 * Modos: disabled | shadow | partial | enabled (env + override por empresa em JSON).
 *
 * Timeouts: primary (IMPETUS_COGNITIVE_CONTROLLER_TIMEOUT_MS) vs shadow mais curto
 * (IMPETUS_COGNITIVE_CONTROLLER_SHADOW_TIMEOUT_MS ou min(primary, 6000)).
 * Sampling shadow: IMPETUS_COGNITIVE_CONTROLLER_SHADOW_SAMPLE_PCT + adaptativo por empresa
 * (IMPETUS_COGNITIVE_CONTROLLER_SHADOW_ADAPTIVE !== 'false').
 *
 * P95 adaptativo: IMPETUS_COGNITIVE_CONTROLLER_SHADOW_P95_MS (default 9000).
 * Chão da amostra adaptativa: IMPETUS_COGNITIVE_CONTROLLER_SHADOW_SAMPLE_FLOOR (default 0.05).
 * HITL (confiança): IMPETUS_HITL_CONFIDENCE_THRESHOLD (default 0.7, escala 0–1 após normalizeConfidence).
 *
 * Métricas-chave (agregação por company_id nos logs COGNITIVE_CONTROLLER_* / METRIC):
 * - divergence_score: ≤0.2 ≈ igual; ≤0.4 leve; <0.7 relevante; ≥0.7 forte. Foco inicial: % com divergence_gt_0_5.
 * - fallback_rate: meta <5% aceitável; <3% bom; <2% candidato a enabled (com outras métricas).
 * - reason=low_quality: principal sinal de regressão do controller vs contexto real.
 * - shadow_error: deve tender a ~0; senão integração / timeout.
 * - p95 latency: comparar controller_latency_ms vs legacy_latency_ms (latency_delta_ms ≈ +10–20%).
 * - correlation_divergence_gt05_then_low_quality: após shadow com divergence_gt_0_5, mesmo user cai em
 *   primary fallback low_quality dentro de IMPETUS_COGNITIVE_CONTROLLER_CORRELATION_TTL_MS (default 120s; min 60s).
 * - IMPETUS_TECH_KEYWORDS: palavras extra (separadas por , ; | ou newline) para heurística better_hint.
 * - IMPETUS_COGNITIVE_CONTROLLER_CORRELATION_MAP_MAX: tamanho máximo do mapa in-memory (default 3000).
 * - IMPETUS_COGNITIVE_CONTROLLER_CORRELATION_PRUNE_INTERVAL_MS: opcional; ≥60000 → prune periódico TTL+cap.
 * - shadow_queue_pressure: shadow_queue_size / shadow_active_jobs (amostragem ocasional).
 *
 * Taxa agregada (dashboards / logs METRIC):
 *   controller_better_rate ≈ sum(controller_better_num) / sum(controller_better_den)
 *   em eventos metric:controller_better_sample (den=1 só quando controller_better_conclusive).
 *   Em jq para não inflar taxa: select(.metric=="controller_better_sample" and .controller_better_den==1).
 *
 * Leitura em logs (jq — práticas obrigatórias):
 *   — Sempre separar cc_mode (ex.: select(.cc_mode=="shadow")) para não misturar testes locais,
 *     partial acidental ou outro ruído de rota.
 *   — Taxa controller_better: só linhas conclusivas (.controller_better_den==1); nunca média sem esse filtro.
 *   — Delta médio/mediana: select(.controller_vs_legacy_delta != null) — null distorce média e quebra mediana.
 *   — Padrão de leitura “limpa”: .better_hint_confidence=="high" (corta a maior parte do ruído heurístico).
 *   — Onde realmente importa (divergência relevante): .divergence_gt_0_5==true em COMPARISON / cruzamentos.
 *   — Cruzamento “diverge e melhora?”: metric:divergence_high_controller_better OU
 *     (divergence_gt_0_5 && controller_better_bool).
 *   — divergence_better_hint null ≠ false: usar divergence_better_hint_defined / nunca assumir null como perda.
 *
 * Queries exemplo (stdout JSON uma linha por evento; ajustar caminho do log):
 *   — Amostras relevantes (shadow + high + divergência):
 *     grep COGNITIVE_CONTROLLER_COMPARISON out.log | jq -c 'select(.cc_mode=="shadow" and
 *       .better_hint_confidence=="high" and .divergence_gt_0_5==true) |
 *       {company_id, divergence_score, controller_vs_legacy_delta}'
 *   — Taxa controller melhor (shadow + só conclusivas):
 *     grep COGNITIVE_CONTROLLER_METRIC out.log | jq 'select(.cc_mode=="shadow" and
 *       .metric=="controller_better_sample" and .controller_better_den==1) | .controller_better_num' |
 *       awk '{s+=$1; c+=1} END {print (c? s/c : 0)}'
 *   — Delta médio (sem null):
 *     grep COGNITIVE_CONTROLLER_COMPARISON out.log | jq 'select(.cc_mode=="shadow" and
 *       .controller_vs_legacy_delta != null) | .controller_vs_legacy_delta' |
 *       awk '{s+=$1; c+=1} END {print (c? s/c : 0)}'
 *   — Debug: alta confiança e delta claramente negativo:
 *     grep COGNITIVE_CONTROLLER_COMPARISON out.log | jq -c 'select(.cc_mode=="shadow" and
 *       .better_hint_confidence=="high" and .controller_vs_legacy_delta < -0.05)'
 *   — Correlação divergência (shadow) → low_quality no primary (cc_mode aqui = partial|enabled quando caiu):
 *     grep COGNITIVE_CONTROLLER_METRIC out.log | jq -c
 *       'select(.metric=="correlation_divergence_gt05_then_low_quality")'
 *
 * Boas práticas (governança da leitura):
 *   — Cruzar sempre ≥2 sinais antes de decidir; nunca promover fase só por delta OU só por better_rate.
 *     Exemplos úteis: delta + better_rate; delta + divergência (ou divergence_gt_0_5); better_rate + fallback
 *     (+ low_quality quando em partial).
 *   — Amostra insuficiente: com <200 amostras conclusivas na janela → não decidir promoção de fase.
 *   — Outliers não guiam a decisão: p50/p95 de controller_vs_legacy_delta ajudam a ver cauda e ruído;
 *     a decisão é pela tendência estável entre janelas, não por picos isolados.
 *   — Shadow vs partial: shadow indica potencial (comparativo sem risco ao utilizador); partial expõe a
 *     realidade operacional (primary, fallback, latência, low_quality) — validar métricas críticas em partial.
 *
 * Interpretação (evitar auto-engano):
 *   — Delta negativo ≠ problema automático: só alarme se consistente, com high, em casos relevantes.
 *   — Divergência alta ≠ ruim: cruzar com controller_better / delta / amostra manual.
 *   — controller_better_rate sozinho não basta: sempre com delta médio, fallback, low_quality.
 *   — Pequena melhora consistente > pico ocasional: preferir delta médio positivo e estabilidade entre janelas.
 *
 * Opcional (alto valor): p50/p95 de controller_vs_legacy_delta (ex.: jq -s sort | awk) para outliers; cruzar
 * com média por janela para não deixar um único outlier ditar o veredito.
 *
 * Checklist operacional antes de partial / rampa 20–30%:
 *   — Partial: ≥200–500 amostras conclusivas; taxa ≥0.55 (com filtro den==1); delta médio ≥0 (sem nulls);
 *     poucos casos high com delta < -0.05; shadow_error ≈ 0; validar sempre ≥2 sinais em conjunto.
 *   — Rampa partial ~20–30%: taxa ≥0.60; delta positivo consistente; divergência sem regressão operacional.
 *
 * Princípio do desenho: auditar, validar e governar a evolução do controller em produção com dados e fases —
 * não decisões monossinais nem conclusões com amostra fraca.
 *
 * Calibração futura (por empresa / perfil): HITL (IMPETUS_HITL_CONFIDENCE_THRESHOLD), low_quality,
 * delta mínimo aceitável e thresholds de divergência — afinar com dados reais + overrides JSON por empresa.
 *
 * Baseline legado (evolução no tempo):
 *   — legacy_quality_hint / legacy_quality_score: proxy heurístico da resposta legado (não substitui
 *     avaliação humana); útil para tendência antes/depois de mudanças de produto.
 *   — controller_vs_legacy_delta = controller_confidence_normalized − legacy_quality_score (0–1):
 *     >0 sugere ganho vs proxy baseline; <0 perda vs proxy; null se faltar confiança do controller.
 *   — Drift cognitivo (agregação externa): séries temporais de legacy_quality_score e do delta médio
 *     para detetar degradação ou melhoria após rollout, mudanças de modelo ou de contexto.
 *
 * Janela de decisão (governança):
 *   — Antes de promover fase por empresa: acumular tipicamente ≥200–500 amostras conclusivas
 *     (controller_better_den ou pedidos equivalentes) para taxas estáveis; abaixo de 200 → não promover.
 *   — Estabilidade: controller_better_rate não deve oscilar >±10% entre janelas consecutivas
 *     (avaliar em dashboards, não no processo Node).
 *
 * Futuro (pesos):
 *   — requires_action e decisões operacionais com peso maior nas agregações (criticidade).
 *
 * Futuro (análise):
 *   — Segmentação por tipo de input (clusterização): onde o controller é melhor vs onde não é.
 *   — Relatório como ferramenta de explicação: quando controller < baseline ou divergência alta sem ganho,
 *     correlacionar com trilha (council, política, fallback interno) fora deste serviço.
 *
 * Critérios práticos de rollout (referência final):
 *   — Partial: fallback <5%; controller_better_rate ≥55–60%; delta médio ≥0 (vs proxy legado);
 *     low_quality baixo; shadow_error ~0; filtrar sinais fortes (better_hint_confidence high) nos dashboards.
 *   — Escalar partial: rate ≥60–65%; delta médio positivo consistente; divergência não gera regressão.
 *   — Enabled: fallback <3%; rate ≥65–70%; delta médio > +0.03 a +0.05; confidence high dominante.
 *
 * @see cognitiveControllerService.handleCognitiveRequest
 */

const { handleCognitiveRequest } = require('./cognitiveControllerService');

const VALID_MODES = new Set(['disabled', 'shadow', 'partial', 'enabled']);

const LOG_INPUT_MAX = 500;
const LOG_RESPONSE_MAX = 500;

/** Razões padronizadas para fallback / dashboards. */
const FALLBACK_REASON = {
  TIMEOUT: 'timeout',
  EXCEPTION: 'exception',
  INVALID_RESPONSE: 'invalid_response',
  LOW_QUALITY: 'low_quality'
};

const shadowQueue = [];
let shadowActive = 0;

/** @type {Record<string, { ok: boolean, ms: number }[]>} */
const shadowOutcomesByCompany = Object.create(null);
/** @type {Record<string, number>} amostra efectiva (≥ floor) por empresa */
const shadowAdaptivePctByCompany = Object.create(null);

/** Shadow recente com divergence_gt_0_5 → correlacionar com fallback low_quality (mesmo user/empresa). */
const recentShadowHighDivergence = new Map();

let shadowEnqueueSeq = 0;

function correlationTtlMs() {
  const n = parseInt(process.env.IMPETUS_COGNITIVE_CONTROLLER_CORRELATION_TTL_MS || '120000', 10);
  if (!Number.isFinite(n)) return 120000;
  return Math.min(600000, Math.max(60000, n));
}

function shadowCorrKey(companyId, userId) {
  return `${String(companyId || '')}\t${String(userId || '')}`;
}

function getCorrelationMapMax() {
  const n = parseInt(process.env.IMPETUS_COGNITIVE_CONTROLLER_CORRELATION_MAP_MAX || '3000', 10);
  return Number.isFinite(n) && n >= 500 ? Math.min(50000, n) : 3000;
}

function pruneShadowCorrelationMap() {
  if (recentShadowHighDivergence.size < 800) return;
  const ttl = correlationTtlMs();
  const now = Date.now();
  for (const [k, ts] of [...recentShadowHighDivergence.entries()]) {
    if (now - ts > ttl) recentShadowHighDivergence.delete(k);
  }
}

function enforceCorrelationMapMax() {
  const cap = getCorrelationMapMax();
  while (recentShadowHighDivergence.size > cap) {
    const first = recentShadowHighDivergence.keys().next().value;
    if (first === undefined) break;
    recentShadowHighDivergence.delete(first);
  }
}

function noteShadowHighDivergence(companyId, userId) {
  recentShadowHighDivergence.set(shadowCorrKey(companyId, userId), Date.now());
  pruneShadowCorrelationMap();
  enforceCorrelationMapMax();
}

const _corrPruneMs = parseInt(process.env.IMPETUS_COGNITIVE_CONTROLLER_CORRELATION_PRUNE_INTERVAL_MS || '0', 10);
if (Number.isFinite(_corrPruneMs) && _corrPruneMs >= 60000) {
  const iv = setInterval(() => {
    pruneShadowCorrelationMap();
    enforceCorrelationMapMax();
  }, _corrPruneMs);
  if (typeof iv.unref === 'function') iv.unref();
}

/** @returns {boolean} true se havia shadow recente com divergência alta antes deste low_quality. */
function consumeHighDivergenceThenLowQuality(companyId, userId) {
  const k = shadowCorrKey(companyId, userId);
  const ts = recentShadowHighDivergence.get(k);
  const ttl = correlationTtlMs();
  if (!ts || Date.now() - ts > ttl) return false;
  recentShadowHighDivergence.delete(k);
  return true;
}

function normalizeMode(raw) {
  const m = String(raw || 'disabled').toLowerCase().trim();
  return VALID_MODES.has(m) ? m : 'disabled';
}

function parseCompanyOverrides() {
  const raw = process.env.IMPETUS_COGNITIVE_CONTROLLER_BY_COMPANY;
  if (!raw || typeof raw !== 'string') return null;
  try {
    const j = JSON.parse(raw);
    return j && typeof j === 'object' ? j : null;
  } catch {
    return null;
  }
}

function getCognitiveControllerMode(companyId) {
  const byCo = parseCompanyOverrides();
  if (companyId && byCo) {
    const cid = String(companyId);
    if (Object.prototype.hasOwnProperty.call(byCo, cid)) {
      return normalizeMode(byCo[cid]);
    }
    const key = Object.keys(byCo).find(
      (k) => k && String(k).toLowerCase() === cid.toLowerCase()
    );
    if (key != null) return normalizeMode(byCo[key]);
  }
  return normalizeMode(process.env.IMPETUS_COGNITIVE_CONTROLLER_MODE);
}

function getBaseShadowSamplePct() {
  const pct = parseFloat(process.env.IMPETUS_COGNITIVE_CONTROLLER_SHADOW_SAMPLE_PCT || '0.3', 10);
  return Number.isFinite(pct) ? Math.min(1, Math.max(0, pct)) : 0.3;
}

function getShadowWindowPerCompany() {
  const n = parseInt(process.env.IMPETUS_COGNITIVE_CONTROLLER_SHADOW_WINDOW || '80', 10);
  return Number.isFinite(n) && n >= 10 ? Math.min(200, n) : 80;
}

/** Limiar p95 shadow (sensível a degradação); 8–10s recomendado em produção inicial. */
function getShadowP95ThresholdMs() {
  const n = parseInt(process.env.IMPETUS_COGNITIVE_CONTROLLER_SHADOW_P95_MS || '9000', 10);
  return Number.isFinite(n) && n > 0 ? n : 9000;
}

/** Chão mínimo da taxa de amostragem adaptativa (ex.: 0.05 em incidentes prolongados). */
function getShadowSampleFloor() {
  const x = parseFloat(process.env.IMPETUS_COGNITIVE_CONTROLLER_SHADOW_SAMPLE_FLOOR || '0.05', 10);
  if (!Number.isFinite(x)) return 0.05;
  return Math.min(0.5, Math.max(0, x));
}

function recordShadowOutcome(companyId, ok, latencyMs) {
  if (process.env.IMPETUS_COGNITIVE_CONTROLLER_SHADOW_ADAPTIVE === 'false') return;
  const key = companyId ? String(companyId) : '_';
  const maxW = getShadowWindowPerCompany();
  let arr = shadowOutcomesByCompany[key];
  if (!arr) {
    arr = [];
    shadowOutcomesByCompany[key] = arr;
  }
  arr.push({ ok, ms: latencyMs });
  if (arr.length > maxW) arr.shift();

  const base = getBaseShadowSamplePct();
  if (shadowAdaptivePctByCompany[key] == null) shadowAdaptivePctByCompany[key] = base;
  if (arr.length < 10) return;

  const errRate = arr.filter((x) => !x.ok).length / arr.length;
  const sorted = arr.map((x) => x.ms).sort((a, b) => a - b);
  const p95 = sorted[Math.max(0, Math.floor(0.95 * (sorted.length - 1)))];
  const p95Th = getShadowP95ThresholdMs();
  const floorPct = getShadowSampleFloor();
  let cur = shadowAdaptivePctByCompany[key];
  if (errRate > 0.1 || p95 > p95Th) {
    shadowAdaptivePctByCompany[key] = Math.max(floorPct, cur - 0.1);
  } else if (errRate < 0.03 && p95 < p95Th * 0.65) {
    shadowAdaptivePctByCompany[key] = Math.min(base, cur + 0.02);
  }
}

/**
 * Amostragem shadow (custo); opcionalmente adaptativa por company_id.
 * @param {string|null|undefined} companyId
 */
function shouldSampleShadow(companyId) {
  const key = companyId ? String(companyId) : '_';
  const base = getBaseShadowSamplePct();
  if (process.env.IMPETUS_COGNITIVE_CONTROLLER_SHADOW_ADAPTIVE === 'false') {
    return Math.random() < base;
  }
  const eff = shadowAdaptivePctByCompany[key] != null ? shadowAdaptivePctByCompany[key] : base;
  return Math.random() < eff;
}

function stickyBucket0to99(userId) {
  const s = String(userId || '');
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) % 100;
}

function shouldUseController(user, mode) {
  const m = normalizeMode(mode);
  if (m === 'enabled') return true;
  if (m === 'partial') {
    const pct = parseFloat(process.env.IMPETUS_COGNITIVE_CONTROLLER_PARTIAL_PCT || '0.2', 10);
    const p = Number.isFinite(pct) ? Math.min(1, Math.max(0, pct)) : 0.2;
    return stickyBucket0to99(user && user.id) < p * 100;
  }
  return false;
}

function getPrimaryTimeoutMs() {
  const n = parseInt(process.env.IMPETUS_COGNITIVE_CONTROLLER_TIMEOUT_MS || '8000', 10);
  if (!Number.isFinite(n)) return 8000;
  return Math.min(120000, Math.max(3000, n));
}

/** Compat: nome antigo. */
function getControllerTimeoutMs() {
  return getPrimaryTimeoutMs();
}

/**
 * Shadow: mais curto que o primary (custo / backlog).
 * IMPETUS_COGNITIVE_CONTROLLER_SHADOW_TIMEOUT_MS sobrepõe; senão min(primary, 6000).
 */
function getShadowTimeoutMs() {
  const explicit = parseInt(process.env.IMPETUS_COGNITIVE_CONTROLLER_SHADOW_TIMEOUT_MS || '', 10);
  if (Number.isFinite(explicit) && explicit >= 2000) {
    return Math.min(60000, explicit);
  }
  return Math.min(getPrimaryTimeoutMs(), 6000);
}

function getShadowMaxConcurrent() {
  const n = parseInt(process.env.IMPETUS_COGNITIVE_CONTROLLER_SHADOW_MAX_CONCURRENT || '4', 10);
  if (!Number.isFinite(n) || n < 1) return 4;
  return Math.min(32, n);
}

function getShadowQueueMax() {
  const n = parseInt(process.env.IMPETUS_COGNITIVE_CONTROLLER_SHADOW_QUEUE_MAX || '100', 10);
  if (!Number.isFinite(n) || n < 5) return 100;
  return Math.min(5000, n);
}

function runWithTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(
      () => reject(Object.assign(new Error('COGNITIVE_CONTROLLER_TIMEOUT'), { code: 'TIMEOUT' })),
      ms
    );
    promise.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      }
    );
  });
}

function truncateForLog(s, max) {
  const t = String(s || '');
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

/**
 * Confiança 0–1 unificada (entrada 0–1 ou 0–100).
 * @param {unknown} c
 * @returns {number|null}
 */
function normalizeConfidence(c) {
  if (c == null) return null;
  const n = Number(c);
  if (!Number.isFinite(n)) return null;
  return n > 1 ? n / 100 : n;
}

/** Bucket para agregadores (escala 0–1 após normalizeConfidence). */
function confidenceBucketFromNormalized(nc) {
  if (nc == null) return null;
  if (nc < 0.3) return 'low';
  if (nc < 0.7) return 'medium';
  return 'high';
}

/** Limiar HITL em escala 0–1 (após normalizeConfidence no score do controller). */
function getHitlConfidenceThreshold() {
  const x = parseFloat(process.env.IMPETUS_HITL_CONFIDENCE_THRESHOLD || '0.7', 10);
  if (!Number.isFinite(x)) return 0.7;
  return Math.min(0.99, Math.max(0.35, x));
}

/**
 * Heurística leve de divergência legacy vs controller (shadow / dashboards).
 * Não substitui embeddings; só comprimento + sobreposição lexical.
 */
function computeResponseDivergenceHint(legacyText, controllerText) {
  const L = String(legacyText || '');
  const C = String(controllerText || '');
  const lenL = L.length;
  const lenC = C.length;
  const lenMax = Math.max(lenL, lenC, 1);
  const length_ratio = Math.min(lenL, lenC) / lenMax;
  const tokenize = (s) =>
    new Set(
      s
        .toLowerCase()
        .split(/\W+/)
        .filter((w) => w.length >= 3)
    );
  const a = tokenize(L);
  const b = tokenize(C);
  let inter = 0;
  for (const t of a) {
    if (b.has(t)) inter++;
  }
  const uni = a.size + b.size - inter;
  const token_jaccard = uni > 0 ? inter / uni : lenL + lenC === 0 ? 1 : 0;
  const similarity_blend = 0.5 * length_ratio + 0.5 * token_jaccard;
  const divergence_score = 1 - similarity_blend;
  const round3 = (x) => Math.round(x * 1000) / 1000;
  return {
    length_ratio: round3(length_ratio),
    token_jaccard: round3(token_jaccard),
    similarity_blend: round3(similarity_blend),
    divergence_score: round3(divergence_score)
  };
}

/**
 * Banda operacional do divergence_score (0–1) para contagens em agregadores.
 * @param {number|null|undefined} score
 * @returns {{ band: string, divergence_gt_0_5: boolean, divergence_gt_0_7: boolean } | null}
 */
function interpretDivergenceScore(score) {
  if (score == null || !Number.isFinite(Number(score))) return null;
  const s = Number(score);
  let band;
  if (s <= 0.2) band = 'near_equal';
  else if (s <= 0.4) band = 'light_variation';
  else if (s < 0.7) band = 'relevant_difference';
  else band = 'strong_divergence';
  return {
    band,
    divergence_gt_0_5: s > 0.5,
    divergence_gt_0_7: s >= 0.7
  };
}

/** Junta heurística numérica + banda (para COGNITIVE_CONTROLLER_COMPARISON). */
function enrichDivergenceHint(div) {
  if (!div || div.divergence_score == null) return div || null;
  const meta = interpretDivergenceScore(div.divergence_score);
  return meta ? { ...div, ...meta } : { ...div };
}

let _techKwRe = null;
let _techKwSource = '';

/** Regex de termos técnicos: base + IMPETUS_TECH_KEYWORDS (operadores , ; | newline). */
function getTechKeywordRegex() {
  const raw = process.env.IMPETUS_TECH_KEYWORDS || '';
  if (_techKwRe && raw === _techKwSource) return _techKwRe;
  _techKwSource = raw;
  const base = ['kpi', 'ordem', 'manuten', 'sensor', 'segur', 'dado', 'industr', 'impetus', 'risco'];
  const extra = raw
    .split(/[,;|\n]+/)
    .map((s) => s.trim().toLowerCase())
    .filter((w) => w.length >= 2);
  const all = [...new Set([...base, ...extra])];
  const escaped = all.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  try {
    _techKwRe = new RegExp(escaped.join('|'), 'i');
  } catch {
    _techKwRe = /kpi|ordem|manuten|sensor|segur|dado|industr|impetus|risco/i;
  }
  return _techKwRe;
}

/**
 * better_hint + better_hint_confidence (null não é “pior”; low = zona inconclusiva).
 * @returns {{ hint: boolean|null, better_hint_confidence: 'low'|'medium'|'high' }}
 */
function computeDivergenceBetterHintWithMeta(p) {
  const ncC = normalizeConfidence(p.controllerConfidenceRaw);
  const ncL = normalizeConfidence(p.legacyConfidenceRaw);
  const cReq = !!p.controllerRequiresAction;
  const lReq = !!p.legacyRequiresAction;
  const legacyText = String(p.legacyText || '');
  const controllerText = String(p.controllerText || '');
  const techRe = getTechKeywordRegex();

  if (ncC != null && ncL != null) {
    const hint = !!(ncC > ncL || (cReq && !lReq));
    return { hint, better_hint_confidence: 'high' };
  }
  if (ncC != null && ncL == null) {
    if (cReq && !lReq) return { hint: true, better_hint_confidence: 'medium' };
    if (ncC >= 0.55) return { hint: true, better_hint_confidence: 'medium' };
    if (ncC <= 0.35) return { hint: false, better_hint_confidence: 'medium' };
    const lenC = controllerText.trim().length;
    const lenL = legacyText.trim().length;
    if (lenC >= 48 && techRe.test(controllerText) && lenC >= lenL * 0.75) {
      return { hint: true, better_hint_confidence: 'low' };
    }
    return { hint: null, better_hint_confidence: 'low' };
  }
  if (ncC == null && ncL != null) {
    return { hint: null, better_hint_confidence: 'low' };
  }
  if (cReq && !lReq) return { hint: true, better_hint_confidence: 'medium' };
  const lenC = controllerText.trim().length;
  const lenL = legacyText.trim().length;
  if (lenC >= 80 && techRe.test(controllerText) && lenC >= lenL * 0.9) {
    return { hint: true, better_hint_confidence: 'low' };
  }
  return { hint: null, better_hint_confidence: 'low' };
}

/**
 * Sinal leve: divergência "favorece" o controller (sem NLP pesado).
 * @param {object} p
 */
function computeDivergenceBetterHint(p) {
  return computeDivergenceBetterHintWithMeta(p).hint;
}

/**
 * “Controller melhor que legado?” no shadow (ok + hint + buckets).
 * @returns {{ controller_better: boolean|null, controller_better_conclusive: boolean }}
 */
function computeControllerBetterShadow({ ok, hint, hintConfidence, ncC, ncL, ctrlBucket, legBucket }) {
  if (!ok) return { controller_better: false, controller_better_conclusive: true };
  if (hint === true && (hintConfidence === 'high' || hintConfidence === 'medium')) {
    return { controller_better: true, controller_better_conclusive: true };
  }
  if (hint === false && hintConfidence === 'high') {
    return { controller_better: false, controller_better_conclusive: true };
  }
  if (hint === false && hintConfidence !== 'high') {
    return { controller_better: false, controller_better_conclusive: hintConfidence === 'medium' };
  }
  if (hint === true && hintConfidence === 'low') {
    return { controller_better: true, controller_better_conclusive: false };
  }
  if (ctrlBucket === 'high' && legBucket && legBucket !== 'high' && ncC != null) {
    return { controller_better: true, controller_better_conclusive: true };
  }
  if (ctrlBucket === 'low' && legBucket && legBucket !== 'low') {
    return { controller_better: false, controller_better_conclusive: true };
  }
  return { controller_better: null, controller_better_conclusive: false };
}

/**
 * Proxy simples da “qualidade absoluta” do legado (evolução temporal; não é ground truth).
 * @param {{ legacyText: string, legacyConfidenceRaw?: unknown, legacyRequiresAction?: boolean, legacyDegraded?: boolean }} p
 * @returns {{ legacy_quality_hint: 'low'|'medium'|'high', legacy_quality_score: number }}
 */
function computeLegacyQualityHint(p) {
  const text = String(p.legacyText || '');
  const nc = normalizeConfidence(p.legacyConfidenceRaw);
  let score = nc != null ? nc * 0.72 + 0.14 : 0.48;
  const len = text.trim().length;
  if (len < 32) score *= 0.86;
  if (len > 180) score = Math.min(1, score * 1.04);
  if (p.legacyRequiresAction) score *= 0.9;
  if (p.legacyDegraded) score *= 0.88;
  try {
    if (getTechKeywordRegex().test(text)) score = Math.min(1, score * 1.06);
  } catch (_) {
    /* ignore */
  }
  score = Math.min(1, Math.max(0, score));
  let legacy_quality_hint;
  if (score < 0.36) legacy_quality_hint = 'low';
  else if (score < 0.64) legacy_quality_hint = 'medium';
  else legacy_quality_hint = 'high';
  return {
    legacy_quality_hint,
    legacy_quality_score: Math.round(score * 1000) / 1000
  };
}

/** Ganho/perda vs proxy baseline legado (mesma escala 0–1 que legacy_quality_score). */
function computeControllerVsLegacyDelta(controllerNorm, legacyQualityScore) {
  if (controllerNorm == null || legacyQualityScore == null || !Number.isFinite(Number(legacyQualityScore))) {
    return null;
  }
  return Math.round((Number(controllerNorm) - Number(legacyQualityScore)) * 1000) / 1000;
}

function sanitizeForLog(s, maxLen) {
  let t = String(s || '');
  t = t.replace(/\b[\w.%+-]+@[\w.-]+\.[A-Za-z]{2,}\b/gi, '[email]');
  t = t.replace(/\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g, '[cnpj]');
  t = t.replace(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, '[cpf]');
  t = t.replace(/\b\d{14}\b/g, '[digits14]');
  t = t.replace(/\b\d{11}\b/g, '[digits11]');
  t = t.replace(/\b(?:\d[ \-.]*?){13,19}\b/g, '[digits_long]');
  t = t.replace(
    /\b(?:\(?\s*(?:0?)?([1-9]{2})\s*\)?\s*)(?:9\s*)?\d{4}[\s.-]?\d{4}\b/g,
    '[phone]'
  );
  return truncateForLog(t, maxLen);
}

function emitRolloutMetric(payload) {
  if (process.env.IMPETUS_COGNITIVE_CONTROLLER_METRICS_LOG === 'false') return;
  console.info(
    JSON.stringify({
      event: 'COGNITIVE_CONTROLLER_METRIC',
      timestamp: new Date().toISOString(),
      ...payload
    })
  );
}

/**
 * @param {object} user
 * @param {string} message
 * @param {{ skipEgress?: boolean, timeoutMs?: number, cognitiveAttachment?: object, cognitiveSnapshot?: object }} [opts]
 */
async function invokeController(user, message, opts = {}) {
  const skipEgress = !!opts.skipEgress;
  const timeoutMs =
    opts.timeoutMs != null && Number.isFinite(opts.timeoutMs)
      ? opts.timeoutMs
      : skipEgress
        ? getShadowTimeoutMs()
        : getPrimaryTimeoutMs();

  const cognitiveAttachment =
    opts.cognitiveAttachment != null ? opts.cognitiveAttachment : undefined;
  const cognitiveSnapshot =
    opts.cognitiveSnapshot != null ? opts.cognitiveSnapshot : undefined;

  const ctrl = await runWithTimeout(
    handleCognitiveRequest({
      user,
      message,
      cognitiveAttachment,
      cognitiveSnapshot,
      options: { skipPromptFirewall: true }
    }),
    timeoutMs
  );
  if (skipEgress || !ctrl || ctrl.ok !== true || !String(ctrl.content || '').trim()) {
    return ctrl;
  }
  const text = String(ctrl.content).trim();
  const aiEgressGuard = require('./aiEgressGuardService');
  const egress = await aiEgressGuard.scanModelOutput({
    text,
    allowlist: aiEgressGuard.buildTenantAllowlist(user, {}),
    user,
    moduleName: 'dashboard_chat',
    channel: 'dashboard_chat_cognitive_controller'
  });
  return { ...ctrl, content: egress.text };
}

function isControllerQualityUnacceptable(ctrl) {
  if (!ctrl) return true;
  if (ctrl.degraded === true) return true;
  const nc = normalizeConfidence(ctrl.confidence_score);
  if (nc == null) return false;
  return nc < 0.3;
}

function isInvalidOrShortContent(ctrl) {
  if (!ctrl || ctrl.ok !== true) return true;
  const t = String(ctrl.content || '').trim();
  return t.length < 10;
}

function logComparison(payload) {
  const ncCtrl = normalizeConfidence(payload.controller_confidence);
  const ncLeg = normalizeConfidence(payload.legacy_confidence);
  const vsDelta = computeControllerVsLegacyDelta(ncCtrl, payload.legacy_quality_score);
  console.info(
    JSON.stringify({
      event: 'COGNITIVE_CONTROLLER_COMPARISON',
      cc_mode: payload.cc_mode || null,
      user_id: payload.user_id,
      company_id: payload.company_id,
      input: sanitizeForLog(payload.input, LOG_INPUT_MAX),
      legacy_response: sanitizeForLog(payload.legacy_response, LOG_RESPONSE_MAX),
      controller_response: sanitizeForLog(payload.controller_response, LOG_RESPONSE_MAX),
      controller_confidence: payload.controller_confidence,
      controller_confidence_normalized: ncCtrl,
      controller_confidence_bucket: confidenceBucketFromNormalized(ncCtrl),
      legacy_confidence: payload.legacy_confidence,
      legacy_confidence_normalized: ncLeg,
      legacy_confidence_bucket: confidenceBucketFromNormalized(ncLeg),
      controller_degraded: payload.controller_degraded,
      legacy_latency_ms: payload.legacy_latency_ms != null ? payload.legacy_latency_ms : null,
      controller_latency_ms: payload.controller_latency_ms != null ? payload.controller_latency_ms : null,
      latency_delta_ms:
        payload.legacy_latency_ms != null && payload.controller_latency_ms != null
          ? Math.round(payload.controller_latency_ms - payload.legacy_latency_ms)
          : null,
      shadow_latency_ms: payload.shadow_latency_ms,
      divergence_better_hint: payload.divergence_better_hint,
      divergence_better_hint_defined: payload.divergence_better_hint != null,
      divergence_better_hint_null: payload.divergence_better_hint == null,
      better_hint_confidence: payload.better_hint_confidence || null,
      divergence_hint: payload.divergence_hint,
      divergence_score: payload.divergence_hint && payload.divergence_hint.divergence_score != null
        ? payload.divergence_hint.divergence_score
        : null,
      divergence_band: payload.divergence_hint && payload.divergence_hint.band != null
        ? payload.divergence_hint.band
        : null,
      divergence_gt_0_5:
        payload.divergence_hint && payload.divergence_hint.divergence_gt_0_5 != null
          ? payload.divergence_hint.divergence_gt_0_5
          : null,
      divergence_gt_0_7:
        payload.divergence_hint && payload.divergence_hint.divergence_gt_0_7 != null
          ? payload.divergence_hint.divergence_gt_0_7
          : null,
      legacy_quality_hint: payload.legacy_quality_hint || null,
      legacy_quality_score: payload.legacy_quality_score != null ? payload.legacy_quality_score : null,
      controller_vs_legacy_delta: vsDelta,
      trace_id: payload.trace_id,
      timestamp: payload.timestamp || new Date().toISOString()
    })
  );
}

function logFallback(payload) {
  const reason = payload.reason;
  console.warn(
    JSON.stringify({
      event: 'COGNITIVE_CONTROLLER_FALLBACK',
      cc_mode: payload.cc_mode || null,
      reason,
      user_id: payload.user_id,
      company_id: payload.company_id,
      error: truncateForLog(payload.error, LOG_RESPONSE_MAX),
      timestamp: payload.timestamp || new Date().toISOString()
    })
  );
  emitRolloutMetric({
    company_id: payload.company_id,
    metric: 'fallback',
    reason,
    value: 1,
    cc_mode: payload.cc_mode || null
  });
  if (reason === FALLBACK_REASON.LOW_QUALITY) {
    emitRolloutMetric({
      company_id: payload.company_id,
      metric: 'fallback_low_quality',
      reason,
      value: 1,
      cc_mode: payload.cc_mode || null
    });
    if (payload.user_id && consumeHighDivergenceThenLowQuality(payload.company_id, payload.user_id)) {
      emitRolloutMetric({
        company_id: payload.company_id,
        metric: 'correlation_divergence_gt05_then_low_quality',
        value: 1,
        cc_mode: payload.cc_mode || null
      });
    }
  }
}

function logShadowError(payload) {
  console.warn(
    JSON.stringify({
      event: 'COGNITIVE_CONTROLLER_SHADOW_ERROR',
      cc_mode: payload.cc_mode || null,
      user_id: payload.user_id,
      company_id: payload.company_id,
      legacy_latency_ms: payload.legacy_latency_ms != null ? payload.legacy_latency_ms : null,
      controller_latency_ms: payload.controller_latency_ms != null ? payload.controller_latency_ms : null,
      latency_delta_ms: payload.latency_delta_ms != null ? payload.latency_delta_ms : null,
      error: truncateForLog(payload.error, LOG_RESPONSE_MAX),
      timestamp: payload.timestamp || new Date().toISOString()
    })
  );
  emitRolloutMetric({
    company_id: payload.company_id,
    metric: 'shadow_error',
    value: 1,
    cc_mode: payload.cc_mode || null
  });
}

function drainShadowQueue() {
  const max = getShadowMaxConcurrent();
  while (shadowActive < max && shadowQueue.length > 0) {
    const job = shadowQueue.shift();
    shadowActive++;
    setImmediate(() => {
      Promise.resolve()
        .then(job)
        .catch(() => {})
        .finally(() => {
          shadowActive--;
          drainShadowQueue();
        });
    });
  }
}

function scheduleShadowCompare({
  user,
  message,
  legacyReply,
  legacyLatencyMs,
  ccMode,
  legacyRequiresAction,
  legacyConfidenceScore,
  legacyDegraded,
  cognitiveAttachment,
  cognitiveSnapshot
}) {
  const user_id = user.id;
  const company_id = user.company_id;
  const inputRaw = String(message || '');
  const legacyRaw = String(legacyReply || '');
  const legacyWallMs =
    legacyLatencyMs != null && Number.isFinite(Number(legacyLatencyMs)) ? Number(legacyLatencyMs) : null;
  const modeTag = ccMode || 'shadow';
  const legReq = !!legacyRequiresAction;
  const legConf = legacyConfidenceScore != null ? legacyConfidenceScore : null;
  const legDegraded = !!legacyDegraded;

  const qmax = getShadowQueueMax();
  while (shadowQueue.length >= qmax) {
    shadowQueue.shift();
  }

  shadowEnqueueSeq++;
  const backpressure = shadowQueue.length + shadowActive;
  const logEvery = parseInt(process.env.IMPETUS_COGNITIVE_CONTROLLER_SHADOW_QUEUE_LOG_EVERY || '25', 10) || 25;
  if (backpressure >= 20 || shadowEnqueueSeq % logEvery === 0) {
    emitRolloutMetric({
      company_id,
      metric: 'shadow_queue_pressure',
      cc_mode: modeTag,
      shadow_queue_size: shadowQueue.length,
      shadow_active_jobs: shadowActive,
      value: backpressure
    });
  }

  shadowQueue.push(() => {
    const t0 = Date.now();
    return invokeController(user, message, {
      skipEgress: true,
      timeoutMs: getShadowTimeoutMs(),
      cognitiveAttachment:
        cognitiveAttachment != null ? cognitiveAttachment : undefined,
      cognitiveSnapshot:
        cognitiveSnapshot != null ? cognitiveSnapshot : undefined
    })
      .then((ctrl) => {
        const latencyMs = Date.now() - t0;
        const trace_id = ctrl && ctrl.trace_id != null ? ctrl.trace_id : null;
        const controller_response =
          ctrl && ctrl.ok && ctrl.content != null && String(ctrl.content).trim() !== ''
            ? String(ctrl.content)
            : JSON.stringify(ctrl || {});
        const ok = !!(ctrl && ctrl.ok);
        recordShadowOutcome(company_id, ok, latencyMs);
        const divRaw =
          ok && ctrl && ctrl.content != null && String(ctrl.content).trim() !== ''
            ? computeResponseDivergenceHint(legacyRaw, String(ctrl.content))
            : null;
        const div = divRaw ? enrichDivergenceHint(divRaw) : null;
        if (div && div.divergence_gt_0_5) {
          noteShadowHighDivergence(company_id, user_id);
        }
        const betterMeta =
          ok && ctrl && ctrl.content != null
            ? computeDivergenceBetterHintWithMeta({
                controllerConfidenceRaw: ctrl && ctrl.confidence_score,
                legacyConfidenceRaw: legConf,
                controllerRequiresAction: ctrl && ctrl.requires_action,
                legacyRequiresAction: legReq,
                legacyText: legacyRaw,
                controllerText: String(ctrl.content)
              })
            : { hint: null, better_hint_confidence: 'low' };
        const betterHint = betterMeta.hint;
        const betterHintConfidence = betterMeta.better_hint_confidence;
        const ncC = normalizeConfidence(ctrl && ctrl.confidence_score);
        const ncL = normalizeConfidence(legConf);
        const ctrlBucket = confidenceBucketFromNormalized(ncC);
        const legBucket = confidenceBucketFromNormalized(ncL);
        const betterShadow = computeControllerBetterShadow({
          ok,
          hint: betterHint,
          hintConfidence: betterHintConfidence,
          ncC,
          ncL,
          ctrlBucket,
          legBucket
        });
        const legacyQ = computeLegacyQualityHint({
          legacyText: legacyRaw,
          legacyConfidenceRaw: legConf,
          legacyRequiresAction: legReq,
          legacyDegraded: legDegraded
        });
        const vsDelta = computeControllerVsLegacyDelta(ncC, legacyQ.legacy_quality_score);
        const latencyDelta =
          legacyWallMs != null ? Math.round(latencyMs - legacyWallMs) : null;
        logComparison({
          user_id,
          company_id,
          cc_mode: modeTag,
          input: inputRaw,
          legacy_response: legacyRaw,
          controller_response,
          controller_confidence: ctrl && ctrl.confidence_score != null ? ctrl.confidence_score : null,
          legacy_confidence: legConf,
          controller_degraded: ctrl && ctrl.degraded != null ? ctrl.degraded : null,
          legacy_latency_ms: legacyWallMs,
          controller_latency_ms: latencyMs,
          shadow_latency_ms: latencyMs,
          divergence_better_hint: betterHint,
          better_hint_confidence: betterHintConfidence,
          legacy_quality_hint: legacyQ.legacy_quality_hint,
          legacy_quality_score: legacyQ.legacy_quality_score,
          controller_vs_legacy_delta: vsDelta,
          divergence_hint: div,
          trace_id,
          timestamp: new Date().toISOString()
        });
        emitRolloutMetric({
          company_id,
          metric: 'shadow_latency_ms',
          cc_mode: modeTag,
          legacy_latency_ms: legacyWallMs,
          controller_latency_ms: latencyMs,
          latency_delta_ms: latencyDelta,
          value: latencyMs,
          shadow_ok: ok
        });
        const bbNum =
          betterShadow.controller_better_conclusive && betterShadow.controller_better === true ? 1 : 0;
        const bbDen = betterShadow.controller_better_conclusive ? 1 : 0;
        emitRolloutMetric({
          company_id,
          metric: 'controller_better_sample',
          cc_mode: modeTag,
          controller_better_num: bbNum,
          controller_better_den: bbDen,
          controller_better_conclusive: betterShadow.controller_better_conclusive,
          legacy_quality_hint: legacyQ.legacy_quality_hint,
          legacy_quality_score: legacyQ.legacy_quality_score,
          controller_vs_legacy_delta: vsDelta,
          shadow_ok: ok
        });
        if (betterShadow.controller_better !== null) {
          emitRolloutMetric({
            company_id,
            metric: 'controller_better',
            cc_mode: modeTag,
            value: betterShadow.controller_better ? 1 : 0,
            controller_better_bool: !!betterShadow.controller_better,
            controller_better_conclusive: betterShadow.controller_better_conclusive,
            controller_better_num: bbNum,
            controller_better_den: bbDen,
            divergence_better_hint: betterHint,
            better_hint_confidence: betterHintConfidence,
            controller_vs_legacy_delta: vsDelta,
            shadow_ok: ok
          });
        }
        if (
          div &&
          div.divergence_gt_0_5 &&
          betterShadow.controller_better === true &&
          betterShadow.controller_better_conclusive
        ) {
          emitRolloutMetric({
            company_id,
            metric: 'divergence_high_controller_better',
            cc_mode: modeTag,
            value: 1,
            divergence_score: div.divergence_score,
            better_hint_confidence: betterHintConfidence
          });
        }
        if (div && div.divergence_score != null) {
          emitRolloutMetric({
            company_id,
            metric: 'shadow_divergence',
            cc_mode: modeTag,
            divergence_score: div.divergence_score,
            divergence_band: div.band,
            divergence_gt_0_5: div.divergence_gt_0_5,
            divergence_gt_0_7: div.divergence_gt_0_7,
            divergence_better_hint: betterHint,
            better_hint_confidence: betterHintConfidence,
            controller_confidence_bucket: ctrlBucket,
            legacy_confidence_bucket: legBucket,
            legacy_latency_ms: legacyWallMs,
            controller_latency_ms: latencyMs,
            latency_delta_ms: latencyDelta,
            legacy_quality_hint: legacyQ.legacy_quality_hint,
            legacy_quality_score: legacyQ.legacy_quality_score,
            controller_vs_legacy_delta: vsDelta,
            value: div.divergence_score
          });
        }
        if (vsDelta != null) {
          emitRolloutMetric({
            company_id,
            metric: 'controller_vs_legacy_delta',
            cc_mode: modeTag,
            value: vsDelta,
            legacy_quality_score: legacyQ.legacy_quality_score,
            controller_confidence_normalized: ncC,
            shadow_ok: ok
          });
        }
      })
      .catch((err) => {
        const latencyMs = Date.now() - t0;
        recordShadowOutcome(company_id, false, latencyMs);
        const latencyDelta =
          legacyWallMs != null ? Math.round(latencyMs - legacyWallMs) : null;
        logShadowError({
          user_id,
          company_id,
          cc_mode: modeTag,
          legacy_latency_ms: legacyWallMs,
          controller_latency_ms: latencyMs,
          latency_delta_ms: latencyDelta,
          error: String(err && err.message ? err.message : err),
          timestamp: new Date().toISOString()
        });
        emitRolloutMetric({
          company_id,
          metric: 'shadow_latency_ms',
          cc_mode: modeTag,
          legacy_latency_ms: legacyWallMs,
          controller_latency_ms: latencyMs,
          latency_delta_ms: latencyDelta,
          value: latencyMs,
          shadow_ok: false
        });
      });
  });
  drainShadowQueue();
}

async function tryControllerPrimary({
  user,
  message,
  cognitiveAttachment,
  cognitiveSnapshot,
  systemInfluence,
  hitlClosure,
  fallbackTraceId,
  buildSystemInfluenceMessage,
  ccMode
}) {
  const modeTag = ccMode || null;
  let ctrl;
  try {
    ctrl = await invokeController(user, message, {
      skipEgress: false,
      timeoutMs: getPrimaryTimeoutMs(),
      cognitiveAttachment,
      cognitiveSnapshot
    });
  } catch (err) {
    const reason = String(err && err.message).includes('COGNITIVE_CONTROLLER_TIMEOUT')
      ? FALLBACK_REASON.TIMEOUT
      : FALLBACK_REASON.EXCEPTION;
    logFallback({
      reason,
      user_id: user.id,
      company_id: user.company_id,
      cc_mode: modeTag,
      error: String(err && err.message ? err.message : err),
      timestamp: new Date().toISOString()
    });
    return { used: false };
  }

  if (isInvalidOrShortContent(ctrl)) {
    logFallback({
      reason: FALLBACK_REASON.INVALID_RESPONSE,
      user_id: user.id,
      company_id: user.company_id,
      cc_mode: modeTag,
      error: ctrl && ctrl.error ? JSON.stringify(ctrl.error).slice(0, 4000) : 'empty_or_short',
      timestamp: new Date().toISOString()
    });
    return { used: false };
  }

  if (isControllerQualityUnacceptable(ctrl)) {
    logFallback({
      reason: FALLBACK_REASON.LOW_QUALITY,
      user_id: user.id,
      company_id: user.company_id,
      cc_mode: modeTag,
      error: JSON.stringify({
        degraded: ctrl.degraded,
        confidence_score: ctrl.confidence_score,
        confidence_normalized: normalizeConfidence(ctrl.confidence_score)
      }).slice(0, 500),
      timestamp: new Date().toISOString()
    });
    return { used: false };
  }

  const textOut = String(ctrl.content).trim();

  let systemInfluenceMessage = null;
  try {
    if (typeof buildSystemInfluenceMessage === 'function') {
      systemInfluenceMessage = buildSystemInfluenceMessage(systemInfluence);
    }
  } catch (e) {
    console.warn('[COGNITIVE_CONTROLLER_PRIMARY] system influence', e?.message || e);
  }

  const headersTraceId = ctrl.trace_id || fallbackTraceId;
  const ncHitl = normalizeConfidence(ctrl.confidence_score);
  const hitlTh = getHitlConfidenceThreshold();
  const hitlPending = !!ctrl.requires_action || (ncHitl != null && ncHitl < hitlTh);

  emitRolloutMetric({
    company_id: user.company_id,
    metric: 'controller_primary_used',
    cc_mode: modeTag,
    controller_confidence_bucket: confidenceBucketFromNormalized(ncHitl),
    value: 1
  });

  return {
    used: true,
    headersTraceId: String(headersTraceId),
    hitlPending,
    body: {
      ok: true,
      reply: textOut,
      message: textOut,
      content: textOut,
      explanation_layer: ctrl.explanation_layer,
      confidence_score: ctrl.confidence_score,
      requires_action: ctrl.requires_action,
      degraded: !!ctrl.degraded,
      hitl_closed: hitlClosure?.closed === true,
      hitl_closed_trace: hitlClosure?.closed ? hitlClosure.trace_id : undefined,
      processing_transparency: ctrl.processing_transparency,
      cognitive_council: false,
      cognitive_controller: true,
      system_influence: systemInfluenceMessage
    }
  };
}

module.exports = {
  FALLBACK_REASON,
  getCognitiveControllerMode,
  shouldUseController,
  shouldSampleShadow,
  getControllerTimeoutMs,
  getPrimaryTimeoutMs,
  getShadowTimeoutMs,
  getShadowMaxConcurrent,
  getShadowQueueMax,
  getShadowP95ThresholdMs,
  getShadowSampleFloor,
  getHitlConfidenceThreshold,
  normalizeConfidence,
  computeResponseDivergenceHint,
  interpretDivergenceScore,
  confidenceBucketFromNormalized,
  computeDivergenceBetterHint,
  computeDivergenceBetterHintWithMeta,
  computeControllerBetterShadow,
  computeLegacyQualityHint,
  computeControllerVsLegacyDelta,
  getTechKeywordRegex,
  logComparison,
  logFallback,
  logShadowError,
  scheduleShadowCompare,
  tryControllerPrimary
};
