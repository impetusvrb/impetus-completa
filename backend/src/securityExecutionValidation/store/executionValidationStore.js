'use strict';

/**
 * SEC-12 — Store (validations, dry runs, last dashboard).
 */

let lastDashboard = null;
let lastEvaluation = null;
/** @type {object[]} */
const validationHistory = [];
/** @type {object[]} */
const dryRunHistory = [];

function setLastDashboard(d) {
  lastDashboard = d;
}

function getLastDashboard() {
  return lastDashboard;
}

function setLastEvaluation(e) {
  lastEvaluation = e;
}

function getLastEvaluation() {
  return lastEvaluation;
}

function addValidation(record) {
  validationHistory.unshift(record);
  if (validationHistory.length > 100) validationHistory.pop();
}

function getValidationHistory(limit = 20) {
  return validationHistory.slice(0, limit);
}

function addDryRun(record) {
  dryRunHistory.unshift(record);
  if (dryRunHistory.length > 50) dryRunHistory.pop();
}

function getDryRunHistory(limit = 20) {
  return dryRunHistory.slice(0, limit);
}

function resetForTests() {
  lastDashboard = null;
  lastEvaluation = null;
  validationHistory.length = 0;
  dryRunHistory.length = 0;
}

module.exports = {
  setLastDashboard,
  getLastDashboard,
  setLastEvaluation,
  getLastEvaluation,
  addValidation,
  getValidationHistory,
  addDryRun,
  getDryRunHistory,
  resetForTests
};
