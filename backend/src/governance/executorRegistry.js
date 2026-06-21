'use strict';

/**
 * EVENT-GOVERNANCE-03 — registry declarativo de executores de canal.
 */

/** @typedef {object} ExecutorDefinition
 * @property {string} id
 * @property {string} channel
 * @property {string} modulePath
 * @property {boolean} available
 */

/** @type {ExecutorDefinition[]} */
const EXECUTOR_DEFINITIONS = Object.freeze([
  {
    id: 'notificationCenterExecutor',
    channel: 'notification_center',
    modulePath: './executors/notificationCenterExecutor',
    available: true
  },
  {
    id: 'appImpetusExecutor',
    channel: 'app_impetus',
    modulePath: './executors/appImpetusExecutor',
    available: true
  },
  {
    id: 'emailExecutor',
    channel: 'email',
    modulePath: './executors/emailExecutor',
    available: true
  },
  {
    id: 'dashboardExecutor',
    channel: 'dashboard',
    modulePath: './executors/dashboardExecutor',
    available: true
  },
  {
    id: 'chatExecutor',
    channel: 'chat',
    modulePath: './executors/chatExecutor',
    available: true
  }
]);

/** @type {Map<string, object>} */
const _cache = new Map();

function getExecutorDefinitions() {
  return EXECUTOR_DEFINITIONS;
}

function getExecutorCount() {
  return EXECUTOR_DEFINITIONS.length;
}

function getExecutorDefinition(executorId) {
  const id = String(executorId || '').trim();
  return EXECUTOR_DEFINITIONS.find((d) => d.id === id) || null;
}

/**
 * Resolve módulo executor (lazy load).
 * @param {string} executorId
 * @returns {object|null}
 */
function resolveExecutor(executorId) {
  const def = getExecutorDefinition(executorId);
  if (!def || !def.available) return null;

  if (!_cache.has(def.id)) {
    try {
      // eslint-disable-next-line import/no-dynamic-require, global-require
      const mod = require(def.modulePath);
      _cache.set(def.id, mod);
    } catch (_err) {
      return null;
    }
  }

  return _cache.get(def.id) || null;
}

function clearExecutorCacheForTests() {
  _cache.clear();
}

module.exports = {
  EXECUTOR_DEFINITIONS,
  getExecutorDefinitions,
  getExecutorCount,
  getExecutorDefinition,
  resolveExecutor,
  clearExecutorCacheForTests
};
