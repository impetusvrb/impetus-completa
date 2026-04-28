/**
 * IMPETUS - Feature Flags
 * Habilita/desabilita funcionalidades via env ou banco (futuro)
 * Uso: featureFlags.isEnabled('ai_chat') => true/false
 */
const db = require('../db');

const ENV_FLAGS = {
  AI_CHAT: process.env.FEATURE_AI_CHAT !== 'false',
  OPERATIONAL_BRAIN: process.env.FEATURE_OPERATIONAL_BRAIN !== 'false',
  INDUSTRIAL_INTEGRATION: process.env.FEATURE_INDUSTRIAL !== 'false',
  ROLE_VERIFICATION: process.env.FEATURE_ROLE_VERIFICATION !== 'false'
};

let dbFlagsCache = null;
let dbFlagsExpiry = 0;
const CACHE_TTL_MS = 60 * 1000; // 1 minuto

async function getDbFlags() {
  if (dbFlagsCache && Date.now() < dbFlagsExpiry) return dbFlagsCache;
  try {
    const r = await db.query(`
      SELECT flag_key, enabled FROM feature_flags WHERE active = true
    `).catch(() => ({ rows: [] }));
    dbFlagsCache = Object.fromEntries((r.rows || []).map(x => [x.flag_key, x.enabled]));
    dbFlagsExpiry = Date.now() + CACHE_TTL_MS;
    return dbFlagsCache;
  } catch (err) {
    console.warn('[featureFlagsService][get_db_flags]', err?.message ?? err);
    return {};
  }
}

async function isEnabled(flagKey) {
  const key = (flagKey || '').toUpperCase().replace(/-/g, '_');
  const envKey = `FEATURE_${key}`;
  if (process.env[envKey] !== undefined) {
    return process.env[envKey] === 'true' || process.env[envKey] === '1';
  }
  const envDefault = ENV_FLAGS[key];
  if (envDefault !== undefined) return envDefault;
  const dbFlags = await getDbFlags();
  if (dbFlags[key] !== undefined) return !!dbFlags[key];
  return true;
}

function isEnabledSync(flagKey) {
  const key = (flagKey || '').toUpperCase().replace(/-/g, '_');
  const envKey = `FEATURE_${key}`;
  if (process.env[envKey] !== undefined) {
    return process.env[envKey] === 'true' || process.env[envKey] === '1';
  }
  return ENV_FLAGS[key] !== false;
}

module.exports = {
  isEnabled,
  isEnabledSync,
  ENV_FLAGS,
  invalidateCache: () => { dbFlagsCache = null; dbFlagsExpiry = 0; }
};
