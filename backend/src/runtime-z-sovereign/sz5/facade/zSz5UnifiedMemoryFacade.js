'use strict';

const flags = require('../config/sz5FeatureFlags');
const indexer = require('../indexing/zConversationOperationalIndexerRuntime');
const queryRt = require('../query/zOperationalConversationalQueryRuntime');
const memory = require('../memory/zUnifiedOperationalMemoryRuntime');
const followup = require('../followup/zOperationalFollowupRuntime');
const observability = require('../observability/zConversationalObservabilityRuntime');
const injector = require('../../../middleware/zUnifiedConversationalContextInjector');

function health() {
  return {
    ok: true,
    phase: 'SZ5',
    runtime: 'unified-operational-conversational-memory',
    flags: {
      enabled: flags.isEnabled(),
      indexing: flags.isIndexingEnabled(),
      query: flags.isQueryRuntimeEnabled(),
      fact_retrieval: flags.isFactRetrievalEnabled(),
      cross_thread: flags.isCrossThreadEnabled()
    },
    invariants: flags.invariants
  };
}

async function indexMessage(user, message, conversationId, participants = []) {
  return injector.indexMessageForSz5(user, message, conversationId, participants);
}

async function query(user, queryText, opts = {}) {
  const started = Date.now();
  const out = await queryRt.queryOperationalConversation(user, queryText, opts);
  observability.recordQuery(out.retrieval_hit, Date.now() - started);
  if (flags.isCrossThreadEnabled() && out.facts?.length) {
    await memory.linkCrossThreadFacts(user?.company_id, out.facts);
  }
  return out;
}

async function injectBeforeLlm(user, message, opts = {}) {
  const started = Date.now();
  const ctx = await injector.buildUnifiedConversationalContext(user, message, opts);
  observability.recordInjection(ctx.meta?.retrieval_hit, Date.now() - started);
  return ctx;
}

async function processFollowupFromIndex(tenantId, indexRecord) {
  return followup.inferOperationalObjects(tenantId, indexRecord);
}

module.exports = {
  health,
  indexMessage,
  query,
  injectBeforeLlm,
  processFollowupFromIndex
};
