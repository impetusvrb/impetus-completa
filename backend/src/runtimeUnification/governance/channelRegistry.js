'use strict';

/**
 * Canais unificados — SSOT de capacidades por runtime (additive-only).
 */

const CHANNELS = Object.freeze({
  VOICE: 'voice',
  PANEL: 'panel',
  TEXT: 'text',
  MEMORY: 'memory',
  ORCHESTRATION: 'orchestration'
});

const CHANNEL_ENTRIES = Object.freeze([
  {
    id: CHANNELS.VOICE,
    debt_ref: 'D5',
    sz5_adapter: 'voice',
    legacy_service: 'impetusChatOperationalContextService',
    legacy_method: 'formatForVoiceAppend',
    consumers: ['voiceRealtimeContextService', 'claudePanelService'],
    removal_allowed: false
  },
  {
    id: CHANNELS.PANEL,
    debt_ref: 'D5',
    sz5_adapter: 'panel',
    legacy_service: 'impetusChatOperationalContextService',
    legacy_method: 'buildPanelChatTables',
    consumers: ['smartPanelCommandService', 'claudePanelService'],
    removal_allowed: false
  },
  {
    id: CHANNELS.TEXT,
    debt_ref: 'D4',
    sz5_adapter: 'text',
    legacy_service: 'zUnifiedConversationalContextInjector',
    legacy_method: 'buildUnifiedConversationalContext',
    consumers: ['chatAIService.consolidated', 'chatAIService.loader'],
    removal_allowed: false
  },
  {
    id: CHANNELS.MEMORY,
    debt_ref: 'SZ5',
    sz5_adapter: 'memory',
    legacy_service: 'zSz5UnifiedMemoryFacade',
    legacy_method: 'health',
    consumers: ['runtime-z-sovereign/sz5'],
    removal_allowed: false
  },
  {
    id: CHANNELS.ORCHESTRATION,
    debt_ref: 'D1',
    sz5_adapter: 'orchestration',
    legacy_service: 'unifiedOrchestrator',
    legacy_method: 'executeCognitiveFlow',
    consumers: ['runLlm', 'chatAIService'],
    removal_allowed: false,
    observe_only: true
  }
]);

const _byId = new Map(CHANNEL_ENTRIES.map((e) => [e.id, e]));

function getChannel(channelId) {
  return _byId.get(String(channelId || '').trim().toLowerCase()) || null;
}

function listChannels() {
  return CHANNEL_ENTRIES.map((e) => ({ ...e }));
}

function isValidChannel(channelId) {
  return _byId.has(String(channelId || '').trim().toLowerCase());
}

module.exports = {
  CHANNELS,
  CHANNEL_ENTRIES,
  getChannel,
  listChannels,
  isValidChannel
};
