'use strict';

/**
 * SEC-11 — In-memory store (plans, approvals, last dashboard).
 */

const PROFILES = Object.freeze(['NORMAL', 'ELEVATED', 'DEFENSE', 'PROTECTED', 'LOCKDOWN']);

let currentProfile = 'NORMAL';
let lastDashboard = null;
let lastEvaluation = null;
/** @type {object[]} */
const approvalLog = [];
/** @type {object[]} */
const planHistory = [];

function getCurrentProfile() {
  return currentProfile;
}

function setCurrentProfile(profile) {
  if (PROFILES.includes(profile)) currentProfile = profile;
  return currentProfile;
}

function addApprovalRecord(record) {
  approvalLog.unshift(record);
  if (approvalLog.length > 100) approvalLog.pop();
}

function getApprovalLog(limit = 20) {
  return approvalLog.slice(0, limit);
}

function addPlan(plan) {
  planHistory.unshift(plan);
  if (planHistory.length > 50) planHistory.pop();
}

function getPlanHistory(limit = 20) {
  return planHistory.slice(0, limit);
}

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

function resetForTests() {
  currentProfile = 'NORMAL';
  lastDashboard = null;
  lastEvaluation = null;
  approvalLog.length = 0;
  planHistory.length = 0;
}

module.exports = {
  PROFILES,
  getCurrentProfile,
  setCurrentProfile,
  addApprovalRecord,
  getApprovalLog,
  addPlan,
  getPlanHistory,
  setLastDashboard,
  getLastDashboard,
  setLastEvaluation,
  getLastEvaluation,
  resetForTests
};
