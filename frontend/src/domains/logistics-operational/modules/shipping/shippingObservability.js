/**
 * OPM-005 — Observabilidade Shipping / Outbound Logistics.
 */
import { logWmsUiEvent } from '../../services/wmsUiObservability.js';

const MODULE_ID = 'shipping';
const PHASE = 'OPM-005';

export const SHIPPING_EVENTS = Object.freeze({
  LOADED: 'SHIPPING_LOADED',
  ORDER_RECEIVED: 'SHIPPING_ORDER_RECEIVED',
  LOADING_STARTED: 'SHIPPING_LOADING_STARTED',
  LOADING_COMPLETED: 'SHIPPING_LOADING_COMPLETED',
  DISPATCHED: 'SHIPPING_DISPATCHED',
  DIVERGENCE: 'SHIPPING_DIVERGENCE',
  TIMELINE: 'SHIPPING_TIMELINE',
  EXPORT: 'SHIPPING_EXPORT',
  FILTER: 'SHIPPING_FILTER',
  SEARCH: 'SHIPPING_SEARCH'
});

function emit(event, payload = {}) {
  logWmsUiEvent({ event, module: MODULE_ID, phase: PHASE, ...payload });
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent('impetus:shipping', { detail: { event, phase: PHASE, ts: Date.now(), ...payload } }));
    } catch {
      /* noop */
    }
  }
}

export function trackShippingLoaded(meta) {
  emit(SHIPPING_EVENTS.LOADED, meta);
}

export function trackShippingOrderReceived(orderId) {
  emit(SHIPPING_EVENTS.ORDER_RECEIVED, { orderId });
}

export function trackShippingLoadingStarted(orderId) {
  emit(SHIPPING_EVENTS.LOADING_STARTED, { orderId });
}

export function trackShippingLoadingCompleted(orderId) {
  emit(SHIPPING_EVENTS.LOADING_COMPLETED, { orderId });
}

export function trackShippingDispatched(orderId, movementCount = 0) {
  emit(SHIPPING_EVENTS.DISPATCHED, { orderId, movementCount });
}

export function trackShippingDivergence(orderId) {
  emit(SHIPPING_EVENTS.DIVERGENCE, { orderId });
}

export function trackShippingExport(format, rowCount) {
  emit(SHIPPING_EVENTS.EXPORT, { format, rowCount });
}

export function trackShippingFilter(filterId) {
  emit(SHIPPING_EVENTS.FILTER, { filterId });
}

export function trackShippingSearch(queryLength) {
  emit(SHIPPING_EVENTS.SEARCH, { queryLength });
}

export function trackShippingTimeline(periodDays) {
  emit(SHIPPING_EVENTS.TIMELINE, { periodDays });
}

export { MODULE_ID, PHASE };
