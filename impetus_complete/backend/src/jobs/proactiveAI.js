/**
 * IA PROATIVA - Trabalho agendado
 * Detecta padrões, alerta grupo, lembra pendências.
 * Utiliza aiProactiveMessagingService para auditoria, LGPD e rastreabilidade.
 */
const db = require('../db');
const organizationalAI = require('../services/organizationalAI');
const aiProactive = require('../services/aiProactiveMessagingService');

/**
 * Executa verificação de padrão de falhas e envia alerta proativo
 */
async function runFailurePatternCheck() {
  try {
    const companies = await db.query('SELECT id FROM companies WHERE active = true');
    for (const row of companies.rows || []) {
      const patterns = await organizationalAI.detectFailurePattern(row.id, 24, 3);
      for (const p of patterns) {
        const message = organizationalAI.buildProactiveMessage(p);
        const ins = await db.query(`
          INSERT INTO ai_proactive_alerts (company_id, alert_type, message_text, status)
          VALUES ($1, 'failure_pattern', $2, 'pending')
          RETURNING id
        `, [row.id, message]);
        const alertId = ins.rows[0]?.id;

        const recipients = await db.query(`
          SELECT id, whatsapp_number, phone FROM users
          WHERE company_id = $1 AND active = true AND (whatsapp_number IS NOT NULL OR phone IS NOT NULL)
          AND hierarchy_level <= 4
          LIMIT 15
        `, [row.id]);

        const seen = new Set();
        let sent = 0;
        for (const u of recipients.rows || []) {
          const phone = (u.whatsapp_number || u.phone || '').replace(/\D/g, '');
          if (phone.length < 10 || seen.has(phone)) continue;
          seen.add(phone);
          if (sent >= 5) break;
          try {
            const result = await aiProactive.sendProactiveMessage({
              companyId: row.id,
              recipientPhone: phone,
              recipientUserId: u.id,
              message,
              triggerType: 'failure_pattern'
            });
            if (result?.ok) sent++;
          } catch (e) {
            console.warn('[PROACTIVE_AI] send:', e.message);
          }
        }

        if (alertId) {
          await db.query(
            'UPDATE ai_proactive_alerts SET status = $1, sent_at = now() WHERE id = $2',
            ['sent', alertId]
          );
        }
      }
    }
    return { ok: true };
  } catch (e) {
    console.error('[PROACTIVE_AI] runFailurePatternCheck:', e);
    return { ok: false, error: e.message };
  }
}

/**
 * Lembra eventos incompletos (cobrança após 1h)
 */
async function remindIncompleteEvents() {
  try {
    const r = await db.query(`
      SELECT aie.id, aie.company_id, aie.sender_phone, aie.pending_questions, aie.answered_questions
      FROM ai_incomplete_events aie
      WHERE aie.status = 'pending'
        AND aie.last_reminder_at < now() - INTERVAL '1 hour'
        AND aie.created_at < now() - INTERVAL '30 minutes'
      LIMIT 20
    `);

    for (const row of r.rows || []) {
      const pending = row.pending_questions || [];
      const answered = row.answered_questions || {};
      const nextIdx = Object.keys(answered).length;
      const nextQ = pending[nextIdx];

      if (nextQ) {
        try {
          const phone = (row.sender_phone || '').replace(/\D/g, '');
          if (phone.length >= 10) {
            const recipientUser = await db.query(
              `SELECT id FROM users WHERE company_id = $1
               AND (regexp_replace(COALESCE(whatsapp_number, phone), '\D', '', 'g') = $2)
               LIMIT 1`,
              [row.company_id, phone]
            );
            await aiProactive.sendProactiveMessage({
              companyId: row.company_id,
              recipientPhone: phone,
              recipientUserId: recipientUser.rows[0]?.id,
              message: `[IMPETUS] Lembrete: ${nextQ}`,
              triggerType: 'incomplete_event'
            });
          }
          await db.query(
            'UPDATE ai_incomplete_events SET last_reminder_at = now(), reminder_count = reminder_count + 1 WHERE id = $1',
            [row.id]
          );
        } catch (e) {
          console.warn('[PROACTIVE_AI] remind:', e.message);
        }
      }
    }
    return { ok: true };
  } catch (e) {
    console.error('[PROACTIVE_AI] remindIncomplete:', e);
    return { ok: false };
  }
}

module.exports = {
  runFailurePatternCheck,
  remindIncompleteEvents
};
