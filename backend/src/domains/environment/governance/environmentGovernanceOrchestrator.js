'use strict';

const flags = require('./environmentGovernanceRuntimeFlags');
const esg = require('./esg/environmentEsgGovernanceRuntime');
const compliance = require('./compliance/environmentComplianceRuntime');
const carbon = require('./carbon/environmentCarbonRuntime');
const energy = require('./energy/environmentEnergyRuntime');
const sustainability = require('./sustainability/environmentSustainabilityRuntime');
const correlation = require('./correlation/environmentGovernanceCorrelationRuntime');
const obs = require('./shared/environmentGovernanceObservability');

function buildExecutiveNarrative(pack) {
  return {
    assistive_only: true,
    no_authority: true,
    no_auto_promotion: true,
    headline: 'Inteligência ambiental executiva (assistiva)',
    sections: [pack.esg?.narrative, pack.compliance?.narrative, pack.sustainability?.narrative].filter(Boolean),
    insights: [
      { type: 'esg', score: pack.esg?.esg_score },
      { type: 'carbon', total: pack.carbon?.inventory?.total_tco2e },
      { type: 'maturity', score: pack.sustainability?.maturity?.maturity_score }
    ]
  };
}

function runEnvironmentGovernancePack(input = {}) {
  if (!flags.isEnvironmentGovernanceRuntimeEnabled()) {
    return { ok: true, skipped: true, reason: 'governance_off', shadow: true };
  }

  const t0 = Date.now();
  const body = input.body || input;

  const pack = {
    ok: true,
    domain: 'environment',
    layer: 'governance',
    shadow: true,
    assistive_only: true,
    auto_promotion: false,
    flags: flags.getGovernanceRuntimeFlagSnapshot(),
    esg: flags.isEnvironmentEsgRuntimeEnabled() ? esg.environmentEsgGovernanceRuntime(body) : { skipped: true },
    compliance: flags.isEnvironmentComplianceRuntimeEnabled() ? compliance.environmentComplianceRuntime(body) : { skipped: true },
    carbon: flags.isEnvironmentCarbonRuntimeEnabled() ? carbon.environmentCarbonRuntime(body) : { skipped: true },
    energy: flags.isEnvironmentEnergyRuntimeEnabled() ? energy.environmentEnergyRuntime(body) : { skipped: true },
    sustainability: flags.isEnvironmentSustainabilityRuntimeEnabled()
      ? sustainability.environmentSustainabilityRuntime({ ...body, esg_score: body.esg_score })
      : { skipped: true },
    correlation: correlation.buildGovernanceCorrelationPack(body.correlation || body)
  };

  if (flags.isEnvironmentExecutiveIntelligenceEnabled()) {
    pack.executive = buildExecutiveNarrative(pack);
  }

  obs.record('environment_governance_runtime_ms', Date.now() - t0, { op: 'pack' });
  return pack;
}

module.exports = { runEnvironmentGovernancePack, buildExecutiveNarrative };
