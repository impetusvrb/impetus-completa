/**
 * OPM-003 — Observabilidade do módulo Recebimento (porta de entrada WMS).
 */
import { logWmsUiEvent } from '../../services/wmsUiObservability.js';

const MODULE_ID = 'receiving';
const PHASE = 'OPM-003';

export const RECEIVING_EVENTS = Object.freeze({
  LOADED: 'RECEIVING_LOADED',
  ASN_CREATED: 'RECEIVING_ASN_CREATED',
  DOCK_ASSIGNED: 'RECEIVING_DOCK_ASSIGNED',
  INSPECTION_STARTED: 'RECEIVING_INSPECTION_STARTED',
  DIVERGENCE: 'RECEIVING_DIVERGENCE',
  COMPLETED: 'RECEIVING_COMPLETED',
  TIMELINE: 'RECEIVING_TIMELINE',
  EXPORT: 'RECEIVING_EXPORT',
  FILTER: 'RECEIVING_FILTER',
  SEARCH: 'RECEIVING_SEARCH'
});

function emit(event, payload = {}) {
  logWmsUiEvent({ event, module: MODULE_ID, phase: PHASE, ...payload });
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent('impetus:receiving', { detail: { event, phase: PHASE, ts: Date.now(), ...payload } }));
    } catch {
      /* noop */
    }
  }
}

export function trackReceivingLoaded(meta) {
  emit(RECEIVING_EVENTS.LOADED, meta);
}

export function trackReceivingAsnCreated(orderId) {
  emit(RECEIVING_EVENTS.ASN_CREATED, { orderId });
}

export function trackReceivingDockAssigned(dockId, orderId) {
  emit(RECEIVING_EVENTS.DOCK_ASSIGNED, { dockId, orderId });
}

export function trackReceivingInspectionStarted(orderId) {
  emit(RECEIVING_EVENTS.INSPECTION_STARTED, { orderId });
}

export function trackReceivingDivergence(orderId) {
  emit(RECEIVING_EVENTS.DIVERGENCE, { orderId });
}

export function trackReceivingCompleted(orderId, movementCount = 0) {
  emit(RECEIVING_EVENTS.COMPLETED, { orderId, movementCount });
}

export function trackReceivingTimeline(periodDays) {
  emit(RECEIVING_EVENTS.TIMELINE, { periodDays });
}

export function trackReceivingExport(format, rowCount) {
  emit(RECEIVING_EVENTS.EXPORT, { format, rowCount });
}

export function trackReceivingFilter(filterId) {
  emit(RECEIVING_EVENTS.FILTER, { filterId });
}

export function trackReceivingSearch(queryLength) {
  emit(RECEIVING_EVENTS.SEARCH, { queryLength });
}

export { MODULE_ID, PHASE };
