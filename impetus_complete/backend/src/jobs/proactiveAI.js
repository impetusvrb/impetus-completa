/**
 * IA PROATIVA - Trabalho agendado
 * Detecta padrões, alerta grupo, lembra pendências
 */
const db = require('../db');
const organizationalAI = require('../services/organizationalAI');
const zapi = require('../services/zapi');

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
          SELECT whatsapp_number FROM users
          WHERE company_id = $1 AND active = true AND (whatsapp_number IS NOT NULL OR phone IS NOT NULL)
          AND hierarchy_level <= 4
          LIMIT 15
        `, [row.id]);

        const phones = recipients.rows
          .map(u => (u.whatsapp_number || u.phone || '').replace(/\D/g, ''))
          .filter(p => p.length >= 10);

        for (const phone of [...new Set(phones)].slice(0, 5)) {
          try {
            await zapi.sendTextMessage(row.id, phone, message);
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
          await zapi.sendTextMessage(row.company_id, row.sender_phone, `[IMPETUS] Lembrete: ${nextQ}`);
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
