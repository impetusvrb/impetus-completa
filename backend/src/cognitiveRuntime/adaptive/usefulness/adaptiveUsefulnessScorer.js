'use strict';

const { scoreOperationalUsefulness } = require('./operationalUsefulnessRuntime');
const { scoreStrategicUsefulness } = require('./strategicUsefulnessRuntime');

function scoreAdaptiveUsefulness(payload = {}) {
  const op = scoreOperationalUsefulness(payload);
  const st = scoreStrategicUsefulness(payload);
  const combined = st.applicable
    ? Math.round((op.operational_usefulness * 0.55 + st.strategic_usefulness * 0.45) * 100) / 100
    : op.operational_usefulness;
  return { ...op, ...st, usefulness_score: combined, low_usefulness: combined < 0.65 };
}

module.exports = { scoreAdaptiveUsefulness };
