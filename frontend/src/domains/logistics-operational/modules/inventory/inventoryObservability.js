/**
 * OPM-002A — Observabilidade do módulo Inventário (aditiva).
 */
import { logWmsUiEvent } from '../../services/wmsUiObservability.js';

const MODULE_ID = 'inventory';
const PHASE = 'OPM-002A';

export const INVENTORY_EVENTS = Object.freeze({
  LOADED: 'INVENTORY_LOADED',
  FILTER: 'INVENTORY_FILTER',
  SEARCH: 'INVENTORY_SEARCH',
  GRID_SORT: 'INVENTORY_GRID_SORT',
  EXPORT: 'INVENTORY_EXPORT',
  TIMELINE: 'INVENTORY_TIMELINE',
  VIEW_CHANGED: 'INVENTORY_VIEW_CHANGED'
});

function emit(event, payload = {}) {
  logWmsUiEvent({ event, module: MODULE_ID, phase: PHASE, ...payload });
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent('impetus:inventory', { detail: { event, phase: PHASE, ts: Date.now(), ...payload } }));
    } catch {
      /* noop */
    }
  }
}

export function trackInventoryLoaded(meta) {
  emit(INVENTORY_EVENTS.LOADED, meta);
}

export function trackInventoryFilter(filterId) {
  emit(INVENTORY_EVENTS.FILTER, { filterId });
}

export function trackInventorySearch(queryLength) {
  emit(INVENTORY_EVENTS.SEARCH, { queryLength });
}

export function trackInventoryGridSort(sortKey, direction) {
  emit(INVENTORY_EVENTS.GRID_SORT, { sortKey, direction });
}

export function trackInventoryExport(format, rowCount) {
  emit(INVENTORY_EVENTS.EXPORT, { format, rowCount });
}

export function trackInventoryTimeline(periodDays) {
  emit(INVENTORY_EVENTS.TIMELINE, { periodDays });
}

export function trackInventoryViewChanged(viewId) {
  emit(INVENTORY_EVENTS.VIEW_CHANGED, { viewId });
}
