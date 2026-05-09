'use strict';

/**
 * Memória cognitiva persistente (ficheiro JSON) — auditoria e reidratação sem alterar pipeline/decisões.
 * Kill switch: IMPETUS_COGNITIVE_PERSISTENCE_ENABLED !== 'true' → só RAM.
 * PostgreSQL paralelo (opcional): cognitiveDbPersistenceService + IMPETUS_COGNITIVE_DB_ENABLED.
 */

const fs = require('fs');
const path = require('path');

const STORAGE_PATH = path.join(__dirname, '..', '..', 'storage', 'cognitive-memory.json');

const MAX_INTERACTIONS = 5000;
const MAX_PROPOSALS = 1000;
const MAX_AUTONOMOUS_EVENTS = 5000;

function isPersistenceEnabled() {
  return String(process.env.IMPETUS_COGNITIVE_PERSISTENCE_ENABLED ?? '')
    .trim()
    .toLowerCase() === 'true';
}

function ensureStorage() {
  const dir = path.dirname(STORAGE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (!fs.existsSync(STORAGE_PATH)) {
    const initial = {
      version: 1,
      interactions: [],
      proposals: [],
      autonomousEvents: []
    };
    fs.writeFileSync(STORAGE_PATH, JSON.stringify(initial, null, 2), 'utf8');
    try {
      console.log('[COGNITIVE_MEMORY_SAVE]', { reason: 'init_file', path: STORAGE_PATH });
    } catch (_e) {}
  }
}

function emptyState() {
  return {
    version: 1,
    interactions: [],
    proposals: [],
    autonomousEvents: []
  };
}

function trimArray(arr, max) {
  if (!Array.isArray(arr)) return [];
  while (arr.length > max) arr.shift();
  return arr;
}

function safeClone(obj) {
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch (_e) {
    return null;
  }
}

function normalizeLoaded(data) {
  if (!data || typeof data !== 'object') return emptyState();
  return {
    version: typeof data.version === 'number' ? data.version : 1,
    interactions: Array.isArray(data.interactions) ? data.interactions : [],
    proposals: Array.isArray(data.proposals) ? data.proposals : [],
    autonomousEvents: Array.isArray(data.autonomousEvents) ? data.autonomousEvents : []
  };
}

/** Leitura sem log (append rápido). */
function readPersistedStateSilent() {
  if (!isPersistenceEnabled()) return emptyState();
  ensureStorage();
  try {
    const raw = fs.readFileSync(STORAGE_PATH, 'utf8');
    return normalizeLoaded(JSON.parse(raw));
  } catch (err) {
    console.warn('[COGNITIVE_MEMORY_LOAD]', { error: err.message, path: STORAGE_PATH, silent: true });
    return emptyState();
  }
}

function loadCognitiveMemory() {
  if (!isPersistenceEnabled()) {
    return emptyState();
  }
  const data = readPersistedStateSilent();
  try {
    console.log('[COGNITIVE_MEMORY_LOAD]', {
      path: STORAGE_PATH,
      interactions: data.interactions.length,
      proposals: data.proposals.length,
      autonomousEvents: data.autonomousEvents.length
    });
  } catch (_e) {}
  return data;
}

function saveCognitiveMemory(data) {
  if (!isPersistenceEnabled()) return;
  ensureStorage();
  const payload = {
    version: 1,
    interactions: trimArray([...(data.interactions || [])], MAX_INTERACTIONS),
    proposals: trimArray([...(data.proposals || [])], MAX_PROPOSALS),
    autonomousEvents: trimArray([...(data.autonomousEvents || [])], MAX_AUTONOMOUS_EVENTS)
  };
  const tmp = `${STORAGE_PATH}.tmp`;
  try {
    fs.writeFileSync(tmp, JSON.stringify(payload, null, 2), 'utf8');
    fs.renameSync(tmp, STORAGE_PATH);
    try {
      console.log('[COGNITIVE_MEMORY_SAVE]', {
        interactions: payload.interactions.length,
        proposals: payload.proposals.length,
        autonomousEvents: payload.autonomousEvents.length
      });
    } catch (_e) {}
  } catch (err) {
    console.warn('[COGNITIVE_MEMORY_SAVE]', { error: err.message });
    try {
      if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
    } catch (_e2) {}
  }
}

function appendInteraction(entry) {
  if (!isPersistenceEnabled() || !entry) return;
  const persisted = readPersistedStateSilent();
  const clone = safeClone(entry);
  if (!clone) return;
  persisted.interactions.push(clone);
  trimArray(persisted.interactions, MAX_INTERACTIONS);
  saveCognitiveMemory(persisted);
}

function saveProposalsSnapshot(proposalsArray) {
  if (!isPersistenceEnabled() || !Array.isArray(proposalsArray)) return;
  const persisted = readPersistedStateSilent();
  const clone = safeClone(proposalsArray);
  if (!clone) return;
  persisted.proposals = clone;
  trimArray(persisted.proposals, MAX_PROPOSALS);
  saveCognitiveMemory(persisted);
}

function appendAutonomousEvent({ type, details }) {
  if (!isPersistenceEnabled()) return;
  const persisted = readPersistedStateSilent();
  persisted.autonomousEvents.push({
    timestamp: Date.now(),
    type: type != null ? String(type) : 'unknown',
    details: details && typeof details === 'object' ? safeClone(details) || {} : {}
  });
  trimArray(persisted.autonomousEvents, MAX_AUTONOMOUS_EVENTS);
  saveCognitiveMemory(persisted);
}

module.exports = {
  STORAGE_PATH,
  MAX_INTERACTIONS,
  MAX_PROPOSALS,
  MAX_AUTONOMOUS_EVENTS,
  isPersistenceEnabled,
  ensureStorage,
  loadCognitiveMemory,
  readPersistedStateSilent,
  saveCognitiveMemory,
  appendInteraction,
  saveProposalsSnapshot,
  appendAutonomousEvent
};
