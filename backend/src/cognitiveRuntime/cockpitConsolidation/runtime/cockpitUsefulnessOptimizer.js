'use strict';

function optimizeCockpitUsefulness(centers = [], bindingRatio = 0) {
  const withData = centers.filter((c) => c.ok !== false && Object.keys(c.metrics || {}).length > 0);
  const usefulness = Math.min(
    1,
    0.35 + withData.length * 0.08 + bindingRatio * 0.35
  );

  return {
    usefulness: Math.round(usefulness * 1000) / 1000,
    centers_with_data: withData.length,
    recommendation: usefulness >= 0.65 ? 'operational_ready' : 'needs_more_binding'
  };
}

module.exports = { optimizeCockpitUsefulness };
