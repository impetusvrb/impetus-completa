/**
 * OPM-008 — Observabilidade cognitiva.
 */
import { logWmsUiEvent } from '../../services/wmsUiObservability.js';

const MODULE_ID = 'cognitive_logistics';
const PHASE = 'OPM-008';

export const CL_EVENTS = Object.freeze({
  DASHBOARD_LOADED: 'COGNITIVE_DASHBOARD_LOADED',
  INSIGHT_GENERATED: 'COGNITIVE_INSIGHT_GENERATED',
  RECOMMENDATION_OPENED: 'COGNITIVE_RECOMMENDATION_OPENED',
  SCENARIO_EXECUTED: 'COGNITIVE_SCENARIO_EXECUTED',
  TRACE_VIEWED: 'COGNITIVE_TRACE_VIEWED',
  EXPORT: 'COGNITIVE_EXPORT',
  FILTER: 'COGNITIVE_ANALYTICS_FILTER'
});

function emit(event, payload = {}) {
  logWmsUiEvent({ event, module: MODULE_ID, phase: PHASE, ...payload });
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent('impetus:cognitive-logistics', { detail: { event, phase: PHASE, ts: Date.now(), ...payload } }));
    } catch {
      /* noop */
    }
  }
}

export function trackClLoaded(meta) {
  emit(CL_EVENTS.DASHBOARD_LOADED, meta);
}

export function trackClInsightGenerated(ruleId, count = 1) {
  emit(CL_EVENTS.INSIGHT_GENERATED, { ruleId, count });
}

export function trackClRecommendationOpened(recommendationId) {
  emit(CL_EVENTS.RECOMMENDATION_OPENED, { recommendationId });
}

export function trackClScenarioExecuted(scenarioId, params) {
  emit(CL_EVENTS.SCENARIO_EXECUTED, { scenarioId, params });
}

export function trackClTraceViewed(recommendationId) {
  emit(CL_EVENTS.TRACE_VIEWED, { recommendationId });
}

export function trackClExport(format, rowCount) {
  emit(CL_EVENTS.EXPORT, { format, rowCount });
}

export function trackClFilter(filterId) {
  emit(CL_EVENTS.FILTER, { filterId });
}

export function trackClSearch(queryLength) {
  emit(CL_EVENTS.FILTER, { queryLength, kind: 'search' });
}

export { MODULE_ID, PHASE };
