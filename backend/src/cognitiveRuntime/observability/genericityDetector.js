'use strict';

const { DOMAIN_AXES } = require('../registry/cognitiveBlockDomains');
const { GENERIC_INDUSTRIAL_TAGS } = require('../registry/cognitiveBlockMetadata');

const GENERIC_PATTERNS = [
  /operational_insights/i,
  /department_interactions/i,
  /recent_interactions/i,
  /ai_insights/i,
  /^trend$/i,
  /live_metric/i,
  /centro\s*de\s*opera/i,
  /uptime/i,
  /efici[eê]ncia\s*(operacional|global)/i,
  /produ[çc][aã]o\s*total/i,
  /indicadores_executivos/i,
  /executive_summary/i,
  /score\s*ia\s*gen[eé]rico/i,
  /personaliza[çc][aã]o\s*parcial/i
];

function detectGenericityInDelivery(payload = {}, ctx = {}) {
  const domainAxis = ctx.domain_axis || payload.functional_axis || payload.functional_area || 'quality';
  const domainConfig = DOMAIN_AXES[domainAxis] || DOMAIN_AXES.quality;

  const deliveredTypes = [
    ...(payload.profile_config?.cards || []).map((c) => c.id || c.title || c.type),
    ...(payload.profile_config?.widgets || []).map((w) => w.id || w.type),
    ...(payload.kpis || []).map((k) => k.label || k.title || k.id)
  ].filter(Boolean);

  const genericHits = [];
  const domainIdealMiss = [];

  for (const item of deliveredTypes) {
    const s = String(item);
    if (GENERIC_PATTERNS.some((re) => re.test(s))) {
      genericHits.push({ item: s, reason: 'generic_industrial_pattern' });
    }
    if ((domainConfig.generic_patterns || []).some((re) => re.test(s))) {
      genericHits.push({ item: s, reason: 'cross_domain_generic_for_axis' });
    }
  }

  const ideal = domainConfig.ideal_semantic_categories || [];
  const deliveredNorm = deliveredTypes.map((t) => String(t).toLowerCase());
  for (const cat of ideal) {
    const found = deliveredNorm.some((d) => d.includes(cat.replace(/_/g, '')) || d.includes(cat));
    if (!found) domainIdealMiss.push(cat);
  }

  const genericityRatio =
    deliveredTypes.length > 0 ? genericHits.length / deliveredTypes.length : 0;

  return {
    domain_axis: domainAxis,
    delivered_count: deliveredTypes.length,
    generic_hits: genericHits,
    genericity_ratio: Math.min(1, genericityRatio),
    ideal_semantic_missing: domainIdealMiss,
    is_semantically_generic: genericityRatio >= 0.5 || domainIdealMiss.length >= 3,
    generic_industrial_tags: GENERIC_INDUSTRIAL_TAGS
  };
}

module.exports = {
  GENERIC_PATTERNS,
  detectGenericityInDelivery
};
