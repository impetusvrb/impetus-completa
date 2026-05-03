'use strict';

/**
 * Anexo cognitivo controlado — validação fechada e mapeamento para o contrato
 * existente de {@link runCognitiveCouncil} (data + context + module).
 *
 * Não aceita contexto livre do cliente HTTP; o snapshot deve ser montado no servidor
 * (ex.: buildEnvironmentalAttachmentFromDashboardPack).
 */

const ALLOWED_ATTACHMENT_KINDS = new Set(['environmental']);
const SUPPORTED_ATTACHMENT_VERSIONS = new Set([1]);
const MAX_ATTACHMENT_JSON_BYTES = 120000;
const MAX_ARRAY_ITEMS = 500;
const MAX_META_STRING_LEN = 256;
const MAX_AS_OF_LEN = 64;
const MAX_METRICS_TOP_KEYS = 200;
/** Base para completude relativa (nº de famílias de métricas esperadas no domínio ambiental). */
const EXPECTED_METRICS_COUNT = 5;

/** Eixo de métricas/auditoria alinhado ao fluxo dashboard chat (evita fragmentação). */
const COGNITIVE_ATTACHMENT_COUNCIL_MODULE = 'dashboard_chat';

/**
 * Estimativa 0–1 de completude do objeto de métricas (sem bloquear ingestão).
 * @param {object|null|undefined} metrics
 * @returns {number}
 */
function estimateCompleteness(metrics) {
  if (!metrics || typeof metrics !== 'object' || Array.isArray(metrics)) return 0;
  const keys = Object.keys(metrics);
  if (keys.length === 0) return 0;
  return Math.min(1, keys.length / EXPECTED_METRICS_COUNT);
}

function _normalizeDataSource(v) {
  const s = v != null ? String(v).trim().toLowerCase() : '';
  if (s === 'sensor' || s === 'manual' || s === 'mixed') return s;
  return 'mixed';
}

function _coerceNullableString(v, maxLen) {
  if (v == null || v === '') return null;
  const s = String(v).trim();
  return s.length ? s.slice(0, maxLen) : null;
}

/**
 * Metadata semântica opcional — nunca lança; valores inválidos viram omissão ou default seguro.
 * @param {object|null|undefined} raw
 * @param {object} [metricsForCompleteness] — métricas já normalizadas (para estimateCompleteness)
 */
function normalizeMetaInput(raw, metricsForCompleteness = {}) {
  const asOfDefault = new Date().toISOString();
  const completeness = estimateCompleteness(metricsForCompleteness);
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) {
    return {
      unit: null,
      window: null,
      as_of: asOfDefault,
      completeness,
      source: _normalizeDataSource(null)
    };
  }
  const unit = _coerceNullableString(raw.unit, MAX_META_STRING_LEN);
  const window = _coerceNullableString(raw.window, MAX_META_STRING_LEN);
  let as_of = asOfDefault;
  if (raw.as_of != null && raw.as_of !== '') {
    const s = String(raw.as_of).trim().slice(0, MAX_AS_OF_LEN);
    if (s.length) as_of = s;
  }
  const source = _normalizeDataSource(raw.source);
  return { unit, window, as_of, completeness, source };
}

/**
 * Mapa livre de métricas nomeadas (ex. intensidade hídrica) — só aceita objeto plano; trunca chaves em excesso.
 */
function normalizeMetricsInput(raw) {
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) {
    return {};
  }
  const keys = Object.keys(raw);
  if (keys.length <= MAX_METRICS_TOP_KEYS) {
    return { ...raw };
  }
  const trimmed = {};
  for (let i = 0; i < MAX_METRICS_TOP_KEYS; i++) {
    const k = keys[i];
    trimmed[k] = raw[k];
  }
  return trimmed;
}

/**
 * @param {object|null|undefined} pack — resultado server-side (ex. retrieveContextualData)
 * @returns {object|null}
 */
function buildEnvironmentalAttachmentFromDashboardPack(pack) {
  if (!pack || typeof pack !== 'object') return null;
  const metrics =
    pack.metrics && typeof pack.metrics === 'object' && !Array.isArray(pack.metrics)
      ? normalizeMetricsInput(pack.metrics)
      : {};
  const meta = normalizeMetaInput(
    {
      unit: pack.unit,
      window: pack.window,
      as_of: pack.as_of,
      source: pack.source
    },
    metrics
  );
  return {
    kind: 'environmental',
    version: 1,
    payload: {
      kpis: Array.isArray(pack.kpis) ? pack.kpis : [],
      events: Array.isArray(pack.events) ? pack.events : [],
      assets: Array.isArray(pack.assets) ? pack.assets : [],
      contextual_data:
        pack.contextual_data && typeof pack.contextual_data === 'object' && !Array.isArray(pack.contextual_data)
          ? pack.contextual_data
          : {},
      meta,
      metrics
    }
  };
}

function _reject(code, message) {
  const e = new Error(message);
  e.code = code;
  throw e;
}

function sanitizeEnvironmentalPayload(payload) {
  if (payload == null || typeof payload !== 'object' || Array.isArray(payload)) {
    _reject('ATTACHMENT_PAYLOAD_INVALID', 'Payload do anexo ambiental inválido');
  }
  const allowedKeys = ['contextual_data', 'kpis', 'events', 'assets', 'meta', 'metrics'];
  const unknown = Object.keys(payload).filter((k) => !allowedKeys.includes(k));
  if (unknown.length) {
    _reject('ATTACHMENT_PAYLOAD_FORBIDDEN_KEYS', `Chaves não permitidas no payload: ${unknown.join(', ')}`);
  }

  const metrics = normalizeMetricsInput(payload.metrics);
  const out = {
    contextual_data: {},
    kpis: [],
    events: [],
    assets: [],
    metrics,
    meta: normalizeMetaInput(payload.meta, metrics)
  };

  if (payload.contextual_data != null) {
    if (typeof payload.contextual_data !== 'object' || Array.isArray(payload.contextual_data)) {
      _reject('ATTACHMENT_CONTEXTUAL_DATA_INVALID', 'contextual_data deve ser um objeto');
    }
    out.contextual_data = payload.contextual_data;
  }

  for (const key of ['kpis', 'events', 'assets']) {
    if (payload[key] == null) continue;
    if (!Array.isArray(payload[key])) {
      _reject('ATTACHMENT_ARRAY_INVALID', `${key} deve ser array`);
    }
    out[key] = payload[key].slice(0, MAX_ARRAY_ITEMS);
  }

  const serialized = JSON.stringify(out);
  if (serialized.length > MAX_ATTACHMENT_JSON_BYTES) {
    _reject('ATTACHMENT_TOO_LARGE', 'Anexo cognitivo excede o limite de tamanho');
  }
  return out;
}

/**
 * @param {object} raw — { kind, version?, payload }
 * @returns {{ kind: string, version: number, payload: object }}
 */
function parseCognitiveAttachment(raw) {
  if (raw == null) {
    _reject('ATTACHMENT_INVALID', 'Anexo cognitivo ausente ou inválido');
  }
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    _reject('ATTACHMENT_INVALID', 'Anexo cognitivo deve ser um objeto');
  }
  const kind = raw.kind;
  const version = raw.version != null ? Number(raw.version) : 1;

  if (!ALLOWED_ATTACHMENT_KINDS.has(kind)) {
    _reject('ATTACHMENT_NOT_ALLOWED', 'Tipo de anexo cognitivo não permitido');
  }
  if (!Number.isFinite(version) || !SUPPORTED_ATTACHMENT_VERSIONS.has(version)) {
    _reject('ATTACHMENT_VERSION_UNSUPPORTED', 'Versão do anexo não suportada');
  }

  if (kind === 'environmental') {
    const payload = sanitizeEnvironmentalPayload(raw.payload);
    return { kind, version, payload };
  }

  _reject('ATTACHMENT_NOT_ALLOWED', 'Tipo de anexo cognitivo não permitido');
  return null;
}

/**
 * Traduz anexo validado para entrada do conselho (ingressLayer já funde context em data quando aplicável).
 *
 * @param {object} cognitiveAttachment — bruto; validado aqui
 * @returns {{ data: object, context: object, module: 'dashboard_chat' }}
 */
function attachmentToCouncilIngress(cognitiveAttachment) {
  const parsed = parseCognitiveAttachment(cognitiveAttachment);
  const data = {
    kpis: parsed.payload.kpis,
    events: parsed.payload.events,
    assets: parsed.payload.assets,
    contextual_data: parsed.payload.contextual_data,
    meta: parsed.payload.meta,
    metrics: parsed.payload.metrics
  };
  const context = {
    source: 'cognitive_controller_attachment',
    attachment_kind: parsed.kind,
    attachment_version: parsed.version,
    cognitive_attachment_kind: parsed.kind,
    cognitive_attachment_version: parsed.version
  };
  return {
    data,
    context,
    module: COGNITIVE_ATTACHMENT_COUNCIL_MODULE
  };
}

module.exports = {
  ALLOWED_ATTACHMENT_KINDS,
  SUPPORTED_ATTACHMENT_VERSIONS,
  EXPECTED_METRICS_COUNT,
  buildEnvironmentalAttachmentFromDashboardPack,
  parseCognitiveAttachment,
  attachmentToCouncilIngress,
  normalizeMetaInput,
  normalizeMetricsInput,
  estimateCompleteness
};
