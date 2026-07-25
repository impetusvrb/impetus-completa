/**
 * WMS-004 — Telemetria de interface (sem PII).
 */

const _entries = [];

export function logWmsUiEvent(event = {}) {
  _entries.push(
    Object.freeze({
      ts: new Date().toISOString(),
      layer: 'WMS-004',
      ...event
    })
  );
  if (_entries.length > 300) _entries.shift();
}

export function getWmsUiObservabilitySnapshot(limit = 50) {
  return _entries.slice(-limit);
}

export function resetWmsUiObservabilityForTests() {
  _entries.length = 0;
}
