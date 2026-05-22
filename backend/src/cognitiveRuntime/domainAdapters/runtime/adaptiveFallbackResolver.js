'use strict';

function resolveAdaptiveFallback(payload = {}, enrichResult = {}) {
  if (enrichResult.ok && enrichResult.fallback_required !== true) {
    return {
      use_legacy_only: false,
      payload,
      reason: 'enrichment_success'
    };
  }

  const reason = enrichResult.reason || enrichResult.error || 'enrichment_failed';
  return {
    use_legacy_only: true,
    payload: {
      ...payload,
      specialized_delivery: {
        phase: 'Z.21',
        mode: 'fallback_legacy',
        promotion_applied: false,
        reason,
        legacy_preserved: true
      }
    },
    reason
  };
}

module.exports = { resolveAdaptiveFallback };
