const messagingAdapter = require('./messagingAdapter');
    `, [auditId, result?.notificationId]);

    return { ok: true, auditId, messageId: result?.id };
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
