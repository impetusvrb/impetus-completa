'use strict';

const crypto = require('crypto');

function fromAuthUser(user, req = {}, extra = {}) {
  if (!user?.company_id || !user?.id) return null;
  const requestId = extra.requestId || extra.request_id || crypto.randomUUID();
  return {
    companyId: user.company_id,
    userId: user.id,
    departmentId: user.department_id || extra.departmentId || null,
    requestId,
    traceId: extra.traceId || extra.trace_id || req.headers?.['x-trace-id'] || requestId,
    sessionId: extra.sessionId || extra.session_id || req.body?.sessionId || req.body?.session_id || null,
    conversationId:
      extra.conversationId ||
      extra.conversation_id ||
      req.body?.conversationId ||
      req.body?.conversation_id ||
      null,
    ip: req.ip || req.headers?.['x-forwarded-for']?.split(',')[0]?.trim() || null,
    userAgent: req.headers?.['user-agent'] || null
  };
}

function usageMeta(provider, model, extra = {}) {
  return {
    provider: provider || 'openai',
    model: model || null,
    operation: extra.operation || 'completion',
    inputTokens: extra.inputTokens ?? extra.input_tokens,
    outputTokens: extra.outputTokens ?? extra.output_tokens,
    ...extra
  };
}

module.exports = { fromAuthUser, usageMeta };
