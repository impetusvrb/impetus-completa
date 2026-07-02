/**
 * CERT-PULSE-02 FASE 1 — Camada de Percepção Organizacional.
 * Consolida sinais de estruturas existentes; não duplica dados.
 */
'use strict';

const db = require('../../db');
const { buildOperationalSnapshot, buildTeamMemberOperationalSnapshot } = require('../pulseOperationalSnapshot');

const PERIOD_DAYS = 30;

function clamp(n, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n));
}

function daysSince(dateVal) {
  if (!dateVal) return null;
  const d = new Date(dateVal);
  if (Number.isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / (24 * 60 * 60 * 1000));
}

async function safeCount(query, params) {
  try {
    const r = await db.query(query, params);
    return parseInt(r.rows?.[0]?.c ?? r.rows?.[0]?.count ?? 0, 10);
  } catch (_) {
    return 0;
  }
}

async function loadUserContext(companyId, userId) {
  const r = await db.query(
    `
    SELECT id, name, role, department, department_id, job_title, supervisor_id,
      pulse_shift_code, pulse_team_label, created_at, hire_date
    FROM users
    WHERE id = $1 AND company_id = $2 AND active = true AND deleted_at IS NULL
  `,
    [userId, companyId]
  );
  return r.rows[0] || null;
}

async function loadTeamMemberContext(companyId, teamMemberId) {
  const r = await db.query(
    `
    SELECT m.*, t.name AS team_name, t.main_shift_label
    FROM operational_team_members m
    INNER JOIN operational_teams t ON t.id = m.team_id AND t.company_id = $1
    WHERE m.id = $2 AND m.active
  `,
    [companyId, teamMemberId]
  );
  return r.rows[0] || null;
}

async function loadTimeClockSignals(companyId, userId, since) {
  const r = await db.query(
    `
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE absent = true)::int AS absences,
      COUNT(*) FILTER (WHERE delay_minutes > 0)::int AS delays,
      COALESCE(SUM(overtime_minutes), 0)::int AS overtime_min
    FROM time_clock_records
    WHERE company_id = $1 AND user_id = $2 AND record_date >= $3::date
  `,
    [companyId, userId, since]
  );
  const row = r.rows[0] || {};
  const total = parseInt(row.total || 0, 10);
  const absences = parseInt(row.absences || 0, 10);
  const delays = parseInt(row.delays || 0, 10);
  const overtime = parseInt(row.overtime_min || 0, 10);
  return {
    records: total,
    absences,
    delays,
    overtime_minutes: overtime,
    absence_rate: total > 0 ? absences / total : 0,
    delay_rate: total > 0 ? delays / total : 0
  };
}

async function loadTaskSignals(companyId, userId) {
  return safeCount(
    `
    SELECT COUNT(*)::int AS c FROM tasks
    WHERE company_id = $1
      AND assigned_to::text = $2
      AND COALESCE(status, 'open') IN ('done', 'completed', 'closed')
      AND updated_at >= now() - interval '30 days'
  `,
    [companyId, String(userId)]
  );
}

async function loadSafetySignals(companyId, userId) {
  const webTag = `web:${userId}`;
  const sst = await safeCount(
    `
    SELECT COUNT(*)::int AS c FROM operational_alerts
    WHERE company_id = $1
      AND created_at >= now() - interval '30 days'
      AND (
        lower(COALESCE(tipo_alerta, '')) LIKE '%sst%'
        OR lower(COALESCE(tipo_alerta, '')) LIKE '%segur%'
        OR lower(COALESCE(severidade, '')) IN ('high', 'critical', 'alta', 'critica')
      )
      AND (metadata::text LIKE $2 OR metadata::text LIKE $3)
  `,
    [companyId, `%${userId}%`, `%${webTag}%`]
  );
  return { sst_related_alerts: sst };
}

async function loadLatestPulseEvaluation(companyId, userId, teamMemberId) {
  try {
    let r;
    if (userId) {
      r = await db.query(
        `
        SELECT fixed_scores, ai_operational_snapshot, self_completed_at, status, supervisor_perception
        FROM pulse_evaluations
        WHERE company_id = $1 AND user_id = $2 AND status = 'completed'
        ORDER BY self_completed_at DESC NULLS LAST
        LIMIT 1
      `,
        [companyId, userId]
      );
    } else if (teamMemberId) {
      r = await db.query(
        `
        SELECT fixed_scores, ai_operational_snapshot, self_completed_at, status
        FROM pulse_evaluations
        WHERE company_id = $1 AND operational_team_member_id = $2 AND status = 'completed'
        ORDER BY self_completed_at DESC NULLS LAST
        LIMIT 1
      `,
        [companyId, teamMemberId]
      );
    } else {
      return null;
    }
    return r.rows[0] || null;
  } catch (_) {
    return null;
  }
}

async function loadCommunicationParticipation(companyId, userId) {
  return safeCount(
    `
    SELECT COUNT(*)::int AS c FROM communication_reads cr
    INNER JOIN communications c ON c.id = cr.communication_id AND c.company_id = $1
    WHERE cr.user_id = $2 AND cr.read_at >= now() - interval '30 days'
  `,
    [companyId, userId]
  );
}

/**
 * @param {string} companyId
 * @param {{ userId?: string, teamMemberId?: string, collectiveUserId?: string }} subject
 * @returns {Promise<object>}
 */
async function buildOrganizationalPerception(companyId, subject = {}) {
  const { userId, teamMemberId, collectiveUserId } = subject;
  const since = new Date(Date.now() - PERIOD_DAYS * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  let operational;
  let profile = null;
  if (userId) {
    operational = await buildOperationalSnapshot(companyId, userId, PERIOD_DAYS);
    profile = await loadUserContext(companyId, userId);
  } else if (teamMemberId) {
    operational = await buildTeamMemberOperationalSnapshot(
      companyId,
      collectiveUserId || null,
      teamMemberId,
      PERIOD_DAYS
    );
    profile = await loadTeamMemberContext(companyId, teamMemberId);
  } else {
    return { ok: false, reason: 'missing_subject' };
  }

  const timeClock = userId ? await loadTimeClockSignals(companyId, userId, since) : null;
  const tasksCompleted = userId ? await loadTaskSignals(companyId, userId) : 0;
  const safety = userId ? await loadSafetySignals(companyId, userId) : { sst_related_alerts: 0 };
  const communicationsRead = userId ? await loadCommunicationParticipation(companyId, userId) : 0;
  const latestPulse = await loadLatestPulseEvaluation(companyId, userId, teamMemberId);

  const tenureDays =
    daysSince(profile?.hire_date) ??
    daysSince(profile?.created_at) ??
    (profile?.created_at ? daysSince(profile.created_at) : null);

  const fixedScores =
    typeof latestPulse?.fixed_scores === 'string'
      ? JSON.parse(latestPulse.fixed_scores)
      : latestPulse?.fixed_scores || null;

  return {
    ok: true,
    period_days: PERIOD_DAYS,
    since,
    subject: { user_id: userId || null, operational_team_member_id: teamMemberId || null },
    profile: profile
      ? {
          name: profile.name || profile.display_name,
          department: profile.department || profile.sector,
          department_id: profile.department_id || null,
          job_title: profile.job_title || profile.operator_kind,
          supervisor_id: profile.supervisor_id || null,
          shift: profile.pulse_shift_code || profile.main_shift_label || profile.shift_label,
          team_label: profile.pulse_team_label || profile.team_name
        }
      : {},
    operational,
    human_signals: {
      time_clock: timeClock,
      tasks_completed: tasksCompleted,
      communications_read: communicationsRead,
      safety,
      tenure_days: tenureDays,
      latest_self_evaluation: fixedScores,
      latest_pulse_at: latestPulse?.self_completed_at || null,
      has_supervisor_perception: !!latestPulse?.supervisor_perception
    },
    data_sources: [
      'pulse_operational_snapshot',
      'time_clock_records',
      'tasks',
      'operational_alerts',
      'communications',
      'pulse_evaluations'
    ],
    collected_at: new Date().toISOString()
  };
}

/**
 * Percepção agregada da empresa (para índices de escopo company/department).
 */
async function buildCompanyPerception(companyId) {
  const since = new Date(Date.now() - PERIOD_DAYS * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  let hrIndicators = null;
  try {
    const hr = require('../hrIntelligenceService');
    hrIndicators = await hr.getIndicators(companyId, PERIOD_DAYS);
  } catch (_) {
    hrIndicators = null;
  }

  const activeUsers = await safeCount(
    `SELECT COUNT(*)::int AS c FROM users WHERE company_id = $1 AND active = true AND deleted_at IS NULL`,
    [companyId]
  );
  const pulseCompleted = await safeCount(
    `SELECT COUNT(*)::int AS c FROM pulse_evaluations WHERE company_id = $1 AND status = 'completed' AND self_completed_at >= $2::date`,
    [companyId, since]
  );

  return {
    ok: true,
    company_id: companyId,
    period_days: PERIOD_DAYS,
    hr_indicators: hrIndicators,
    active_users: activeUsers,
    pulse_evaluations_completed: pulseCompleted,
    collected_at: new Date().toISOString()
  };
}

module.exports = {
  PERIOD_DAYS,
  buildOrganizationalPerception,
  buildCompanyPerception,
  loadUserContext,
  loadTeamMemberContext
};
