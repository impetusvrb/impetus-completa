'use strict';

/**
 * EVENT-GOVERNANCE-02 — registry declarativo de canais de execução.
 * Mapeia canais existentes a executores (nomes simbólicos — sem envio nesta fase).
 */

/** @typedef {object} ChannelDefinition
 * @property {boolean} available
 * @property {string} executor
 * @property {string} [description]
 */

/** @type {Record<string, ChannelDefinition>} */
const CHANNEL_REGISTRY = Object.freeze({
  notification_center: Object.freeze({
    available: true,
    executor: 'notificationCenterExecutor',
    description: 'Notification Center — unifiedMessaging / NC-02'
  }),
  app_impetus: Object.freeze({
    available: true,
    executor: 'appImpetusExecutor',
    description: 'App Impetus — push in-app'
  }),
  email: Object.freeze({
    available: true,
    executor: 'emailExecutor',
    description: 'Email transacional — subscription / alertas'
  }),
  dashboard: Object.freeze({
    available: true,
    executor: 'dashboardExecutor',
    description: 'Dashboard operacional — painéis e alertas visuais'
  }),
  chat: Object.freeze({
    available: true,
    executor: 'chatExecutor',
    description: 'Chat operacional — mensagens em tempo real'
  })
});

/** Canais referenciados em políticas mas registados para fase posterior. */
const EXTENDED_CHANNEL_ALIASES = Object.freeze({
  operational_alerts: 'dashboard',
  notifications_table: 'notification_center',
  manuia_inbox: 'app_impetus',
  web_push_optional: 'app_impetus'
});

function getChannelRegistry() {
  return CHANNEL_REGISTRY;
}

function getRegisteredChannelIds() {
  return Object.keys(CHANNEL_REGISTRY);
}

function getRegisteredChannelCount() {
  return getRegisteredChannelIds().length;
}

/**
 * Resolve definição de canal (directo ou alias de política).
 * @param {string} channelId
 * @returns {{ id: string, definition: ChannelDefinition|null, aliasOf: string|null }}
 */
function resolveChannelDefinition(channelId) {
  const id = String(channelId || '').trim().toLowerCase();
  if (!id) {
    return { id: '', definition: null, aliasOf: null };
  }

  if (CHANNEL_REGISTRY[id]) {
    return { id, definition: CHANNEL_REGISTRY[id], aliasOf: null };
  }

  const aliasTarget = EXTENDED_CHANNEL_ALIASES[id];
  if (aliasTarget && CHANNEL_REGISTRY[aliasTarget]) {
    return { id, definition: CHANNEL_REGISTRY[aliasTarget], aliasOf: aliasTarget };
  }

  return { id, definition: null, aliasOf: null };
}

function getReadyChannelCount() {
  return getRegisteredChannelIds().filter((id) => CHANNEL_REGISTRY[id]?.available === true).length;
}

module.exports = {
  CHANNEL_REGISTRY,
  EXTENDED_CHANNEL_ALIASES,
  getChannelRegistry,
  getRegisteredChannelIds,
  getRegisteredChannelCount,
  getReadyChannelCount,
  resolveChannelDefinition
};
