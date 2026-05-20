'use strict';

const phaseL = require('./config/phaseLFeatureFlags');
const { applySummaryPrecision } = require('./governedSummaryPrecision');

function resolvePreciseSummary(summary, user, ctx = {}) {
  const precision = applySummaryPrecision(summary, ctx);
  const enforcement = phaseL.isPreciseSummaryEngineEnabled();
  const confidence = precision.summary_precision.dependency_score;

  let output = summary;
  if (enforcement && !precision.summary_precision.valid) {
    output = {
      available: false,
      state: 'contextual_insufficiency',
      message: 'Summary indisponível — dependências ou contexto insuficientes',
      explain: precision.summary_precision.explain_absence,
      invented: false
    };
  } else if (!precision.summary_precision.valid) {
    output = {
      ...summary,
      precision_warning: precision.summary_precision.issues,
      shadow_only: true
    };
  }

  return {
    summary: output,
    summary_delivery_confidence: Number(confidence.toFixed(4)),
    provenance: summary?.provenance || summary?.sources || null,
    enforcement_active: enforcement,
    shadow_only: !enforcement,
    precision: precision.summary_precision
  };
}

module.exports = { resolvePreciseSummary };
