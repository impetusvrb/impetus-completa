'use strict';

/** @type {Map<string, object>} */
const scenarios = new Map();
/** @type {Map<string, object>} */
const engagementProfiles = new Map();
/** @type {object[]} */
const planHistory = [];
/** @type {object[]} */
const evidenceRefs = [];

let lastDashboard = null;

function setScenario(id, scenario) {
  scenarios.set(id, { ...scenario, updatedAt: new Date().toISOString() });
}

function getScenario(id) {
  return scenarios.get(id) || null;
}

function getAllScenarios() {
  return [...scenarios.values()];
}

function setEngagementProfile(id, profile) {
  engagementProfiles.set(id, { ...profile, updatedAt: new Date().toISOString() });
}

function getAllEngagementProfiles() {
  return [...engagementProfiles.values()];
}

function addPlan(plan) {
  planHistory.unshift(plan);
  if (planHistory.length > 200) planHistory.pop();
}

function getPlans(limit = 50) {
  return planHistory.slice(0, limit);
}

function addEvidenceRef(ref) {
  evidenceRefs.unshift(ref);
  if (evidenceRefs.length > 100) evidenceRefs.pop();
}

function getEvidenceRefs(limit = 50) {
  return evidenceRefs.slice(0, limit);
}

function setLastDashboard(d) {
  lastDashboard = d;
}

function getLastDashboard() {
  return lastDashboard;
}

function resetForTests() {
  scenarios.clear();
  engagementProfiles.clear();
  planHistory.length = 0;
  evidenceRefs.length = 0;
  lastDashboard = null;
}

module.exports = {
  setScenario,
  getScenario,
  getAllScenarios,
  setEngagementProfile,
  getAllEngagementProfiles,
  addPlan,
  getPlans,
  addEvidenceRef,
  getEvidenceRefs,
  setLastDashboard,
  getLastDashboard,
  resetForTests
};
