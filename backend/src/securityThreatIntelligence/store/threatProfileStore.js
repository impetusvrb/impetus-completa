'use strict';

/**
 * SEC-03 — Threat Profile Store (in-memory).
 * Mantém perfis separados dos Incident DTOs SEC-02.
 */

const flags = require('../config/securityThreatIntelligenceFlags');

/** @type {Map<string, object>} incidentId -> profile */
const profiles = new Map();

/** @type {Map<string, object>} threatProfileId -> profile */
const byProfileId = new Map();

function upsertProfile(profile) {
  if (profiles.size >= flags.maxStoredProfiles()) {
    evictOldest();
  }
  profiles.set(profile.incidentId, profile);
  byProfileId.set(profile.threatProfileId, profile);
  return profile;
}

function evictOldest() {
  const sorted = [...profiles.values()].sort(
    (a, b) => new Date(a.analyzedAt) - new Date(b.analyzedAt)
  );
  const oldest = sorted[0];
  if (oldest) {
    profiles.delete(oldest.incidentId);
    byProfileId.delete(oldest.threatProfileId);
  }
}

function getProfileByIncidentId(incidentId) {
  return profiles.get(incidentId) || null;
}

function getProfileById(threatProfileId) {
  return byProfileId.get(threatProfileId) || null;
}

function getAllProfiles() {
  return [...profiles.values()].sort((a, b) => new Date(b.analyzedAt) - new Date(a.analyzedAt));
}

function getHistoricalProfiles(excludeIncidentId) {
  const windowMs = flags.historicalWindowMs();
  const cutoff = Date.now() - windowMs;
  return getAllProfiles().filter((p) => {
    if (p.incidentId === excludeIncidentId) return false;
    const t = new Date(p.analyzedAt).getTime();
    return t >= cutoff;
  });
}

function resetForTests() {
  profiles.clear();
  byProfileId.clear();
}

module.exports = {
  upsertProfile,
  getProfileByIncidentId,
  getProfileById,
  getAllProfiles,
  getHistoricalProfiles,
  resetForTests
};
