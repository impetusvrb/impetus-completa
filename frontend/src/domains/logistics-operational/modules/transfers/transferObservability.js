/**
 * OPM-006 — Observabilidade Transfer / Internal Logistics (camada transversal).
 */
import { logWmsUiEvent } from '../../services/wmsUiObservability.js';

const MODULE_ID = 'transfers';
const PHASE = 'OPM-006';

export const TRANSFER_EVENTS = Object.freeze({
  LOADED: 'TRANSFER_LOADED',
  CREATED: 'TRANSFER_CREATED',
  STARTED: 'TRANSFER_STARTED',
  PAUSED: 'TRANSFER_PAUSED',
  COMPLETED: 'TRANSFER_COMPLETED',
  RELOCATION: 'TRANSFER_RELOCATION',
  REPLENISHMENT: 'TRANSFER_REPLENISHMENT',
  CROSSDOCK: 'TRANSFER_CROSSDOCK',
  DIVERGENCE: 'TRANSFER_DIVERGENCE',
  TIMELINE: 'TRANSFER_TIMELINE',
  EXPORT: 'TRANSFER_EXPORT',
  FILTER: 'TRANSFER_FILTER',
  SEARCH: 'TRANSFER_SEARCH'
});

function emit(event, payload = {}) {
  logWmsUiEvent({ event, module: MODULE_ID, phase: PHASE, ...payload });
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent('impetus:transfers', { detail: { event, phase: PHASE, ts: Date.now(), ...payload } }));
    } catch {
      /* noop */
    }
  }
}

export function trackTransferLoaded(meta) {
  emit(TRANSFER_EVENTS.LOADED, meta);
}

export function trackTransferCreated(orderId, internalType = 'transfer') {
  emit(TRANSFER_EVENTS.CREATED, { orderId, internalType });
  if (internalType === 'relocation') emit(TRANSFER_EVENTS.RELOCATION, { orderId });
  if (internalType === 'replenishment') emit(TRANSFER_EVENTS.REPLENISHMENT, { orderId });
  if (internalType === 'crossDock') emit(TRANSFER_EVENTS.CROSSDOCK, { orderId });
}

export function trackTransferStarted(orderId) {
  emit(TRANSFER_EVENTS.STARTED, { orderId });
}

export function trackTransferPaused(orderId) {
  emit(TRANSFER_EVENTS.PAUSED, { orderId });
}

export function trackTransferCompleted(orderId, movementCount = 0) {
  emit(TRANSFER_EVENTS.COMPLETED, { orderId, movementCount });
}

export function trackTransferDivergence(orderId) {
  emit(TRANSFER_EVENTS.DIVERGENCE, { orderId });
}

export function trackTransferExport(format, rowCount) {
  emit(TRANSFER_EVENTS.EXPORT, { format, rowCount });
}

export function trackTransferFilter(filterId) {
  emit(TRANSFER_EVENTS.FILTER, { filterId });
}

export function trackTransferSearch(queryLength) {
  emit(TRANSFER_EVENTS.SEARCH, { queryLength });
}

export function trackTransferTimeline(periodDays) {
  emit(TRANSFER_EVENTS.TIMELINE, { periodDays });
}

export { MODULE_ID, PHASE };
