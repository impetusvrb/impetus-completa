'use strict';

/**
 * SEC-19 — In-memory store (certificação operacional).
 */

let lastDashboard = null;
let lastCertification = null;
let attackResults = [];
let stressResults = [];
let readinessSnapshot = null;

function resetForTests() {
  lastDashboard = null;
  lastCertification = null;
  attackResults = [];
  stressResults = [];
  readinessSnapshot = null;
}

function setLastDashboard(dto) {
  lastDashboard = dto;
}

function getLastDashboard() {
  return lastDashboard;
}

function setLastCertification(result) {
  lastCertification = result;
}

function getLastCertification() {
  return lastCertification;
}

function addAttackResult(result) {
  attackResults.push(result);
  if (attackResults.length > 200) attackResults.shift();
}

function getAttackResults(limit = 100) {
  return attackResults.slice(-limit);
}

function addStressResult(result) {
  stressResults.push(result);
  if (stressResults.length > 50) stressResults.shift();
}

function getStressResults(limit = 20) {
  return stressResults.slice(-limit);
}

function setReadinessSnapshot(snapshot) {
  readinessSnapshot = snapshot;
}

function getReadinessSnapshot() {
  return readinessSnapshot;
}

module.exports = {
  resetForTests,
  setLastDashboard,
  getLastDashboard,
  setLastCertification,
  getLastCertification,
  addAttackResult,
  getAttackResults,
  addStressResult,
  getStressResults,
  setReadinessSnapshot,
  getReadinessSnapshot
};
