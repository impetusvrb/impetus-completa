'use strict';

/**
 * Flags granulares de rollout dos módulos contextuais (Phase 6).
 * Todas optam por OFF ("legacy") por defeito.
 *
 *   IMPETUS_CONTEXTUAL_MODULES               'off'|'shadow'|'enrich'|'replace'  (default: off)
 *   IMPETUS_CONTEXTUAL_MODULES_FINANCE       boolean override por área
 *   IMPETUS_CONTEXTUAL_MODULES_OPERATIONAL   boolean override por área
 *   IMPETUS_CONTEXTUAL_MODULES_INDUSTRIAL    boolean override por área
 *   IMPETUS_CONTEXTUAL_MODULES_HR            boolean override por área
 *   IMPETUS_CONTEXTUAL_MODULES_QUALITY       boolean override por área
 *   IMPETUS_CONTEXTUAL_MODULES_MAINTENANCE   boolean override por área
 *   IMPETUS_CONTEXTUAL_MODULES_ADMIN         boolean override por área
 *   IMPETUS_CONTEXTUAL_MODULES_PERCENT       0..100  (default 100)
 *   IMPETUS_CONTEXTUAL_MODULES_BY_COMPANY    JSON map { "<companyId>": "off|shadow|enrich|replace" }
 *
 * Modos:
 *   off     – devolve `visible_modules` legacy intacto, contextual_modules vazio
 *   shadow  – calcula tudo em paralelo mas devolve legacy; observa diff
 *   enrich  – devolve união (legacy ∪ permitidos pelo orchestrator)
 *   replace – devolve apenas o que o orchestrator permite (sempre garantindo
 *             os universals/críticos)
 */

const VALID_MODES = Object.freeze(['off', 'shadow', 'enrich', 'replace']);

const AREA_FLAG_VARS = Object.freeze({
  finance: 'IMPETUS_CONTEXTUAL_MODULES_FINANCE',
  operations: 'IMPETUS_CONTEXTUAL_MODULES_OPERATIONAL',
  industrial: 'IMPETUS_CONTEXTUAL_MODULES_INDUSTRIAL',
  hr: 'IMPETUS_CONTEXTUAL_MODULES_HR',
  quality: 'IMPETUS_CONTEXTUAL_MODULES_QUALITY',
  maintenance: 'IMPETUS_CONTEXTUAL_MODULES_MAINTENANCE',
  admin: 'IMPETUS_CONTEXTUAL_MODULES_ADMIN',
  production: 'IMPETUS_CONTEXTUAL_MODULES_OPERATIONAL',
  pcp: 'IMPETUS_CONTEXTUAL_MODULES_OPERATIONAL'
});

function _readBool(name) {
  const raw = String(process.env[name] || '').trim().toLowerCase();
  if (!raw) return null;
  if (['1', 'true', 'on', 'enabled', 'yes'].includes(raw)) return true;
  if (['0', 'false', 'off', 'disabled', 'no'].includes(raw)) return false;
  return null;
}

function _readMode(name) {
  const raw = String(process.env[name] || 'off').trim().toLowerCase();
  return VALID_MODES.includes(raw) ? raw : 'off';
}

function _readPercent(name) {
  const raw = Number(process.env[name]);
  if (!Number.isFinite(raw)) return 100;
  return Math.max(0, Math.min(100, Math.round(raw)));
}

function _readJsonMap(name) {
  const raw = process.env[name];
  if (!raw) return {};
  try {
    const obj = JSON.parse(raw);
    return obj && typeof obj === 'object' ? obj : {};
  } catch (_) { return {}; }
}

/** stable hash 0..99 a partir de uma seed. */
function _hashBucket(seed) {
  const s = String(seed || '');
  let h = 5381;
  for (let i = 0; i < s.length; i += 1) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return Math.abs(h) % 100;
}

function getFlags() {
  return Object.freeze({
    mode: _readMode('IMPETUS_CONTEXTUAL_MODULES'),
    percent: _readPercent('IMPETUS_CONTEXTUAL_MODULES_PERCENT'),
    byCompany: _readJsonMap('IMPETUS_CONTEXTUAL_MODULES_BY_COMPANY')
  });
}

/**
 * Resolve a directiva final para uma identidade.
 * @param {object} args { area, function_type, company_id, user_id }
 * @returns {{mode:string, source:string, detail:object}}
 */
function resolveDirectiveForUser(args) {
  const flags = getFlags();
  const detail = {};

  // 1) override por empresa
  const byCompany = flags.byCompany || {};
  if (args && args.company_id != null && byCompany[String(args.company_id)]) {
    const m = String(byCompany[String(args.company_id)]).toLowerCase();
    if (VALID_MODES.includes(m)) {
      return { mode: m, source: 'company', detail: { company_id: args.company_id, mode: m } };
    }
  }

  // 2) override por área (boolean) — se true e modo base 'off', promove para 'enrich';
  //    se false, força 'off'. Se não definido, segue base.
  const area = args && args.area ? String(args.area).toLowerCase() : null;
  if (area && AREA_FLAG_VARS[area]) {
    const v = _readBool(AREA_FLAG_VARS[area]);
    if (v === true && flags.mode === 'off') return { mode: 'enrich', source: 'area_override', detail: { area } };
    if (v === false) return { mode: 'off', source: 'area_override', detail: { area } };
  }

  // 3) percent ramping (apenas afecta upgrades; off permanece off)
  if (flags.mode !== 'off') {
    const bucket = _hashBucket(`${args?.company_id || ''}_${args?.user_id || ''}`);
    if (bucket >= flags.percent) {
      return { mode: 'off', source: 'percent', detail: { bucket, percent: flags.percent } };
    }
    detail.bucket = bucket;
    detail.percent = flags.percent;
  }

  return { mode: flags.mode, source: 'base', detail };
}

module.exports = {
  VALID_MODES,
  AREA_FLAG_VARS,
  getFlags,
  resolveDirectiveForUser,
  _hashBucket
};
