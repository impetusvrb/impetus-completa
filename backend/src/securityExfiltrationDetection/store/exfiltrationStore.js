'use strict';

/** @type {object[]} */
const accessProfiles = [];
/** @type {object[]} */
const movementProfiles = [];
/** @type {object[]} */
const planHistory = [];
/** @type {object[]} */
const timelineEvents = [];

let lastDashboard = null;

function addAccessProfile(p) {
  accessProfiles.unshift(p);
  if (accessProfiles.length > 100) accessProfiles.pop();
}

function getAccessProfiles(limit = 50) {
  return accessProfiles.slice(0, limit);
}

function addMovementProfile(p) {
  movementProfiles.unshift(p);
  if (movementProfiles.length > 100) movementProfiles.pop();
}

function getMovementProfiles(limit = 50) {
  return movementProfiles.slice(0, limit);
}

function addPlan(plan) {
  planHistory.unshift(plan);
  if (planHistory.length > 200) planHistory.pop();
}

function getPlans(limit = 50) {
  return planHistory.slice(0, limit);
}

function setTimeline(events) {
  timelineEvents.length = 0;
  timelineEvents.push(...events);
}

function getTimeline() {
  return [...timelineEvents];
}

function setLastDashboard(d) {
  lastDashboard = d;
}

function getLastDashboard() {
  return lastDashboard;
}

function resetForTests() {
  accessProfiles.length = 0;
  movementProfiles.length = 0;
  planHistory.length = 0;
  timelineEvents.length = 0;
  lastDashboard = null;
}

module.exports = {
  addAccessProfile,
  getAccessProfiles,
  addMovementProfile,
  getMovementProfiles,
  addPlan,
  getPlans,
  setTimeline,
  getTimeline,
  setLastDashboard,
  getLastDashboard,
  resetForTests
};
