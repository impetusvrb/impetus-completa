'use strict';

function detectManagerialBlindSpot(kpis = [], ctx = {}) {
  const tier = String(ctx.hierarchy_tier || '').toLowerCase();
  if (!['coordination', 'supervisor'].includes(tier)) return { blind_spot: false, not_applicable: true };
  const critical = kpis.length < 2;
  return { blind_spot: critical, critical, tier: 'managerial', gap_count: critical ? 2 : 0 };
}

module.exports = { detectManagerialBlindSpot };
