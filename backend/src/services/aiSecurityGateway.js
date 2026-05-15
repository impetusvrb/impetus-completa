'use strict';

/**
 * IMPETUS — AI Security Gateway (Unified Cognitive Enforcement Layer)
 * Camada única aditiva: ingress, contexto, política, execução LLM, egress, safety, auditoria.
 * Rollout: IMPETUS_AI_GATEWAY_ENABLED=true
 */

const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const promptFirewall = require('../middleware/promptFirewall');
const secureContextBuilder = require('./secureContextBuilder');
const aiEgressGuardService = require('./aiEgressGuardService');
const cognitiveSafetyRuntimeService = require('./cognitiveSafetyRuntimeService');
const contextIntegrityService = require('./contextIntegrityService');

const GATEWAY_VERSION = '1.0.0';

let _secureContextBypassAttempts = 0;
let _secureContextBypassBlocked = 0;

/**
 * skipSecureContext só em não-produção, RED_TEAM_SKIP_DB=1 ou IMPETUS_TEST_MODE=true.
 * Em produção (sem excepções) o bypass é sempre negado.
 */
function canBypassSecureContext(metadata) {
  const meta = metadata && typeof metadata === 'object' ? metadata : {};
  if (meta.skipSecureContext !== true) {
    return { allowed: false, reason: 'not_requested' };
  }
  const nodeEnv = String(process.env.NODE_ENV || 'development').trim();
  const redTeam = String(process.env.RED_TEAM_SKIP_DB || '').trim() === '1';
  const testMode = String(process.env.IMPETUS_TEST_MODE || '')
    .trim()
    .toLowerCase() === 'true';
  const isProd = nodeEnv === 'production';
  if (isProd && !redTeam && !testMode) {
    return { allowed: false, reason: 'production_forbidden' };
  }
  if (!isProd || redTeam || testMode) {
    return {
      allowed: true,
      reason: !isProd ? 'non_production' : redTeam ? 'red_team' : 'test_mode'
    };
  }
  return { allowed: false, reason: 'denied' };
}

function applySecureContextBypassPolicy(metadata, traceId, channel) {
  const meta = metadata && typeof metadata === 'object' ? { ...metadata } : {};
  if (!meta.skipSecureContext) return meta;
  const decision = canBypassSecureContext(meta);
  if (decision.allowed) {
    _secureContextBypassAttempts += 1;
    try {
      console.info(
        '[SECURE_CONTEXT_BYPASS_ALLOWED]',
        JSON.stringify({
          trace_id: traceId,
          channel,
          reason: decision.reason
        })
      );
    } catch (_e) {}
    return meta;
  }
  _secureContextBypassBlocked += 1;
  try {
    console.warn(
      '[SECURE_CONTEXT_BYPASS_BLOCKED]',
      JSON.stringify({
        trace_id: traceId,
        channel,
        reason: decision.reason
      })
    );
  } catch (_e2) {}
  const out = { ...meta, skipSecureContext: false };
  return out;
}

function getSecureContextBypassMetrics() {
  return {
    bypass_attempts: _secureContextBypassAttempts,
    blocked_bypass_attempts: _secureContextBypassBlocked
  };
}

function publishBackboneEvent(partial) {
  try {
    const eb = require('./cognitiveEventBackboneService');
    eb.publishCognitiveEventDeferred(partial);
  } catch (_e) {}
}

function isGatewayEnabled() {
  return String(process.env.IMPETUS_AI_GATEWAY_ENABLED || '')
    .trim()
    .toLowerCase() === 'true';
}

function isRealtimeGatewayEnabled() {
  return String(process.env.IMPETUS_AI_GATEWAY_REALTIME_ENABLED || '')
    .trim()
    .toLowerCase() === 'true';
}

function bindIdentity({ user, companyId, channel }) {
  const u = user && typeof user === 'object' ? user : {};
  const cid =
    companyId != null && String(companyId).trim() !== ''
      ? String(companyId).trim()
      : u.company_id != null
        ? String(u.company_id).trim()
        : null;
  return {
    user_id: u.id != null ? String(u.id) : null,
    company_id: cid,
    channel: channel != null ? String(channel).slice(0, 128) : 'unknown',
    role: u.role != null ? String(u.role) : '',
    capabilities: Array.isArray(u.contextual_capabilities) ? [...u.contextual_capabilities] : []
  };
}

function flattenUserContent(content) {
  if (content == null) return '';
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    const parts = [];
    for (const part of content) {
      if (!part) continue;
      if (typeof part === 'string') parts.push(part);
      else if (part.type === 'text' && part.text) parts.push(String(part.text));
    }
    return parts.join('\n');
  }
  return String(content);
}

function extractLastUserText(messages) {
  if (!Array.isArray(messages)) return '';
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m && m.role === 'user') {
      return flattenUserContent(m.content).trim();
    }
  }
  return '';
}

function parseForbiddenModulesEnv() {
  const raw = String(process.env.IMPETUS_AI_GATEWAY_FORBIDDEN_MODULES || '').trim();
  if (!raw) return [];
  return raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

function applyGatewayPolicies({ identity, contextBundle, metadata }) {
  const reasons = [];
  const meta = metadata && typeof metadata === 'object' ? metadata : {};
  if (identity.company_id && meta.asserted_company_id) {
    if (String(identity.company_id) !== String(meta.asserted_company_id)) {
      reasons.push('tenant_mismatch');
    }
  }
  const forbidden = parseForbiddenModulesEnv();
  const mod = meta.module != null ? String(meta.module).toLowerCase() : '';
  if (mod && forbidden.includes(mod)) {
    reasons.push('forbidden_module');
  }
  const scope = contextBundle?.scope || {};
  if (meta.requires_financial === true && !scope.financial) {
    reasons.push('capability_financial');
  }
  if (meta.requires_hr === true && !scope.hr) {
    reasons.push('capability_hr');
  }
  if (meta.requires_strategic === true && !scope.strategic) {
    reasons.push('capability_strategic');
  }
  return { ok: reasons.length === 0, reasons };
}

function normalizeGatewayResponse({ ok, text, traceId, channel, model, blocked, blockReasons }) {
  return {
    ok: ok !== false,
    text: text != null ? String(text) : '',
    trace_id: traceId,
    channel: channel || null,
    model: model || null,
    gateway_version: GATEWAY_VERSION,
    blocked: !!blocked,
    block_reasons: Array.isArray(blockReasons) ? blockReasons : []
  };
}

/**
 * Execução unificada LLM com enforcement completo.
 * @param {object} params
 * @param {string} params.channel
 * @param {object|null} params.user
 * @param {string|null} params.companyId
 * @param {string} [params.model]
 * @param {Array} params.messages
 * @param {object} [params.metadata]
 * @param {string} [params.traceId]
 * @param {object} params.llmOpts — repassado ao executor (max_tokens, billing, response_format, timeout, model)
 * @param {function(Array, object): Promise<string>} params.executeFn
 * @returns {Promise<string>}
 */
async function invokeUnifiedLlm(params) {
  const traceId = params.traceId || uuidv4();
  const channel = params.channel || 'unknown';
  const user = params.user || null;
  const companyId =
    params.companyId != null && String(params.companyId).trim() !== ''
      ? String(params.companyId).trim()
      : user?.company_id != null
        ? String(user.company_id).trim()
        : null;
  const messages = Array.isArray(params.messages) ? params.messages : [];
  const metadataRaw = params.metadata && typeof params.metadata === 'object' ? params.metadata : {};
  const metadata = applySecureContextBypassPolicy(metadataRaw, traceId, channel);
  const llmOpts = params.llmOpts && typeof params.llmOpts === 'object' ? params.llmOpts : {};
  const executeFn = typeof params.executeFn === 'function' ? params.executeFn : null;
  if (!executeFn) {
    try {
      console.error('[AI_GATEWAY_ERROR]', JSON.stringify({ trace_id: traceId, error: 'missing_executeFn' }));
    } catch (_e) {}
    return 'FALLBACK: gateway sem executor.';
  }

  const identity = bindIdentity({ user, companyId, channel });
  const model = llmOpts.model || params.model || process.env.OPENAI_MODEL || 'gpt-4o-mini';

  try {
    if (!metadata.skipIngress) {
      const probe = extractLastUserText(messages);
      if (probe.length > 0) {
        const pf = await promptFirewall.analyzePrompt(probe.slice(0, 120000), user || {});
        if (!pf.allowed) {
          try {
            console.warn(
              '[AI_GATEWAY_BLOCK]',
              JSON.stringify({
                trace_id: traceId,
                channel,
                reason: pf.reason || 'prompt_firewall',
                company_id: identity.company_id
              })
            );
          } catch (_e) {}
          publishBackboneEvent({
            event_type: 'ingress_block',
            trace_id: traceId,
            company_id: identity.company_id,
            channel,
            runtime: 'ai_security_gateway',
            context_hash: null,
            payload: { layer: 'ingress', reason: pf.reason || 'prompt_firewall' },
            metadata: { model }
          });
          return pf.message || pf.reason || 'Pedido bloqueado pela política IMPETUS.';
        }
      }
    }

    let contextBundle = { context: '', permissions: [], scope: {} };
    if (!metadata.skipSecureContext) {
      try {
        if (user && companyId) {
          const q = extractLastUserText(messages).slice(0, 8000);
          contextBundle = await secureContextBuilder.buildContext(user, {
            companyId,
            queryText: q,
            forDiagnostic: true,
            user,
            channel,
            data_state: metadata.data_state || metadata.metrics?.data_state || 'unknown'
          });
        }
      } catch (e) {
        try {
          console.warn(
            '[AI_GATEWAY_ERROR]',
            JSON.stringify({ trace_id: traceId, step: 'context', message: e?.message })
          );
        } catch (_e2) {}
      }
    }

    if (contextIntegrityService.isContextIntegrityEnabled() && !metadata.skipSecureContext && user && companyId) {
      const env = contextBundle?.integrity?.envelope;
      if (!env) {
        contextIntegrityService.noteIntegrityFailure('missing_envelope');
        contextIntegrityService.recordIntegrityFlowTrace(traceId, {
          context_hash: null,
          integrity_status: 'missing_envelope',
          tenant_scope: String(companyId)
        });
        try {
          console.warn(
            '[CONTEXT_INTEGRITY_FAIL]',
            JSON.stringify({ trace_id: traceId, reason: 'missing_envelope', channel })
          );
        } catch (_e) {}
        publishBackboneEvent({
          event_type: 'context_integrity_fail',
          trace_id: traceId,
          company_id: identity.company_id,
          channel,
          runtime: 'ai_security_gateway',
          context_hash: null,
          payload: { reason: 'missing_envelope' },
          metadata: { model, block_mode: contextIntegrityService.isBlockMode() }
        });
        if (contextIntegrityService.isBlockMode()) {
          try {
            console.warn('[CONTEXT_BLOCKED]', JSON.stringify({ trace_id: traceId, reason: 'missing_envelope' }));
          } catch (_e2) {}
          return 'Pedido bloqueado: integridade contextual indisponível ou envelope em falta.';
        }
      } else {
        const integ = contextIntegrityService.validateContextIntegrity({
          contextBundle,
          envelope: env,
          identity,
          metadata
        });
        contextIntegrityService.recordIntegrityFlowTrace(traceId, {
          context_hash: integ.context_hash || null,
          integrity_status: integ.ok ? 'verified' : 'failed',
          tenant_scope: integ.tenant_scope || String(companyId)
        });
        if (!integ.ok) {
          try {
            console.warn(
              '[CONTEXT_BLOCKED]',
              JSON.stringify({
                trace_id: traceId,
                channel,
                reasons: integ.reasons,
                company_id: identity.company_id
              })
            );
          } catch (_e3) {}
          publishBackboneEvent({
            event_type: 'context_integrity_fail',
            trace_id: traceId,
            company_id: identity.company_id,
            channel,
            runtime: 'ai_security_gateway',
            context_hash: integ.context_hash || null,
            payload: { reasons: integ.reasons },
            metadata: { model, block_mode: contextIntegrityService.isBlockMode() }
          });
          if (contextIntegrityService.isBlockMode()) {
            return 'Pedido bloqueado: falha na verificação de integridade do contexto (tenant ou hash).';
          }
        }
      }
    } else if (contextIntegrityService.isContextIntegrityEnabled()) {
      contextIntegrityService.recordIntegrityFlowTrace(traceId, {
        context_hash: null,
        integrity_status: metadata.skipSecureContext ? 'skipped_no_context_build' : 'skipped_no_identity',
        tenant_scope: identity.company_id || null
      });
    }

    const contextHash = (
      contextBundle?.integrity?.context_hash ||
      crypto.createHash('sha256').update(String(contextBundle.context || '').slice(0, 50000), 'utf8').digest('hex')
    ).slice(0, 32);

    const tenantVerified = !!(user && companyId && String(user.company_id || '') === String(companyId));
    const policy = applyGatewayPolicies({
      identity,
      contextBundle: {
        ...contextBundle,
        tenant_verified: tenantVerified,
        capability_scope: contextBundle.scope,
        context_hash: contextHash
      },
      metadata
    });
    if (!policy.ok) {
      try {
        console.warn(
          '[AI_GATEWAY_BLOCK]',
          JSON.stringify({
            trace_id: traceId,
            channel,
            reasons: policy.reasons,
            company_id: identity.company_id
          })
        );
      } catch (_e) {}
      publishBackboneEvent({
        event_type: 'ingress_block',
        trace_id: traceId,
        company_id: identity.company_id,
        channel,
        runtime: 'ai_security_gateway',
        context_hash,
        payload: { layer: 'gateway_policy', reasons: policy.reasons },
        metadata: { model }
      });
      return 'Pedido bloqueado pela política de gateway (âmbito ou módulo).';
    }

    let rawText = '';
    try {
      rawText = await executeFn(messages, llmOpts);
    } catch (e) {
      try {
        console.error(
          '[AI_GATEWAY_ERROR]',
          JSON.stringify({ trace_id: traceId, channel, step: 'llm', message: e?.message || String(e) })
        );
      } catch (_e2) {}
      throw e;
    }

    const allowlist = aiEgressGuardService.buildTenantAllowlist(user || {}, { messages });
    const egress = await aiEgressGuardService.scanModelOutput({
      text: rawText,
      allowlist,
      user: user || {},
      moduleName: metadata.module || 'ai_security_gateway',
      channel
    });

    let outText = egress.text;
    if (egress.blocked) {
      try {
        console.warn(
          '[AI_GATEWAY_BLOCK]',
          JSON.stringify({
            trace_id: traceId,
            channel,
            layer: 'egress',
            reasons: egress.reasons,
            company_id: identity.company_id
          })
        );
      } catch (_e) {}
      publishBackboneEvent({
        event_type: 'safety_block',
        trace_id: traceId,
        company_id: identity.company_id,
        channel,
        runtime: 'ai_security_gateway',
        context_hash,
        payload: { layer: 'egress', reasons: egress.reasons },
        metadata: { model }
      });
    }

    const safety = await cognitiveSafetyRuntimeService.applySafetyToChatText(outText, user || {});
    outText = safety.text;
    if (safety.safety_blocked) {
      try {
        console.warn(
          '[AI_GATEWAY_BLOCK]',
          JSON.stringify({
            trace_id: traceId,
            channel,
            layer: 'cognitive_safety',
            company_id: identity.company_id
          })
        );
      } catch (_e) {}
      publishBackboneEvent({
        event_type: 'safety_block',
        trace_id: traceId,
        company_id: identity.company_id,
        channel,
        runtime: 'ai_security_gateway',
        context_hash,
        payload: { layer: 'cognitive_safety', reason: safety.reason || null },
        metadata: { model }
      });
    }

    try {
      console.info(
        '[AI_GATEWAY]',
        JSON.stringify({
          trace_id: traceId,
          channel,
          model,
          gateway_version: GATEWAY_VERSION,
          company_id: identity.company_id,
          user_id: identity.user_id,
          egress_redacted: !!egress.redacted,
          safety_blocked: !!safety.safety_blocked,
          context_hash: contextHash
        })
      );
    } catch (_e) {}

    normalizeGatewayResponse({
      ok: true,
      text: outText,
      traceId,
      channel,
      model,
      blocked: egress.blocked || safety.safety_blocked,
      blockReasons: [...(egress.reasons || []), ...(safety.safety_blocked ? ['cognitive_safety'] : [])]
    });

    return outText;
  } catch (err) {
    try {
      console.error(
        '[AI_GATEWAY_ERROR]',
        JSON.stringify({
          trace_id: traceId,
          channel,
          message: err?.message || String(err)
        })
      );
    } catch (_e) {}
    return `FALLBACK: IA indisponível. Erro: ${String(err?.message || err).slice(0, 120)}`;
  }
}

/**
 * Egress incremental para realtime (texto acumulado). Não altera streaming por defeito.
 * @param {object} opts
 * @param {string} opts.accumulatedText
 * @param {object|null} opts.user
 * @param {string} [opts.channel]
 */
async function realtimeEgressScan({ accumulatedText, user, channel }) {
  if (!isRealtimeGatewayEnabled()) {
    return { ok: true, blocked: false, text: accumulatedText, reasons: [] };
  }
  const t = String(accumulatedText || '');
  if (!t.trim()) return { ok: true, blocked: false, text: t, reasons: [] };
  const allowlist = aiEgressGuardService.buildTenantAllowlist(user || {}, {});
  const egress = await aiEgressGuardService.scanModelOutput({
    text: t,
    allowlist,
    user: user || {},
    moduleName: 'realtime_proxy',
    channel: channel || 'realtime'
  });
  try {
    console.info(
      '[AI_GATEWAY_REALTIME]',
      JSON.stringify({
        blocked: egress.blocked,
        redacted: egress.redacted,
        reasons: egress.reasons,
        company_id: user?.company_id || null
      })
    );
  } catch (_e) {}
  if (egress.blocked) {
    try {
      console.warn('[AI_GATEWAY_BLOCK]', JSON.stringify({ layer: 'realtime_egress', reasons: egress.reasons }));
    } catch (_e2) {}
  }
  return egress;
}

module.exports = {
  GATEWAY_VERSION,
  isGatewayEnabled,
  isRealtimeGatewayEnabled,
  bindIdentity,
  extractLastUserText,
  applyGatewayPolicies,
  normalizeGatewayResponse,
  invokeUnifiedLlm,
  realtimeEgressScan,
  canBypassSecureContext,
  applySecureContextBypassPolicy,
  getSecureContextBypassMetrics
};
