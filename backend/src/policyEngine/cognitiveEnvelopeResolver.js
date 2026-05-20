'use strict';

const catalog = require('../config/functionalAreaCatalog');
const cognitiveFlags = require('./config/cognitiveFeatureFlags');
const { logCognitive } = require('./policyDecisionLogger');

const DEPTH_BY_HIERARCHY = {
  0: 'strategic',
  1: 'strategic',
  2: 'tactical',
  3: 'operational',
  4: 'operational',
  5: 'operational'
};

function resolveAxis(user, dashboardConfig = {}) {
  const axis =
    dashboardConfig.functional_axis ||
    dashboardConfig.functional_area ||
    user?.functional_axis ||
    user?.functional_area;
  if (!axis) return 'operations';
  const id = catalog.isKnownId(catalog.normKey(axis)) ?
    catalog.normKey(axis) :
    catalog.resolveIdFromText(axis);
  return id ? catalog.getAxis(id) || id : String(axis).toLowerCase();
}

/**
 * Envelope cognitivo — limite máximo de profundidade semântica (não expande IA).
 * @param {object} user
 * @param {object} [opts]
 * @returns {object} cognitive_envelope
 */
function resolveCognitiveEnvelope(user, opts = {}) {
  if (!cognitiveFlags.isCognitiveEnvelopeEnabled() && !opts.force) {
    return null;
  }

  const hl = Number(user?.hierarchy_level ?? 5);
  const axis = resolveAxis(user, opts.dashboardConfig || {});
  const depth = DEPTH_BY_HIERARCHY[hl] ?? 'operational';
  const strategic = hl <= 1;
  const crossDomain = strategic && ['admin', 'ceo', 'diretor'].includes(String(user?.role || '').toLowerCase());

  let aiScope = 'restricted';
  if (hl <= 1) aiScope = 'executive_summary';
  else if (hl === 2) aiScope = 'tactical';
  else aiScope = 'operational_bounded';

  let telemetryVisibility = 'aggregated_only';
  if (hl <= 1) telemetryVisibility = 'executive_aggregates';
  if (['engineering', 'admin', 'industrial'].includes(axis)) telemetryVisibility = 'technical_allowed';

  const envelope = {
    depth,
    domains: [axis].filter(Boolean),
    strategic_access: strategic,
    cross_domain_access: !!crossDomain,
    ai_inference_scope: aiScope,
    telemetry_visibility: telemetryVisibility,
    hierarchy_level: hl,
    primary_axis: axis
  };

  logCognitive('COGNITIVE_ENVELOPE_RESOLVED', {
    user_id: user?.id,
    depth: envelope.depth,
    primary_axis: axis,
    ai_inference_scope: aiScope
  });

  return envelope;
}

module.exports = {
  resolveCognitiveEnvelope,
  resolveAxis
};
