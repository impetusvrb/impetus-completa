'use strict';

/**
 * SEC-14 — In-memory store (reputation, blacklist, fingerprints).
 */

/** @type {Map<string, object>} */
const reputationByIp = new Map();
/** @type {Map<string, object>} */
const blacklistByIp = new Map();
/** @type {Map<string, object>} */
const fingerprints = new Map();
/** @type {object[]} */
const recommendationHistory = [];

let lastDashboard = null;

const BLACKLIST_STATES = Object.freeze([
  'NORMAL',
  'OBSERVED',
  'WATCHLIST',
  'QUARANTINE',
  'BLOCK_CANDIDATE',
  'MANUAL_REVIEW'
]);

function getReputation(ip) {
  return reputationByIp.get(ip) || null;
}

function setReputation(ip, data) {
  reputationByIp.set(ip, { ...data, ip, updatedAt: new Date().toISOString() });
}

function getAllReputations() {
  return [...reputationByIp.values()];
}

function getBlacklistEntry(ip) {
  return blacklistByIp.get(ip) || null;
}

function setBlacklistState(ip, state, reason) {
  blacklistByIp.set(ip, {
    ip,
    state,
    reason,
    updatedAt: new Date().toISOString(),
    executed: false
  });
}

function getAllBlacklistEntries() {
  return [...blacklistByIp.values()];
}

function setFingerprint(id, fp) {
  fingerprints.set(id, fp);
}

function getFingerprint(id) {
  return fingerprints.get(id) || null;
}

function getAllFingerprints() {
  return [...fingerprints.values()];
}

function addRecommendation(rec) {
  recommendationHistory.unshift(rec);
  if (recommendationHistory.length > 200) recommendationHistory.pop();
}

function getRecommendations(limit = 50) {
  return recommendationHistory.slice(0, limit);
}

function setLastDashboard(d) {
  lastDashboard = d;
}

function getLastDashboard() {
  return lastDashboard;
}

function resetForTests() {
  reputationByIp.clear();
  blacklistByIp.clear();
  fingerprints.clear();
  recommendationHistory.length = 0;
  lastDashboard = null;
}

module.exports = {
  BLACKLIST_STATES,
  getReputation,
  setReputation,
  getAllReputations,
  getBlacklistEntry,
  setBlacklistState,
  getAllBlacklistEntries,
  setFingerprint,
  getFingerprint,
  getAllFingerprints,
  addRecommendation,
  getRecommendations,
  setLastDashboard,
  getLastDashboard,
  resetForTests
};
