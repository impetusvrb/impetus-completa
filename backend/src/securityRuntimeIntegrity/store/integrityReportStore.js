'use strict';

/**
 * SEC-04 — Integrity report store (in-memory, último relatório).
 */

let lastReport = null;
let history = [];

function setLastReport(report) {
  lastReport = report;
  history.unshift(report);
  if (history.length > 20) history.pop();
}

function getLastReport() {
  return lastReport;
}

function getHistory(limit = 10) {
  return history.slice(0, limit);
}

function resetForTests() {
  lastReport = null;
  history = [];
}

module.exports = { setLastReport, getLastReport, getHistory, resetForTests };
