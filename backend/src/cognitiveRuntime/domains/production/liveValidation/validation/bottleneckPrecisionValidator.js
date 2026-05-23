'use strict';

function validateBottleneckPrecision(signalBundle = {}) {
  const bn = signalBundle.bottlenecks || {};
  const lines = signalBundle.raw?.lines || [];
  const falseBottleneck = bn.primary_line && !lines.some((l) => l.line_identifier === bn.primary_line);
  return {
    precise: !falseBottleneck && (bn.top_score > 0 || lines.length === 0),
    primary_line: bn.primary_line,
    false_positive: falseBottleneck,
    heatmap_size: bn.heatmap?.length ?? 0
  };
}

module.exports = { validateBottleneckPrecision };
