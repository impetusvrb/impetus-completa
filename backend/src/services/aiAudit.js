/**
 * AUDITORIA IA - IMUTÁVEL
 * Toda interação com IA é registrada.
 * Inclui tentativas negadas (blocked=true).
 */
const db = require('../db');

const PREVIEW_MAX_LENGTH = 500;

async function logAIInteraction(params) {
  const {
    userId,
    companyId,
    action,
    question,
    response,
    blocked = false,
    blockReason,
    ipAddress,
    userAgent
  } = params;

  try {
    const responsePreview = response ? String(response).slice(0, PREVIEW_MAX_LENGTH) : null;
    const responseLength = response ? String(response).length : null;

    await db.query(`
      INSERT INTO ai_audit_logs (
        user_id, company_id, action, question, response_preview, response_length,
        blocked, block_reason, ip_address, user_agent
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::inet, $10)
    `, [
      userId,
      companyId,
      action,
      question ? String(question).slice(0, 10000) : null,
      responsePreview,
      responseLength,
      !!blocked,
      blockReason || null,
      ipAddress || null,
      userAgent || null
    ]);
  } catch (err) {
    if (err.message?.includes('ai_audit_logs')) {
      console.warn('[AI_AUDIT] Tabela ai_audit_logs pode não existir:', err.message);
    } else {
      console.error('[AI_AUDIT_ERROR]', err);
    }
  }
}

module.exports = { logAIInteraction };
