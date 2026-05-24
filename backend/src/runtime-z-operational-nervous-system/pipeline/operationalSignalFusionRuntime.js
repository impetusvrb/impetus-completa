'use strict';

const store = require('../_core/sz4TenantStore');
const nlp = require('../_core/sz4EntityExtractor');

function fuseSignals(messages = []) {
  let fused = {};
  for (const m of messages) {
    fused = nlp.fuseThreadEntities({ entities: fused }, nlp.extractEntities(m.content || m.text_content || ''));
  }
  return { fused, density: Object.keys(fused).length };
}

function fuseThreadMessages(tenantId, threadId) {
  const ctx = store.getThreadContext(tenantId, threadId);
  return fuseSignals(ctx?.messages || []);
}

module.exports = { fuseSignals, fuseThreadMessages };
