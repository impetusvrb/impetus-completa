'use strict';

/**
 * Bridge aditivo — consumidores voice/panel/text importam apenas isto.
 */

const facade = require('../facade/unifiedSz5RuntimeFacade');
const flags = require('../config/runtimeUnificationFlags');
const channels = require('../governance/channelRegistry');

/**
 * Resolve bloco de contexto chat para voz/painel (substitui chamada directa ao legado quando activo).
 */
async function resolveChatContextForChannel(user, queryText, channel, opts = {}) {
  if (!flags.isUnificationActive()) {
    return _legacyOnly(user, queryText, channel);
  }

  const result = await facade.buildChannelContext({
    channel,
    user,
    message: queryText,
    queryText,
    conversationId: opts.conversationId || null,
    legacyPayload: opts.legacyPayload || {},
    callerHint: opts.callerHint || `${channel}_bridge`
  });

  return {
    block: result.block || '',
    tables: result.tables || [],
    source: result.source,
    explainability: result.explainability,
    meta: result.meta,
    legacy_snapshot: result.legacy_snapshot || null
  };
}

async function _legacyOnly(user, queryText, channel) {
  const legacy = require('../../services/impetusChatOperationalContextService');
  if (!legacy.userHasChatAccess(user)) {
    return { block: '', tables: [], source: 'legacy', explainability: {} };
  }
  try {
    const chatCtx = await legacy.buildChatOperationalContext(user, queryText);
    const block =
      channel === channels.CHANNELS.PANEL || channel === channels.CHANNELS.VOICE
        ? legacy.formatForVoiceAppend(chatCtx)
        : '';
    const tables =
      channel === channels.CHANNELS.PANEL ? legacy.buildPanelChatTables(chatCtx) : [];
    return {
      block: block ? `\n\n${block}` : '',
      tables,
      source: 'legacy',
      explainability: {}
    };
  } catch (_e) {
    return { block: '', tables: [], source: 'legacy_error', explainability: {} };
  }
}

module.exports = {
  resolveChatContextForChannel,
  CHANNELS: channels.CHANNELS
};
