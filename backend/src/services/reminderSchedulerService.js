/**
 * IMPETUS - Agendador de Lembretes
 * Verifica tasks com scheduled_at no horário e envia notificações aos responsáveis.
 */
const db = require('../db');
const unifiedMessaging = require('./unifiedMessagingService');

const REMINDER_ENABLED = process.env.REMINDER_SCHEDULER_ENABLED !== 'false';
const INTERVAL_MS = 60 * 1000;
const WINDOW_MINUTES = 15;

let intervalId = null;

async function resolveAssigneeToUserId(companyId, assigneeName) {
  if (!companyId || !assigneeName || typeof assigneeName !== 'string') return null;
  const name = assigneeName.trim();
  if (name.length < 2) return null;
  const r = await db.query(`
    SELECT id FROM users
    WHERE company_id = $1 AND active = true AND deleted_at IS NULL
      AND (name ILIKE $2 OR name ILIKE $3 OR split_part(name, ' ', 1) ILIKE $2)
    ORDER BY CASE WHEN name ILIKE $2 THEN 0 ELSE 1 END
    LIMIT 1
  `, [companyId, name, `${name}%`]);
  return r.rows?.[0]?.id || null;
}

async function processTaskReminder(task) {
  const { id, company_id, title, description, assignee, scheduled_at } = task;
  let recipientId = null;
  if (assignee) recipientId = await resolveAssigneeToUserId(company_id, assignee);
  if (!recipientId) {
    await db.query("UPDATE tasks SET reminder_sent_at = now() WHERE id = $1", [id]);
    return { sent: false };
  }
  const msg = `🔔 Lembrete: ${title || description || 'Tarefa agendada'}${scheduled_at ? ` (${new Date(scheduled_at).toLocaleString('pt-BR', { weekday: 'short', hour: '2-digit', minute: '2-digit' })})` : ''}.`;
  const result = await unifiedMessaging.sendToUser(company_id, recipientId, msg, { type: 'task_reminder' });
  if (result.ok) {
    await db.query('UPDATE tasks SET reminder_sent_at = now() WHERE id = $1', [id]);
    return { sent: true };
  }
  return { sent: false };
}

async function runReminderCheck() {
  if (!REMINDER_ENABLED) return;
  const cutoff = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000);
  let rows = [];
  try {
    const r = await db.query(`
      SELECT id, company_id, title, description, assignee, scheduled_at
      FROM tasks
      WHERE company_id IS NOT NULL AND status != 'done'
        AND scheduled_at IS NOT NULL AND scheduled_at <= now()
        AND reminder_sent_at IS NULL AND scheduled_at >= $1
      ORDER BY scheduled_at DESC
      LIMIT 20
    `, [cutoff.toISOString()]);
    rows = r.rows || [];
  } catch (err) {
    if (err.message?.includes('reminder_sent_at') || err.message?.includes('scheduled_at')) return;
    console.warn('[REMINDER]', err.message);
    return;
  }
  for (const task of rows) {
    try { await processTaskReminder(task); } catch (e) { console.warn('[REMINDER]', e?.message); }
  }
}

function start() {
  if (!REMINDER_ENABLED || intervalId) return;
  runReminderCheck();
  intervalId = setInterval(runReminderCheck, INTERVAL_MS);
  console.info('[REMINDER] Scheduler iniciado');
}

function stop() {
  if (intervalId) { clearInterval(intervalId); intervalId = null; }
}

module.exports = { start, stop, runReminderCheck };
