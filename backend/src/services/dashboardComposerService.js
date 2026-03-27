/**
 * COMPOSITOR DO DASHBOARD INTELIGENTE
 * DASHBOARD FINAL = perfil base (role+área) + permissões + preferências + histórico de uso
 */
const db = require('../db');
const dashboardProfileResolver = require('./dashboardProfileResolver');
const dashboardAccessService = require('./dashboardAccessService');
const personalizedInsightsService = require('./personalizedInsightsService');

function parseJsonField(val, fallback) {
  if (val == null) return fallback;
  if (Array.isArray(val)) return val;
  if (typeof val === 'object') return val;
  if (typeof val === 'string') {
    try {
      return JSON.parse(val);
    } catch {
      return fallback;
    }
  }
  return fallback;
}

/**
 * Normaliza campos de personalização do utilizador (sessão ou linha DB)
 */
function normalizeUserPersonalization(user) {
  const preferred_kpis = parseJsonField(user.preferred_kpis, []);
  const dashboard_preferences = parseJsonField(user.dashboard_preferences, {});
  return {
    ...user,
    preferred_kpis: Array.isArray(preferred_kpis) ? preferred_kpis : [],
    dashboard_preferences: typeof dashboard_preferences === 'object' && dashboard_preferences !== null
      ? dashboard_preferences
      : {},
    ai_profile_context: parseJsonField(user.ai_profile_context, {}),
    seniority_level: user.seniority_level || null,
    onboarding_completed: user.onboarding_completed === true
  };
}

async function hydrateUserPreferences(userId) {
  const r = await db.query(
    `SELECT preferred_kpis, dashboard_preferences, seniority_level, onboarding_completed, ai_profile_context, dashboard_profile, functional_area
     FROM users WHERE id = $1`,
    [userId]
  );
  if (!r.rows?.length) return null;
  const row = r.rows[0];
  return {
    preferred_kpis: parseJsonField(row.preferred_kpis, []),
    dashboard_preferences: parseJsonField(row.dashboard_preferences, {}),
    seniority_level: row.seniority_level,
    onboarding_completed: row.onboarding_completed === true,
    ai_profile_context: parseJsonField(row.ai_profile_context, {}),
    dashboard_profile: row.dashboard_profile,
    functional_area: row.functional_area
  };
}

/**
 * Agrega pesos por entidade clicada/visualizada (para ordenação)
 */
async function getUsageWeights(userId, days = 30) {
  if (!userId) return [];
  try {
    const r = await db.query(
      `SELECT entity_type, entity_id, COUNT(*)::int AS weight
       FROM dashboard_usage_events
       WHERE user_id = $1
         AND created_at >= now() - ($2::int * interval '1 day')
         AND entity_id IS NOT NULL
       GROUP BY entity_type, entity_id
       ORDER BY weight DESC
       LIMIT 30`,
      [userId, days]
    );
    return (r.rows || []).map((row) => ({
      entity_type: row.entity_type,
      entity_id: row.entity_id,
      weight: row.weight
    }));
  } catch {
    return [];
  }
}

/**
 * Reordena KPIs: favoritos primeiro, depois por peso de uso, depois restantes
 */
function applyPersonalizationToKpis(kpis, user) {
  const u = normalizeUserPersonalization(user);
  const preferred = u.preferred_kpis || [];
  const weights = user._usage_weights || [];
  const weightMap = new Map(weights.map((w) => [w.entity_id, w.weight]));
  if (!Array.isArray(kpis) || !kpis.length) return kpis;

  const byKey = new Map();
  for (const k of kpis) {
    const key = k.key || k.id;
    if (key) byKey.set(key, k);
  }

  const ordered = [];
  const seen = new Set();

  for (const key of preferred) {
    if (byKey.has(key) && !seen.has(key)) {
      ordered.push(byKey.get(key));
      seen.add(key);
    }
  }

  const restKeys = [...byKey.keys()].filter((k) => !seen.has(k));
  restKeys.sort((a, b) => (weightMap.get(b) || 0) - (weightMap.get(a) || 0));
  for (const key of restKeys) {
    ordered.push(byKey.get(key));
    seen.add(key);
  }

  return ordered;
}

async function recordInteraction(userId, companyId, eventType, entityType, entityId, context = {}) {
  if (!userId || !eventType) return;
  try {
    await db.query(
      `INSERT INTO dashboard_usage_events (user_id, company_id, event_type, entity_type, entity_id, context)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
      [userId, companyId || null, eventType.slice(0, 64), entityType ? entityType.slice(0, 64) : null, entityId ? String(entityId).slice(0, 128) : null, JSON.stringify(context || {})]
    );
  } catch (e) {
    if (!String(e.message || '').includes('dashboard_usage_events')) {
      console.warn('[DASHBOARD_COMPOSER] recordInteraction:', e.message);
    }
  }
}

/**
 * Merge seguro de preferências JSONB
 */
async function mergeDashboardPreferences(userId, patch) {
  const cur = await db.query('SELECT dashboard_preferences FROM users WHERE id = $1', [userId]);
  const base = parseJsonField(cur.rows?.[0]?.dashboard_preferences, {});
  const next = { ...base, ...patch };
  await db.query(
    'UPDATE users SET dashboard_preferences = $1::jsonb, updated_at = now() WHERE id = $2',
    [JSON.stringify(next), userId]
  );
  return next;
}

/**
 * Payload enriquecido para GET /dashboard/me e GET /dashboard/config
 */
async function buildDashboardPayload(user) {
  let u = normalizeUserPersonalization(user);
  if (!u.preferred_kpis?.length && !Object.keys(u.dashboard_preferences || {}).length) {
    const h = await hydrateUserPreferences(user.id);
    if (h) {
      u = { ...u, ...h };
      u = normalizeUserPersonalization(u);
    }
  }

  const config = dashboardProfileResolver.getDashboardConfigForUser(u);
  const allowedModules = dashboardAccessService.getAllowedModules(u);
  const allowedCards = dashboardAccessService.getAllowedCards(u, config.profile_config?.cards || []);

  const usageWeights = await getUsageWeights(user.id, 30);
  u._usage_weights = usageWeights;

  const insightsInstructions = personalizedInsightsService.getInsightsInstructions(config.profile_code, u);
  const prefs = u.dashboard_preferences || {};
  const cardsOrder = Array.isArray(prefs.cards_order) ? prefs.cards_order : [];

  return {
    resolved_profile: config.profile_code,
    resolved_functional_area: config.functional_area,
    profile_label: config.profile_config?.label || config.profile_code,
    insights_mode: config.profile_config?.insights_mode || 'objective_practical',
    default_period: prefs.favorite_period || config.profile_config?.default_period || '7d',
    compact_mode: prefs.compact_mode === true,
    cards_order: cardsOrder,
    favorite_sector: prefs.favorite_sector || null,
    preferred_kpis: u.preferred_kpis,
    seniority_level: u.seniority_level,
    onboarding_completed: u.onboarding_completed,
    ai_profile_context: u.ai_profile_context,
    usage_top_entities: usageWeights.slice(0, 8),
    ai_insights_instructions: insightsInstructions,
    allowed_modules: allowedModules,
    cards_allowed_by_permission: allowedCards.map((c) => c.key || c.title).filter(Boolean),
    widgets_preview: (config.profile_config?.widgets || []).slice(0, 12)
  };
}

module.exports = {
  normalizeUserPersonalization,
  hydrateUserPreferences,
  getUsageWeights,
  applyPersonalizationToKpis,
  recordInteraction,
  mergeDashboardPreferences,
  buildDashboardPayload
};
