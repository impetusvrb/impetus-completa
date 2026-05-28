'use strict';

/**
 * Catálogo canónico de runtimes legados — NÃO remove código; governa migração.
 * Ref: TECHNICAL_DEBT_MASTER_REPORT D3–D8, D4, D5.
 */

const LIFECYCLE = Object.freeze({
  ACTIVE: 'active',
  DEPRECATED: 'deprecated',
  SUNSET: 'sunset',
  FROZEN: 'frozen'
});

const ENFORCEMENT = Object.freeze({
  NONE: 'none',
  WARN: 'warn',
  REDIRECT: 'redirect',
  BLOCK: 'block'
});

/** removal_allowed=false em todos — proibido remoção abrupta via esta camada */
const LEGACY_ENTRIES = Object.freeze([
  {
    id: 'chat_ai_service_legacy',
    debt_ref: 'D4',
    module_path: 'services/chatAIService.js',
    replacement_id: 'chat_ai_service_consolidated',
    replacement_path: 'services/chatAIService.consolidated.js',
    loader_path: 'services/chatAIService.loader.js',
    lifecycle: LIFECYCLE.DEPRECATED,
    enforcement_default: ENFORCEMENT.WARN,
    enforcement_on: ENFORCEMENT.REDIRECT,
    removal_allowed: false,
    sunset_target: '2026-12-31',
    description: 'Chat IA legado — hot path deve usar loader → consolidated com fallback.'
  },
  {
    id: 'chat_ai_direct_import',
    debt_ref: 'D4',
    module_path: 'services/chatAIService.js',
    replacement_id: 'chat_ai_service_loader',
    replacement_path: 'services/chatAIService.loader.js',
    lifecycle: LIFECYCLE.DEPRECATED,
    enforcement_default: ENFORCEMENT.WARN,
    enforcement_on: ENFORCEMENT.WARN,
    removal_allowed: false,
    description: 'Import directo de chatAIService.js em vez do loader.'
  },
  {
    id: 'impetus_chat_operational_context',
    debt_ref: 'D5',
    module_path: 'services/impetusChatOperationalContextService.js',
    replacement_id: 'sz5_unified_context_injector',
    replacement_path: 'runtime-z-sovereign/.../zUnifiedConversationalContextInjector',
    lifecycle: LIFECYCLE.DEPRECATED,
    enforcement_default: ENFORCEMENT.WARN,
    enforcement_on: ENFORCEMENT.WARN,
    removal_allowed: false,
    consumers: ['claudePanelService', 'smartPanelCommandService', 'softwareOperationalSnapshotService'],
    description: 'Contexto chat voice/panel — unificar com SZ5 (T2.12).'
  },
  {
    id: 'cognitive_block_registry_direct_delivery',
    debt_ref: 'D3',
    module_path: 'cognitiveRuntime/registry/cognitiveBlockRegistry.js',
    replacement_id: 'unified_cognitive_registry',
    replacement_path: 'cognitiveRegistry/consolidation/unifiedCognitiveRegistry.js',
    lifecycle: LIFECYCLE.FROZEN,
    enforcement_default: ENFORCEMENT.NONE,
    enforcement_on: ENFORCEMENT.WARN,
    removal_allowed: false,
    metadata_only: true,
    description: 'Registry definitional — delivery via Engine V2; SSOT PROMPT 26.'
  },
  {
    id: 'motor_a_runtime',
    debt_ref: 'D8',
    module_path: 'motor-a/*',
    replacement_id: 'engine_v2',
    replacement_path: 'dashboardEngineV2',
    lifecycle: LIFECYCLE.ACTIVE,
    enforcement_default: ENFORCEMENT.NONE,
    enforcement_on: ENFORCEMENT.NONE,
    removal_allowed: false,
    strategic_sunset: '12-18 months',
    description: 'Coexistência Motor A + Engine V2 — depreciação estratégica apenas.'
  }
]);

const _byId = new Map(LEGACY_ENTRIES.map((e) => [e.id, e]));

function getEntry(legacyId) {
  return _byId.get(String(legacyId || '').trim()) || null;
}

function listEntries(filter = {}) {
  let items = LEGACY_ENTRIES.map((e) => ({ ...e }));
  if (filter.lifecycle) {
    items = items.filter((e) => e.lifecycle === filter.lifecycle);
  }
  if (filter.deprecated_only) {
    items = items.filter((e) => e.lifecycle === LIFECYCLE.DEPRECATED);
  }
  return items;
}

function getEnforcementForEntry(entry, mode) {
  if (!entry) return ENFORCEMENT.NONE;
  if (mode === 'on') return entry.enforcement_on || entry.enforcement_default;
  if (mode === 'audit' || mode === 'shadow') return entry.enforcement_default;
  return ENFORCEMENT.NONE;
}

module.exports = {
  LIFECYCLE,
  ENFORCEMENT,
  LEGACY_ENTRIES,
  getEntry,
  listEntries,
  getEnforcementForEntry
};
