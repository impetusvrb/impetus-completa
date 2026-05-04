'use strict';

/**
 * Gate de execução — impede OpenAI/Anthropic "solto" quando IMPETUS_ENFORCE_AI_ORCHESTRATOR_GATE=true
 * e o pipeline estrito está ativo. O conselho cognitivo obtém tokens de sessão (runCouncilExecution).
 */

const crypto = require('crypto');

const VIOLATION_CAP = 80;
const FAILURE_CAP = 40;

/** @type {{ at: string, code: string, message: string, provider: string }[]} */
const _violations = [];
/** @type {{ at: string, code: string, message: string }[]} */
const _failures = [];

let _session = null;

function isStrictPipeline() {
  return String(process.env.IMPETUS_STRICT_AI_PIPELINE || '').trim() === 'true';
}

function isEnforceGate() {
  if (!isStrictPipeline()) return false;
  const v = String(process.env.IMPETUS_ENFORCE_AI_ORCHESTRATOR_GATE || '').trim().toLowerCase();
  if (v === 'false' || v === '0' || v === 'no') return false;
  return true;
}

function _pushRing(arr, cap, entry) {
  arr.push(entry);
  if (arr.length > cap) arr.splice(0, arr.length - cap);
}

function recordArchitectureViolation(provider, code, message, extra = {}) {
  const entry = {
    at: new Date().toISOString(),
    provider,
    code,
    message: String(message || '').slice(0, 500),
    classification: 'ARCHITECTURE_VIOLATION',
    ...extra
  };
  _pushRing(_violations, VIOLATION_CAP, entry);
  console.error('[ARCHITECTURE_VIOLATION]', JSON.stringify(entry));
}

/** @type {number[]} */
const _strictFailureTimestamps = [];

function recordCouncilFailure(code, message) {
  const c = String(code || '');
  _pushRing(_failures, FAILURE_CAP, {
    at: new Date().toISOString(),
    code: c,
    message: String(message || '').slice(0, 500)
  });
  if (c.startsWith('STRICT_')) {
    recordArchitectureViolation('strict_pipeline', c, String(message || '').slice(0, 500), {
      type: 'STRICT_PIPELINE_FAILURE'
    });
    if (isStrictPipeline()) {
      const now = Date.now();
      _strictFailureTimestamps.push(now);
      while (_strictFailureTimestamps.length && now - _strictFailureTimestamps[0] > 60000) {
        _strictFailureTimestamps.shift();
      }
      if (_strictFailureTimestamps.length >= 3) {
        _strictFailureTimestamps.length = 0;
        try {
          require('../services/systemRuntimeState').setDegraded(
            'STRICT_FAILURE_BURST',
            `${c}: ${String(message || '').slice(0, 240)}`
          );
        } catch (_e) {
          /* ignore */
        }
      }
    }
  }
}

function getViolationsSnapshot() {
  return _violations.slice(-20);
}

function getFailuresSnapshot() {
  return _failures.slice(-15);
}

/**
 * @param {string} traceId
 * @returns {{ traceId: string, claudeToken: string, openaiToken: string }}
 */
function beginCouncilAiSession(traceId) {
  if (_session) {
    recordArchitectureViolation('orchestrator', 'GATE_SESSION_LEAK', 'Sessão de gate anterior não foi fechada.');
  }
  _session = {
    traceId: String(traceId || ''),
    claudeToken: crypto.randomBytes(16).toString('hex'),
    openaiToken: crypto.randomBytes(16).toString('hex')
  };
  return _session;
}

function endCouncilAiSession() {
  _session = null;
}

function getActiveSession() {
  return _session;
}

function assertAnthropicInvocation(opts = {}) {
  if (opts && opts.orchestrator_exempt === true) {
    recordArchitectureViolation(
      'policy',
      'ORCHESTRATOR_EXEMPT_USED',
      `Chamada Anthropic com orchestrator_exempt (${String(opts.orchestrator_exempt_component || 'unspecified')}).`,
      { type: 'ORCHESTRATOR_EXEMPT', provider_target: 'anthropic' }
    );
    if (!isEnforceGate()) return;
    return;
  }
  if (!isEnforceGate()) return;
  if (!_session || !opts._councilClaudeToken || opts._councilClaudeToken !== _session.claudeToken) {
    recordArchitectureViolation(
      'anthropic',
      'CLAUDE_OUTSIDE_ORCHESTRATOR',
      'Chamada a Claude sem token de sessão do conselho cognitivo.',
      { has_session: !!_session }
    );
    const e = new Error(
      'ARCHITECTURE_VIOLATION: Claude só pode ser invocado dentro do pipeline do orquestrador (token em falta).'
    );
    e.code = 'ARCHITECTURE_VIOLATION';
    throw e;
  }
}

function assertOpenAiInvocation(opts = {}) {
  if (opts && opts.orchestrator_exempt === true) {
    recordArchitectureViolation(
      'policy',
      'ORCHESTRATOR_EXEMPT_USED',
      `Chamada OpenAI com orchestrator_exempt (${String(opts.orchestrator_exempt_component || 'unspecified')}).`,
      { type: 'ORCHESTRATOR_EXEMPT', provider_target: 'openai' }
    );
    if (!isEnforceGate()) return;
    return;
  }
  if (!isEnforceGate()) return;
  if (!_session || !opts._councilOpenAiToken || opts._councilOpenAiToken !== _session.openaiToken) {
    recordArchitectureViolation(
      'openai',
      'CHATGPT_OUTSIDE_ORCHESTRATOR',
      'Chamada a OpenAI/ChatGPT sem token de sessão do conselho cognitivo.',
      { has_session: !!_session }
    );
    const e = new Error(
      'ARCHITECTURE_VIOLATION: ChatGPT/OpenAI só pode ser invocado dentro do pipeline do orquestrador (token em falta).'
    );
    e.code = 'ARCHITECTURE_VIOLATION';
    throw e;
  }
}

module.exports = {
  isStrictPipeline,
  isEnforceGate,
  beginCouncilAiSession,
  endCouncilAiSession,
  getActiveSession,
  assertAnthropicInvocation,
  assertOpenAiInvocation,
  recordArchitectureViolation,
  recordCouncilFailure,
  getViolationsSnapshot,
  getFailuresSnapshot
};
