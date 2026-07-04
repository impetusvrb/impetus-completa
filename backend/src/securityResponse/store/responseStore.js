'use strict';

/**
 * SEC-06 — Response store (histórico in-memory).
 */

const flags = require('../config/securityResponseFlags');

/** @type {Map<string, object>} */
const byId = new Map();

/** @type {Map<string, string>} incidentId -> responseId */
const byIncident = new Map();

function addResponse(response) {
  if (byId.size >= flags.maxStoredResponses()) {
    evictOldest();
  }
  byId.set(response.responseId, response);
  if (response.incidentId) byIncident.set(response.incidentId, response.responseId);
  return response;
}

function updateResponse(response) {
  byId.set(response.responseId, response);
  return response;
}

function evictOldest() {
  const sorted = [...byId.values()].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  const oldest = sorted[0];
  if (oldest) {
    byId.delete(oldest.responseId);
    if (oldest.incidentId) byIncident.delete(oldest.incidentId);
  }
}

function getById(id) {
  return byId.get(id) || null;
}

function getByIncidentId(incidentId) {
  const id = byIncident.get(incidentId);
  return id ? byId.get(id) : null;
}

function getHistory(limit = 50) {
  return [...byId.values()].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, limit);
}

function getAll() {
  return getHistory(1000);
}

function resetForTests() {
  byId.clear();
  byIncident.clear();
}

module.exports = {
  addResponse,
  updateResponse,
  getById,
  getByIncidentId,
  getHistory,
  getAll,
  resetForTests
};
