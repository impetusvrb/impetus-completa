/**
 * Disponibilidade e silêncio fora do expediente — reutilizável por motor de regras e futuro app nativo.
 */
'use strict';

const ALERT_LEVELS = ['silent', 'normal', 'urgent', 'critical'];

function parseTimeToMinutes(t) {
  if (!t) return 0;
  const s = String(t);
  const m = s.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return 0;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

function evaluateScheduleContext(prefs, now) {
  const p = prefs || {};
  const d = now instanceof Date ? now : new Date(now);
  const day = d.getDay();
  const workDays = Array.isArray(p.work_days) ? p.work_days : [1, 2, 3, 4, 5];
  const dayOk = workDays.includes(day);
  const mins = d.getHours() * 60 + d.getMinutes();
  const start = parseTimeToMinutes(p.work_start || '08:00');
  const end = parseTimeToMinutes(p.work_end || '18:00');
  let inWorkHours = dayOk && mins >= start && mins < end;
  if (end <= start) {
    inWorkHours = dayOk && (mins >= start || mins < end);
  }

  let inQuietHours = false;
  if (p.quiet_hours_enabled && p.quiet_hours_start && p.quiet_hours_end) {
    const qs = parseTimeToMinutes(p.quiet_hours_start);
    const qe = parseTimeToMinutes(p.quiet_hours_end);
    if (qe > qs) inQuietHours = mins >= qs && mins < qe;
    else inQuietHours = mins >= qs || mins < qe;
  }

  return { inWorkHours, inQuietHours, inOnCallSlot: !!p.on_call };
}

function shouldDeliverNow({ prefs, alertLevel, now = new Date(), userOnCall = false }) {
  const level = String(alertLevel || 'normal').toLowerCase();
  const p = prefs || {};
  const ctx = evaluateScheduleContext(p, now);
  const maxLevel = String(p.max_interruption_level || 'urgent').toLowerCase();
  const maxIdx = ALERT_LEVELS.indexOf(maxLevel === 'critical_only' ? 'critical' : maxLevel);
  const curIdx = ALERT_LEVELS.indexOf(level === 'critical' ? 'critical' : level);

  if (curIdx > maxIdx && level !== 'silent') {
    return {
      deliver: false,
      channel: 'none',
      reason: 'Nível acima do máximo configurado pelo usuário.',
      sound: false,
      vibrate: false,
      requireAck: false
    };
  }

  if (level === 'silent') {
    return {
      deliver: true,
      channel: 'inbox_only',
      reason: 'Silencioso — apenas central.',
      sound: false,
      vibrate: false,
      requireAck: false
    };
  }

  if (ctx.inQuietHours && level !== 'critical') {
    return {
      deliver: level === 'urgent' && !!p.allow_urgent_outside_hours,
      channel: 'deferred',
      reason: 'Horário de silêncio configurado.',
      sound: false,
      vibrate: false,
      requireAck: false
    };
  }

  if (!ctx.inWorkHours && !userOnCall) {
    if (level === 'critical' && p.allow_critical_outside_hours !== false) {
      return {
        deliver: true,
        channel: 'push_critical',
        reason: 'Crítico fora do expediente — política permite.',
        sound: true,
        vibrate: true,
        requireAck: true
      };
    }
    if (level === 'urgent' && p.allow_urgent_outside_hours) {
      return {
        deliver: true,
        channel: 'push_urgent',
        reason: 'Urgente permitido fora do expediente.',
        sound: true,
        vibrate: true,
        requireAck: false
      };
    }
    if (level === 'normal' && p.allow_normal_outside_hours) {
      return {
        deliver: true,
        channel: 'push_normal',
        reason: 'Normal permitido fora do expediente.',
        sound: false,
        vibrate: false,
        requireAck: false
      };
    }
    return {
      deliver: false,
      channel: 'queue_next_shift',
      reason: 'Fora do expediente — não perturbar.',
      sound: false,
      vibrate: false,
      requireAck: false
    };
  }

  if (userOnCall || ctx.inWorkHours) {
    const critical = level === 'critical';
    return {
      deliver: true,
      channel: critical ? 'push_critical' : 'push',
      reason: userOnCall ? 'Plantão ativo.' : 'Dentro do expediente.',
      sound: critical || level === 'urgent',
      vibrate: critical || level === 'urgent',
      requireAck: critical
    };
  }

  return {
    deliver: true,
    channel: 'push',
    reason: 'default',
    sound: level !== 'normal',
    vibrate: level !== 'normal',
    requireAck: false
  };
}

module.exports = {
  evaluateScheduleContext,
  shouldDeliverNow,
  ALERT_LEVELS
};
