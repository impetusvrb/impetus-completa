'use strict';

/**
 * FASE 3 — TASK & REMINDER ORCHESTRATION
 *
 * Orquestra criação, scheduling, escalation e lifecycle de tarefas e lembretes
 * gerados a partir de linguagem natural.
 *
 * Feature flag: COGNITIVE_TASK_ORCHESTRATOR_ENABLED (default true)
 *
 * Governance:
 *   - bounded escalation (máx 3 níveis)
 *   - anti-spam (rate limit por user)
 *   - confirmação obrigatória para ações destrutivas
 *   - audit trail completo
 */

const db = require('../../db');

const ENABLED = process.env.COGNITIVE_TASK_ORCHESTRATOR_ENABLED !== 'false';
const MAX_TASKS_PER_USER_PER_HOUR = parseInt(process.env.COGNITIVE_MAX_TASKS_PER_HOUR || '20', 10);
const MAX_ESCALATION_DEPTH = 3;

const _taskCountCache = new Map();
const CACHE_TTL = 3600000;

function _checkRateLimit(userId) {
  if (!userId) return true;
  const key = `${userId}`;
  const entry = _taskCountCache.get(key);
  const now = Date.now();
  if (!entry || now - entry.ts > CACHE_TTL) {
    _taskCountCache.set(key, { ts: now, count: 1 });
    return true;
  }
  if (entry.count >= MAX_TASKS_PER_USER_PER_HOUR) return false;
  entry.count++;
  return true;
}

async function _resolveAssigneeId(companyId, assigneeName) {
  if (!companyId || !assigneeName) return null;
  try {
    const r = await db.query(`
      SELECT id FROM users
      WHERE company_id = $1 AND active = true AND deleted_at IS NULL
        AND (name ILIKE $2 OR split_part(name, ' ', 1) ILIKE $2)
      ORDER BY CASE WHEN name ILIKE $2 THEN 0 ELSE 1 END
      LIMIT 1
    `, [companyId, `${assigneeName.trim()}%`]);
    return r.rows?.[0]?.id || null;
  } catch (_) {
    return null;
  }
}

/**
 * Cria tarefa a partir de conversa com NLP entities pré-extraídas.
 */
async function createTaskFromConversation(params = {}) {
  if (!ENABLED) return { ok: false, reason: 'disabled' };

  const {
    companyId, userId, content, title, assignee, scheduledAt,
    sourceType, sourceId, priority = 'normal'
  } = params;

  if (!companyId) return { ok: false, reason: 'no_company' };
  if (!_checkRateLimit(userId)) return { ok: false, reason: 'rate_limited' };

  const assignedTo = assignee ? await _resolveAssigneeId(companyId, assignee) : (userId || null);
  const taskTitle = (title || 'Tarefa detectada em conversa').slice(0, 200);
  const taskDesc = (content || '').slice(0, 2000);

  try {
    const insertSql = `
      INSERT INTO tasks (company_id, title, description, assignee, assigned_to, status, scheduled_at, origem_conversa)
      VALUES ($1, $2, $3, $4, $5, 'open', $6, $7)
      RETURNING id
    `;
    const r = await db.query(insertSql, [
      companyId,
      taskTitle,
      taskDesc,
      assignee || null,
      assignedTo,
      scheduledAt || null,
      sourceId || null
    ]);
    const taskId = r.rows?.[0]?.id;

    if (taskId && userId && assignedTo && userId !== assignedTo) {
      try {
        await db.query(
          'INSERT INTO task_watchers (task_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [taskId, userId]
        );
      } catch (_) {}
    }

    console.info('[COGNITIVE_TASK]', { action: 'created', taskId, sourceType, priority });
    return { ok: true, taskId, title: taskTitle };
  } catch (err) {
    if (err.message?.includes('assigned_to')) {
      try {
        const r = await db.query(
          'INSERT INTO tasks (company_id, title, description, assignee, status, scheduled_at) VALUES ($1,$2,$3,$4,\'open\',$5) RETURNING id',
          [companyId, taskTitle, taskDesc, assignee || 'Automático', scheduledAt || null]
        );
        return { ok: true, taskId: r.rows?.[0]?.id, title: taskTitle };
      } catch (e2) {
        console.warn('[COGNITIVE_TASK] fallback insert:', e2.message);
        return { ok: false, reason: e2.message };
      }
    }
    console.warn('[COGNITIVE_TASK] create:', err.message);
    return { ok: false, reason: err.message };
  }
}

/**
 * Agenda lembrete (cria task com scheduled_at que o reminderScheduler irá processar).
 */
async function scheduleReminder(params = {}) {
  if (!ENABLED) return { ok: false, reason: 'disabled' };

  const { companyId, userId, title, scheduledAt, sourceType, sourceId } = params;
  if (!companyId) return { ok: false, reason: 'no_company' };
  if (!_checkRateLimit(userId)) return { ok: false, reason: 'rate_limited' };

  const finalSchedule = scheduledAt || (() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0);
    return d.toISOString();
  })();

  const reminderTitle = `🔔 ${(title || 'Lembrete').slice(0, 190)}`;

  try {
    const r = await db.query(
      `INSERT INTO tasks (company_id, title, description, assigned_to, status, scheduled_at, origem_conversa)
       VALUES ($1, $2, $3, $4, 'open', $5, $6)
       RETURNING id`,
      [companyId, reminderTitle, `Lembrete criado automaticamente via ${sourceType || 'chat'}`, userId || null, finalSchedule, sourceId || null]
    );
    const taskId = r.rows?.[0]?.id;

    if (taskId && userId) {
      try {
        await db.query('INSERT INTO task_watchers (task_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [taskId, userId]);
      } catch (_) {}
    }

    console.info('[COGNITIVE_REMINDER]', { action: 'scheduled', taskId, scheduledAt: finalSchedule });
    return { ok: true, taskId, scheduledAt: finalSchedule };
  } catch (err) {
    console.warn('[COGNITIVE_REMINDER] schedule:', err.message);
    return { ok: false, reason: err.message };
  }
}

/**
 * Verifica escalation para tarefas atrasadas. Chamado pelo scheduler ou manualmente.
 */
async function checkEscalation(companyId) {
  if (!ENABLED) return [];

  try {
    const r = await db.query(`
      SELECT t.id, t.title, t.assignee, t.assigned_to, t.scheduled_at, t.created_at,
             COALESCE(t.escalation_level, 0) AS escalation_level
      FROM tasks t
      WHERE t.company_id = $1 AND t.status = 'open'
        AND t.scheduled_at IS NOT NULL AND t.scheduled_at < now()
        AND COALESCE(t.escalation_level, 0) < $2
      ORDER BY t.scheduled_at ASC
      LIMIT 10
    `, [companyId, MAX_ESCALATION_DEPTH]);

    const escalated = [];
    for (const task of (r.rows || [])) {
      const newLevel = (task.escalation_level || 0) + 1;
      try {
        await db.query(
          'UPDATE tasks SET escalation_level = $2 WHERE id = $1',
          [task.id, newLevel]
        );
        escalated.push({ taskId: task.id, title: task.title, level: newLevel });
        console.info('[COGNITIVE_ESCALATION]', { taskId: task.id, level: newLevel });
      } catch (escErr) {
        if (!escErr.message?.includes('escalation_level')) {
          console.warn('[COGNITIVE_ESCALATION]', escErr.message);
        }
      }
    }

    return escalated;
  } catch (err) {
    if (err.message?.includes('does not exist') || err.message?.includes('escalation_level')) return [];
    console.warn('[COGNITIVE_ESCALATION] check:', err.message);
    return [];
  }
}

/**
 * Fecha lifecycle de uma tarefa.
 */
async function closeTask(taskId, closedBy) {
  if (!ENABLED) return { ok: false };
  try {
    await db.query("UPDATE tasks SET status = 'done' WHERE id = $1", [taskId]);
    console.info('[COGNITIVE_TASK]', { action: 'closed', taskId, closedBy });
    return { ok: true };
  } catch (err) {
    console.warn('[COGNITIVE_TASK] close:', err.message);
    return { ok: false, reason: err.message };
  }
}

module.exports = {
  createTaskFromConversation,
  scheduleReminder,
  checkEscalation,
  closeTask,
  isEnabled: () => ENABLED
};
