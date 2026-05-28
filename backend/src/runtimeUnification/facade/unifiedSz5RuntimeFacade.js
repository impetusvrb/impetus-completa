'use strict';

/**
 * PROMPT 28 — Facade unificado SZ5 para voice, panel, text, memory, orchestration.
 * Shadow-first · fallback legado · tenant isolation · explainability.
 */

const flags = require('../config/runtimeUnificationFlags');
const channels = require('../governance/channelRegistry');
const shadowCmp = require('../shadow/runtimeShadowComparator');
const explainer = require('../explainability/unifiedRuntimeExplainer');
const audit = require('../observability/runtimeUnificationAuditService');

function _log(event, data) {
  try {
    console.info(
      '[RUNTIME_UNIFICATION]',
      JSON.stringify({
        event,
        ts: new Date().toISOString(),
        mode: flags.unificationMode(),
        ...data
      })
    );
  } catch (_e) {}
}

function _channelAdapter(channel) {
  const entry = channels.getChannel(channel);
  return entry?.sz5_adapter || String(channel || 'text');
}

async function _buildSz5Block(user, message, opts = {}) {
  const sz5Facade = require('../../runtime-z-sovereign/sz5/facade/zSz5UnifiedMemoryFacade');
  const ctx = await sz5Facade.injectBeforeLlm(user, message, {
    conversationId: opts.conversationId || null,
    legacyPayload: {
      ...(opts.legacyPayload || {}),
      runtime_unification_channel: _channelAdapter(opts.channel)
    }
  });
  return {
    block: ctx.block || '',
    meta: ctx.meta || {},
    governance: {}
  };
}

async function _buildLegacyChatBlock(user, queryText, channel) {
  const legacy = require('../../services/impetusChatOperationalContextService');
  if (!legacy.userHasChatAccess(user)) {
    return { block: '', tables: [], legacyCtx: null };
  }
  const chatCtx = await legacy.buildChatOperationalContext(user, queryText);
  let block = '';
  let tables = [];
  if (channel === channels.CHANNELS.VOICE || channel === channels.CHANNELS.PANEL) {
    block = legacy.formatForVoiceAppend(chatCtx) || '';
  }
  if (channel === channels.CHANNELS.PANEL) {
    tables = legacy.buildPanelChatTables(chatCtx) || [];
  }
  return { block, tables, legacyCtx: chatCtx };
}

async function _buildMemorySnapshot(user) {
  const sz5Facade = require('../../runtime-z-sovereign/sz5/facade/zSz5UnifiedMemoryFacade');
  const health = sz5Facade.health();
  const block = [
    '--- RUNTIME UNIFICADO · MEMÓRIA OPERACIONAL SZ5 ---',
    `indexing: ${health.flags?.indexing}; query: ${health.flags?.query}; cross_thread: ${health.flags?.cross_thread}`,
    '--- FIM MEMÓRIA SZ5 ---'
  ].join('\n');
  return { block: `\n\n${block}`, meta: { memory_health: health } };
}

function _buildOrchestrationSnapshot() {
  let enabled = false;
  try {
    const uo = require('../../services/unifiedOrchestrator');
    enabled =
      typeof uo.isUnifiedOrchestratorEnabled === 'function'
        ? uo.isUnifiedOrchestratorEnabled()
        : String(process.env.IMPETUS_UNIFIED_ORCHESTRATOR_ENABLED || '').toLowerCase() === 'true';
  } catch (_e) {
    enabled = false;
  }
  const block = [
    '--- RUNTIME UNIFICADO · ORQUESTRAÇÃO (observe-only) ---',
    `unified_orchestrator_enabled: ${enabled}`,
    'Execução real permanece em unifiedOrchestrator/runLlm — sem bypass.',
    '--- FIM ORQUESTRAÇÃO ---'
  ].join('\n');
  return { block: `\n\n${block}`, meta: { orchestration_enabled: enabled } };
}

function _mergeBlocks(sz5Block, legacyBlock, channel) {
  const parts = [];
  if (sz5Block) {
    parts.push(`--- RUNTIME UNIFICADO SZ5 · canal: ${_channelAdapter(channel)} ---`, sz5Block);
  }
  if (legacyBlock) parts.push(legacyBlock);
  if (!parts.length) return '';
  return parts.join('\n\n');
}

function _pickSource(mode, shadowCompare, sz5Block, legacyBlock) {
  if (mode === 'on') {
    if (sz5Block && legacyBlock) return 'merged';
    if (sz5Block) return 'sz5_unified';
    return 'legacy_fallback';
  }
  if (shadowCompare?.divergent) return 'shadow_legacy';
  return 'legacy';
}

/**
 * @param {object} params
 * @param {string} params.channel voice|panel|text|memory|orchestration
 * @param {object} params.user
 * @param {string} [params.message]
 * @param {string} [params.queryText]
 * @param {string} [params.conversationId]
 * @param {object} [params.legacyPayload]
 * @param {string} [params.callerHint]
 */
async function buildChannelContext(params = {}) {
  const channel = String(params.channel || channels.CHANNELS.TEXT).toLowerCase();
  const user = params.user || {};
  const message = String(params.message || params.queryText || '').trim();
  const companyId = user.company_id || user.companyId || null;
  const callerHint = params.callerHint || null;

  if (!channels.isValidChannel(channel)) {
    return {
      ok: false,
      error: 'invalid_channel',
      block: '',
      tables: [],
      source: 'none',
      explainability: {}
    };
  }

  if (!flags.shouldApplyForTenant(companyId)) {
    if (channel === channels.CHANNELS.MEMORY) {
      return { ok: true, block: '', tables: [], source: 'inactive', explainability: { mode: 'off' } };
    }
    if (channel === channels.CHANNELS.ORCHESTRATION) {
      return { ok: true, block: '', tables: [], source: 'inactive', explainability: { mode: 'off' } };
    }
    try {
      const leg = await _buildLegacyChatBlock(user, message, channel);
      return {
        ok: true,
        block: leg.block ? `\n\n${leg.block}` : '',
        tables: leg.tables,
        source: 'legacy',
        legacy_snapshot: leg.legacyCtx || null,
        explainability: { mode: flags.unificationMode(), pilot: false }
      };
    } catch (_e) {
      return {
        ok: true,
        block: '',
        tables: [],
        source: 'legacy_error',
        legacy_snapshot: null,
        explainability: {}
      };
    }
  }

  const mode = flags.unificationMode();
  let sz5Block = '';
  let sz5Meta = {};
  let legacyBlock = '';
  let tables = [];
  let legacySnapshot = null;
  let shadowCompare = null;

  try {
    if (channel === channels.CHANNELS.MEMORY) {
      const mem = await _buildMemorySnapshot(user);
      sz5Block = mem.block;
      sz5Meta = mem.meta || {};
    } else if (channel === channels.CHANNELS.ORCHESTRATION) {
      const orch = _buildOrchestrationSnapshot();
      sz5Block = orch.block;
      sz5Meta = orch.meta || {};
    } else {
      const sz5 = await _buildSz5Block(user, message, {
        channel,
        conversationId: params.conversationId,
        legacyPayload: params.legacyPayload
      });
      sz5Block = sz5.block || '';
      sz5Meta = sz5.meta || {};
    }
  } catch (err) {
    _log('sz5_build_failed', { channel, error: err?.message });
  }

  if (channel !== channels.CHANNELS.MEMORY && channel !== channels.CHANNELS.ORCHESTRATION) {
    try {
      const leg = await _buildLegacyChatBlock(user, message, channel);
      legacyBlock = leg.block || '';
      tables = leg.tables || [];
      legacySnapshot = leg.legacyCtx || null;
    } catch (err) {
      _log('legacy_build_failed', { channel, error: err?.message });
    }
  }

  shadowCompare = shadowCmp.compareBlocks(sz5Block, legacyBlock);

  const isObserveChannel =
    channel === channels.CHANNELS.MEMORY || channel === channels.CHANNELS.ORCHESTRATION;

  let outputBlock = legacyBlock;
  let source = 'legacy';

  if (isObserveChannel) {
    outputBlock = sz5Block;
    source = 'sz5_observe';
    if (flags.isShadowMode() || flags.isAuditMode()) {
      _log('shadow_compare', { channel, ...shadowCompare, caller_hint: callerHint, observe_only: true });
    }
  } else if (flags.isShadowMode() || flags.isAuditMode()) {
    outputBlock = legacyBlock;
    source = shadowCompare.divergent ? 'shadow_legacy' : 'legacy';
    _log('shadow_compare', { channel, ...shadowCompare, caller_hint: callerHint });
  } else if (flags.shouldServeUnifiedBlock()) {
    const merged = _mergeBlocks(sz5Block, legacyBlock, channel);
    outputBlock = merged || legacyBlock || sz5Block;
    source = _pickSource('on', shadowCompare, sz5Block, legacyBlock);
  }

  const explainability = explainer.buildExplainability({
    channel,
    mode,
    source,
    sz5Meta,
    shadowCompare,
    pilot: flags.isPilotTenant(companyId),
    governance: { tenant_scoped: true }
  });

  const formattedBlock = outputBlock ? (outputBlock.startsWith('\n') ? outputBlock : `\n\n${outputBlock}`) : '';

  if (flags.shouldPersistAudit()) {
    audit
      .recordAudit({
        companyId,
        channel,
        source,
        sz5FactCount: sz5Meta.fact_count || 0,
        legacyBlockChars: (legacyBlock || '').length,
        unifiedBlockChars: formattedBlock.length,
        shadowDivergence: shadowCompare?.divergent === true,
        callerHint,
        actorUserId: user.id || null,
        explainability,
        payload: { shadow: shadowCompare }
      })
      .catch(() => {});
  }

  _log('context_built', {
    channel,
    source,
    sz5_facts: sz5Meta.fact_count || 0,
    divergent: shadowCompare?.divergent,
    caller_hint: callerHint
  });

  return {
    ok: true,
    channel,
    block: formattedBlock,
    tables,
    source,
    meta: sz5Meta,
    explainability,
    legacy_snapshot: legacySnapshot
  };
}

function getHealth() {
  let sz5Health = null;
  try {
    const sz5Facade = require('../../runtime-z-sovereign/sz5/facade/zSz5UnifiedMemoryFacade');
    sz5Health = sz5Facade.health();
  } catch (_e) {
    sz5Health = { ok: false };
  }

  return {
    mode: flags.unificationMode(),
    active: flags.isUnificationActive(),
    pilot_tenants: flags.pilotTenants(),
    channels: channels.listChannels(),
    sz5: sz5Health,
    invariants: {
      additive_only: true,
      shadow_first: true,
      legacy_fallback: true,
      motor_a_intact: true,
      engine_v2_intact: true
    }
  };
}

module.exports = {
  buildChannelContext,
  getHealth
};
