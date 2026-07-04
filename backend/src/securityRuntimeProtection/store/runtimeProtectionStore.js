'use strict';

/** @type {object[]} */
const planHistory = [];
/** @type {object[]} */
const approvalHistory = [];
/** @type {object[]} */
const safetyChecks = [];

let lastDashboard = null;
let currentProfile = 'NORMAL';

function setCurrentProfile(p) {
  currentProfile = p;
}

function getCurrentProfile() {
  return currentProfile;
}

function addPlan(plan) {
  planHistory.unshift(plan);
  if (planHistory.length > 200) planHistory.pop();
}

function getPlans(limit = 50) {
  return planHistory.slice(0, limit);
}

function addApproval(approval) {
  approvalHistory.unshift(approval);
  if (approvalHistory.length > 100) approvalHistory.pop();
}

function getApprovals(limit = 50) {
  return approvalHistory.slice(0, limit);
}

function addSafetyCheck(check) {
  safetyChecks.unshift(check);
  if (safetyChecks.length > 100) safetyChecks.pop();
}

function getSafetyChecks(limit = 20) {
  return safetyChecks.slice(0, limit);
}

function setLastDashboard(d) {
  lastDashboard = d;
}

function getLastDashboard() {
  return lastDashboard;
}

function resetForTests() {
  planHistory.length = 0;
  approvalHistory.length = 0;
  safetyChecks.length = 0;
  lastDashboard = null;
  currentProfile = 'NORMAL';
}

module.exports = {
  setCurrentProfile,
  getCurrentProfile,
  addPlan,
  getPlans,
  addApproval,
  getApprovals,
  addSafetyCheck,
  getSafetyChecks,
  setLastDashboard,
  getLastDashboard,
  resetForTests
};
