'use strict';

/**
 * Egress guard — reduz exfiltração na saída do modelo (segredos, PII óbvia, UUID fora do allowlist).
 * Defesa em profundidade; complementa o ingress (AIPromptGuardService).
 */

const { v4: uuidv4 } = require('uuid');
const aiAnalyticsService = require('./aiAnalyticsService');
const aiIncidentService = require('./aiIncidentService');

const UUID_RE_GLOBAL =
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi;

const CPF_RE = /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g;

const EMAIL_RE = /\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b/gi;

const PHONE_BR_RE = /\b(\+55\s?)?\(?\d{2}\)?\s?\d{4,5}-?\d{4}\b/g;

const SECRET_PATTERNS = [
  { re: /\bsk-[a-zA-Z0-9]{16,}\b/, code: 'OPENAI_SK' },
  { re: /\bBearer\s+[a-zA-Z0-9._\-]{24,}\b/i, code: 'BEARER_TOKEN' },
  { re: /\bAKIA[0-9A-Z]{16}\b/, code: 'AWS_KEY_ID' },
  { re: /\bghp_[a-zA-Z0-9]{20,}\b/, code: 'GITHUB_PAT' },
  { re: /\bOPENAI_API_KEY\s*[=:]\s*\S+/i, code: 'ENV_OPENAI' },
  { re: /\bANTHROPIC_API_KEY\s*[=:]\s*\S+/i, code: 'ENV_ANTHROPIC' },
  { re: /\bGOOGLE_API_KEY\s*[=:]\s*\S+/i, code: 'ENV_GOOGLE' },
  { re: /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/, code: 'PEM_PRIVATE' }
];

const SAFE_REPLY_PT =
  'Não foi possível concluir esta resposta por uma política de segurança IMPETUS. O administrador foi notificado. Reformule o pedido sem solicitar segredos, chaves ou dados fora do seu contexto.';

/**
 * Extrai UUIDs presentes no contexto (dossiê) + sessão.
 * @param {object} user
 * @param {object} data
 * @returns {Set<string>}
 */
function buildTenantAllowlist(user, data) {
  const set = new Set();
  if (user?.company_id) set.add(String(user.company_id).toLowerCase());
  if (user?.id) set.add(String(user.id).toLowerCase());
  try {
    const blob = JSON.stringify(data ?? {}).slice(0, 200000);
    const found = blob.match(UUID_RE_GLOBAL) || [];
    found.forEach((x) => set.add(x.toLowerCase()));
  } catch (_) {
    /* ignore */
  }
  return set;
}

/**
 * @param {object} opts
 * @param {string} opts.text — texto principal (ex.: answer)
 * @param {Set<string>} opts.allowlist
 * @param {object} opts.user
 * @param {string} [opts.moduleName]
 * @param {string} [opts.channel]
 * @returns {Promise<{ ok: boolean, text: string, blocked: boolean, redacted: boolean, reasons: string[] }>}
 */
async function scanModelOutput({ text, allowlist, user, moduleName, channel }) {
  const reasons = [];
  let t = String(text || '');
  let redacted = false;

  for (const { re, code } of SECRET_PATTERNS) {
    const once = new RegExp(re.source, re.flags.replace(/g/g, ''));
    if (once.test(t)) {
      reasons.push(`secret_pattern:${code}`);
      await recordEgressSecurityEvent({
        user,
        companyId: user?.company_id,
        moduleName: moduleName || 'egress_guard',
        snippet: t.slice(0, 2000),
        reasons,
        channel: channel || 'egress'
      });
      return {
        ok: false,
        blocked: true,
        text: SAFE_REPLY_PT,
        redacted: true,
        reasons
      };
    }
  }

  const allow = allowlist instanceof Set ? allowlist : new Set(allowlist || []);
  t = t.replace(UUID_RE_GLOBAL, (match) => {
    const low = match.toLowerCase();
    if (allow.has(low)) return match;
    redacted = true;
    reasons.push('uuid_out_of_scope');
    return '[IDENTIFICADOR CONFIDENCIAL]';
  });

  if (CPF_RE.test(t)) {
    t = t.replace(CPF_RE, '[DADO CONFIDENCIAL]');
    redacted = true;
    reasons.push('cpf_redacted');
  }

  const emailProbe = new RegExp(EMAIL_RE.source, EMAIL_RE.flags.replace(/g/g, '') + 'g');
  if (emailProbe.test(t)) {
    t = t.replace(new RegExp(EMAIL_RE.source, 'gi'), '[E-MAIL REDACTED]');
    redacted = true;
    reasons.push('email_redacted');
  }

  if (PHONE_BR_RE.test(t)) {
    t = t.replace(PHONE_BR_RE, '[TELEFONE REDACTED]');
    redacted = true;
    reasons.push('phone_redacted');
  }

  return {
    ok: true,
    blocked: false,
    text: t,
    redacted,
    reasons: [...new Set(reasons)]
  };
}

async function recordEgressSecurityEvent({ user, companyId, moduleName, snippet, reasons, channel }) {
  if (process.env.RED_TEAM_SKIP_DB === '1') {
    return null;
  }
  if (!companyId || !user?.id) return null;
  const traceId = uuidv4();
  const comment = `[${channel || 'egress'}] ${(reasons || []).join('; ')}`;

  await aiAnalyticsService.insertAiTrace({
    trace_id: traceId,
    user_id: user.id,
    company_id: companyId,
    module_name: String(moduleName || 'ai_egress_guard').slice(0, 128),
    input_payload: { guard: 'egress', reasons, snippet: String(snippet || '').slice(0, 2000) },
    output_response: { blocked: true, policy: 'egress_filter' },
    model_info: { governance_tags: ['SECURITY_ALERT'], guard_layer: 'egress' },
    system_fingerprint: null,
    human_validation_status: null,
    validation_modality: null,
    validation_evidence: null,
    validated_at: null,
    governance_tags: ['SECURITY_ALERT']
  });

  try {
    await aiIncidentService.createIncident({
      traceId,
      userId: user.id,
      companyId,
      incidentType: 'TENTATIVA_DE_INVASAO',
      userComment: `Exfiltração bloqueada na saída. ${comment}`.slice(0, 50000),
      severity: 'CRITICAL'
    });
  } catch (e) {
    console.error('[AI_EGRESS_GUARD_INCIDENT]', e.message);
  }
  return traceId;
}

module.exports = {
  buildTenantAllowlist,
  scanModelOutput,
  recordEgressSecurityEvent,
  SAFE_REPLY_PT
};
