/**
 * ADMIN — Gestão de Equipes Operacionais (chão de fábrica)
 */
const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();
const db = require('../../db');
const { requireAuth, requireHierarchy } = require('../../middleware/auth');
const { isValidUUID } = require('../../utils/security');
const { z } = require('zod');

const adminMw = [requireAuth, requireHierarchy(1)];

const teamCreateSchema = z.object({
  name: z.string().min(2).max(120),
  department_id: z.preprocess((v) => (v === '' || v === undefined ? null : v), z.string().uuid().nullable()),
  company_role_id: z.preprocess((v) => (v === '' || v === undefined ? null : v), z.string().uuid().nullable()),
  main_shift_label: z.string().max(80).nullable().optional(),
  description: z.string().max(2000).nullable().optional()
});

const teamUpdateSchema = teamCreateSchema.partial().extend({ active: z.boolean().optional() });

const memberSchema = z.object({
  display_name: z.string().min(1).max(120),
  shift_label: z.string().max(80).nullable().optional(),
  schedule_start: z.string().max(8).nullable().optional(),
  schedule_end: z.string().max(8).nullable().optional(),
  active: z.boolean().optional(),
  sort_order: z.number().int().min(0).max(9999).optional()
});

const collectiveUserSchema = z.object({
  name: z.string().min(3).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(128)
});

function cid(req) {
  return req.user?.company_id;
}

async function assertDeptCompany(companyId, deptId) {
  if (!deptId) return true;
  const r = await db.query(`SELECT id FROM departments WHERE id = $1 AND company_id = $2`, [deptId, companyId]);
  return r.rows.length > 0;
}

async function assertRoleCompany(companyId, roleId) {
  if (!roleId) return true;
  const r = await db.query(`SELECT id FROM company_roles WHERE id = $1 AND company_id = $2 AND active`, [roleId, companyId]);
  return r.rows.length > 0;
}

router.get('/', ...adminMw, async (req, res) => {
  try {
    const companyId = cid(req);
    const r = await db.query(
      `SELECT t.*,
        (SELECT COUNT(*)::int FROM operational_team_members m WHERE m.team_id = t.id AND m.active) AS members_count
       FROM operational_teams t
       WHERE t.company_id = $1
       ORDER BY t.name`,
      [companyId]
    );
    res.json({ ok: true, teams: r.rows });
  } catch (e) {
    console.error('[OP_TEAMS_LIST]', e);
    res.status(500).json({ ok: false, error: 'Erro ao listar equipes' });
  }
});

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

/** Alertas operacionais: equipe sem login coletivo, sem membros, horários incompletos */
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

/** Eventos agregados por equipe (período em dias) */
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

/** Export CSV — eventos por membro (auditoria externa) */
router.get('/exports/member-events.csv', ...adminMw, async (req, res) => {
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
      lines.push(
        [row.team_name, row.member_name, row.event_type, row.created_at?.toISOString?.() || row.created_at, row.collective_account_email]
          .map(esc)
          .join(';')
      );
    }
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="impetus-equipes-operacionais-eventos-${days}d.csv"`);
    res.send('\ufeff' + lines.join('\n'));
  } catch (e) {
    console.error('[OP_TEAMS_EXPORT_CSV]', e);
    res.status(500).json({ ok: false, error: 'Erro ao exportar CSV' });
  }
});

router.get('/:id', ...adminMw, async (req, res) => {
  try {
    if (!isValidUUID(req.params.id)) return res.status(400).json({ ok: false, error: 'ID inválido' });
    const companyId = cid(req);
    const t = await db.query(`SELECT * FROM operational_teams WHERE id = $1 AND company_id = $2`, [req.params.id, companyId]);
    if (!t.rows.length) return res.status(404).json({ ok: false, error: 'Equipe não encontrada' });
    const members = await db.query(
      `SELECT * FROM operational_team_members WHERE team_id = $1 ORDER BY sort_order, display_name`,
      [req.params.id]
    );
    res.json({ ok: true, team: t.rows[0], members: members.rows });
  } catch (e) {
    console.error('[OP_TEAMS_GET]', e);
    res.status(500).json({ ok: false, error: 'Erro ao carregar equipe' });
  }
});

router.post('/', ...adminMw, async (req, res) => {
  try {
    const companyId = cid(req);
    const b = teamCreateSchema.parse(req.body);
    if (!(await assertDeptCompany(companyId, b.department_id))) {
      return res.status(400).json({ ok: false, error: 'Departamento inválido' });
    }
    if (!(await assertRoleCompany(companyId, b.company_role_id))) {
      return res.status(400).json({ ok: false, error: 'Cargo estrutural inválido' });
    }
    const ins = await db.query(
      `INSERT INTO operational_teams (company_id, name, department_id, company_role_id, main_shift_label, description)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [companyId, b.name, b.department_id, b.company_role_id, b.main_shift_label || null, b.description || null]
    );
    res.status(201).json({ ok: true, team: ins.rows[0] });
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ ok: false, error: 'Dados inválidos', details: e.errors });
    console.error('[OP_TEAMS_CREATE]', e);
    res.status(500).json({ ok: false, error: 'Erro ao criar equipe' });
  }
});

router.put('/:id', ...adminMw, async (req, res) => {
  try {
    if (!isValidUUID(req.params.id)) return res.status(400).json({ ok: false, error: 'ID inválido' });
    const companyId = cid(req);
    const b = teamUpdateSchema.parse(req.body);
    if (b.department_id !== undefined && b.department_id !== null && !(await assertDeptCompany(companyId, b.department_id))) {
      return res.status(400).json({ ok: false, error: 'Departamento inválido' });
    }
    if (b.company_role_id !== undefined && b.company_role_id !== null && !(await assertRoleCompany(companyId, b.company_role_id))) {
      return res.status(400).json({ ok: false, error: 'Cargo estrutural inválido' });
    }
    const r = await db.query(
      `UPDATE operational_teams SET
        name = COALESCE($3, name),
        department_id = COALESCE($4, department_id),
        company_role_id = COALESCE($5, company_role_id),
        main_shift_label = COALESCE($6, main_shift_label),
        description = COALESCE($7, description),
        active = COALESCE($8, active),
        updated_at = now()
       WHERE id = $2 AND company_id = $1
       RETURNING *`,
      [
        companyId,
        req.params.id,
        b.name,
        b.department_id,
        b.company_role_id,
        b.main_shift_label,
        b.description,
        b.active
      ]
    );
    if (!r.rows.length) return res.status(404).json({ ok: false, error: 'Equipe não encontrada' });
    res.json({ ok: true, team: r.rows[0] });
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ ok: false, error: 'Dados inválidos', details: e.errors });
    console.error('[OP_TEAMS_UPDATE]', e);
    res.status(500).json({ ok: false, error: 'Erro ao atualizar equipe' });
  }
});

router.post('/:id/members', ...adminMw, async (req, res) => {
  try {
    if (!isValidUUID(req.params.id)) return res.status(400).json({ ok: false, error: 'ID inválido' });
    const companyId = cid(req);
    const b = memberSchema.parse(req.body);
    const ok = await db.query(`SELECT id FROM operational_teams WHERE id = $1 AND company_id = $2 AND active`, [req.params.id, companyId]);
    if (!ok.rows.length) return res.status(404).json({ ok: false, error: 'Equipe não encontrada' });
    const ins = await db.query(
      `INSERT INTO operational_team_members (team_id, display_name, shift_label, schedule_start, schedule_end, sort_order)
       VALUES ($1,$2,$3,$4::time,$5::time,$6) RETURNING *`,
      [
        req.params.id,
        b.display_name,
        b.shift_label || null,
        b.schedule_start || null,
        b.schedule_end || null,
        b.sort_order ?? 0
      ]
    );
    res.status(201).json({ ok: true, member: ins.rows[0] });
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ ok: false, error: 'Dados inválidos', details: e.errors });
    console.error('[OP_TEAM_MEMBER_CREATE]', e);
    res.status(500).json({ ok: false, error: 'Erro ao cadastrar membro' });
  }
});

router.put('/:id/members/:memberId', ...adminMw, async (req, res) => {
  try {
    if (!isValidUUID(req.params.id) || !isValidUUID(req.params.memberId)) {
      return res.status(400).json({ ok: false, error: 'ID inválido' });
    }
    const companyId = cid(req);
    const b = memberSchema.partial().parse(req.body);
    const chk = await db.query(
      `SELECT m.id FROM operational_team_members m
       JOIN operational_teams t ON t.id = m.team_id AND t.company_id = $1 AND t.id = $2
       WHERE m.id = $3`,
      [companyId, req.params.id, req.params.memberId]
    );
    if (!chk.rows.length) return res.status(404).json({ ok: false, error: 'Membro não encontrado' });

    const cur = await db.query(`SELECT * FROM operational_team_members WHERE id = $1`, [req.params.memberId]);
    const row = cur.rows[0];
    const display_name = b.display_name !== undefined ? b.display_name : row.display_name;
    const shift_label = b.shift_label !== undefined ? b.shift_label : row.shift_label;
    const schedule_start = b.schedule_start !== undefined ? b.schedule_start : row.schedule_start;
    const schedule_end = b.schedule_end !== undefined ? b.schedule_end : row.schedule_end;
    const active = b.active !== undefined ? b.active : row.active;
    const sort_order = b.sort_order !== undefined ? b.sort_order : row.sort_order;

    const r = await db.query(
      `UPDATE operational_team_members SET
        display_name = $1, shift_label = $2, schedule_start = $3::time, schedule_end = $4::time,
        active = $5, sort_order = $6, updated_at = now()
       WHERE id = $7
       RETURNING *`,
      [display_name, shift_label, schedule_start, schedule_end, active, sort_order, req.params.memberId]
    );
    res.json({ ok: true, member: r.rows[0] });
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ ok: false, error: 'Dados inválidos', details: e.errors });
    console.error('[OP_TEAM_MEMBER_UPDATE]', e);
    res.status(500).json({ ok: false, error: 'Erro ao atualizar membro' });
  }
});

router.delete('/:id/members/:memberId', ...adminMw, async (req, res) => {
  try {
    if (!isValidUUID(req.params.id) || !isValidUUID(req.params.memberId)) {
      return res.status(400).json({ ok: false, error: 'ID inválido' });
    }
    const companyId = cid(req);
    const r = await db.query(
      `UPDATE operational_team_members m SET active = false, updated_at = now()
       FROM operational_teams t
       WHERE m.id = $3 AND m.team_id = t.id AND t.id = $2 AND t.company_id = $1
       RETURNING m.id`,
      [companyId, req.params.id, req.params.memberId]
    );
    if (!r.rows.length) return res.status(404).json({ ok: false, error: 'Membro não encontrado' });
    res.json({ ok: true });
  } catch (e) {
    console.error('[OP_TEAM_MEMBER_DELETE]', e);
    res.status(500).json({ ok: false, error: 'Erro ao remover membro' });
  }
});

/**
 * Cria utilizador de login coletivo (colaborador, chão de fábrica) vinculado à equipe.
 */
router.post('/:id/collective-user', ...adminMw, async (req, res) => {
  try {
    if (!isValidUUID(req.params.id)) return res.status(400).json({ ok: false, error: 'ID inválido' });
    const companyId = cid(req);
    const b = collectiveUserSchema.parse(req.body);

    const teamR = await db.query(`SELECT * FROM operational_teams WHERE id = $1 AND company_id = $2 AND active`, [req.params.id, companyId]);
    if (!teamR.rows.length) return res.status(404).json({ ok: false, error: 'Equipe não encontrada' });
    const team = teamR.rows[0];

    const ex = await db.query(`SELECT id FROM users WHERE lower(trim(email)) = lower(trim($1)) AND deleted_at IS NULL`, [b.email]);
    if (ex.rows.length) return res.status(409).json({ ok: false, error: 'Email já cadastrado', code: 'EMAIL_EXISTS' });

    const existingTeamUser = await db.query(
      `SELECT id FROM users WHERE operational_team_id = $1 AND is_factory_team_account AND deleted_at IS NULL`,
      [team.id]
    );
    if (existingTeamUser.rows.length) {
      return res.status(400).json({ ok: false, error: 'Esta equipe já possui conta de login coletivo.' });
    }

    const passwordHash = await bcrypt.hash(b.password, 10);
    const displayName = b.name.trim();

    const ins = await db.query(
      `INSERT INTO users (
        company_id, name, email, password_hash, role, area, hierarchy_level,
        job_title, is_factory_team_account, operational_team_id, active, permissions
      ) VALUES (
        $1, $2, $3, $4, 'colaborador', 'Colaborador', 5,
        $5, true, $6, true, '[]'::jsonb
      ) RETURNING id, name, email, role, is_factory_team_account, operational_team_id`,
      [companyId, displayName, b.email.trim().toLowerCase(), passwordHash, `${team.name} (equipe)`, team.id]
    );

    res.status(201).json({ ok: true, user: ins.rows[0] });
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ ok: false, error: 'Dados inválidos', details: e.errors });
    console.error('[OP_TEAMS_COLLECTIVE_USER]', e);
    res.status(500).json({ ok: false, error: 'Erro ao criar utilizador coletivo' });
  }
});

module.exports = router;
