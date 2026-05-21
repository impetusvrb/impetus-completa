'use strict';

function protectSummaryUnderdelivery(payload = {}, before = {}, ctx = {}) {
  const hasText = !!(payload.summary || payload.narrative || payload.text);
  const hadText = !!(before.summary || before.narrative || before.text);
  if (!hasText && hadText) {
    return {
      payload: before,
      underdelivery_protected: true,
      reason: 'empty_summary_restore'
    };
  }
  return { payload, underdelivery_protected: false };
}

module.exports = { protectSummaryUnderdelivery };
