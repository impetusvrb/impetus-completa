'use strict';

module.exports = {
  fuseConversationTurn: (tenantId, threadId, content) =>
    require('./operationalSignalFusionRuntime').fuseThreadMessages(tenantId, threadId)
};
