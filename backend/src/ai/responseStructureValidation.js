'use strict';

/**
 * Validação semântica complementar: secções SITUAÇÃO / PROBLEMAS / RECOMENDAÇÕES
 * e coerência mínima. Não substitui contextualResponseValidation.
 */

const SCORE_PER_AXIS = 2;
const THRESHOLD_FALLBACK = 3;

const RE_SITUACAO = /(\*\*)?\s*(SITUA[ÇC][AÃ]O|CONTEXTO)\s*(ATUAL)?\s*:(\*\*)?/i;
const RE_PROBLEMAS = /(\*\*)?\s*PROBLEMAS?\s*:(\*\*)?/i;
/** Alinhado a enforceResponseStructure: "RECOMENDAÇÕES" = Ç + Õ + ES, não *ÇÃO. */
const RE_RECOMENDACOES = /(\*\*)?\s*RECOMENDA[ÇC](ÃO|OES|ÕES|OES?)\s*:(\*\*)?/i;

const DATA_USE_RE =
  /\d|[0-9a-f]{8}-[0-9a-f-]{4,}|m[aá]quina|equipamento|linha|ativo|prioridad|risco|evento|alarme|sensor|kpi|turno|falha|parad|lote|produt|laborat|janela|taref|a(çc)(ãa)o|recomend|t[eé]cnic|manuten|operacional|dado|regist/i;
const RISK_PROBLEM_RE =
  /falha|problema|risco|anomali|atraso|erro|parad|degrad|alarme|dano|fug|lote|defeito|n[aã]o[\s-]?conform|cr[ií]t|urg[eê]ncia|sever/i;

/**
 * @param {string} s
 * @param {RegExp} re
 * @returns {{ index: number, len: number }}
 */
function firstHeader(s, re) {
  const m = s.match(new RegExp(re.source, 'i'));
  if (!m || m.index == null) {
    return { index: -1, len: 0 };
  }
  return { index: m.index, len: m[0].length };
}

/**
 * @param {string} t
 * @returns {{
 *   situacao: string,
 *   problemas: string,
 *   recomendacoes: string,
 *   hasSituacao: boolean,
 *   hasProblemas: boolean,
 *   hasRecomendacoes: boolean
 * }|null}
 */
function extractSectionBodies(t) {
  const s = t != null ? String(t).replace(/\r\n/g, '\n') : '';
  if (!s.trim()) {
    return null;
  }

  const a = firstHeader(s, RE_SITUACAO);
  const b = firstHeader(s, RE_PROBLEMAS);
  const c = firstHeader(s, RE_RECOMENDACOES);

  const hasSituacao = a.index >= 0;
  const hasProblemas = b.index >= 0;
  const hasRecomendacoes = c.index >= 0;

  if (!hasSituacao && !hasProblemas && !hasRecomendacoes) {
    return {
      situacao: '',
      problemas: '',
      recomendacoes: s.trim(),
      hasSituacao: false,
      hasProblemas: false,
      hasRecomendacoes: false
    };
  }

  const mark = [
    { k: 'situacao', i: a.index, h: a.len },
    { k: 'problemas', i: b.index, h: b.len },
    { k: 'recomendacoes', i: c.index, h: c.len }
  ]
    .filter((x) => x.i >= 0)
    .sort((p, q) => p.i - q.i);

  const parts = {
    situacao: '',
    problemas: '',
    recomendacoes: '',
    hasSituacao,
    hasProblemas,
    hasRecomendacoes
  };
  for (let k = 0; k < mark.length; k += 1) {
    const cur = mark[k];
    const nxt = mark[k + 1];
    const from = cur.i + cur.h;
    const to = nxt != null ? nxt.i : s.length;
    const chunk = s.slice(from, to).trim();
    if (cur.k === 'situacao') {
      parts.situacao = chunk;
    } else if (cur.k === 'problemas') {
      parts.problemas = chunk;
    } else {
      parts.recomendacoes = chunk;
    }
  }
  return parts;
}

/**
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
function countSharedTokens(a, b) {
  const tokenize = (x) =>
    x
      .toLowerCase()
      .split(/[^a-zA-ZÀ-ÿ0-9]+/)
      .filter((w) => w && w.length >= 4);
  const wa = tokenize(a);
  const setB = new Set(tokenize(b));
  let n = 0;
  for (const w of wa) {
    if (setB.has(w)) {
      n += 1;
    }
  }
  return n;
}

const PLACEHOLDER_RE = /^[\s—\-–.]+$/i;

/**
 * @param {string} body
 * @returns {boolean}
 */
function isPlaceholderOnly(body) {
  const t = body != null ? String(body).trim() : '';
  if (t.length < 2) {
    return true;
  }
  if (PLACEHOLDER_RE.test(t)) {
    return true;
  }
  if (/^[\s(]*sem\s+conte(úu)do[.)]*$/i.test(t)) {
    return true;
  }
  if (t === '—' || t === '-' || t === 'N/A' || t === 'n/a') {
    return true;
  }
  if (/^ver\s+detalhe/i.test(t) && t.length < 50) {
    return true;
  }
  return false;
}

/**
 * @param {{ situacao: string, problemas: string, recomendacoes: string }} slice
 * @returns {boolean}
 */
function hasMinimalCoherence(slice) {
  if (
    isPlaceholderOnly(slice.situacao) &&
    isPlaceholderOnly(slice.problemas) &&
    isPlaceholderOnly(slice.recomendacoes)
  ) {
    return false;
  }
  const a = String(slice.situacao).trim();
  const b = String(slice.problemas).trim();
  const c = String(slice.recomendacoes).trim();

  if (a && b && a === b && b === c) {
    return false;
  }
  if (a.length > 3 && c.length > 3 && a === c && b.length < 8) {
    return false;
  }
  if (
    a.length > 0 &&
    b.length > 0 &&
    countSharedTokens(a, b) < 1 &&
    b.length < 20 &&
    !RISK_PROBLEM_RE.test(b)
  ) {
    if (RISK_PROBLEM_RE.test(a) && b.length < 12) {
      return false;
    }
  }
  if (a.length < 4 && b.length < 4 && c.length < 4) {
    return false;
  }
  return true;
}

/**
 * @param {string} text
 * @returns {boolean}
 */
function hasDataUseSignals(text) {
  if (!text || !String(text).trim()) {
    return false;
  }
  return DATA_USE_RE.test(String(text));
}

/**
 * Valida presença das secções (SITUAÇÃO/CONTEXTO, PROBLEMAS, RECOMENDAÇÕES),
 * corpo mínimo e sinais de ancoragem a dados. Pontuação 0–6; abaixo de 3 ativa
 * `needs_fallback` (a camada de execução aplica juntamente com a validação existente).
 *
 * @param {string|null|undefined} answer
 * @returns {{
 *   score: number,
 *   needs_fallback: boolean,
 *   structure: number,
 *   consistency: number,
 *   data_usage: number,
 *   reason: string
 * }}
 */
function validateResponseStructure(answer) {
  const t = answer != null ? String(answer) : '';
  if (!t.trim()) {
    return {
      score: 0,
      needs_fallback: true,
      structure: 0,
      consistency: 0,
      data_usage: 0,
      reason: 'empty'
    };
  }

  const slice = extractSectionBodies(t);
  if (!slice) {
    return {
      score: 0,
      needs_fallback: true,
      structure: 0,
      consistency: 0,
      data_usage: 0,
      reason: 'no_parse'
    };
  }

  const hasAllHeaders = slice.hasSituacao && slice.hasProblemas && slice.hasRecomendacoes;

  let structurePts = 0;
  if (hasAllHeaders) {
    structurePts = SCORE_PER_AXIS;
  }

  const bodiesOk =
    hasAllHeaders &&
    !isPlaceholderOnly(slice.situacao) &&
    !isPlaceholderOnly(slice.problemas) &&
    !isPlaceholderOnly(slice.recomendacoes) &&
    String(slice.situacao).trim().length >= 6 &&
    String(slice.problemas).trim().length >= 6 &&
    String(slice.recomendacoes).trim().length >= 6;

  let consistencyPts = 0;
  if (bodiesOk && hasMinimalCoherence(slice)) {
    consistencyPts = SCORE_PER_AXIS;
  }

  let dataPts = 0;
  const dataProbe = [slice.situacao, slice.problemas, slice.recomendacoes].join('\n');
  if (hasDataUseSignals(dataProbe)) {
    dataPts = SCORE_PER_AXIS;
  }

  const score = structurePts + consistencyPts + dataPts;
  const needsFallback = score < THRESHOLD_FALLBACK;

  let reason = 'ok';
  if (needsFallback) {
    if (structurePts === 0) {
      reason = 'incomplete_headers';
    } else if (consistencyPts === 0) {
      reason = 'weak_coherence';
    } else if (dataPts === 0) {
      reason = 'low_data_grounding';
    } else {
      reason = 'below_threshold';
    }
  }

  return {
    score,
    needs_fallback: needsFallback,
    structure: structurePts,
    consistency: consistencyPts,
    data_usage: dataPts,
    reason
  };
}

module.exports = {
  validateResponseStructure,
  THRESHOLD_FALLBACK,
  SCORE_PER_AXIS
};
