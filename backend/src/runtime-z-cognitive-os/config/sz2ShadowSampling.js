'use strict';

const flags = require('./sz2FeatureFlags');

function shouldSampleShadow(tenantId) {
  const rate = parseFloat(process.env.IMPETUS_SZ2_SHADOW_SAMPLE_RATE || '1');
  const safe = Number.isFinite(rate) ? Math.max(0, Math.min(1, rate)) : 1;
  if (safe >= 1) return true;
  if (safe <= 0) return false;
  let hash = 0;
  const str = String(tenantId || 'global');
  for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  return (hash % 1000) / 1000 < safe;
}

function shadowEnabled() {
  return flags.isShadowDiffEnabled();
}

module.exports = { shouldSampleShadow, shadowEnabled };
