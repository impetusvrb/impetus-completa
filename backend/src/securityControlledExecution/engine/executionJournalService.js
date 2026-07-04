'use strict';

/**
 * SEC-13 — Execution Journal.
 */

/** @type {object[]} */
const journal = [];
/** @type {object[]} */
const internalIncidents = [];
let securityLogLevel = 'info';

function append(entry) {
  journal.unshift({
    ...entry,
    journalId: entry.journalId || `jrnl-${Date.now()}-${journal.length}`,
    recordedAt: entry.recordedAt || new Date().toISOString()
  });
  if (journal.length > 500) journal.pop();
  return journal[0];
}

function getHistory(limit = 50) {
  return journal.slice(0, limit);
}

function addInternalIncident(incident) {
  internalIncidents.unshift({
    ...incident,
    internalIncidentId: incident.internalIncidentId || `int-${Date.now()}`,
    openedAt: new Date().toISOString(),
    source: 'SEC-13'
  });
  if (internalIncidents.length > 100) internalIncidents.pop();
  return internalIncidents[0];
}

function closeInternalIncident(id) {
  const inc = internalIncidents.find((i) => i.internalIncidentId === id);
  if (inc) {
    inc.status = 'CLOSED';
    inc.closedAt = new Date().toISOString();
  }
  return inc;
}

function getInternalIncidents() {
  return [...internalIncidents];
}

function setSecurityLogLevel(level) {
  securityLogLevel = level;
}

function getSecurityLogLevel() {
  return securityLogLevel;
}

function resetForTests() {
  journal.length = 0;
  internalIncidents.length = 0;
  securityLogLevel = 'info';
}

module.exports = {
  append,
  getHistory,
  addInternalIncident,
  closeInternalIncident,
  getInternalIncidents,
  setSecurityLogLevel,
  getSecurityLogLevel,
  resetForTests
};
