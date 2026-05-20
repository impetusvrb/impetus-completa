'use strict';

/**
 * Facade única para governança cognitiva Fase F — entrypoints de canal.
 */

const phaseF = require('./config/phaseFFeatureFlags');
const { resolveContentExposure } = require('./unifiedExposureResolver');
const { buildSecureChatContext } = require('./channels/secureChatContextBuilder');
const { resolveGovernedKpis } = require('./channels/secureKpiExposureResolver');
const { sanitizeSummaryContext, sanitizeSummaryText } = require('./channels/summaryExposureSanitizer');
const { compareExposureShadow } = require('./shadow/governanceShadowComparator');
const telemetry = require('./observability/governanceTelemetry');

async function governChatRequest(user, opts = {}) {
  return buildSecureChatContext(user, opts);
}

async function governKpiResponse(user, kpis) {
  const exposure = await resolveContentExposure(user, { kpis });
  telemetry.recordExposureEvaluation();

  const legacy = { kpis, kpi_count: kpis?.length };
  const result = resolveGovernedKpis(user, kpis, exposure, {
    shadowOnly: !phaseF.isKpiGovernanceEnabled(user)
  });

  if (phaseF.isGovernanceShadowModeEnabled()) {
    compareExposureShadow(
      'dashboard_kpis',
      legacy,
      { kpis: result.governed_kpis, kpi_count: result.governed_kpis?.length },
      user?.id
    );
  }

  return {
    kpis: phaseF.isKpiGovernanceEnabled(user) ? result.kpis : legacy.kpis,
    governance_meta: phaseF.isKpiGovernanceEnabled(user) ?
      { governed: true, denied: result.denied_keys } :
      { governed: false, shadow: result.governed_kpis }
  };
}

async function governSummaryRequest(user, pack, summaryText) {
  const exposure = await resolveContentExposure(user, {});
  telemetry.recordExposureEvaluation();

  const ctxResult = sanitizeSummaryContext(pack, user, exposure);
  const text = sanitizeSummaryText(summaryText, user, exposure);

  if (phaseF.isGovernanceShadowModeEnabled()) {
    compareExposureShadow(
      'smart_summary',
      { summary_allowed: true },
      { summary_allowed: !ctxResult.denied },
      user?.id
    );
  }

  return {
    pack: ctxResult.pack,
    text,
    denied: ctxResult.denied === true,
    exposure
  };
}

module.exports = {
  governChatRequest,
  governKpiResponse,
  governSummaryRequest,
  phaseF
};
