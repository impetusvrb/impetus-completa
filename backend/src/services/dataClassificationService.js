'use strict';

/**
 * Classificação leve de dados (regex + heurística) — LGPD / minimização.
 * Não substitui DLP enterprise; adequado a latência baixa no orquestrador.
 */

const CPF_DIGITS = /\b(\d{3})\.?(\d{3})\.?(\d{3})-?(\d{2})\b/g;
const EMAIL_RE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE_BR_RE =
  /\b(?:\+?55\s?)?(?:\(?0?\d{2}\)?\s?)?(?:9\s?)?\d{4}[-.\s]?\d{4}\b/g;
const UUID_RE =
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi;
const CREDENTIAL_RE =
  /\b(?:senha|password|passwd|api[_-]?key|secret|token|bearer\s+[a-z0-9._-]{8,}|chave\s+(?:de\s+)?api)\b/gi;
const NOME_FRASE_RE =
  /\b(?:meu\s+)?nome\s+(?:é|e|eh)\s+([A-ZÀ-Ú][a-zà-ú]+(?:\s+[A-ZÀ-Ú][a-zà-ú]+)+)/i;
const RG_RE = /\b\d{1,2}\.\d{3}\.\d{3}-[0-9Xx]\b/;
const INDUSTRIAL_CRITICAL_RE =
  /\b(?:receita\s+secreta|formula\s+qu[ií]mica|msds\s+confidencial|dados\s+de\s+fornecedor\s+sigiloso)\b/i;

function collectStrings(value, out, depth = 0) {
  if (depth > 12) return;
  if (value == null) return;
  if (typeof value === 'string') {
    if (value.length && value.length < 500000) out.push(value);
    return;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    out.push(String(value));
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value.slice(0, 400)) collectStrings(item, out, depth + 1);
    return;
  }
  if (typeof value === 'object') {
    for (const v of Object.values(value)) collectStrings(v, out, depth + 1);
  }
}

function scanText(text, detected) {
  const t = String(text || '');
  if (!t) return;

  CPF_DIGITS.lastIndex = 0;
  if (CPF_DIGITS.test(t) || /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/.test(t)) detected.add('cpf');

  if (EMAIL_RE.test(t)) detected.add('email');
  EMAIL_RE.lastIndex = 0;

  if (PHONE_BR_RE.test(t)) detected.add('telefone');

  const uuids = t.match(UUID_RE) || [];
  UUID_RE.lastIndex = 0;
  if (uuids.length >= 2 && /\b(?:cadastro|usu[aá]rio|cliente|funcion[aá]rio|cpf|pessoal)\b/i.test(t)) {
    detected.add('uuid_contexto_pessoal');
  } else if (uuids.length >= 4) detected.add('multi_uuid');

  if (NOME_FRASE_RE.test(t)) detected.add('nome_declarado');

  if (RG_RE.test(t)) detected.add('rg');

  if (CREDENTIAL_RE.test(t)) detected.add('credencial_ou_segredo');
  CREDENTIAL_RE.lastIndex = 0;

  if (INDUSTRIAL_CRITICAL_RE.test(t)) detected.add('dado_industrial_critico');
}

/**
 * @param {string|Record<string, unknown>} payload
 * @returns {{
 *   contains_personal_data: boolean,
 *   contains_sensitive_data: boolean,
 *   detected_fields: string[],
 *   risk_level: 'LOW'|'MEDIUM'|'HIGH'|'CRITICAL',
 *   data_categories: string[],
 *   primary_category: 'PERSONAL'|'SENSITIVE'|'OPERATIONAL'|'CRITICAL_INDUSTRIAL'
 * }}
 */
function classifyData(payload) {
  const detected = new Set();
  const strings = [];
  if (typeof payload === 'string') {
    strings.push(payload);
  } else if (payload && typeof payload === 'object') {
    collectStrings(payload, strings);
  }

  const blob = strings.join('\n').slice(0, 400000);
  for (const part of blob.match(/.{1,8000}/gs) || [blob]) {
    scanText(part, detected);
  }

  const fields = [...detected];
  const hasCpf = fields.includes('cpf');
  const hasCred = fields.includes('credencial_ou_segredo');
  const hasIndustrial = fields.includes('dado_industrial_critico');
  const hasEmail = fields.includes('email');
  const hasPhone = fields.includes('telefone');
  const hasNome = fields.includes('nome_declarado');
  const hasRg = fields.includes('rg');
  const hasUuidPersonal = fields.includes('uuid_contexto_pessoal');

  const contains_personal_data =
    hasCpf || hasEmail || hasPhone || hasNome || hasRg || hasUuidPersonal;
  const contains_sensitive_data =
    hasCpf || hasCred || hasIndustrial || hasRg || (hasEmail && hasPhone) || hasUuidPersonal;

  let risk_level = 'LOW';
  if (hasCpf || hasCred || (hasIndustrial && hasEmail)) {
    risk_level = 'CRITICAL';
  } else if (hasIndustrial || (hasEmail && hasPhone && hasNome) || hasUuidPersonal) {
    risk_level = 'HIGH';
  } else if (contains_sensitive_data || contains_personal_data || fields.includes('multi_uuid')) {
    risk_level = 'MEDIUM';
  }

  const operationalHint = /\b(?:linha|sensor|oee|ativo|lote|manuten[cç][aã]o|ordem\s+de\s+produ[cç][aã]o|plc|scada)\b/i.test(
    blob.slice(0, 80000)
  );
  const data_categories = [];
  if (contains_personal_data) data_categories.push('PERSONAL');
  if (contains_sensitive_data) data_categories.push('SENSITIVE');
  if (hasIndustrial) data_categories.push('CRITICAL_INDUSTRIAL');
  if (operationalHint || data_categories.length === 0) data_categories.push('OPERATIONAL');

  let primary_category = 'OPERATIONAL';
  if (hasIndustrial) primary_category = 'CRITICAL_INDUSTRIAL';
  else if (contains_sensitive_data) primary_category = 'SENSITIVE';
  else if (contains_personal_data) primary_category = 'PERSONAL';

  return {
    contains_personal_data,
    contains_sensitive_data,
    detected_fields: fields.sort(),
    risk_level,
    data_categories: [...new Set(data_categories)].sort(),
    primary_category
  };
}

module.exports = {
  classifyData
};
