/**
 * FIN-EVOLVE-001 / 002 — Observabilidade Finance (EOX + eventos Release 2.0).
 */
import {
  trackEoxHeaderRender,
  trackEoxBreadcrumbNavigation,
  trackEoxDomainReturn,
  EOX_EVENTS
} from '../../../presentation/eox/eoxObservability.js';

const FINANCE_EVENTS = Object.freeze({
  WORKSPACE_VIEW: 'FINANCE_WORKSPACE_VIEW',
  CAPABILITY_NAVIGATE: 'FINANCE_CAPABILITY_NAVIGATE',
  INTEGRATION_COMPOSE: 'FINANCE_INTEGRATION_COMPOSE',
  DASHBOARD_LOADED: 'finance.dashboard.loaded',
  KPI_OPENED: 'finance.kpi.opened',
  ALERT_OPENED: 'finance.alert.opened',
  INSIGHT_CLICKED: 'finance.insight.clicked',
  DECISION_EXECUTED: 'finance.decision.executed',
  SMART_COSTING_CALCULATED: 'finance.smart_costing.calculated',
  PERFORMANCE_UPDATED: 'finance.performance.updated',
  COST_ANALYSIS_COMPLETED: 'finance.cost_analysis.completed',
  TWIN_OPENED: 'finance.twin.opened',
  TWIN_OVERLAY_LOADED: 'finance.twin.overlay.loaded',
  TWIN_NODE_SELECTED: 'finance.twin.node.selected',
  TWIN_FINANCIAL_STATE_UPDATED: 'finance.twin.financial_state.updated',
  WHATIF_STARTED: 'finance.whatif.started',
  WHATIF_PARAMETER_CHANGED: 'finance.whatif.parameter.changed',
  WHATIF_CALCULATED: 'finance.whatif.calculated',
  WHATIF_DISCARDED: 'finance.whatif.discarded',
  PREDICTION_REQUESTED: 'finance.prediction.requested',
  PREDICTION_RECEIVED: 'finance.prediction.received',
  PREDICTION_DISPLAYED: 'finance.prediction.displayed',
  PREDICTION_COMPARED: 'finance.prediction.compared',
  PREDICTION_REJECTED: 'finance.prediction.rejected'
});

function emitFinance(event, payload = {}) {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(
      new CustomEvent('impetus:finance', {
        detail: {
          event,
          phase: payload.phase || 'FIN-EVOLVE-2.1',
          ts: Date.now(),
          ...payload
        }
      })
    );
  } catch {
    /* best-effort */
  }
}

/** FIN-EVOLVE-2.3 — What-if events on the same impetus:finance channel */
export function emitFinanceWhatIf(event, payload = {}) {
  emitFinance(event, { phase: 'FIN-EVOLVE-2.3', ...payload });
}

/** FIN-EVOLVE-2.4 — Prediction events on the same impetus:finance channel */
export function emitFinancePrediction(event, payload = {}) {
  emitFinance(event, { phase: 'FIN-EVOLVE-2.4', ...payload });
}

export function trackFinanceWorkspaceView(moduleId = 'hub') {
  emitFinance(FINANCE_EVENTS.WORKSPACE_VIEW, { moduleId });
  trackEoxHeaderRender({ domainId: 'finance', module: moduleId, phase: 'FIN-EVOLVE-002' });
}

export function trackFinanceCapabilityNavigate(capabilityId, path) {
  emitFinance(FINANCE_EVENTS.CAPABILITY_NAVIGATE, { capabilityId, path });
  trackEoxBreadcrumbNavigation({ label: capabilityId, path });
}

export function trackFinanceDomainReturn(target) {
  trackEoxDomainReturn(target);
}

export function trackFinanceIntegrationCompose(capabilityId, reusedComponent) {
  emitFinance(FINANCE_EVENTS.INTEGRATION_COMPOSE, { capabilityId, reusedComponent });
}

export function trackFinanceDashboardLoaded(meta = {}) {
  emitFinance(FINANCE_EVENTS.DASHBOARD_LOADED, meta);
}

export function trackFinanceKpiOpened(kpiId) {
  emitFinance(FINANCE_EVENTS.KPI_OPENED, { kpiId });
}

export function trackFinanceAlertOpened(alertId) {
  emitFinance(FINANCE_EVENTS.ALERT_OPENED, { alertId });
}

export function trackFinanceInsightClicked(insightId) {
  emitFinance(FINANCE_EVENTS.INSIGHT_CLICKED, { insightId });
}

export function trackFinanceDecisionExecuted(decisionId) {
  emitFinance(FINANCE_EVENTS.DECISION_EXECUTED, { decisionId });
}

export function trackSmartCostingCalculated(meta = {}) {
  emitFinance(FINANCE_EVENTS.SMART_COSTING_CALCULATED, { phase: 'FIN-EVOLVE-2.1', ...meta });
}

export function trackPerformanceUpdated(meta = {}) {
  emitFinance(FINANCE_EVENTS.PERFORMANCE_UPDATED, { phase: 'FIN-EVOLVE-2.1', ...meta });
}

export function trackCostAnalysisCompleted(meta = {}) {
  emitFinance(FINANCE_EVENTS.COST_ANALYSIS_COMPLETED, { phase: 'FIN-EVOLVE-2.1', ...meta });
}

export function trackTwinOpened(meta = {}) {
  emitFinance(FINANCE_EVENTS.TWIN_OPENED, { phase: 'FIN-EVOLVE-2.2', ...meta });
}

export function trackTwinOverlayLoaded(meta = {}) {
  emitFinance(FINANCE_EVENTS.TWIN_OVERLAY_LOADED, { phase: 'FIN-EVOLVE-2.2', ...meta });
}

export function trackTwinNodeSelected(meta = {}) {
  emitFinance(FINANCE_EVENTS.TWIN_NODE_SELECTED, { phase: 'FIN-EVOLVE-2.2', ...meta });
}

export function trackTwinFinancialStateUpdated(meta = {}) {
  emitFinance(FINANCE_EVENTS.TWIN_FINANCIAL_STATE_UPDATED, { phase: 'FIN-EVOLVE-2.2', ...meta });
}

export function trackWhatIfStarted(meta = {}) {
  emitFinanceWhatIf(FINANCE_EVENTS.WHATIF_STARTED, meta);
}

export function trackWhatIfParameterChanged(meta = {}) {
  emitFinanceWhatIf(FINANCE_EVENTS.WHATIF_PARAMETER_CHANGED, meta);
}

export function trackWhatIfCalculated(meta = {}) {
  emitFinanceWhatIf(FINANCE_EVENTS.WHATIF_CALCULATED, meta);
}

export function trackWhatIfDiscarded(meta = {}) {
  emitFinanceWhatIf(FINANCE_EVENTS.WHATIF_DISCARDED, meta);
}

export function trackPredictionRequested(meta = {}) {
  emitFinancePrediction(FINANCE_EVENTS.PREDICTION_REQUESTED, meta);
}

export function trackPredictionReceived(meta = {}) {
  emitFinancePrediction(FINANCE_EVENTS.PREDICTION_RECEIVED, meta);
}

export function trackPredictionDisplayed(meta = {}) {
  emitFinancePrediction(FINANCE_EVENTS.PREDICTION_DISPLAYED, meta);
}

export function trackPredictionCompared(meta = {}) {
  emitFinancePrediction(FINANCE_EVENTS.PREDICTION_COMPARED, meta);
}

export function trackPredictionRejected(meta = {}) {
  emitFinancePrediction(FINANCE_EVENTS.PREDICTION_REJECTED, meta);
}

export { FINANCE_EVENTS, EOX_EVENTS };
