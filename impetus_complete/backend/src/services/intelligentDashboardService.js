/**
 * SERVIÇO DE DASHBOARD INTELIGENTE
 * Monta payload completo: perfil + preferências + histórico + KPIs + insights
 * DASHBOARD = HIERARQUIA + ÁREA + CARGO + PERMISSÕES + KPIs FAVORITOS + HISTÓRICO
 */

const db = require('../db');
const dashboardProfileResolver = require('./dashboardProfileResolver');
const { getProfile } = require('../config/dashboardProfiles');
const dashboardKPIs = require('./dashboardKPIs');
const hierarchicalFilter = require('./hierarchicalFilter');
const userContext = require('./userContext');
const smartSummary = require('./smartSummary');
const dashboardAccess = require('./dashboardAccessService');
let centralIndustryAI;
try { centralIndustryAI = require('./centralIndustryAIService'); } catch (_) {}

/**
 * Busca preferências do usuário (tabela user_dashboard_preferences)
 */
async function getUserPreferences(userId) {
  try {
    const r = await db.query(
      'SELECT cards_order, favorite_kpis, default_period, default_sector, compact_mode, pinned_widgets, sections_priority FROM user_dashboard_preferences WHERE user_id = $1',
      [userId]
    );
    if (r.rows.length > 0) {
      return r.rows[0];
    }
  } catch (err) {
    if (!err.message?.includes('does not exist')) console.warn('[INTELLIGENT_DASHBOARD] getUserPreferences:', err.message);
  }
  return null;
}

/**
 * Busca preferências do usuário da tabela users (dashboard_preferences, preferred_kpis)
 */
function getLegacyPreferences(user) {
  const prefs = user.dashboard_preferences || {};
  const kpis = user.preferred_kpis || [];
  return {
    cards_order: prefs.cards_order || [],
    favorite_kpis: Array.isArray(kpis) ? kpis : [],
    default_period: prefs.favorite_period || prefs.default_period || '7d',
    default_sector: prefs.favorite_sector || prefs.default_sector || null,
    compact_mode: prefs.compact_mode || false
  };
}

/**
 * Busca histórico de uso recente (últimos 30 dias) para personalização
 */
async function getUsageHistory(userId, companyId, limit = 50) {
  try {
    const r = await db.query(`
      SELECT event_type, entity_type, entity_id, context, created_at
      FROM dashboard_usage_events
      WHERE user_id = $1 AND company_id = $2
        AND created_at >= now() - INTERVAL '30 days'
      ORDER BY created_at DESC
      LIMIT $3
    `, [userId, companyId, limit]);
    return r.rows;
  } catch (err) {
    if (!err.message?.includes('does not exist')) console.warn('[INTELLIGENT_DASHBOARD] getUsageHistory:', err.message);
  }
  return [];
}

/**
 * Extrai KPIs mais acessados do histórico
 */
function extractTopKpisFromHistory(history) {
  const counts = {};
  for (const row of history) {
    if (row.event_type === 'click_kpi' && row.entity_id) {
      counts[row.entity_id] = (counts[row.entity_id] || 0) + 1;
    }
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([k]) => k);
}

/**
 * Monta ordem de cards considerando preferências + histórico
 */
function buildCardsOrder(profileCards, userPrefs, topKpisFromHistory) {
  const order = userPrefs?.cards_order?.length ? userPrefs.cards_order : [];
  const favKpis = userPrefs?.favorite_kpis?.length ? userPrefs.favorite_kpis : topKpisFromHistory;
  const allKeys = [...new Set([...order, ...favKpis, ...profileCards.map(c => c.key)])];
  return allKeys.filter(k => profileCards.some(c => c.key === k));
}

/**
 * buildDashboardPayload(user)
 * Payload completo para o frontend montar o dashboard
 */
async function buildDashboardPayload(user) {
  if (!user?.id || !user?.company_id) {
    return getFallbackPayload();
  }

  const scope = await hierarchicalFilter.resolveHierarchyScope(user);
  const config = dashboardProfileResolver.getDashboardConfigForUser(user);
  const profile = config.profile_config;
  const profileCode = config.profile_code;

  const [prefsTable, legacyPrefs, usageHistory, kpis, summaryResult, centralAIResult] = await Promise.all([
    getUserPreferences(user.id),
    Promise.resolve(getLegacyPreferences(user)),
    getUsageHistory(user.id, user.company_id),
    dashboardKPIs.getDashboardKPIs(user, scope),
    smartSummary.buildSmartSummary(user.id, user.name, user.company_id, user).catch(() => null),
    centralIndustryAI?.getCentralIntelligence(user.company_id, user).catch(() => null)
  ]);

  const userPrefs = prefsTable || legacyPrefs;
  const topKpisFromHistory = extractTopKpisFromHistory(usageHistory);
  const cardsOrder = buildCardsOrder(profile.cards || [], userPrefs, topKpisFromHistory);

  const cards = (profile.cards || []).map(c => ({
    ...c,
    sort_order: cardsOrder.indexOf(c.key) >= 0 ? cardsOrder.indexOf(c.key) : 999
  })).sort((a, b) => a.sort_order - b.sort_order);

  const ctx = userContext.buildUserContext(user);

  const allowedModules = dashboardAccess.getAllowedModules(user);
  const allowedKpis = dashboardAccess.getAllowedKpis(user, kpis);

  return {
    ok: true,
    profile_code: profileCode,
    profile_label: profile.label,
    favorite_kpis: userPrefs?.favorite_kpis || [],
    insights_mode: profile.insights_mode,
    default_period: userPrefs?.default_period || profile.default_period || '7d',
    default_sector: userPrefs?.default_sector || profile.default_filters?.sector || null,
    compact_mode: userPrefs?.compact_mode || false,
    visible_modules: allowedModules,
    cards: dashboardAccess.getAllowedCards(user, cards),
    charts: profile.charts || [],
    alerts: profile.alerts || [],
    widgets: profile.widgets || [],
    default_filters: profile.default_filters || {},
    kpis: allowedKpis,
    smart_summary: summaryResult?.summary || null,
    user_context: {
      role: user.role,
      functional_area: config.functional_area,
      job_title: user.job_title,
      department: user.department,
      hierarchy_level: user.hierarchy_level ?? ctx?.hierarchy_level ?? 5
    },
    permissions: dashboardAccess.getEffectivePermissions(user),
    central_ai: centralAIResult || undefined
  };
}

/**
 * Fallback quando usuário ou company inválidos
 */
function getFallbackPayload() {
  return {
    ok: true,
    profile_code: 'operator_floor',
    profile_label: 'Operador',
    insights_mode: 'objective_practical',
    default_period: '7d',
    default_sector: null,
    compact_mode: false,
    visible_modules: ['dashboard', 'operational', 'biblioteca', 'ai', 'settings'],
    cards: [
      { key: 'my_interactions', title: 'Minhas interações', icon: 'message', color: 'blue' },
      { key: 'my_proposals', title: 'Minhas propostas', icon: 'target', color: 'purple' }
    ],
    charts: [],
    alerts: ['critical'],
    widgets: ['ai_insights'],
    default_filters: {},
    kpis: [],
    smart_summary: null,
    user_context: {},
    permissions: []
  };
}

/**
 * Registra evento de uso (para personalização por comportamento)
 */
async function trackInteraction(userId, companyId, eventType, entityType, entityId, context = {}) {
  try {
    await db.query(`
      INSERT INTO dashboard_usage_events (user_id, company_id, event_type, entity_type, entity_id, context)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [userId, companyId, eventType, entityType || null, entityId || null, JSON.stringify(context)]);
    return true;
  } catch (err) {
    if (!err.message?.includes('does not exist')) console.warn('[INTELLIGENT_DASHBOARD] trackInteraction:', err.message);
  }
  return false;
}

/**
 * Salva preferências do usuário
 */
async function savePreferences(userId, preferences) {
  try {
    const {
      cards_order = [],
      favorite_kpis = [],
      default_period = '7d',
      default_sector = null,
      compact_mode = false,
      pinned_widgets = [],
      sections_priority = []
    } = preferences;

    await db.query(`
      INSERT INTO user_dashboard_preferences (user_id, cards_order, favorite_kpis, default_period, default_sector, compact_mode, pinned_widgets, sections_priority, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now())
      ON CONFLICT (user_id) DO UPDATE SET
        cards_order = COALESCE($2::jsonb, user_dashboard_preferences.cards_order),
        favorite_kpis = COALESCE($3::jsonb, user_dashboard_preferences.favorite_kpis),
        default_period = COALESCE($4, user_dashboard_preferences.default_period),
        default_sector = COALESCE($5, user_dashboard_preferences.default_sector),
        compact_mode = COALESCE($6, user_dashboard_preferences.compact_mode),
        pinned_widgets = COALESCE($7::jsonb, user_dashboard_preferences.pinned_widgets),
        sections_priority = COALESCE($8::jsonb, user_dashboard_preferences.sections_priority),
        updated_at = now()
    `, [
      userId,
      JSON.stringify(Array.isArray(cards_order) ? cards_order : []),
      JSON.stringify(Array.isArray(favorite_kpis) ? favorite_kpis : []),
      default_period,
      default_sector,
      compact_mode,
      JSON.stringify(Array.isArray(pinned_widgets) ? pinned_widgets : []),
      JSON.stringify(Array.isArray(sections_priority) ? sections_priority : [])
    ]);
    return true;
  } catch (err) {
    if (!err.message?.includes('does not exist')) console.error('[INTELLIGENT_DASHBOARD] savePreferences:', err.message);
  }
  return false;
}

/**
 * Gera insights personalizados baseado no perfil do usuário
 */
function getInsightsPromptContext(profileCode) {
  const profile = getProfile(profileCode);
  const mode = profile.insights_mode || 'objective_practical';
  const map = {
    strategic_executive: 'Resuma de forma estratégica. Foque em decisões e tendências globais. Tom executivo.',
    strategic_analytical: 'Apresente dados consolidados e conclusões. Visão analítica de diretor.',
    analytical_tactical: 'Combine análise com ações táticas. Foque no setor do gerente.',
    operational_tactical: 'Status operacional e pendências. Detalhes do coordenador.',
    technical_tactical: 'Linguagem técnica e objetiva. Ações diretas para o supervisor.',
    practical_operational: 'Informações práticas e diretas. Foco em execução.',
    objective_practical: 'Objetivo e conciso. Informações essenciais para o operador.'
  };
  return map[mode] || map.objective_practical;
}

module.exports = {
  buildDashboardPayload,
  trackInteraction,
  savePreferences,
  getUserPreferences,
  getUsageHistory,
  getInsightsPromptContext
};
