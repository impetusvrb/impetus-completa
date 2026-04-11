/**
 * Sessão de equipe operacional — verificação secundária (matrícula + senha individual)
 */
const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { logAction } = require('../middleware/audit');
const { z } = require('zod');
const factoryTeam = require('../services/factoryTeamService');
const pulseService = require('../services/pulseService');

const verifyOperatorSchema = z.object({
  matricula: z.string().min(1).max(64),
  access_password: z.string().min(1).max(128)
});

function publicMemberRow(row) {
  if (!row) return null;
  const { access_password_hash: _h, ...rest } = row;
  return rest;
}

router.get('/context', requireAuth, async (req, res) => {
  try {
    const u = req.user;
    if (!u.is_factory_team_account || !u.operational_team_id) {
      return res.json({
        ok: true,
        is_factory_team: false,
        needs_selection: false,
        revalidation_hours: factoryTeam.REVALIDATION_HOURS
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

    let confirmedAt = u.factory_member_confirmed_at || null;
    if (u.sessionId && activeMember && !confirmedAt) {
      await db.query(`UPDATE sessions SET factory_member_confirmed_at = now() WHERE id = $1`, [u.sessionId]);
      const fr = await db.query(`SELECT factory_member_confirmed_at FROM sessions WHERE id = $1`, [u.sessionId]);
      confirmedAt = fr.rows[0]?.factory_member_confirmed_at || null;
    }

    const rev = factoryTeam.computeRevalidationState({
      activeMember,
      suggested,
      confirmedAt
    });

    const needs_selection = !activeMember || rev.needs_revalidation;

    res.json({
      ok: true,
      is_factory_team: true,
      needs_selection,
      needs_revalidation: rev.needs_revalidation,
      revalidation_reason: rev.reason,
      quick_confirm_eligible: false,
      revalidation_hours: factoryTeam.REVALIDATION_HOURS,
      team: { id: ctx.team.id, name: ctx.team.name, main_shift_label: ctx.team.main_shift_label },
      members: [],
      suggested_member: null,
      active_member: activeMember ? publicMemberRow(activeMember) : null
    });
  } catch (e) {
    console.error('[FACTORY_TEAM_CONTEXT]', e);
    res.status(500).json({ ok: false, error: 'Erro ao carregar contexto da equipe' });
  }
});

router.post('/session/clear-active-member', requireAuth, async (req, res) => {
  try {
    const u = req.user;
    if (!u.is_factory_team_account || !u.sessionId) {
      return res.status(400).json({ ok: false, error: 'Operação só se aplica à conta de equipe operacional' });
    }
    await factoryTeam.clearSessionActiveMember(u.sessionId);
    res.json({ ok: true });
  } catch (e) {
    console.error('[FACTORY_TEAM_CLEAR_MEMBER]', e);
    res.status(500).json({ ok: false, error: 'Erro ao limpar operador da sessão' });
  }
});

router.post('/session/verify-operator', requireAuth, async (req, res) => {
  try {
    const u = req.user;
    if (!u.is_factory_team_account || !u.operational_team_id || !u.sessionId) {
      return res.status(400).json({ ok: false, error: 'Conta não é de equipe operacional ou sessão inválida' });
    }

    const b = verifyOperatorSchema.parse(req.body);
    const member = await factoryTeam.findActiveMemberByMatricula(u.company_id, u.operational_team_id, b.matricula);
    if (!member || !member.access_password_hash) {
      return res.status(401).json({ ok: false, error: 'Matrícula ou senha de acesso inválida' });
    }
    const okPw = await bcrypt.compare(b.access_password, member.access_password_hash);
    if (!okPw) {
      return res.status(401).json({ ok: false, error: 'Matrícula ou senha de acesso inválida' });
    }

    await factoryTeam.setSessionActiveMember(u.sessionId, member.id);
    await factoryTeam.logMemberEvent(u.company_id, u.id, member.id, 'operator_verified', { matricula: member.matricula });

    const ts = new Date().toISOString();
    await logAction({
      companyId: u.company_id,
      userId: u.id,
      userName: u.name,
      userRole: u.role,
      action: 'factory_team_operator_verified',
      entityType: 'operational_team',
      entityId: u.operational_team_id,
      description: `${ts} - ${u.operational_team_id} - ${member.display_name} - ${member.matricula} - Acesso ao Dashboard Coletivo`,
      ipAddress: req.ip || req.connection?.remoteAddress,
      userAgent: req.get('user-agent'),
      sessionId: u.sessionId,
      severity: 'info',
      success: true
    });

    const pulsePeek = await pulseService.getPendingPromptForTeamMember(u.company_id, member.id);
    const pub = publicMemberRow(member);
    res.json({
      ok: true,
      active_member: pub,
      factory_member_confirmed_at: new Date().toISOString(),
      pulse: {
        require_completion: !!(pulsePeek.show && pulsePeek.evaluation?.id),
        evaluation: pulsePeek.evaluation || null
      }
    });
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ ok: false, error: 'Dados inválidos' });
    console.error('[FACTORY_TEAM_VERIFY]', e);
    res.status(500).json({ ok: false, error: 'Erro ao verificar operador' });
  }
});

router.post('/session/member', requireAuth, async (req, res) => {
  return res.status(400).json({ ok: false, error: 'Utilize a verificação por matrícula e senha individual (verify-operator).' });
});

router.post('/session/member/suggested', requireAuth, async (req, res) => {
  return res.status(400).json({ ok: false, error: 'Utilize a verificação por matrícula e senha individual (verify-operator).' });
});

router.post('/session/member/confirm-continue', requireAuth, async (req, res) => {
  return res.status(400).json({ ok: false, error: 'Utilize a verificação por matrícula e senha individual (verify-operator).' });
});

module.exports = router;
