'use strict';

const flags = require('../../../config/phaseP1EnvironmentalFeatureFlags');
const { validateEnvironmentalCompliance } = require('./compliance/environmentalComplianceValidator');
const { validateLicenseIntegrity } = require('./compliance/licenseIntegrityRuntime');
const { validateRegulatoryDeadlines } = require('./compliance/regulatoryDeadlineValidator');
const { validateEnvironmentalRiskGovernance } = require('./compliance/environmentalRiskGovernance');
const { validateAuditIntegrity } = require('./compliance/auditIntegrityValidator');
const { validateEnvironmentalTelemetryHealth } = require('./telemetry/environmentalTelemetryHealth');
const { validateContextualEsg } = require('./validation/contextualEsgValidator');
const { validateSustainabilitySemanticIntegrity } = require('./validation/sustainabilitySemanticIntegrity');
const { scoreOperationalEsgUsefulness } = require('./validation/operationalEsgUsefulness');
const { validateEnvironmentalAiOperational } = require('./ai/environmentalAiOperationalValidator');
const { validateRegulatoryQuestionIntegrity } = require('./ai/regulatoryQuestionIntegrity');
const { validateSustainabilityInsights } = require('./ai/sustainabilityInsightValidator');
const { validateEnvironmentalNarrative } = require('./narrative/environmentalNarrativeValidator');
const { validateRegulatoryNarrativeIntegrity } = require('./narrative/regulatoryNarrativeIntegrity');
const { validateSustainabilityNarrativeGovernance } = require('./narrative/sustainabilityNarrativeGovernance');
const { measureEnvironmentalAlertPressure } = require('./density/environmentalAlertPressure');
const { reduceComplianceNoise } = require('./density/complianceNoiseReducer');
const { validateEnvironmentalDensityIntegrity } = require('./density/environmentalDensityIntegrity');
const { detectRegulatoryOverload } = require('./density/regulatoryOverloadDetector');
const { runRegulatoryIsolationRuntime } = require('./governance/regulatoryIsolationRuntime');
const { validateEnvironmentalSemanticIsolationRuntime } = require('./governance/environmentalSemanticIsolation');
const { validateEnvironmentalRuntimeStability } = require('./runtime/environmentalRuntimeStability');
const { analyzeEnvironmentalRuntimePerformance } = require('./performance/environmentalRuntimePerformance');
const { analyzeCompliancePressure } = require('./performance/compliancePressureAnalyzer');
const { validateSustainabilityRuntimeIntegrity } = require('./performance/sustainabilityRuntimeIntegrity');
const { buildEnvironmentalGovernanceHealth } = require('./observability/environmentalGovernanceHealth');
const { buildRegulatoryCockpitHealth } = require('./observability/regulatoryCockpitHealth');
const { buildEnvironmentalGovernanceObservability } = require('./observability/environmentalGovernanceObservability');

async function runEnvironmentalLiveValidation(user = {}, payload = {}, ctx = {}, opts = {}) {
  if (!flags.isEnvironmentalLiveValidationEnabled() && !ctx.force_environmental_live_validation) {
    return { skipped: true, reason: 'p1env_live_validation_off' };
  }

  const t0 = Date.now();
  let signalBundle = opts.signal_bundle;
  if (!signalBundle) {
    try {
      const loader = require('../bridge/environmentalSignalLoader');
      signalBundle = await loader.loadEnvironmentalTenantSignals(user, {
        ...ctx,
        mock_signals: ctx.mock_signals
      });
    } catch (_) {
      signalBundle = { telemetry_readiness: 'empty', operational: {} };
    }
  }

  const consolidated = opts.consolidated || {
    centers: payload.environmental_cognitive_centers || payload.environmental_cognitive_runtime?.centers,
    widgets: payload.widgets_promoted,
    consolidation_applied: payload.environmental_cognitive_runtime?.consolidation_applied,
    telemetry_readiness: signalBundle.telemetry_readiness,
    environmental_narrative: payload.environmental_cognitive_runtime?.environmental_narrative,
    environmental_contextual_ai: payload.environmental_contextual_ai || payload.environmental_contextual_questions
  };

  const compliance = validateEnvironmentalCompliance(signalBundle);
  const licenses = validateLicenseIntegrity(signalBundle);
  const deadlines = validateRegulatoryDeadlines(signalBundle);
  const risk = validateEnvironmentalRiskGovernance(signalBundle);
  const audit = validateAuditIntegrity(signalBundle);
  const telemetry = validateEnvironmentalTelemetryHealth(signalBundle);
  const esg = validateContextualEsg(signalBundle);
  const esgSemantic = validateSustainabilitySemanticIntegrity(consolidated);
  const esgUsefulness = scoreOperationalEsgUsefulness(esg, compliance);
  const density = validateEnvironmentalDensityIntegrity(consolidated);
  const overload = detectRegulatoryOverload(consolidated);
  const alertPressure = measureEnvironmentalAlertPressure(consolidated.centers || []);
  const complianceNoise = reduceComplianceNoise(consolidated.centers || []);
  const summary = validateEnvironmentalNarrative(payload, consolidated);
  const narrativeIntegrity = validateRegulatoryNarrativeIntegrity(consolidated);
  const narrativeGov = validateSustainabilityNarrativeGovernance(consolidated.environmental_narrative || {});
  const ai = validateEnvironmentalAiOperational(consolidated, payload);
  const questions = Array.isArray(payload.environmental_contextual_questions)
    ? payload.environmental_contextual_questions
    : consolidated.environmental_contextual_ai?.contextual_questions || [];
  const questionIntegrity = validateRegulatoryQuestionIntegrity(questions);
  const insights = validateSustainabilityInsights(consolidated);
  const isolation = validateEnvironmentalSemanticIsolationRuntime(payload, consolidated);
  const boundary = runRegulatoryIsolationRuntime(payload, consolidated);
  const perf = analyzeEnvironmentalRuntimePerformance({ total_ms: Date.now() - t0, ...opts.timings });
  const compliancePressure = analyzeCompliancePressure(signalBundle, compliance);
  const stability = opts.stability_b
    ? validateEnvironmentalRuntimeStability(opts.stability_a, opts.stability_b)
    : { environmental_runtime_stable: true };

  const regulatory_integrity =
    compliance.compliant !== false &&
    !compliance.compliance_drift &&
    licenses.integrity_ok &&
    !audit.audit_critical;
  const telemetry_safe =
    telemetry.environmental_telemetry_health?.invented_data !== true &&
    !telemetry.environmental_telemetry_health?.stale_detected;
  const compliance_governance_valid =
    regulatory_integrity && deadlines.deadlines_ok !== false && !risk.regulatory_risk;
  const esg_contextual_valid =
    esg.contextual && !esg.boardroom_generic && !esg.greenwashing && esgSemantic.ok !== false;

  const environmental_live_validation = {
    phase: 'P1.1',
    mode: flags.environmentalLiveValidationMode(),
    regulatory_integrity,
    telemetry_safe: telemetry_safe || signalBundle.telemetry_readiness === 'empty',
    environmental_runtime_stable: stability.environmental_runtime_stable !== false,
    compliance_governance_valid,
    esg_contextual_valid,
    alert_fatigue_detected: alertPressure.alert_fatigue === true,
    cross_domain_clean: isolation.cross_domain_clean && boundary.cross_domain_clean,
    runtime_performance_safe: perf.runtime_performance_safe && !compliancePressure.saturation,
    density_safe: density.density_safe,
    overload_detected: overload.overload_detected,
    summary_semantic_valid: summary.ok,
    delivery_mutation: false
  };

  const report = {
    environmental_live_validation,
    environmental_telemetry_health: telemetry.environmental_telemetry_health,
    compliance_validation: { compliance, licenses, deadlines, risk, audit },
    esg_validation: { esg, esgSemantic, usefulness: esgUsefulness },
    density_validation: { density, overload, alertPressure, complianceNoise },
    summary_validation: { summary, narrativeIntegrity, narrativeGov },
    ai_validation: { ai, questionIntegrity, insights },
    isolation_validation: isolation,
    regulatory_isolation: boundary,
    performance: { ...perf, compliance_pressure: compliancePressure },
    sustainability_runtime: validateSustainabilityRuntimeIntegrity({ environmental_live_validation }),
    stability,
    environmental_governance_observability: buildEnvironmentalGovernanceObservability({
      compliance_validation: { compliance, licenses },
      environmental_telemetry_health: telemetry.environmental_telemetry_health
    }),
    ...buildEnvironmentalGovernanceHealth({ environmental_live_validation }),
    ...buildRegulatoryCockpitHealth({ environmental_live_validation })
  };

  return report;
}

function getEnvironmentalLiveValidationStatus() {
  return {
    phase: 'P1.1',
    live_validation: flags.environmentalLiveValidationMode(),
    regulatory_governance: flags.isRegulatoryGovernanceEnabled(),
    environmental_runtime_health: flags.isEnvironmentalRuntimeHealthEnabled(),
    alert_protection: flags.isEnvironmentalAlertProtectionEnabled(),
    performance_observability: flags.isEnvironmentalPerformanceObservabilityEnabled()
  };
}

module.exports = {
  runEnvironmentalLiveValidation,
  getEnvironmentalLiveValidationStatus
};
