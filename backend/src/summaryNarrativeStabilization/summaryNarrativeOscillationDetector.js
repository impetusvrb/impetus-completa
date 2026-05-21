'use strict';

const { extractSummaryText, summaryWordCount } = require('../summaryConvergence/summaryTextExtractor');
const { getSummaryRuntimeMeta, setSummaryActivationMeta } = require('../summaryRuntimeActivation/summaryRuntimeState');

function detectNarrativeOscillation(summaryPayload = {}, ctx = {}) {
  const text = extractSummaryText(summaryPayload);
  const words = summaryWordCount(text);
  const tenantId = ctx.tenant_id;
  const meta = getSummaryRuntimeMeta(tenantId);
  const signature = `${words}:${text.length}`;
  const prev = meta.last_delivery_hash;
  let oscillating = false;

  if (prev && prev !== signature) {
    const prevWords = parseInt(String(prev).split(':')[0], 10) || 0;
    if (Math.abs(words - prevWords) >= 15) {
      oscillating = true;
      setSummaryActivationMeta(tenantId, {
        oscillation_events: (meta.oscillation_events || 0) + 1,
        last_delivery_hash: signature
      });
    }
  } else {
    setSummaryActivationMeta(tenantId, { last_delivery_hash: signature });
  }

  return {
    oscillating,
    word_count: words,
    signature,
    events: meta.oscillation_events || 0,
    recommendation: oscillating ? 'stabilize_delivery_hold_snapshot' : 'stable'
  };
}

module.exports = { detectNarrativeOscillation };
