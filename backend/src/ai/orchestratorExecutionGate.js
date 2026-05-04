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

function isEnforceGeminiIngress() {
  return String(process.env.IMPETUS_ENFORCE_GEMINI_INGRESS || '').trim().toLowerCase() === 'true';
}

function isEnforceGeminiIngressGlobal() {
  return String(process.env.IMPETUS_ENFORCE_GEMINI_INGRESS_GLOBAL || '').trim().toLowerCase() === 'true';
}

function getEnforceGeminiPrefixes() {
  const raw = process.env.IMPETUS_ENFORCE_GEMINI_INGRESS_PREFIXES;
  if (raw != null && String(raw).trim() !== '') {
    return String(raw)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return ['/api/cognitive-council'];
}

function geminiIngressAppliesToCurrentPath() {
  try {
    const rac = require('../services/requestAsyncContext');
    const gi = rac.getGeminiIngress && rac.getGeminiIngress();
    const path = gi && gi.path ? String(gi.path) : '';
    if (!path) return isEnforceGeminiIngressGlobal();
    if (isEnforceGeminiIngressGlobal()) return true;
    return getEnforceGeminiPrefixes().some((pre) => path.startsWith(pre));
  } catch (_e) {
    return isEnforceGeminiIngressGlobal();
  }
}

/**
 * IMPETUS_ENFORCE_GEMINI_INGRESS — exige req.geminiContext válido (via middleware ou runGeminiIngressForContext).
 */
function assertGeminiIngressIfRequired(opts = {}) {
  if (opts && opts.gemini_ingress_exempt === true) return;
  if (!isEnforceGeminiIngress()) return;
  if (!geminiIngressAppliesToCurrentPath()) return;
  const geminiIngressEngine = require('../services/geminiIngressEngine');
  let gi = null;
  try {
    const rac = require('../services/requestAsyncContext');
    gi = rac.getGeminiIngress && rac.getGeminiIngress();
  } catch (_e) {
    gi = null;
  }
  if (geminiIngressEngine.hasValidGeminiIngress(gi)) return;
  recordArchitectureViolation(
    'gemini_ingress',
    'GEMINI_INGRESS_REQUIRED',
    'Ingress Gemini obrigatório em falta ou inválido para esta rota.',
    {}
  );
  const e = new Error(
    'ARCHITECTURE_VIOLATION: GEMINI_INGRESS_REQUIRED — definir IMPETUS_GEMINI_INGRESS_ENABLED=true e garantir contexto de ingress (HTTP middleware ou runGeminiIngressForContext).'
  );
  e.code = 'ARCHITECTURE_VIOLATION';
  throw e;
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

/** @type {number[]} */
const _exemptInvocationTimestamps = [];

function countViolationsSince(msAgo) {
  const ms = Math.max(1000, Number(msAgo) || 120000);
  const cutoff = Date.now() - ms;
  let n = 0;
  for (const v of _violations) {
    const t = Date.parse(v.at);
    if (Number.isFinite(t) && t >= cutoff) n += 1;
  }
  return n;
}

function countFailuresSince(msAgo) {
  const ms = Math.max(1000, Number(msAgo) || 120000);
  const cutoff = Date.now() - ms;
  let n = 0;
  for (const f of _failures) {
    const t = Date.parse(f.at);
    if (Number.isFinite(t) && t >= cutoff) n += 1;
  }
  return n;
}

function recordExemptInvocationFrequency() {
  const now = Date.now();
  const win = Math.max(30000, parseInt(process.env.IMPETUS_EXEMPT_BURST_WINDOW_MS || '', 10) || 120000);
  const limN = Math.max(3, parseInt(process.env.IMPETUS_EXEMPT_LIMITED_THRESHOLD || '', 10) || 10);
  const degN = Math.max(limN + 1, parseInt(process.env.IMPETUS_EXEMPT_DEGRADED_THRESHOLD || '', 10) || 28);
  _exemptInvocationTimestamps.push(now);
  while (_exemptInvocationTimestamps.length && now - _exemptInvocationTimestamps[0] > win) {
    _exemptInvocationTimestamps.shift();
  }
  const c = _exemptInvocationTimestamps.length;
  try {
    const srs = require('../services/systemRuntimeState');
    if (c >= degN) {
      srs.setDegraded('EXEMPT_FREQUENCY_HIGH', `${c} em ${win}ms`, { force: true });
      _exemptInvocationTimestamps.length = 0;
    } else if (c >= limN) {
      srs.setLimited('EXEMPT_FREQUENCY', `${c} em ${win}ms`, { force: true });
    }
  } catch (_e) {
    /* ignore */
  }
}

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
      const n = _strictFailureTimestamps.length;
      try {
        const srs = require('../services/systemRuntimeState');
        if (n >= 3) {
          _strictFailureTimestamps.length = 0;
          srs.setDegraded('STRICT_FAILURE_BURST', `${c}: ${String(message || '').slice(0, 240)}`, {
            force: true
          });
        } else if (n === 2) {
          srs.setLimited('STRICT_INTERMITTENT', `${c}: ${String(message || '').slice(0, 240)}`, {
            force: true
          });
        }
      } catch (_e) {
        /* ignore */
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
    recordExemptInvocationFrequency();
    if (!isEnforceGate()) return;
    return;
  }
  assertGeminiIngressIfRequired(opts);
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
    recordExemptInvocationFrequency();
    if (!isEnforceGate()) return;
    return;
  }
  assertGeminiIngressIfRequired(opts);
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
  isEnforceGeminiIngress,
  assertGeminiIngressIfRequired,
  beginCouncilAiSession,
  endCouncilAiSession,
  getActiveSession,
  assertAnthropicInvocation,
  assertOpenAiInvocation,
  recordArchitectureViolation,
  recordCouncilFailure,
  getViolationsSnapshot,
  getFailuresSnapshot,
  countViolationsSince,
  countFailuresSince
};
