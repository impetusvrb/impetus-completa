'use strict';

const registry = new Map();

function registerAdaptiveSuggestion(id, meta = {}) {
  registry.set(id, { ...meta, registered_at: new Date().toISOString(), auto_apply: false });
  return { registered: true, id };
}

function listSuggestions() {
  return [...registry.entries()].map(([id, meta]) => ({ id, ...meta }));
}

module.exports = { registerAdaptiveSuggestion, listSuggestions };
