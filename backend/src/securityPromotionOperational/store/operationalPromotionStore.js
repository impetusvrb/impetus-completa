'use strict';

let lastDashboard = null;
let lastValidation = null;
/** @type {object[]} */
const promotionReports = [];
/** @type {Set<string>} */
const rollbackPhases = new Set();

function setLastDashboard(d) {
  lastDashboard = d;
}

function getLastDashboard() {
  return lastDashboard;
}

function setLastValidation(v) {
  lastValidation = v;
}

function getLastValidation() {
  return lastValidation;
}

function addReport(report) {
  promotionReports.unshift(report);
  if (promotionReports.length > 50) promotionReports.pop();
}

function getReports(limit = 20) {
  return promotionReports.slice(0, limit);
}

function markRollback(phase) {
  rollbackPhases.add(phase);
}

function clearRollback(phase) {
  rollbackPhases.delete(phase);
}

function isRollback(phase) {
  return rollbackPhases.has(phase);
}

function resetForTests() {
  lastDashboard = null;
  lastValidation = null;
  promotionReports.length = 0;
  rollbackPhases.clear();
}

module.exports = {
  setLastDashboard,
  getLastDashboard,
  setLastValidation,
  getLastValidation,
  addReport,
  getReports,
  markRollback,
  clearRollback,
  isRollback,
  resetForTests
};
