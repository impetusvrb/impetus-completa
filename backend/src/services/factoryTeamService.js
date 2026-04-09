/**
 * Equipes operacionais — seleção por horário e validação de vínculo
 */
const db = require('../db');

/** Minutos desde meia-noite (local server) */
function nowMinutes() {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

function timeToMinutes(t) {
  if (t == null) return null;
  const s = String(t);
  const m = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  if (Number.isNaN(h) || Number.isNaN(min)) return null;
  return h * 60 + min;
}

/**
 * Janela [start,end] em minutos; se end < start, cruza meia-noite
 */
function isNowInSchedule(scheduleStart, scheduleEnd) {
  const s = timeToMinutes(scheduleStart);
  const e = timeToMinutes(scheduleEnd);
  if (s == null || e == null) return false;
  const n = nowMinutes();
  if (e >= s) return n >= s && n <= e;
  return n >= s || n <= e;
}

async function getTeamWithMembers(companyId, teamId) {
  const t = await db.query(
    `SELECT * FROM operational_teams WHERE id = $1 AND company_id = $2 AND active`,
    [teamId, companyId]
  );
  if (!t.rows.length) return null;
  const m = await db.query(
    `SELECT * FROM operational_team_members WHERE team_id = $1 ORDER BY sort_order, display_name`,
    [teamId]
  );
  return { team: t.rows[0], members: m.rows || [] };
}

function suggestMemberBySchedule(members) {
  const active = (members || []).filter((x) => x.active);
  for (const mem of active) {
    if (mem.schedule_start != null && mem.schedule_end != null && isNowInSchedule(mem.schedule_start, mem.schedule_end)) {
      return mem;
    }
  }
  return active[0] || null;
}

async function assertMemberBelongsToTeam(companyId, teamId, memberId) {
  const r = await db.query(
    `SELECT m.id FROM operational_team_members m
     JOIN operational_teams t ON t.id = m.team_id AND t.company_id = $1 AND t.active
     WHERE m.id = $2 AND m.team_id = $3 AND m.active`,
    [companyId, memberId, teamId]
  );
  return r.rows?.[0]?.id || null;
}

async function setSessionActiveMember(sessionId, memberId) {
  await db.query(
    `UPDATE sessions SET active_operational_team_member_id = $2 WHERE id = $1`,
    [sessionId, memberId]
  );
}

async function clearSessionActiveMember(sessionId) {
  await db.query(`UPDATE sessions SET active_operational_team_member_id = NULL WHERE id = $1`, [sessionId]);
}

async function logMemberEvent(companyId, userId, teamMemberId, eventType, metadata = null) {
  try {
    await db.query(
      `INSERT INTO operational_team_member_events (company_id, user_id, team_member_id, event_type, metadata)
       VALUES ($1, $2, $3, $4, $5::jsonb)`,
      [companyId, userId, teamMemberId, eventType, metadata ? JSON.stringify(metadata) : null]
    );
  } catch (e) {
    console.warn('[FACTORY_TEAM_EVENT]', e.message);
  }
}

module.exports = {
  nowMinutes,
  timeToMinutes,
  isNowInSchedule,
  getTeamWithMembers,
  suggestMemberBySchedule,
  assertMemberBelongsToTeam,
  setSessionActiveMember,
  clearSessionActiveMember,
  logMemberEvent
};
