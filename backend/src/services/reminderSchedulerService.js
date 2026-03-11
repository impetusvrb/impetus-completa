/**
 * IMPETUS - Agendador de Lembretes
 * Verifica tasks com scheduled_at no horário e envia notificações aos responsáveis.
 * Integra com app_notifications e Socket.IO via unifiedMessagingService.
 */
const db = require('../db');
const unifiedMessaging = require('./unifiedMessagingService');

const REMINDER_ENABLED = process.env.REMINDER_SCHEDULER_ENABLED !== 'false';
const INTERVAL_MS = 60 * 1000; // 1 minuto
const GRACE_MINUTES = 2; // Enviar lembrete se agendado há até 2 min atrás

let intervalId = null;

/**
 * Resolve nome do responsável (assignee) para user_id na empresa
 */
async function resolveAssigneeToUserId(companyId, assigneeName) {
  if (!companyId || !assigneeName || typeof assigneeName !== 'string') return null;
  const name = assigneeName.trim();
  if (name.length < 2) return null;

  const r = await db.query(`
    SELECT id FROM users
    WHERE company_id = $1 AND active = true AND deleted_at IS NULL
      AND (name ILIKE $2 OR name ILIKE $3 OR split_part(name, ' ', 1) ILIKE $2)
    ORDER BY CASE WHEN name ILIKE $2 THEN 0 WHEN split_part(name, ' ', 1) ILIKE $2 THEN 1 ELSE 2 END
    LIMIT 1
  `, [companyId, name, `${name}%`]);

  return r.rows?.[0]?.id || null;
}

/**
 * Processa uma task e envia lembrete se possível
 */
async function processTaskReminder(task) {
  const { id, company_id, title, description, assignee, scheduled_at } = task;

  let recipientId = null;
  if (assignee) {
    recipientId = await resolveAssigneeToUserId(company_id, assignee);
  }

  if (!recipientId) {
    console.info('[REMINDER] Task sem responsável identificável:', id);
    await db.query(
      "UPDATE tasks SET reminder_sent_at = now() WHERE id = $1",
      [id]
    );
    return { sent: false, reason: 'no_assignee' };
  }

  const msg = `🔔 Lembrete: ${title || description || 'Tarefa agendada'}${scheduled_at ? ` (${new Date(scheduled_at).toLocaleString('pt-BR', { weekday: 'short', hour: '2-digit', minute: '2-digit' })})` : ''}. ${description && description !== title ? description.slice(0, 150) : ''}`;

  const result = await unifiedMessaging.sendToUser(
    company_id,
    recipientId,
    msg,
    { type: 'task_reminder' }
  );

  if (result.ok) {
    await db.query(
      'UPDATE tasks SET reminder_sent_at = now() WHERE id = $1',
      [id]
    );
    return { sent: true };
  }
  return { sent: false, error: result.error };
}

/**
 * Busca tasks pendentes de lembrete e processa
 */
async function runReminderCheck() {
  if (!REMINDER_ENABLED) return;

  const cutoff = new Date(Date.now() - GRACE_MINUTES * 60 * 1000);

  let rows = [];
  try {
    const r = await db.query(`
      SELECT id, company_id, title, description, assignee, scheduled_at
      FROM tasks
      WHERE company_id IS NOT NULL
        AND status != 'done'
        AND scheduled_at IS NOT NULL
        AND scheduled_at <= now()
        AND reminder_sent_at IS NULL
        AND scheduled_at >= $1
      ORDER BY scheduled_at ASC
      LIMIT 20
    `, [cutoff.toISOString()]);
    rows = r.rows || [];
  } catch (err) {
    if (err.message?.includes('reminder_sent_at') || err.message?.includes('scheduled_at')) {
      return;
    }
    console.warn('[REMINDER] Query error:', err.message);
    return;
  }

  for (const task of rows) {
    try {
      const r = await processTaskReminder(task);
      if (r.sent) {
        console.info('[REMINDER] Enviado para task:', task.id);
      }
    } catch (e) {
      console.warn('[REMINDER] process error:', e.message);
    }
  }
}

/**
 * Inicia o scheduler de lembretes
 */
function start() {
  if (!REMINDER_ENABLED || intervalId) return;
  runReminderCheck();
  intervalId = setInterval(runReminderCheck, INTERVAL_MS);
  console.info('[REMINDER] Scheduler iniciado (intervalo:', INTERVAL_MS / 1000, 's)');
}

/**
 * Para o scheduler
 */
function stop() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.info('[REMINDER] Scheduler parado');
  }
}

module.exports = {
  start,
  stop,
  runReminderCheck,
  resolveAssigneeToUserId
};
