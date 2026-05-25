'use strict';

const db = require('../../../db');
const dashboardAccess = require('../../../services/dashboardAccessService');
const roleAccess = require('../../../services/roleAccessPolicy');

async function userAccessibleThreadIds(user) {
  if (!user?.id || !user?.company_id) return [];
  const r = await db.query(
    `SELECT conversation_id FROM chat_participants WHERE user_id = $1`,
    [user.id]
  );
  return (r.rows || []).map((x) => x.conversation_id);
}

function assertChatAccess(user) {
  const perms = new Set(dashboardAccess.getEffectivePermissions(user));
  if (perms.has('*')) return { ok: true };
  const mods = new Set(dashboardAccess.getAllowedModules(user));
  if (mods.has('chat') || mods.has('ai')) return { ok: true };
  if (perms.has('chat.view') || perms.has('ACCESS_AI_ANALYTICS')) return { ok: true };
  return { ok: false, reason: 'CHAT_ACCESS_DENIED' };
}

function filterHitsByGovernance(user, hits = []) {
  return hits;
}

function canExposeActor(requester, targetUser) {
  return roleAccess.canShareWith(requester, targetUser || {});
}

module.exports = {
  userAccessibleThreadIds,
  assertChatAccess,
  filterHitsByGovernance,
  canExposeActor
};
