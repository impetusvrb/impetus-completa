'use strict';

/** @type {Map<string, object>} */
const scannerFingerprints = new Map();
/** @type {Map<string, object>} */
const enumerationProfiles = new Map();
/** @type {object[]} */
const surfacePlanHistory = [];

let lastDashboard = null;

function setScannerFingerprint(id, fp) {
  scannerFingerprints.set(id, fp);
}

function getScannerFingerprint(id) {
  return scannerFingerprints.get(id) || null;
}

function getAllScannerFingerprints() {
  return [...scannerFingerprints.values()];
}

function setEnumerationProfile(id, profile) {
  enumerationProfiles.set(id, profile);
}

function getEnumerationProfile(id) {
  return enumerationProfiles.get(id) || null;
}

function getAllEnumerationProfiles() {
  return [...enumerationProfiles.values()];
}

function addSurfacePlan(plan) {
  surfacePlanHistory.unshift(plan);
  if (surfacePlanHistory.length > 200) surfacePlanHistory.pop();
}

function getSurfacePlans(limit = 50) {
  return surfacePlanHistory.slice(0, limit);
}

function setLastDashboard(d) {
  lastDashboard = d;
}

function getLastDashboard() {
  return lastDashboard;
}

function resetForTests() {
  scannerFingerprints.clear();
  enumerationProfiles.clear();
  surfacePlanHistory.length = 0;
  lastDashboard = null;
}

module.exports = {
  setScannerFingerprint,
  getScannerFingerprint,
  getAllScannerFingerprints,
  setEnumerationProfile,
  getEnumerationProfile,
  getAllEnumerationProfiles,
  addSurfacePlan,
  getSurfacePlans,
  setLastDashboard,
  getLastDashboard,
  resetForTests
};
