'use strict';

const GENERIC_CARD_PATTERN =
  /operational_insights|department_interactions|recent_interactions|ai_insights|^trend$/i;

function buildSpecializedCockpitHints(shadowCockpit = {}) {
  const blocks = shadowCockpit.blocks || [];
  return blocks
    .filter((b) => b.enriched || b.shadow_signals?.bridge_status === 'bound_z20')
    .map((b) => ({
      block_id: b.block_id,
      label: b.label,
      semantic_category: b.semantic_category,
      surface: b.surface,
      summary: b.shadow_signals?.summary || null,
      metrics: b.shadow_signals?.metrics || {},
      render_active: false,
      enrichment_slot: b.semantic_layer || 'operational'
    }));
}

function enrichProfileConfigCards(payload = {}, hints = []) {
  const profileConfig = payload.profile_config || {};
  const legacyCards = Array.isArray(profileConfig.cards) ? [...profileConfig.cards] : [];
  const legacyWidgets = Array.isArray(profileConfig.widgets) ? [...profileConfig.widgets] : [];

  const genericCards = legacyCards.filter((c) =>
    GENERIC_CARD_PATTERN.test(String(c.id || c.key || c.title || ''))
  );

  return {
    profile_config: {
      ...profileConfig,
      cards: legacyCards,
      widgets: legacyWidgets,
      cards_legacy: legacyCards,
      specialized_cockpit_hints: hints,
      generic_cards_preserved: genericCards.length,
      cockpit_enrichment_mode: 'additive_hints'
    },
    cards_enriched: hints.length > 0,
    widgets_removed: 0
  };
}

module.exports = {
  GENERIC_CARD_PATTERN,
  buildSpecializedCockpitHints,
  enrichProfileConfigCards
};
