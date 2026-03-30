'use strict';

const db = require('../../db');

async function getPreferences(companyId, userId) {
  const r = await db.query(
    `SELECT * FROM manuia_notification_preferences WHERE company_id = $1 AND user_id = $2`,
    [companyId, userId]
  );
  return r.rows[0] || null;
}

async function upsertPreferences(companyId, userId, patch) {
  const existing = await getPreferences(companyId, userId);
  if (!existing) {
    const cols = [
      'company_id',
      'user_id',
      'timezone',
      'work_days',
      'work_start',
      'work_end',
      'on_call',
      'max_interruption_level',
      'allow_critical_outside_hours',
      'allow_urgent_outside_hours',
      'allow_normal_outside_hours',
      'push_enabled',
      'quiet_hours_enabled',
      'quiet_hours_start',
      'quiet_hours_end',
      'extra'
    ];
    const defaults = {
      timezone: patch.timezone || 'America/Sao_Paulo',
      work_days: patch.work_days || [1, 2, 3, 4, 5],
      work_start: patch.work_start || '08:00',
      work_end: patch.work_end || '18:00',
      on_call: patch.on_call ?? false,
      max_interruption_level: patch.max_interruption_level || 'urgent',
      allow_critical_outside_hours: patch.allow_critical_outside_hours ?? true,
      allow_urgent_outside_hours: patch.allow_urgent_outside_hours ?? false,
      allow_normal_outside_hours: patch.allow_normal_outside_hours ?? false,
      push_enabled: patch.push_enabled ?? true,
      quiet_hours_enabled: patch.quiet_hours_enabled ?? false,
      quiet_hours_start: patch.quiet_hours_start || null,
      quiet_hours_end: patch.quiet_hours_end || null,
      extra: patch.extra || {}
    };
    const r = await db.query(
      `INSERT INTO manuia_notification_preferences (
         company_id, user_id, timezone, work_days, work_start, work_end, on_call,
         max_interruption_level, allow_critical_outside_hours, allow_urgent_outside_hours,
         allow_normal_outside_hours, push_enabled, quiet_hours_enabled, quiet_hours_start, quiet_hours_end, extra
       ) VALUES ($1,$2,$3,$4::int[],$5::time,$6::time,$7,$8,$9,$10,$11,$12,$13,$14::time,$15::time,$16::jsonb)
       RETURNING *`,
      [
        companyId,
        userId,
        defaults.timezone,
        defaults.work_days,
        defaults.work_start,
        defaults.work_end,
        defaults.on_call,
        defaults.max_interruption_level,
        defaults.allow_critical_outside_hours,
        defaults.allow_urgent_outside_hours,
        defaults.allow_normal_outside_hours,
        defaults.push_enabled,
        defaults.quiet_hours_enabled,
        defaults.quiet_hours_start,
        defaults.quiet_hours_end,
        JSON.stringify(defaults.extra)
      ]
    );
    return r.rows[0];
  }

  const fields = [];
  const vals = [];
  let n = 1;
  const allowed = [
    'timezone',
    'work_days',
    'work_start',
    'work_end',
    'on_call',
    'max_interruption_level',
    'allow_critical_outside_hours',
    'allow_urgent_outside_hours',
    'allow_normal_outside_hours',
    'push_enabled',
    'quiet_hours_enabled',
    'quiet_hours_start',
    'quiet_hours_end',
    'extra'
  ];
  for (const k of allowed) {
    if (patch[k] !== undefined) {
      if (k === 'work_days') {
        fields.push(`work_days = $${n}::int[]`);
        vals.push(patch[k]);
      } else if (k === 'extra') {
        fields.push(`extra = $${n}::jsonb`);
        vals.push(JSON.stringify(patch[k]));
      } else {
        fields.push(`${k} = $${n}`);
        vals.push(patch[k]);
      }
      n++;
    }
  }
  if (!fields.length) return existing;
  fields.push('updated_at = now()');
  vals.push(companyId, userId);
  const r2 = await db.query(
    `UPDATE manuia_notification_preferences SET ${fields.join(', ')}
     WHERE company_id = $${n} AND user_id = $${n + 1}
     RETURNING *`,
    vals
  );
  return r2.rows[0] || existing;
}

async function insertDevice(companyId, userId, data) {
  const r = await db.query(
    `INSERT INTO manuia_mobile_devices (company_id, user_id, platform, subscription, device_label, user_agent)
     VALUES ($1,$2,$3,$4::jsonb,$5,$6)
     RETURNING id, created_at`,
    [
      companyId,
      userId,
      data.platform || 'web',
      JSON.stringify(data.subscription || {}),
      data.device_label || null,
      data.user_agent || null
    ]
  );
  return r.rows[0];
}

async function listInbox(companyId, userId, limit) {
  const lim = Math.min(parseInt(limit, 10) || 40, 100);
  const r = await db.query(
    `SELECT * FROM manuia_inbox_notifications
     WHERE company_id = $1 AND user_id = $2
     ORDER BY created_at DESC
     LIMIT $3`,
    [companyId, userId, lim]
  );
  return r.rows || [];
}

async function acknowledgeInbox(companyId, userId, id) {
  const r = await db.query(
    `UPDATE manuia_inbox_notifications
     SET acknowledged_at = COALESCE(acknowledged_at, now()), read_at = COALESCE(read_at, now())
     WHERE id = $1 AND company_id = $2 AND user_id = $3
     RETURNING *`,
    [id, companyId, userId]
  );
  return r.rows[0] || null;
}

async function markRead(companyId, userId, id) {
  const r = await db.query(
    `UPDATE manuia_inbox_notifications
     SET read_at = COALESCE(read_at, now())
     WHERE id = $1 AND company_id = $2 AND user_id = $3
     RETURNING *`,
    [id, companyId, userId]
  );
  return r.rows[0] || null;
}

const ATTENDANCE = new Set(['open', 'in_progress', 'resolved', 'escalated']);

async function getInboxById(companyId, userId, id) {
  const r = await db.query(
    `SELECT * FROM manuia_inbox_notifications
     WHERE id = $1 AND company_id = $2 AND user_id = $3`,
    [id, companyId, userId]
  );
  return r.rows[0] || null;
}

async function updateInboxAttendance(companyId, userId, id, status) {
  const s = String(status || 'open').toLowerCase();
  if (!ATTENDANCE.has(s)) {
    throw new Error('attendance_status inválido (open, in_progress, resolved, escalated)');
  }
  const r = await db.query(
    `UPDATE manuia_inbox_notifications
     SET attendance_status = $4, read_at = COALESCE(read_at, now())
     WHERE id = $1 AND company_id = $2 AND user_id = $3
     RETURNING *`,
    [id, companyId, userId, s]
  );
  return r.rows[0] || null;
}

async function insertInboxNotification(row) {
  const r = await db.query(
    `INSERT INTO manuia_inbox_notifications (
       company_id, user_id, source, severity, alert_level, title, body, payload,
       machine_id, work_order_id, requires_ack
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10,$11)
     RETURNING *`,
    [
      row.company_id,
      row.user_id,
      row.source || 'system',
      row.severity || 'medium',
      row.alert_level || 'normal',
      row.title,
      row.body || null,
      JSON.stringify(row.payload || {}),
      row.machine_id || null,
      row.work_order_id || null,
      row.requires_ack || false
    ]
  );
  return r.rows[0];
}

async function listMyWorkOrders(companyId, userId, limit) {
  const lim = Math.min(parseInt(limit, 10) || 30, 80);
  const r = await db.query(
    `SELECT id, title, status, priority, machine_name, sector, scheduled_at, created_at, assigned_to
     FROM work_orders
     WHERE company_id = $1 AND assigned_to = $2
     ORDER BY
       CASE priority WHEN 'critical' THEN 0 WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'normal' THEN 3 ELSE 4 END,
       created_at DESC
     LIMIT $3`,
    [companyId, userId, lim]
  );
  return r.rows || [];
}

async function isUserOnCallNow(companyId, userId, now) {
  const r = await db.query(
    `SELECT 1 FROM manuia_on_call_slots
     WHERE company_id = $1 AND user_id = $2 AND active = true
       AND starts_at <= $3 AND ends_at > $3
     LIMIT 1`,
    [companyId, userId, now]
  );
  return (r.rows || []).length > 0;
}

async function listWebPushSubscriptionsForUser(companyId, userId) {
  const r = await db.query(
    `SELECT id, subscription FROM manuia_mobile_devices
     WHERE company_id = $1 AND user_id = $2
     ORDER BY last_seen_at DESC`,
    [companyId, userId]
  );
  return r.rows || [];
}

async function touchDeviceLastSeen(companyId, userId, deviceId) {
  await db.query(
    `UPDATE manuia_mobile_devices SET last_seen_at = now()
     WHERE company_id = $1 AND user_id = $2 AND id = $3`,
    [companyId, userId, deviceId]
  );
}

async function deleteDeviceById(companyId, userId, deviceId) {
  await db.query(
    `DELETE FROM manuia_mobile_devices WHERE company_id = $1 AND user_id = $2 AND id = $3`,
    [companyId, userId, deviceId]
  );
}

async function listOnCallSlotsForUser(companyId, userId) {
  const r = await db.query(
    `SELECT * FROM manuia_on_call_slots
     WHERE company_id = $1 AND user_id = $2
     ORDER BY starts_at DESC
     LIMIT 100`,
    [companyId, userId]
  );
  return r.rows || [];
}

async function insertOnCallSlot(companyId, userId, row) {
  const r = await db.query(
    `INSERT INTO manuia_on_call_slots (company_id, user_id, starts_at, ends_at, label, active)
     VALUES ($1, $2, $3::timestamptz, $4::timestamptz, $5, COALESCE($6, true))
     RETURNING *`,
    [
      companyId,
      userId,
      row.starts_at,
      row.ends_at,
      row.label != null ? String(row.label).slice(0, 200) : null,
      row.active
    ]
  );
  return r.rows[0];
}

async function updateOnCallSlot(companyId, userId, id, patch) {
  const fields = [];
  const vals = [];
  if (patch.starts_at !== undefined) {
    vals.push(patch.starts_at);
    fields.push(`starts_at = $${vals.length}::timestamptz`);
  }
  if (patch.ends_at !== undefined) {
    vals.push(patch.ends_at);
    fields.push(`ends_at = $${vals.length}::timestamptz`);
  }
  if (patch.label !== undefined) {
    vals.push(patch.label != null ? String(patch.label).slice(0, 200) : null);
    fields.push(`label = $${vals.length}`);
  }
  if (patch.active !== undefined) {
    vals.push(!!patch.active);
    fields.push(`active = $${vals.length}`);
  }
  if (!fields.length) return null;
  const idPos = vals.length + 1;
  vals.push(id);
  const cPos = vals.length + 1;
  vals.push(companyId);
  const uPos = vals.length + 1;
  vals.push(userId);
  const r = await db.query(
    `UPDATE manuia_on_call_slots SET ${fields.join(', ')}
     WHERE id = $${idPos} AND company_id = $${cPos} AND user_id = $${uPos}
     RETURNING *`,
    vals
  );
  return r.rows[0] || null;
}

async function deleteOnCallSlot(companyId, userId, id) {
  const r = await db.query(
    `DELETE FROM manuia_on_call_slots
     WHERE id = $1 AND company_id = $2 AND user_id = $3
     RETURNING id`,
    [id, companyId, userId]
  );
  return r.rows[0] || null;
}

module.exports = {
  getPreferences,
  upsertPreferences,
  insertDevice,
  listInbox,
  getInboxById,
  acknowledgeInbox,
  markRead,
  updateInboxAttendance,
  insertInboxNotification,
  listMyWorkOrders,
  isUserOnCallNow,
  listWebPushSubscriptionsForUser,
  touchDeviceLastSeen,
  deleteDeviceById,
  listOnCallSlotsForUser,
  insertOnCallSlot,
  updateOnCallSlot,
  deleteOnCallSlot
};
