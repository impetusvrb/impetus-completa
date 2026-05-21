'use strict';

function validateExecutiveVisibility(modules = [], ctx = {}) {
  const tier = ctx.canonical_identity?.hierarchy_tier;
  if (tier !== 'executive' && tier !== 'management') return { valid: true, skipped: true };
  const bad = ['manuia', 'anomaly_detection', 'raw_material_lots'].filter((m) => modules.includes(m));
  return { valid: bad.length === 0, executive_exposure: bad };
}

module.exports = { validateExecutiveVisibility };
