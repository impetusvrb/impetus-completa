'use strict';

const { normalizeModuleId } = require('../canonicalModuleGovernance/moduleAliasRegistry');

const BLOCKED_ACTIONS = Object.freeze([
  'merge',
  'enrich',
  'inject',
  'restore',
  'render',
  'fallback',
  'contextualize',
  'augment'
]);

function buildDeniedSet(deniedPublications = [], deniedModules = []) {
  const set = new Set();
  for (const d of [...deniedPublications, ...deniedModules]) {
    const n = normalizeModuleId(d);
    set.add(n);
    set.add(String(d).toLowerCase());
  }
  return set;
}

function isDeniedPublicationLocked(moduleId, ctx = {}) {
  const key = normalizeModuleId(moduleId);
  const denied = buildDeniedSet(ctx.denied_publications, ctx.denied_modules);
  if (denied.size === 0) return { locked: false };
  if (denied.has(key)) {
    return { locked: true, reason: 'denied_publication_terminal', blocked_actions: BLOCKED_ACTIONS };
  }
  if (key.includes('safety') && [...denied].some((d) => d.includes('safety'))) {
    return { locked: true, reason: 'denied_safety_domain', blocked_actions: BLOCKED_ACTIONS };
  }
  if (key.includes('environment') && [...denied].some((d) => d.includes('environment'))) {
    return { locked: true, reason: 'denied_environment_domain', blocked_actions: BLOCKED_ACTIONS };
  }
  return { locked: false };
}

function filterDeniedFromList(items = [], ctx = {}) {
  const kept = [];
  const blocked = [];
  for (const item of items) {
    const id = typeof item === 'string' ? item : item.module_id || item.menu_key || item.id;
    const check = isDeniedPublicationLocked(id, ctx);
    if (check.locked) blocked.push({ item: id, ...check });
    else kept.push(item);
  }
  return { kept, blocked, reinjection_blocked: blocked.length > 0 };
}

module.exports = {
  BLOCKED_ACTIONS,
  buildDeniedSet,
  isDeniedPublicationLocked,
  filterDeniedFromList
};
