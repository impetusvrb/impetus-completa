/**
 * Equipes operacionais — seleção por horário e validação de vínculo
 *
 * Regras de sugestão por horário (documentação):
 * - Cada membro pode ter schedule_start / schedule_end (TIME). A janela é inclusiva.
 * - Se schedule_end < schedule_start, o turno cruza meia-noite (ex.: 22:00–06:00).
 * - "Agora" está na janela se o instante atual (hora:minuto local do servidor) cai dentro do intervalo.
 * - Membros sem horário definido entram apenas como fallback quando ninguém com janela cobre o instante atual.
 * - Empate (vários membros com janela sobreposta): desempate por sort_order ASC, depois display_name (locale pt).
 * - Revalidação: FACTORY_REVALIDATION_HOURS (default 4) após factory_member_confirmed_at; ou membro ativo fora da própria janela.
 */
const db = require('../db');

const REVALIDATION_HOURS = (() => {
  const v = parseFloat(process.env.FACTORY_REVALIDATION_HOURS || '4', 10);
  return Number.isFinite(v) && v > 0 ? v : 4;
})();

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

function sortMembersForSuggestion(members) {
  return [...(members || [])].filter((x) => x.active).sort((a, b) => {
    const so = (a.sort_order ?? 0) - (b.sort_order ?? 0);
    if (so !== 0) return so;
    return String(a.display_name || '').localeCompare(String(b.display_name || ''), 'pt');
  });
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

/**
 * Entre membros cuja janela cobre "agora", o primeiro após ordenação estável (sort_order, nome).
 * Se ninguém tem janela ativa, usa o primeiro membro ativo na mesma ordenação.
 */
function suggestMemberBySchedule(members) {
  const sorted = sortMembersForSuggestion(members);
  const inWindow = sorted.filter(
    (m) => m.schedule_start != null && m.schedule_end != null && isNowInSchedule(m.schedule_start, m.schedule_end)
  );
  if (inWindow.length > 0) return inWindow[0];
  return sorted[0] || null;
}

/**
 * @returns {{ needs_revalidation: boolean, reason: string|null, quick_confirm_eligible: boolean }}
 */
function computeRevalidationState({ activeMember, suggested, confirmedAt, now = new Date() }) {
  if (!activeMember) {
    return { needs_revalidation: false, reason: null, quick_confirm_eligible: false };
  }
  let reason = null;
  if (confirmedAt) {
    const elapsed = (now.getTime() - new Date(confirmedAt).getTime()) / 3600000;
    if (elapsed >= REVALIDATION_HOURS) reason = 'interval_hours';
  }
  if (!reason && activeMember.schedule_start != null && activeMember.schedule_end != null) {
    if (!isNowInSchedule(activeMember.schedule_start, activeMember.schedule_end)) {
      reason = 'outside_schedule';
    }
  }
  const needs_revalidation = !!reason;
  const quick_confirm_eligible =
    needs_revalidation &&
    reason === 'interval_hours' &&
    suggested &&
    suggested.id === activeMember.id;
  return { needs_revalidation, reason, quick_confirm_eligible };
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
    `UPDATE sessions SET active_operational_team_member_id = $2, factory_member_confirmed_at = now() WHERE id = $1`,
    [sessionId, memberId]
  );
}

async function confirmSessionMemberContinuation(sessionId) {
  await db.query(
    `UPDATE sessions SET factory_member_confirmed_at = now() WHERE id = $1 AND active_operational_team_member_id IS NOT NULL`,
    [sessionId]
  );
}

async function clearSessionActiveMember(sessionId) {
  await db.query(
    `UPDATE sessions SET active_operational_team_member_id = NULL, factory_member_confirmed_at = NULL WHERE id = $1`,
    [sessionId]
  );
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
  REVALIDATION_HOURS,
  nowMinutes,
  timeToMinutes,
  isNowInSchedule,
  getTeamWithMembers,
  suggestMemberBySchedule,
  computeRevalidationState,
  assertMemberBelongsToTeam,
  setSessionActiveMember,
  confirmSessionMemberContinuation,
  clearSessionActiveMember,
  logMemberEvent
};
