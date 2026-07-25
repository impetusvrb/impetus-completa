/**
 * OPM-004 — Observabilidade Picking / Order Fulfillment.
 */
import { logWmsUiEvent } from '../../services/wmsUiObservability.js';

const MODULE_ID = 'picking';
const PHASE = 'OPM-004';

export const PICKING_EVENTS = Object.freeze({
  LOADED: 'PICKING_LOADED',
  ORDER_ASSIGNED: 'PICKING_ORDER_ASSIGNED',
  STARTED: 'PICKING_STARTED',
  PAUSED: 'PICKING_PAUSED',
  COMPLETED: 'PICKING_COMPLETED',
  DIVERGENCE: 'PICKING_DIVERGENCE',
  ROUTE_VIEWED: 'PICKING_ROUTE_VIEWED',
  EXPORT: 'PICKING_EXPORT',
  FILTER: 'PICKING_FILTER',
  SEARCH: 'PICKING_SEARCH',
  TIMELINE: 'PICKING_TIMELINE'
});

function emit(event, payload = {}) {
  logWmsUiEvent({ event, module: MODULE_ID, phase: PHASE, ...payload });
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent('impetus:picking', { detail: { event, phase: PHASE, ts: Date.now(), ...payload } }));
    } catch {
      /* noop */
    }
  }
}

export function trackPickingLoaded(meta) {
  emit(PICKING_EVENTS.LOADED, meta);
}

export function trackPickingOrderAssigned(orderId, operatorId) {
  emit(PICKING_EVENTS.ORDER_ASSIGNED, { orderId, operatorId });
}

export function trackPickingStarted(orderId) {
  emit(PICKING_EVENTS.STARTED, { orderId });
}

export function trackPickingPaused(orderId) {
  emit(PICKING_EVENTS.PAUSED, { orderId });
}

export function trackPickingCompleted(orderId, movementCount = 0) {
  emit(PICKING_EVENTS.COMPLETED, { orderId, movementCount });
}

export function trackPickingDivergence(orderId) {
  emit(PICKING_EVENTS.DIVERGENCE, { orderId });
}

export function trackPickingRouteViewed(orderId) {
  emit(PICKING_EVENTS.ROUTE_VIEWED, { orderId });
}

export function trackPickingExport(format, rowCount) {
  emit(PICKING_EVENTS.EXPORT, { format, rowCount });
}

export function trackPickingFilter(filterId) {
  emit(PICKING_EVENTS.FILTER, { filterId });
}

export function trackPickingSearch(queryLength) {
  emit(PICKING_EVENTS.SEARCH, { queryLength });
}

export function trackPickingTimeline(periodDays) {
  emit(PICKING_EVENTS.TIMELINE, { periodDays });
}

export { MODULE_ID, PHASE };
