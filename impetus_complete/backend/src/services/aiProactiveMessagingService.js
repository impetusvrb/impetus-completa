/**
 * AI PROACTIVE MESSAGING SERVICE
 * Envio de mensagens proativas pela IA com rastreabilidade, LGPD e auditoria.
 * Garante consentimento, rate limit, horário comercial e registro em ai_outbound_audit.
 */
const db = require('../db');
const zapi = require('./zapi');

const AI_PROACTIVE_CONSENT_REQUIRED = process.env.AI_PROACTIVE_CONSENT_REQUIRED !== 'false';
const AI_PROACTIVE_BUSINESS_HOURS_ONLY = process.env.AI_PROACTIVE_BUSINESS_HOURS_ONLY !== 'false';
const AI_PROACTIVE_MAX_PER_USER_PER_DAY = parseInt(process.env.AI_PROACTIVE_MAX_PER_USER_PER_DAY || '5', 10);

// Horário comercial padrão (Brasil): 8h-18h
const BUSINESS_HOUR_START = 8;
const BUSINESS_HOUR_END = 18;

function isWithinBusinessHours() {
  if (!AI_PROACTIVE_BUSINESS_HOURS_ONLY) return true;
  const now = new Date();
  const hour = now.getHours();
  const day = now.getDay();
  if (day === 0 || day === 6) return false; // fim de semana
  return hour >= BUSINESS_HOUR_START && hour < BUSINESS_HOUR_END;
}

/**
 * Verifica se o usuário concedeu consentimento para mensagens proativas
 */
async function hasProactiveConsent(userId, companyId) {
  if (!AI_PROACTIVE_CONSENT_REQUIRED) return true;
  const r = await db.query(`
    SELECT granted, revoked_at FROM ai_proactive_consent
    WHERE user_id = $1 AND company_id = $2
  `, [userId, companyId]);
  const row = r.rows[0];
  if (!row) return false;
  return row.granted && !row.revoked_at;
}

/**
 * Verifica rate limit: quantas mensagens proativas o usuário recebeu hoje
 */
async function getProactiveCountToday(recipientPhone, companyId) {
  const r = await db.query(`
    SELECT COUNT(*) AS cnt FROM ai_outbound_audit
    WHERE recipient_phone = $1 AND company_id = $2
      AND created_at >= current_date
      AND success = true
  `, [recipientPhone, companyId]);
  return parseInt(r.rows[0]?.cnt || 0, 10);
}

/**
 * Decide se pode enviar mensagem proativa
 */
async function shouldSendProactive(companyId, recipientPhone, recipientUserId, triggerType) {
  if (!isWithinBusinessHours()) {
    return { ok: false, reason: 'outside_business_hours' };
  }

  const countToday = await getProactiveCountToday(recipientPhone, companyId);
  if (countToday >= AI_PROACTIVE_MAX_PER_USER_PER_DAY) {
    return { ok: false, reason: 'rate_limit_exceeded', count: countToday };
  }

  if (recipientUserId && AI_PROACTIVE_CONSENT_REQUIRED) {
    const hasConsent = await hasProactiveConsent(recipientUserId, companyId);
    if (!hasConsent) {
      return { ok: false, reason: 'no_consent' };
    }
  }

  return { ok: true };
}

/**
 * Envia mensagem proativa com auditoria completa
 * @param {Object} params - { companyId, recipientPhone, recipientUserId?, message, triggerType }
 */
async function sendProactiveMessage(params) {
  const { companyId, recipientPhone, recipientUserId, message, triggerType = 'generic' } = params;

  const check = await shouldSendProactive(companyId, recipientPhone, recipientUserId, triggerType);
  if (!check.ok) {
    return { ok: false, reason: check.reason, auditId: null };
  }

  const preview = (message || '').slice(0, 200);

  // 1. Registrar na auditoria ANTES de enviar
  const ins = await db.query(`
    INSERT INTO ai_outbound_audit (
      company_id, recipient_user_id, recipient_phone, trigger_type,
      message_preview, lgpd_consent_verified
    ) VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id
  `, [
    companyId,
    recipientUserId || null,
    recipientPhone,
    triggerType,
    preview,
    AI_PROACTIVE_CONSENT_REQUIRED ? !!recipientUserId : true
  ]);
  const auditId = ins.rows[0]?.id;

  try {
    // 2. Enviar via Z-API
    const result = await zapi.sendTextMessage(companyId, recipientPhone, message);

    // 3. Registrar em communications para rastreabilidade bidirecional
    await zapi.logOutboundCommunication(companyId, recipientPhone, message, {});

    // 4. Atualizar auditoria com sucesso
    await db.query(`
      UPDATE ai_outbound_audit
      SET success = true, sent_at = now(), zapi_message_id = $2
      WHERE id = $1
    `, [auditId, result?.messageId]);

    return { ok: true, auditId, messageId: result?.messageId };
  } catch (err) {
    // 5. Atualizar auditoria com falha
    await db.query(`
      UPDATE ai_outbound_audit
      SET success = false, error_message = $2
      WHERE id = $1
    `, [auditId, err.message]);
    throw err;
  }
}

/**
 * Concede ou revoga consentimento para mensagens proativas
 */
async function setProactiveConsent(userId, companyId, granted) {
  await db.query(`
    INSERT INTO ai_proactive_consent (user_id, company_id, granted, granted_at, revoked_at)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (user_id, company_id) DO UPDATE SET
      granted = EXCLUDED.granted,
      granted_at = CASE WHEN $3 THEN now() ELSE ai_proactive_consent.granted_at END,
      revoked_at = CASE WHEN NOT $3 THEN now() ELSE NULL END
  `, [userId, companyId, granted, granted ? new Date() : null, !granted ? new Date() : null]);
}

module.exports = {
  sendProactiveMessage,
  shouldSendProactive,
  setProactiveConsent,
  hasProactiveConsent,
  isWithinBusinessHours
};
