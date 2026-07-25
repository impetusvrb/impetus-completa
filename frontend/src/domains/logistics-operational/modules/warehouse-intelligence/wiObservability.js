/**
 * OPM-007 — Observabilidade analítica (Warehouse Intelligence).
 */
import { logWmsUiEvent } from '../../services/wmsUiObservability.js';

const MODULE_ID = 'warehouse_intelligence';
const PHASE = 'OPM-007';

export const WI_EVENTS = Object.freeze({
  LOADED: 'WAREHOUSE_INTELLIGENCE_LOADED',
  HEATMAP_VIEWED: 'WAREHOUSE_HEATMAP_VIEWED',
  BOTTLENECK_DETECTED: 'WAREHOUSE_BOTTLENECK_DETECTED',
  CAPACITY_ANALYZED: 'WAREHOUSE_CAPACITY_ANALYZED',
  RECOMMENDATION_OPENED: 'WAREHOUSE_RECOMMENDATION_OPENED',
  ANALYTICS_FILTER: 'WAREHOUSE_ANALYTICS_FILTER',
  EXPORT: 'WAREHOUSE_EXPORT',
  FLOW_ANALYZED: 'WAREHOUSE_FLOW_ANALYZED'
});

function emit(event, payload = {}) {
  logWmsUiEvent({ event, module: MODULE_ID, phase: PHASE, ...payload });
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent('impetus:warehouse-intelligence', { detail: { event, phase: PHASE, ts: Date.now(), ...payload } }));
    } catch {
      /* noop */
    }
  }
}

export function trackWiLoaded(meta) {
  emit(WI_EVENTS.LOADED, meta);
}

export function trackWiHeatmapViewed(viewId) {
  emit(WI_EVENTS.HEATMAP_VIEWED, { viewId });
}

export function trackWiBottleneckDetected(moduleId, count) {
  emit(WI_EVENTS.BOTTLENECK_DETECTED, { moduleId, count });
}

export function trackWiCapacityAnalyzed(warehouseId) {
  emit(WI_EVENTS.CAPACITY_ANALYZED, { warehouseId });
}

export function trackWiRecommendationOpened(recommendationId) {
  emit(WI_EVENTS.RECOMMENDATION_OPENED, { recommendationId });
}

export function trackWiAnalyticsFilter(filterId) {
  emit(WI_EVENTS.ANALYTICS_FILTER, { filterId });
}

export function trackWiSearch(queryLength) {
  emit(WI_EVENTS.ANALYTICS_FILTER, { queryLength, kind: 'search' });
}

export function trackWiExport(format, rowCount) {
  emit(WI_EVENTS.EXPORT, { format, rowCount });
}

export function trackWiFlowAnalyzed(stages) {
  emit(WI_EVENTS.FLOW_ANALYZED, { stages });
}

export function trackWiTimeline(periodDays) {
  emit(WI_EVENTS.ANALYTICS_FILTER, { filterId: 'timeline_period', periodDays });
}

export { MODULE_ID, PHASE };
