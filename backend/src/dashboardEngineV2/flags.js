'use strict';

/**
 * Feature flags da migração para o motor por eixos (Motor B / V2).
 *
 * Princípios:
 * - Default = comportamento legado (Motor A primário, sem shadow, sem trace).
 * - Cada flag tem uma única fonte: env var. Sem hot-reload — alterar e reiniciar.
 * - O parser nunca lança; valores inválidos caem para o default seguro.
 */

const RAW_LEVELS = Object.freeze({
  off: 'off',
  shadow: 'shadow',
  on: 'on'
});

function _normalizeLevel(value) {
  const v = String(value || '').trim().toLowerCase();
  if (v === RAW_LEVELS.shadow) return RAW_LEVELS.shadow;
  if (v === RAW_LEVELS.on || v === 'true' || v === '1') return RAW_LEVELS.on;
  return RAW_LEVELS.off;
}

function _parseShadowDirective(value) {
  const v = String(value || '').trim().toLowerCase();
  if (!v) return { enabled: false, sample: 0 };
  if (v === 'true' || v === '1' || v === 'on') return { enabled: true, sample: 1 };
  if (v === 'false' || v === '0' || v === 'off') return { enabled: false, sample: 0 };
  const m = v.match(/^sample:([0-9.]+)$/);
  if (m) {
    const n = Number(m[1]);
    if (Number.isFinite(n) && n > 0 && n <= 1) return { enabled: true, sample: n };
  }
  return { enabled: false, sample: 0 };
}

function _parseLogLevel(value) {
  const v = String(value || '').trim().toLowerCase();
  if (v === 'silent' || v === 'debug' || v === 'info') return v;
  return 'info';
}

/**
 * Resolve flags atuais lendo `process.env`.
 * Chamar em cada request — barato, sem efeitos colaterais.
 */
function getFlags() {
  const v2 = _normalizeLevel(process.env.IMPETUS_DASHBOARD_ENGINE_V2);
  const shadow = _parseShadowDirective(process.env.IMPETUS_DASHBOARD_ENGINE_SHADOW);
  const logLevel = _parseLogLevel(process.env.IMPETUS_DASHBOARD_ENGINE_LOG_LEVEL);

  // Coerência: V2 == 'shadow' implica shadow ligado a 100%.
  if (v2 === RAW_LEVELS.shadow && !shadow.enabled) {
    return { v2, shadow: { enabled: true, sample: 1 }, logLevel };
  }
  return { v2, shadow, logLevel };
}

/**
 * Decide se este request deve executar Motor B em paralelo.
 * Com `sample < 1`, faz amostragem determinística por seed (user_id + traceId).
 */
function shouldRunShadow(flags, seed) {
  if (!flags || !flags.shadow || !flags.shadow.enabled) return false;
  const s = Number(flags.shadow.sample);
  if (!Number.isFinite(s) || s <= 0) return false;
  if (s >= 1) return true;
  const str = String(seed || Math.random());
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  // Normaliza para [0, 1) e compara contra a taxa de amostragem.
  const normalized = ((hash >>> 0) % 10000) / 10000;
  return normalized < s;
}

/**
 * Decide qual engine deve devolver a resposta primária.
 * Resposta: 'A' | 'B'. Em qualquer caso, shadow pode rodar em paralelo.
 */
function primaryEngine(flags) {
  if (flags && flags.v2 === RAW_LEVELS.on) return 'B';
  return 'A';
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase 3 — Roteamento granular (área / função / empresa / percentual)
// ─────────────────────────────────────────────────────────────────────────────

const AREA_FLAG_VARS = Object.freeze({
  finance: 'IMPETUS_ENGINE_V2_FINANCE',
  industrial: 'IMPETUS_ENGINE_V2_INDUSTRIAL',
  operations: 'IMPETUS_ENGINE_V2_INDUSTRIAL',  // alias
  production: 'IMPETUS_ENGINE_V2_INDUSTRIAL',  // alias
  maintenance: 'IMPETUS_ENGINE_V2_INDUSTRIAL', // alias
  quality: 'IMPETUS_ENGINE_V2_INDUSTRIAL',     // alias
  hr: 'IMPETUS_ENGINE_V2_HR',
  pcp: 'IMPETUS_ENGINE_V2_INDUSTRIAL',
  admin: 'IMPETUS_ENGINE_V2_ADMIN'
});

const FUNCTION_FLAG_VARS = Object.freeze({
  decisao_estrategica: 'IMPETUS_ENGINE_V2_STRATEGIC',
  analise: 'IMPETUS_ENGINE_V2_ANALYSIS',
  supervisao: 'IMPETUS_ENGINE_V2_SUPERVISION',
  execucao: 'IMPETUS_ENGINE_V2_EXECUTION',
  governanca: 'IMPETUS_ENGINE_V2_GOVERNANCE'
});

function _parseCsv(value) {
  return String(value || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

function _parsePercent(value) {
  const v = String(value || '').trim();
  if (!v) return 0;
  const n = Number(v);
  if (Number.isFinite(n)) {
    if (n <= 1) return Math.max(0, Math.min(1, n));
    if (n <= 100) return Math.max(0, Math.min(1, n / 100));
  }
  return 0;
}

/**
 * Resolve directiva granular V2 — verifica flags em cascata:
 *   1. IMPETUS_ENGINE_V2_BY_COMPANY — lista CSV de company_ids/slugs.
 *   2. IMPETUS_ENGINE_V2_<AREA>     — flag por área (true/shadow/sample:X).
 *   3. IMPETUS_ENGINE_V2_<FUNCTION> — flag por função.
 *   4. IMPETUS_ENGINE_V2_PERCENT    — amostragem global (0..1 ou 0..100).
 *   5. fallback: getFlags().v2 (off/shadow/on).
 *
 * @param {{ area?:string|null, functionType?:string|null, company_id?:string|null, user_id?:string|null }} ctx
 * @returns {{ mode: 'off'|'shadow'|'on', source: string, detail: object }}
 */
function resolveEngineDirectiveForUser(ctx) {
  const c = ctx || {};
  const baseFlags = getFlags();

  // 1) BY_COMPANY (whitelist)
  const companyList = _parseCsv(process.env.IMPETUS_ENGINE_V2_BY_COMPANY);
  const cid = String(c.company_id || '').toLowerCase();
  if (companyList.length > 0 && cid && companyList.includes(cid)) {
    return { mode: RAW_LEVELS.on, source: 'by_company', detail: { company_id: cid } };
  }

  // 2) Por área
  const areaKey = String(c.area || '').toLowerCase();
  const areaVar = AREA_FLAG_VARS[areaKey];
  if (areaVar && process.env[areaVar]) {
    const lvl = _normalizeLevel(process.env[areaVar]);
    if (lvl !== RAW_LEVELS.off) {
      return { mode: lvl, source: 'by_area', detail: { area: areaKey, var: areaVar } };
    }
  }

  // 3) Por função
  const fnKey = String(c.functionType || '').toLowerCase();
  const fnVar = FUNCTION_FLAG_VARS[fnKey];
  if (fnVar && process.env[fnVar]) {
    const lvl = _normalizeLevel(process.env[fnVar]);
    if (lvl !== RAW_LEVELS.off) {
      return { mode: lvl, source: 'by_function', detail: { function_type: fnKey, var: fnVar } };
    }
  }

  // 4) Percentual global
  const pct = _parsePercent(process.env.IMPETUS_ENGINE_V2_PERCENT);
  if (pct > 0) {
    const seed = String(c.user_id || c.company_id || Math.random());
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
    const norm = ((h >>> 0) % 10000) / 10000;
    if (norm < pct) {
      return { mode: RAW_LEVELS.on, source: 'by_percent', detail: { percent: pct } };
    }
  }

  // 5) Fallback: flag global V2
  return { mode: baseFlags.v2, source: 'global_v2', detail: { v2: baseFlags.v2 } };
}

module.exports = {
  RAW_LEVELS,
  AREA_FLAG_VARS,
  FUNCTION_FLAG_VARS,
  getFlags,
  shouldRunShadow,
  primaryEngine,
  resolveEngineDirectiveForUser,
  // expostos para tests
  _normalizeLevel,
  _parseShadowDirective,
  _parseLogLevel,
  _parseCsv,
  _parsePercent
};
