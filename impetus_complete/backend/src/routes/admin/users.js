/**
 * ROTAS DE ADMINISTRAÇÃO DE USUÁRIOS
 * Gestão completa de usuários (RBAC)
 */

const express = require('express');
const router = express.Router();
const db = require('../../db');
const { requireAuth, requireHierarchy, hashPassword, generateToken, createSession } = require('../../middleware/auth');
const { auditMiddleware, logAction } = require('../../middleware/audit');
const { validate, resetPasswordSchema } = require('../../utils/validation');
const { sanitizeSearchTerm, isValidUUID } = require('../../utils/security');
const { z } = require('zod');

// Schemas de validação
const AREA_OPTIONS = ['Direção', 'Gerência', 'Coordenação', 'Supervisão', 'Colaborador'];
const AREA_TO_LEVEL = { Direção: 1, Gerência: 2, Coordenação: 3, Supervisão: 4, Colaborador: 5 };

const createUserSchema = z.object({
  name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres').max(100),
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Senha deve ter no mínimo 8 caracteres')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Senha deve conter maiúscula, minúscula e número'),
  role: z.enum(['colaborador', 'supervisor', 'coordenador', 'gerente', 'diretor', 'ceo']),
  area: z.enum(AREA_OPTIONS).optional(),
  job_title: z.preprocess(v => (typeof v === 'string' ? v.trim() : v), z.string().max(120).optional()),
  department: z.preprocess(v => (typeof v === 'string' ? v.trim().toLowerCase().replace(/\s+/g, ' ') : v), z.string().max(80).optional()),
  department_id: z.preprocess(v => v === '' ? undefined : v, z.string().uuid().optional()),
  phone: z.preprocess(v => v === '' ? undefined : v, z.string().optional()),
  whatsapp_number: z.preprocess(v => v === '' ? undefined : v, z.string().optional()),
  hierarchy_level: z.preprocess(
    v => {
      if (v === '' || v === undefined || v === null) return 5;
      const n = typeof v === 'string' ? parseInt(v, 10) : Number(v);
      return Number.isNaN(n) ? 5 : Math.max(0, Math.min(5, n));
    },
    z.number().int().min(0).max(5)
  ),
  permissions: z.array(z.string()).optional()
}).refine((data) => {
  if (data.role === 'ceo') {
    const w = (data.whatsapp_number || '').trim();
    return w.length >= 10;
  }
  return true;
}, { message: 'CEO deve ter WhatsApp cadastrado (obrigatório para Modo Executivo)', path: ['whatsapp_number'] });

const updateUserSchema = z.object({
  name: z.string().min(3).max(100).optional(),
  email: z.string().email().optional(),
  role: z.enum(['colaborador', 'supervisor', 'coordenador', 'gerente', 'diretor', 'ceo']).optional(),
  area: z.enum(AREA_OPTIONS).nullable().optional(),
  job_title: z.preprocess(v => (typeof v === 'string' ? v.trim() : v), z.string().max(120).nullable().optional()),
  department: z.preprocess(v => (typeof v === 'string' ? v.trim().toLowerCase().replace(/\s+/g, ' ') : v), z.string().max(80).nullable().optional()),
  department_id: z.preprocess(v => v === '' ? undefined : v, z.string().uuid().nullable().optional()),
  phone: z.preprocess(v => v === '' ? undefined : v, z.string().nullable().optional()),
  whatsapp_number: z.preprocess(v => v === '' ? undefined : v, z.string().nullable().optional()),
  executive_verified: z.boolean().optional(),
  hierarchy_level: z.preprocess(
    v => {
      if (v === '' || v === undefined || v === null) return undefined;
      const n = typeof v === 'string' ? parseInt(v, 10) : Number(v);
      return Number.isNaN(n) ? undefined : Math.max(0, Math.min(5, n));
    },
    z.number().int().min(0).max(5).optional()
  ),
  permissions: z.array(z.string()).optional(),
  active: z.boolean().optional()
});

/**
 * GET /api/admin/users
 * Listar usuários (apenas administrador)
 */
router.get('/', 
  requireAuth, 
  requireHierarchy(1),
  async (req, res) => {
    try {
      const { 
        limit = 50, 
        offset = 0,
        search,
        role,
        department_id,
        active,
        hierarchy_level
      } = req.query;

      let conditions = ['u.company_id = $1'];
      const params = [req.user.company_id];
      let paramCount = 1;

      if (search) {
        paramCount++;
        const safeSearch = sanitizeSearchTerm(search);
        conditions.push(`(u.name ILIKE $${paramCount} OR u.email ILIKE $${paramCount})`);
        params.push(`%${safeSearch}%`);
      }

      if (role) {
        paramCount++;
        conditions.push(`u.role = $${paramCount}`);
        params.push(role);
      }

      if (department_id) {
        paramCount++;
        conditions.push(`u.department_id = $${paramCount}`);
        params.push(department_id);
      }

      if (active !== undefined) {
        paramCount++;
        conditions.push(`u.active = $${paramCount}`);
        params.push(active === 'true');
      }

      if (hierarchy_level !== undefined && hierarchy_level !== '') {
        const level = parseInt(hierarchy_level, 10);
        if (!Number.isNaN(level) && level >= 0 && level <= 5) {
          paramCount++;
          conditions.push(`u.hierarchy_level = $${paramCount}`);
          params.push(level);
        }
      }

      const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
      const safeOffset = Math.max(0, parseInt(offset, 10) || 0);

      const whereClause = conditions.join(' AND ');

      const result = await db.query(`
        SELECT 
          u.id, u.name, u.email, u.role, u.phone, u.whatsapp_number,
          u.avatar_url, u.hierarchy_level, u.area, u.job_title, u.department,
          u.permissions, u.active, u.executive_verified,
          u.created_at, u.last_login, u.last_seen,
          u.lgpd_consent, u.lgpd_consent_date,
          d.name as department_name,
          d.id as department_id,
          (SELECT COUNT(*) FROM sessions s WHERE s.user_id = u.id AND s.expires_at > now()) as active_sessions
        FROM users u
        LEFT JOIN departments d ON u.department_id = d.id
        WHERE ${whereClause} AND u.deleted_at IS NULL
        ORDER BY u.created_at DESC
        LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
      `, [...params, safeLimit, safeOffset]);

      const countResult = await db.query(`
        SELECT COUNT(*) as total
        FROM users u
        WHERE ${whereClause} AND u.deleted_at IS NULL
      `, params);

      res.json({
        ok: true,
        users: result.rows,
        pagination: {
          total: parseInt(countResult.rows[0]?.total ?? 0, 10) || 0,
          limit: safeLimit,
          offset: safeOffset
        }
      });

    } catch (err) {
      console.error('[ADMIN_LIST_USERS_ERROR]', err);
      res.status(500).json({
        ok: false,
        error: 'Erro ao listar usuários'
      });
    }
});

/**
 * GET /api/admin/users/:id
 * Buscar usuário específico
 */
router.get('/:id', 
  requireAuth, 
  requireHierarchy(1),
  async (req, res) => {
    try {
      if (!isValidUUID(req.params.id)) return res.status(400).json({ ok: false, error: 'ID inválido' });
      const result = await db.query(`
        SELECT 
          u.*,
          d.name as department_name,
          c.name as company_name,
          (SELECT COUNT(*) FROM sessions s WHERE s.user_id = u.id AND s.expires_at > now()) as active_sessions,
          (SELECT json_agg(json_build_object('id', s.id, 'ip_address', s.ip_address, 'user_agent', s.user_agent, 'created_at', s.created_at, 'last_activity', s.last_activity))
           FROM sessions s WHERE s.user_id = u.id AND s.expires_at > now()) as sessions
        FROM users u
        LEFT JOIN departments d ON u.department_id = d.id
        LEFT JOIN companies c ON u.company_id = c.id
        WHERE u.id = $1 AND u.company_id = $2 AND u.deleted_at IS NULL
      `, [req.params.id, req.user.company_id]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          ok: false,
          error: 'Usuário não encontrado'
        });
      }

      res.json({
        ok: true,
        user: result.rows[0]
      });

    } catch (err) {
      console.error('[ADMIN_GET_USER_ERROR]', err);
      res.status(500).json({
        ok: false,
        error: 'Erro ao buscar usuário'
      });
    }
});

/**
 * POST /api/admin/users
 * Criar novo usuário
 */
router.post('/', 
  requireAuth, 
  requireHierarchy(1),
  auditMiddleware({ 
    action: 'user_created', 
    entityType: 'user',
    severity: 'info'
  }),
  async (req, res) => {
    try {
      if (!req.user.company_id) {
        return res.status(400).json({
          ok: false,
          error: 'Não é possível criar usuário: sua conta não está vinculada a uma empresa',
          code: 'NO_COMPANY'
        });
      }

      // Validar dados
      const validatedData = createUserSchema.parse(req.body);

      // Verificar se email já existe
      const existingUser = await db.query(
        'SELECT id FROM users WHERE email = $1 AND deleted_at IS NULL',
        [validatedData.email]
      );

      if (existingUser.rows.length > 0) {
        return res.status(409).json({
          ok: false,
          error: 'Email já está em uso',
          code: 'EMAIL_ALREADY_EXISTS'
        });
      }

      // Hash da senha
      const passwordHash = hashPassword(validatedData.password);

      const area = validatedData.area || null;
      const hierarchyLevel = validatedData.role === 'ceo' ? 0 : (area ? AREA_TO_LEVEL[area] : (validatedData.hierarchy_level ?? 5));

      // Criar usuário (CEO: executive_verified = false até verificação via WhatsApp)
      const result = await db.query(`
        INSERT INTO users (
          company_id, name, email, password_hash, role,
          area, job_title, department, department_id, phone, whatsapp_number,
          hierarchy_level, permissions, active, executive_verified
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, true, $14)
        RETURNING id, name, email, role, hierarchy_level, area, job_title, department, created_at
      `, [
        req.user.company_id,
        validatedData.name,
        validatedData.email,
        passwordHash,
        validatedData.role,
        area,
        validatedData.job_title || null,
        validatedData.department || null,
        validatedData.department_id || null,
        validatedData.phone || null,
        validatedData.whatsapp_number || null,
        validatedData.role === 'ceo' ? 0 : hierarchyLevel,
        JSON.stringify(validatedData.permissions || []),
        false
      ]);

      // Log de auditoria
      await logAction({
        companyId: req.user.company_id,
        userId: req.user.id,
        action: 'user_created',
        entityType: 'user',
        entityId: result.rows[0].id,
        details: { 
          created_user: validatedData.email,
          role: validatedData.role 
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      res.status(201).json({
        ok: true,
        user: result.rows[0],
        message: 'Usuário criado com sucesso'
      });

    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          ok: false,
          error: 'Dados inválidos',
          details: err.errors
        });
      }

      console.error('[ADMIN_CREATE_USER_ERROR]', err);
      res.status(500).json({
        ok: false,
        error: 'Erro ao criar usuário'
      });
    }
});

/**
 * PUT /api/admin/users/:id
 * Atualizar usuário
 */
router.put('/:id', 
  requireAuth, 
  requireHierarchy(1),
  auditMiddleware({ 
    action: 'user_updated', 
    entityType: 'user',
    severity: 'info'
  }),
  async (req, res) => {
    try {
      if (!isValidUUID(req.params.id)) {
        return res.status(400).json({ ok: false, error: 'ID inválido' });
      }

      // Validar dados
      const validatedData = updateUserSchema.parse(req.body);

      // Verificar se usuário existe
      const existingUser = await db.query(
        'SELECT id, email FROM users WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL',
        [req.params.id, req.user.company_id]
      );

      if (existingUser.rows.length === 0) {
        return res.status(404).json({
          ok: false,
          error: 'Usuário não encontrado'
        });
      }

      // Se está mudando email, verificar se já existe
      if (validatedData.email && validatedData.email !== existingUser.rows[0].email) {
        const emailExists = await db.query(
          'SELECT id FROM users WHERE email = $1 AND id != $2 AND deleted_at IS NULL',
          [validatedData.email, req.params.id]
        );

        if (emailExists.rows.length > 0) {
          return res.status(409).json({
            ok: false,
            error: 'Email já está em uso',
            code: 'EMAIL_ALREADY_EXISTS'
          });
        }
      }

      // Sincronizar hierarchy_level quando area muda
      if (validatedData.area) {
        validatedData.hierarchy_level = validatedData.area === 'Direção' ? 1 : AREA_TO_LEVEL[validatedData.area] ?? validatedData.hierarchy_level;
      }

      // Construir query de update
      const updateFields = [];
      const params = [];
      let paramCount = 0;

      Object.keys(validatedData).forEach(key => {
        if (validatedData[key] !== undefined) {
          paramCount++;
          if (key === 'permissions') {
            updateFields.push(`${key} = $${paramCount}::jsonb`);
            params.push(JSON.stringify(validatedData[key]));
          } else if (key === 'executive_verified') {
            updateFields.push(`${key} = $${paramCount}`);
            params.push(!!validatedData[key]);
          } else {
            updateFields.push(`${key} = $${paramCount}`);
            params.push(validatedData[key]);
          }
        }
      });

      updateFields.push('updated_at = now()');
      params.push(req.params.id, req.user.company_id);

      const result = await db.query(`
        UPDATE users
        SET ${updateFields.join(', ')}
        WHERE id = $${paramCount + 1} AND company_id = $${paramCount + 2} AND deleted_at IS NULL
        RETURNING id, name, email, role, hierarchy_level, active, updated_at
      `, params);

      // Log de auditoria
      await logAction({
        companyId: req.user.company_id,
        userId: req.user.id,
        action: 'user_updated',
        entityType: 'user',
        entityId: req.params.id,
        details: { updated_fields: Object.keys(validatedData) },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      res.json({
        ok: true,
        user: result.rows[0],
        message: 'Usuário atualizado com sucesso'
      });

    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          ok: false,
          error: 'Dados inválidos',
          details: err.errors
        });
      }

      console.error('[ADMIN_UPDATE_USER_ERROR]', err);
      res.status(500).json({
        ok: false,
        error: 'Erro ao atualizar usuário'
      });
    }
});

/**
 * DELETE /api/admin/users/:id
 * Desativar usuário (soft delete)
 */
router.delete('/:id', 
  requireAuth, 
  requireHierarchy(1), // Apenas diretores
  auditMiddleware({ 
    action: 'user_deleted', 
    entityType: 'user',
    severity: 'warning'
  }),
  async (req, res) => {
    try {
      // Não permitir que usuário delete a si mesmo
      if (req.params.id === req.user.id) {
        return res.status(400).json({
          ok: false,
          error: 'Você não pode desativar sua própria conta',
          code: 'CANNOT_DELETE_SELF'
        });
      }

      const result = await db.query(`
        UPDATE users
        SET active = false, deleted_at = now()
        WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL
        RETURNING id, name, email
      `, [req.params.id, req.user.company_id]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          ok: false,
          error: 'Usuário não encontrado'
        });
      }

      // Invalidar todas as sessões do usuário
      await db.query('DELETE FROM sessions WHERE user_id = $1', [req.params.id]);

      // Log de auditoria
      await logAction({
        companyId: req.user.company_id,
        userId: req.user.id,
        action: 'user_deleted',
        entityType: 'user',
        entityId: req.params.id,
        details: { deleted_user: result.rows[0].email },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        severity: 'warning'
      });

      res.json({
        ok: true,
        message: 'Usuário desativado com sucesso'
      });

    } catch (err) {
      console.error('[ADMIN_DELETE_USER_ERROR]', err);
      res.status(500).json({
        ok: false,
        error: 'Erro ao desativar usuário'
      });
    }
});

/**
 * POST /api/admin/users/:id/reset-password
 * Resetar senha do usuário
 */
router.post('/:id/reset-password', 
  requireAuth, 
  requireHierarchy(1),
  validate(resetPasswordSchema),
  auditMiddleware({ 
    action: 'user_password_reset', 
    entityType: 'user',
    severity: 'warning'
  }),
  async (req, res) => {
    try {
      const { new_password } = req.body;
      const passwordHash = hashPassword(new_password);

      const result = await db.query(`
        UPDATE users
        SET password_hash = $1, updated_at = now()
        WHERE id = $2 AND company_id = $3 AND deleted_at IS NULL
        RETURNING id, name, email
      `, [passwordHash, req.params.id, req.user.company_id]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          ok: false,
          error: 'Usuário não encontrado'
        });
      }

      // Invalidar todas as sessões do usuário
      await db.query('DELETE FROM sessions WHERE user_id = $1', [req.params.id]);

      // Log de auditoria
      await logAction({
        companyId: req.user.company_id,
        userId: req.user.id,
        action: 'user_password_reset',
        entityType: 'user',
        entityId: req.params.id,
        details: { target_user: result.rows[0].email },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        severity: 'warning'
      });

      res.json({
        ok: true,
        message: 'Senha resetada com sucesso. Todas as sessões foram invalidadas.'
      });

    } catch (err) {
      console.error('[ADMIN_RESET_PASSWORD_ERROR]', err);
      res.status(500).json({
        ok: false,
        error: 'Erro ao resetar senha'
      });
    }
});

/**
 * DELETE /api/admin/users/:userId/sessions/:sessionId
 * Encerrar sessão específica de um usuário
 */
router.delete('/:userId/sessions/:sessionId', 
  requireAuth, 
  requireHierarchy(1),
  auditMiddleware({ 
    action: 'user_session_terminated', 
    entityType: 'session',
    severity: 'warning'
  }),
  async (req, res) => {
    try {
      const result = await db.query(`
        DELETE FROM sessions
        WHERE id = $1 AND user_id = $2
        RETURNING id, user_id
      `, [req.params.sessionId, req.params.userId]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          ok: false,
          error: 'Sessão não encontrada'
        });
      }

      // Log de auditoria
      await logAction({
        companyId: req.user.company_id,
        userId: req.user.id,
        action: 'user_session_terminated',
        entityType: 'session',
        entityId: req.params.sessionId,
        details: { 
          terminated_user: req.params.userId,
          session_id: req.params.sessionId
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        severity: 'warning'
      });

      res.json({
        ok: true,
        message: 'Sessão encerrada com sucesso'
      });

    } catch (err) {
      console.error('[ADMIN_TERMINATE_SESSION_ERROR]', err);
      res.status(500).json({
        ok: false,
        error: 'Erro ao encerrar sessão'
      });
    }
});

/**
 * GET /api/admin/users/stats/summary
 * Estatísticas de usuários
 */
router.get('/stats/summary', 
  requireAuth, 
  requireHierarchy(1),
  async (req, res) => {
    try {
      const stats = await db.query(`
        SELECT
          COUNT(*) FILTER (WHERE active = true) as active_users,
          COUNT(*) FILTER (WHERE active = false) as inactive_users,
          COUNT(*) FILTER (WHERE role = 'diretor') as directors,
          COUNT(*) FILTER (WHERE role = 'gerente') as managers,
          COUNT(*) FILTER (WHERE role = 'supervisor') as supervisors,
          COUNT(*) FILTER (WHERE role = 'colaborador') as collaborators,
          COUNT(*) FILTER (WHERE last_login > now() - interval '24 hours') as active_last_24h,
          COUNT(*) FILTER (WHERE created_at > now() - interval '30 days') as created_last_30d
        FROM users
        WHERE company_id = $1 AND deleted_at IS NULL
      `, [req.user.company_id]);

      res.json({
        ok: true,
        stats: stats.rows[0]
      });

    } catch (err) {
      console.error('[ADMIN_USER_STATS_ERROR]', err);
      res.status(500).json({
        ok: false,
        error: 'Erro ao buscar estatísticas'
      });
    }
});

module.exports = router;
