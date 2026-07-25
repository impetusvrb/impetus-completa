/**
 * PRED-BASE-002 — Official registry of certified prediction capabilities.
 */
import { CERT_STATUS, PRED_BASE_002_PHASE } from '../certification/predBase002Constants.js';
import { ENTERPRISE_PREDICTION_CONTRACT } from '../contracts/enterprisePredictionContracts.js';

export const CERTIFIED_PREDICTION_REGISTRY = Object.freeze([
  Object.freeze({
    id: 'cap-ops-projections',
    label: 'Operational projections',
    owner: 'platform / operationalForecastingService',
    version: '1.0.0-certified',
    contract: ENTERPRISE_PREDICTION_CONTRACT.id,
    mount: 'dashboard.forecasting.getProjections',
    path: 'backend/src/services/operationalForecastingService.js',
    consumers: Object.freeze(['finance', 'maintenance', 'production', 'logistics', 'environment']),
    state: CERT_STATUS.CERTIFIED,
    limitations: Object.freeze([
      'Linear / heuristic projections — not ML',
      'semantic_lane must be forecast_prediction',
      'Energy-linked metrics not in initial certified coverage'
    ])
  }),
  Object.freeze({
    id: 'cap-ops-alerts',
    label: 'Operational forecast alerts',
    owner: 'platform / operationalForecastingService',
    version: '1.0.0-certified',
    contract: ENTERPRISE_PREDICTION_CONTRACT.id,
    mount: 'dashboard.forecasting.getAlerts',
    path: 'backend/src/services/operationalForecastingService.js',
    consumers: Object.freeze(['finance', 'maintenance', 'production', 'logistics']),
    state: CERT_STATUS.CERTIFIED,
    limitations: Object.freeze(['Alert severity heuristics; always expose evidence_refs'])
  }),
  Object.freeze({
    id: 'cap-ops-health',
    label: 'Forecasting health',
    owner: 'platform / operationalForecastingService',
    version: '1.0.0-certified',
    contract: ENTERPRISE_PREDICTION_CONTRACT.id,
    mount: 'dashboard.forecasting.getHealth',
    path: 'backend/src/routes/dashboard.js',
    consumers: Object.freeze(['finance', 'maintenance', 'production', 'logistics', 'quality', 'environment']),
    state: CERT_STATUS.CERTIFIED,
    limitations: Object.freeze(['Health metadata only — not a forecast point estimate'])
  }),
  Object.freeze({
    id: 'cap-ops-extended',
    label: 'Extended projections / profit-loss / critical factors',
    owner: 'platform / operationalForecastingService',
    version: '1.0.0-certified',
    contract: ENTERPRISE_PREDICTION_CONTRACT.id,
    mount: 'dashboard.forecasting.getExtendedProjections|getProfitLoss|getCriticalFactors',
    path: 'backend/src/services/operationalForecastingService.js',
    consumers: Object.freeze(['finance', 'production', 'maintenance']),
    state: CERT_STATUS.CERTIFIED,
    limitations: Object.freeze(['Must not be labeled observed_fact', 'Decision simulation UI is simulated_scenario lane'])
  }),
  Object.freeze({
    id: 'cap-chart-series',
    label: 'Dashboard time-series (evidence / history refs)',
    owner: 'platform / dashboardChartDataService',
    version: '1.0.0-certified',
    contract: ENTERPRISE_PREDICTION_CONTRACT.id,
    mount: 'dashboard.getTrend|/charts/*',
    path: 'backend/src/services/dashboardChartDataService.js',
    consumers: Object.freeze(['finance', 'production', 'logistics', 'environment']),
    state: CERT_STATUS.CERTIFIED,
    limitations: Object.freeze(['Series are observed_fact or composed evidence — not forecasts by themselves'])
  }),
  Object.freeze({
    id: 'cap-twin-signals',
    label: 'Digital Twin state + failure signals',
    owner: 'platform / digitalTwin',
    version: '1.0.0-certified',
    contract: ENTERPRISE_PREDICTION_CONTRACT.id,
    mount: 'integrations.getDigitalTwinState / failure predictions',
    path: 'backend/src/services/digitalTwinService.js',
    consumers: Object.freeze(['finance', 'maintenance', 'production']),
    state: CERT_STATUS.CERTIFIED,
    limitations: Object.freeze(['Twin is representation; failure hints map to forecast_prediction only when normalized'])
  }),
  Object.freeze({
    id: 'cap-energy',
    label: 'Energy history / forecasts',
    owner: 'platform (pending)',
    version: '0.0.0',
    contract: ENTERPRISE_PREDICTION_CONTRACT.id,
    mount: null,
    path: null,
    consumers: Object.freeze([]),
    state: CERT_STATUS.EXCLUDED,
    limitations: Object.freeze(['GAP-PB-003 — coverage expansion only', 'Not available in initial consumer wave'])
  }),
  Object.freeze({
    id: 'cap-aioi-forecasts',
    label: 'AIOI forecast services',
    owner: 'platform / aioi',
    version: '0.9.0-partial',
    contract: ENTERPRISE_PREDICTION_CONTRACT.id,
    mount: 'aioi*ForecastService (HTTP incomplete)',
    path: 'backend/src/services/aioi/',
    consumers: Object.freeze([]),
    state: CERT_STATUS.PARTIAL,
    limitations: Object.freeze(['GAP-PB-006 — partial; not required for FIN-EVOLVE-2.4 initial wave'])
  })
]);

export function getRegisteredCapability(id) {
  return CERTIFIED_PREDICTION_REGISTRY.find((c) => c.id === id) || null;
}

export function listCertifiedCapabilities() {
  return CERTIFIED_PREDICTION_REGISTRY.filter((c) => c.state === CERT_STATUS.CERTIFIED);
}

export function listCapabilitiesForConsumer(domain) {
  return CERTIFIED_PREDICTION_REGISTRY.filter(
    (c) => c.state === CERT_STATUS.CERTIFIED && c.consumers.includes(domain)
  );
}

export function validateCertifiedPredictionRegistry() {
  const issues = [];
  if (CERTIFIED_PREDICTION_REGISTRY.length < 6) issues.push('registry incomplete');
  const certified = listCertifiedCapabilities();
  if (certified.length < 4) issues.push('too few certified capabilities');
  const energy = getRegisteredCapability('cap-energy');
  if (energy?.state !== CERT_STATUS.EXCLUDED) issues.push('energy must be EXCLUDED until GAP-PB-003');
  for (const c of certified) {
    if (!c.owner || !c.version || !c.contract) issues.push(`${c.id} incomplete`);
    if (!c.limitations?.length) issues.push(`${c.id} missing limitations`);
  }
  return {
    valid: issues.length === 0,
    issues,
    certifiedCount: certified.length,
    phase: PRED_BASE_002_PHASE
  };
}
