const db = require('../db');
const geminiService = require('./geminiService');
const unifiedMessaging = require('./unifiedMessagingService');
const { filterUsersByAccess } = require('./roleAccessPolicy');

const REMINDER_ADVANCE_MIN = parseInt(process.env.IMPETUS_TASK_REMINDER_ADVANCE_MIN || '70', 10);

function inferFallbackRouting(text = '') {
  const t = String(text).toLowerCase();
  const machineStop = /máquina parada|maquina parada|linha parada|parada de produção|parou/i.test(t);
  const partFailure = /quebra|quebrou|peça|peca|falha/i.test(t);
  if (machineStop || partFailure) {
    return {
      event_type: machineStop ? 'machine_stop' : 'part_failure',
      severity: machineStop ? 'high' : 'medium',
      notify_roles: ['mecanico', 'compras', 'pcm', 'supervisor'],
      should_create_task: true,
      task_title: machineStop ? 'Máquina parada - ação imediata' : 'Falha mecânica - verificar peça',
      task_description: text,
      needs_purchase: /repor|reposição|estoque|comprar/.test(t),
      needs_rework: /retrabalho|refazer/.test(t)
    };
  }
  return {
    event_type: 'informational',
    severity: 'low',
    notify_roles: ['supervisor'],
    should_create_task: false,
    task_title: '',
    task_description: text,
    needs_purchase: false,
    needs_rework: false
  };
}

async function findUsersByRoles(companyId, roleKeywords = []) {
  if (!companyId || !Array.isArray(roleKeywords) || roleKeywords.length === 0) return [];
  const keywords = roleKeywords.map((x) => String(x || '').toLowerCase().trim()).filter(Boolean);
  if (!keywords.length) return [];
  const conditions = [];
  const params = [companyId];
  for (const k of keywords) {
    params.push(`%${k}%`);
    const i = params.length;
    conditions.push(`LOWER(COALESCE(role,'')) LIKE $${i}`);
  }
  const sql = `
    SELECT id, name, role, hierarchy_level, department_id
    FROM users
    WHERE company_id = $1
      AND active = true
      AND deleted_at IS NULL
      AND (${conditions.join(' OR ')})
  `;
  const r = await db.query(sql, params);
  return r.rows || [];
}

async function createTask(companyId, ownerUserId, title, description, scheduledAt) {
  try {
    const r = await db.query(
      `INSERT INTO tasks (company_id, title, description, status, assignee, assigned_to, scheduled_at)
       VALUES ($1, $2, $3, 'open', $4, $5, $6)
       RETURNING id`,
      [companyId, title, description || null, ownerUserId ? null : 'Equipe', ownerUserId || null, scheduledAt || null]
    );
    return r.rows?.[0]?.id || null;
  } catch (err) {
    if (err.message?.includes('assigned_to')) {
      const r = await db.query(
        `INSERT INTO tasks (company_id, title, description, status, assignee, scheduled_at)
         VALUES ($1, $2, $3, 'open', $4, $5)
         RETURNING id`,
        [companyId, title, description || null, ownerUserId ? 'Responsável técnico' : 'Equipe', scheduledAt || null]
      );
      return r.rows?.[0]?.id || null;
    }
    throw err;
  }
}

async function saveTaskWatchers(taskId, users = []) {
  if (!taskId || !users.length) return;
  for (const user of users) {
    try {
      await db.query(
        `INSERT INTO task_watchers (task_id, user_id)
         VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [taskId, user.id]
      );
    } catch (err) {
      if (err.message?.includes('task_watchers')) return;
      console.warn('[OPER_REALTIME] saveTaskWatchers:', err?.message);
      return;
    }
  }
}

async function notifyUsers(companyId, users, message) {
  for (const user of users) {
    try {
      await unifiedMessaging.sendToUser(companyId, user.id, message, { type: 'operational_event' });
    } catch (err) {
      console.warn('[OPER_REALTIME] notify:', err?.message);
    }
  }
}

async function processChatMessage(payload = {}) {
  const { companyId, conversationId, senderUser, content, io } = payload;
  if (!companyId || !content || String(content).trim().length < 3) return { ok: false, skipped: true };

  const systemContext = await geminiService.montarContexto({
    empresa_id: companyId,
    user_id: senderUser?.id || null,
    usuario: senderUser?.role || 'colaborador',
    conversas: true,
    manuais: true,
    maquinas: true
  });

  const ctx = {
    conversationId,
    senderRole: senderUser?.role,
    senderHierarchy: senderUser?.hierarchy_level,
    systemContext
  };
  const routing = (await geminiService.classifyRouting({ text: content, context: ctx })) || inferFallbackRouting(content);
  const notifyRoles = Array.isArray(routing.notify_roles) && routing.notify_roles.length
    ? routing.notify_roles
    : ['supervisor'];

  const targets = await findUsersByRoles(companyId, notifyRoles);
  const allowedTargets = filterUsersByAccess(senderUser, targets);
  const message = `[IMPETUS IA] Evento: ${routing.event_type} | Severidade: ${routing.severity}\n${String(content).slice(0, 300)}`;
  await notifyUsers(companyId, allowedTargets, message);

  let taskId = null;
  if (routing.should_create_task) {
    const mechanic = allowedTargets.find((u) => /mecan/i.test(String(u.role || '')));
    const due = new Date(Date.now() + (4 * 60 * 60 * 1000));
    taskId = await createTask(
      companyId,
      mechanic?.id || null,
      routing.task_title || 'Ação operacional automática',
      routing.task_description || content,
      due
    );
    if (taskId) {
      // Todos os envolvidos da cadeia (manutenção, compras, PCM, supervisão) ficam vinculados na tarefa.
      await saveTaskWatchers(taskId, allowedTargets);
    }
  }

  if (io && conversationId) {
    io.to(conversationId).emit('ai_operational_dispatch', {
      ok: true,
      routing,
      notified_users: allowedTargets.map((u) => ({ id: u.id, name: u.name, role: u.role })),
      task_id: taskId,
      reminder_advance_min: REMINDER_ADVANCE_MIN
    });
  }

  return {
    ok: true,
    routing,
    notifiedCount: allowedTargets.length,
    taskId
  };
}

module.exports = {
  processChatMessage,
  REMINDER_ADVANCE_MIN
};
