/**
 * Sessão de equipe operacional — seleção do membro ativo (login coletivo)
 */
const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { z } = require('zod');
const factoryTeam = require('../services/factoryTeamService');

const selectMemberSchema = z.object({
  member_id: z.string().uuid()
});

router.get('/context', requireAuth, async (req, res) => {
  try {
    const u = req.user;
    if (!u.is_factory_team_account || !u.operational_team_id) {
      return res.json({
        ok: true,
        is_factory_team: false,
        needs_selection: false
      });
    }

    const ctx = await factoryTeam.getTeamWithMembers(u.company_id, u.operational_team_id);
    if (!ctx) {
      return res.status(400).json({ ok: false, error: 'Equipe não encontrada' });
    }

    const suggested = factoryTeam.suggestMemberBySchedule(ctx.members);
    const activeId = u.active_operational_team_member_id || null;
    let activeMember = null;
    if (activeId) {
      const am = await db.query(`SELECT * FROM operational_team_members WHERE id = $1 AND team_id = $2 AND active`, [
        activeId,
        u.operational_team_id
      ]);
      activeMember = am.rows[0] || null;
    }

    res.json({
      ok: true,
      is_factory_team: true,
      needs_selection: !activeMember,
      team: { id: ctx.team.id, name: ctx.team.name, main_shift_label: ctx.team.main_shift_label },
      members: (ctx.members || []).filter((m) => m.active),
      suggested_member: suggested,
      active_member: activeMember
    });
  } catch (e) {
    console.error('[FACTORY_TEAM_CONTEXT]', e);
    res.status(500).json({ ok: false, error: 'Erro ao carregar contexto da equipe' });
  }
});

router.post('/session/member', requireAuth, async (req, res) => {
  try {
    const u = req.user;
    if (!u.is_factory_team_account || !u.operational_team_id) {
      return res.status(400).json({ ok: false, error: 'Conta não é de equipe operacional' });
    }
    if (!u.sessionId) {
      return res.status(400).json({ ok: false, error: 'Sessão inválida para definir membro' });
    }

    const b = selectMemberSchema.parse(req.body);
    const mid = await factoryTeam.assertMemberBelongsToTeam(u.company_id, u.operational_team_id, b.member_id);
    if (!mid) {
      return res.status(400).json({ ok: false, error: 'Membro inválido para esta equipe' });
    }

    await factoryTeam.setSessionActiveMember(u.sessionId, mid);
    await factoryTeam.logMemberEvent(u.company_id, u.id, mid, 'member_selected', { source: 'manual' });

    const mr = await db.query(`SELECT * FROM operational_team_members WHERE id = $1`, [mid]);
    res.json({ ok: true, active_member: mr.rows[0] });
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ ok: false, error: 'Dados inválidos' });
    console.error('[FACTORY_TEAM_SET_MEMBER]', e);
    res.status(500).json({ ok: false, error: 'Erro ao definir membro' });
  }
});

router.post('/session/member/suggested', requireAuth, async (req, res) => {
  try {
    const u = req.user;
    if (!u.is_factory_team_account || !u.operational_team_id || !u.sessionId) {
      return res.status(400).json({ ok: false, error: 'Conta não é de equipe operacional' });
    }
    const ctx = await factoryTeam.getTeamWithMembers(u.company_id, u.operational_team_id);
    if (!ctx) return res.status(400).json({ ok: false, error: 'Equipe não encontrada' });
    const suggested = factoryTeam.suggestMemberBySchedule(ctx.members);
    if (!suggested) {
      return res.status(400).json({ ok: false, error: 'Nenhum membro disponível para sugestão automática' });
    }
    await factoryTeam.setSessionActiveMember(u.sessionId, suggested.id);
    await factoryTeam.logMemberEvent(u.company_id, u.id, suggested.id, 'member_selected', { source: 'schedule_suggestion' });
    res.json({ ok: true, active_member: suggested });
  } catch (e) {
    console.error('[FACTORY_TEAM_SUGGESTED]', e);
    res.status(500).json({ ok: false, error: 'Erro ao aplicar sugestão' });
  }
});

module.exports = router;
