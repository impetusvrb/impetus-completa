/**
 * PRED-BASE-002 — Consumer readiness after platform certification.
 * Lists what each domain may consume immediately (initial wave).
 */
import { PRED_BASE_002_PHASE } from '../certification/predBase002Constants.js';
import { listCapabilitiesForConsumer } from '../registry/certifiedPredictionRegistry.js';
import { listInitialWaveCoverage } from '../coverage/predictionCoverageMatrix.js';

export const CERTIFIED_CONSUMER_READINESS = Object.freeze([
  Object.freeze({
    domain: 'finance',
    label: 'Finance',
    eligibleNow: true,
    opensProduct: 'FIN-EVOLVE-2.4',
    mayConsumeImmediately: Object.freeze([
      'cap-ops-projections',
      'cap-ops-alerts',
      'cap-ops-health',
      'cap-ops-extended',
      'cap-chart-series',
      'cap-twin-signals'
    ]),
    excludedUntilLater: Object.freeze(['cap-energy', 'cap-aioi-forecasts']),
    requirements: Object.freeze([
      'Consume via platform.prediction.public_api.v1 only',
      'PREDICT WITHOUT DECIDING',
      'Compose over Economic Intelligence / Twin / What-if — no fork'
    ])
  }),
  Object.freeze({
    domain: 'maintenance',
    label: 'Maintenance',
    eligibleNow: true,
    opensProduct: 'domain predictive overlays (future)',
    mayConsumeImmediately: Object.freeze([
      'cap-ops-projections',
      'cap-ops-alerts',
      'cap-ops-health',
      'cap-twin-signals'
    ]),
    excludedUntilLater: Object.freeze(['cap-energy']),
    requirements: Object.freeze(['No auto work-order execution from forecasts'])
  }),
  Object.freeze({
    domain: 'production',
    label: 'Production',
    eligibleNow: true,
    opensProduct: 'efficiency/throughput consumer (future)',
    mayConsumeImmediately: Object.freeze([
      'cap-ops-projections',
      'cap-ops-health',
      'cap-chart-series',
      'cap-twin-signals'
    ]),
    excludedUntilLater: Object.freeze(['cap-energy']),
    requirements: Object.freeze(['MES remains owner of production qty history'])
  }),
  Object.freeze({
    domain: 'logistics',
    label: 'Logistics',
    eligibleNow: true,
    opensProduct: 'demand/replen consumer (future)',
    mayConsumeImmediately: Object.freeze([
      'cap-ops-projections',
      'cap-ops-alerts',
      'cap-ops-health',
      'cap-chart-series'
    ]),
    excludedUntilLater: Object.freeze(['cap-energy']),
    requirements: Object.freeze(['Reuse CPL patterns — no parallel engine'])
  }),
  Object.freeze({
    domain: 'quality',
    label: 'Quality',
    eligibleNow: true,
    opensProduct: 'quality trend consumer (future)',
    mayConsumeImmediately: Object.freeze(['cap-ops-health']),
    excludedUntilLater: Object.freeze(['cap-energy', 'domain quality history GAP-PB-007']),
    requirements: Object.freeze(['Domain history expansion after initial wave'])
  }),
  Object.freeze({
    domain: 'environment',
    label: 'Environment',
    eligibleNow: true,
    opensProduct: 'environmental consumer (future)',
    mayConsumeImmediately: Object.freeze(['cap-ops-health', 'cap-chart-series']),
    excludedUntilLater: Object.freeze(['cap-energy — GAP-PB-003']),
    requirements: Object.freeze(['Energy-linked forecasts wait for GAP-PB-003 coverage expansion'])
  })
]);

export function getCertifiedConsumerReadiness(domain) {
  return CERTIFIED_CONSUMER_READINESS.find((c) => c.domain === domain) || null;
}

export function validateCertifiedConsumerReadiness() {
  const issues = [];
  if (CERTIFIED_CONSUMER_READINESS.length < 6) issues.push('consumer readiness incomplete');
  const finance = getCertifiedConsumerReadiness('finance');
  if (!finance?.eligibleNow) issues.push('finance must be eligible now');
  if (finance?.opensProduct !== 'FIN-EVOLVE-2.4') issues.push('finance must open FIN-EVOLVE-2.4');
  if (finance?.mayConsumeImmediately.includes('cap-energy')) {
    issues.push('finance must not consume energy in initial wave');
  }
  for (const c of CERTIFIED_CONSUMER_READINESS) {
    const caps = listCapabilitiesForConsumer(c.domain);
    if (c.eligibleNow && caps.length === 0 && c.domain !== 'quality') {
      // quality may only have health — still ok if mayConsumeImmediately non-empty
    }
    if (!c.mayConsumeImmediately?.length) issues.push(`${c.domain} empty consume list`);
  }
  if (!listInitialWaveCoverage().length) issues.push('initial wave coverage empty');
  return {
    valid: issues.length === 0,
    issues,
    phase: PRED_BASE_002_PHASE
  };
}
