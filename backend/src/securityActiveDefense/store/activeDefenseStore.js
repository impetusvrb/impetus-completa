'use strict';

/**
 * SEC-10 — In-memory store (defense state, campaigns, last evaluation).
 */

const SECURITY_MODES = Object.freeze([
  'NORMAL',
  'MONITORING',
  'ELEVATED',
  'DEFENSE',
  'PROTECTED'
]);

let currentMode = 'NORMAL';
let lastEvaluation = null;
let lastDashboard = null;
/** @type {Map<string, object>} */
const campaigns = new Map();
/** @type {object[]} */
const recommendationHistory = [];

function getCurrentMode() {
  return currentMode;
}

function setCurrentMode(mode, reason) {
  if (!SECURITY_MODES.includes(mode)) return null;
  const previous = currentMode;
  if (mode !== previous) {
    currentMode = mode;
    return { previous, current: mode, reason, at: new Date().toISOString() };
  }
  return null;
}

function recordEvaluation(result) {
  lastEvaluation = {
    at: new Date().toISOString(),
    threatLevel: result?.threatLevel || null,
    patterns: result?.patterns?.length || 0,
    recommendations: result?.recommendations?.length || 0
  };
}

function setLastDashboard(dashboard) {
  lastDashboard = dashboard;
}

function getLastDashboard() {
  return lastDashboard;
}

function getLastEvaluation() {
  return lastEvaluation;
}

function upsertCampaign(key, data) {
  campaigns.set(key, { ...data, updatedAt: new Date().toISOString() });
}

function getCampaigns() {
  return [...campaigns.values()];
}

function addRecommendation(rec) {
  recommendationHistory.unshift(rec);
  if (recommendationHistory.length > 200) recommendationHistory.pop();
}

function getRecommendationHistory(limit = 50) {
  return recommendationHistory.slice(0, limit);
}

function resetForTests() {
  currentMode = 'NORMAL';
  lastEvaluation = null;
  lastDashboard = null;
  campaigns.clear();
  recommendationHistory.length = 0;
}

module.exports = {
  SECURITY_MODES,
  getCurrentMode,
  setCurrentMode,
  recordEvaluation,
  setLastDashboard,
  getLastDashboard,
  getLastEvaluation,
  upsertCampaign,
  getCampaigns,
  addRecommendation,
  getRecommendationHistory,
  resetForTests
};
