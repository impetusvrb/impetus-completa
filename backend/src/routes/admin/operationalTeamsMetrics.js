/**
 * Relatórios, alertas e export CSV — montado no mesmo prefixo que operationalTeams.
 * Ficheiro separado para não depender de bcrypt e falhar silenciosamente o router principal.
 */
const express = require('express');
const router = express.Router();
const db = require('../../db');
const { requireAuth, requireHierarchy } = require('../../middleware/auth');
const { isValidUUID } = require('../../utils/security');

const adminMw = [requireAuth, requireHierarchy(1)];

function cid(req) {
  return req.user?.company_id;
}

router.get('/reports/member-activity', ...adminMw, async (req, res) => {
  try {
    const companyId = cid(req);
    const days = Math.min(90, Math.max(1, parseInt(req.query.days, 10) || 30));
    const r = await db.query(
      `SELECT m.display_name, m.id as member_id, t.name as team_name,
              COUNT(e.id)::int AS event_count
       FROM operational_team_member_events e
       JOIN operational_team_members m ON m.id = e.team_member_id
       JOIN operational_teams t ON t.id = m.team_id
       WHERE e.company_id = $1 AND e.created_at >= now() - ($2::int * interval '1 day')
       GROUP BY m.id, m.display_name, t.name
       ORDER BY event_count DESC`,
      [companyId, days]
    );
    res.json({ ok: true, data: r.rows, days });
  } catch (e) {
    console.error('[OP_TEAMS_REPORT]', e);
    res.status(500).json({ ok: false, error: 'Erro ao gerar relatório' });
  }
});

router.get('/health/alerts', ...adminMw, async (req, res) => {
  try {
    const companyId = cid(req);
    const teamsR = await db.query(
      `SELECT t.id, t.name FROM operational_teams t WHERE t.company_id = $1 AND t.active ORDER BY t.name`,
      [companyId]
    );
    const alerts = [];
    for (const row of teamsR.rows) {
      const collective = await db.query(
        `SELECT id FROM users WHERE operational_team_id = $1 AND is_factory_team_account AND deleted_at IS NULL LIMIT 1`,
        [row.id]
      );
      if (!collective.rows.length) {
        alerts.push({
          severity: 'warning',
          type: 'no_collective_user',
          team_id: row.id,
          team_name: row.name,
          message: 'Equipe sem conta de login coletivo cadastrada.'
        });
      }
      const memCount = await db.query(
        `SELECT COUNT(*)::int AS c FROM operational_team_members WHERE team_id = $1 AND active`,
        [row.id]
      );
      if ((memCount.rows[0]?.c || 0) === 0) {
        alerts.push({
          severity: 'warning',
          type: 'no_active_members',
          team_id: row.id,
          team_name: row.name,
          message: 'Equipe sem membros ativos.'
        });
      }
      const noSchedule = await db.query(
        `SELECT display_name FROM operational_team_members WHERE team_id = $1 AND active AND (schedule_start IS NULL OR schedule_end IS NULL) ORDER BY sort_order, display_name`,
        [row.id]
      );
      if (noSchedule.rows.length) {
        alerts.push({
          severity: 'info',
          type: 'members_without_schedule',
          team_id: row.id,
          team_name: row.name,
          members: noSchedule.rows.map((x) => x.display_name),
          message:
            'Membros sem janela de horário: a sugestão automática por turno usa apenas quem tem início e fim definidos; os demais entram como fallback.'
        });
      }
    }
    res.json({ ok: true, alerts });
  } catch (e) {
    console.error('[OP_TEAMS_ALERTS]', e);
    res.status(500).json({ ok: false, error: 'Erro ao carregar alertas' });
  }
});

router.get('/reports/team-activity', ...adminMw, async (req, res) => {
  try {
    const companyId = cid(req);
    const days = Math.min(90, Math.max(1, parseInt(req.query.days, 10) || 30));
    const teamFilter = req.query.team_id && isValidUUID(req.query.team_id) ? req.query.team_id : null;
    const params = [companyId, days];
    let teamClause = '';
    if (teamFilter) {
      teamClause = ' AND t.id = $3';
      params.push(teamFilter);
    }
    const r = await db.query(
      `SELECT t.id AS team_id, t.name AS team_name,
              COUNT(e.id)::int AS event_count
       FROM operational_teams t
       LEFT JOIN operational_team_members m ON m.team_id = t.id AND m.active
       LEFT JOIN operational_team_member_events e ON e.team_member_id = m.id AND e.company_id = $1
         AND e.created_at >= now() - ($2::int * interval '1 day')
       WHERE t.company_id = $1 AND t.active ${teamClause}
       GROUP BY t.id, t.name
       ORDER BY t.name`,
      params
    );
    res.json({ ok: true, data: r.rows, days });
  } catch (e) {
    console.error('[OP_TEAMS_TEAM_REPORT]', e);
    res.status(500).json({ ok: false, error: 'Erro ao gerar relatório por equipe' });
  }
});

/** Export CSV — rota alternativa sem .csv para proxies restritivos */
async function sendMemberEventsCsv(req, res) {
  try {
    const companyId = cid(req);
    const days = Math.min(90, Math.max(1, parseInt(req.query.days, 10) || 30));
    const r = await db.query(
      `SELECT t.name AS team_name, m.display_name AS member_name, e.event_type,
              e.created_at AS created_at,
              u.email AS collective_account_email
       FROM operational_team_member_events e
       JOIN operational_team_members m ON m.id = e.team_member_id
       JOIN operational_teams t ON t.id = m.team_id AND t.company_id = $1
       JOIN users u ON u.id = e.user_id
       WHERE e.company_id = $1 AND e.created_at >= now() - ($2::int * interval '1 day')
       ORDER BY e.created_at DESC`,
      [companyId, days]
    );
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines = [['equipe', 'membro', 'evento', 'data_hora_utc', 'email_conta_coletiva'].map(esc).join(';')];
    for (const row of r.rows) {
      const dt = row.created_at?.toISOString?.() || row.created_at;
      lines.push(
        [row.team_name, row.member_name, row.event_type, dt, row.collective_account_email].map(esc).join(';')
      );
    }
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="impetus-equipes-operacionais-eventos-${days}d.csv"`);
    res.send('\ufeff' + lines.join('\n'));
  } catch (e) {
    console.error('[OP_TEAMS_EXPORT_CSV]', e);
    res.status(500).json({ ok: false, error: 'Erro ao exportar CSV' });
  }
}

router.get('/exports/member-events.csv', ...adminMw, sendMemberEventsCsv);
router.get('/exports/member-events', ...adminMw, sendMemberEventsCsv);

module.exports = router;
