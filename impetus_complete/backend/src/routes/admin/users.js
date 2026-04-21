/**
 * ROTAS DE ADMINISTRAÇÃO DE USUÁRIOS
 * Gestão completa de usuários (RBAC)
 */

const express = require('express');
const router = express.Router();
const db = require('../../db');
const { requireAuth, requireHierarchy, hashPassword, generateToken, createSession } = require('../../middleware/auth');
const { invalidateScopeCache } = require('../../middleware/hierarchyScope');
const { auditMiddleware, logAction } = require('../../middleware/audit');
const { validate, resetPasswordSchema } = require('../../utils/validation');
const { sanitizeSearchTerm, isValidUUID } = require('../../utils/security');
const { z } = require('zod');
const orgVal = require('../../services/organizationalValidationService');

// Schemas de validação
const AREA_OPTIONS = ['Direção', 'Gerência', 'Coordenação', 'Supervisão', 'Colaborador'];
const AREA_TO_LEVEL = { Direção: 1, Gerência: 2, Coordenação: 3, Supervisão: 4, Colaborador: 5 };
/** Área funcional para dashboard inteligente: production, maintenance, quality, etc. */
const FUNCTIONAL_AREA_OPTIONS = ['production', 'maintenance', 'quality', 'operations', 'pcp', 'hr', 'finance', 'admin'];

function normalizeAreaLabel(value) {
  const v = String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
  if (!v) return null;
  if (v === 'direcao') return 'Direção';
  if (v === 'gerencia') return 'Gerência';
  if (v === 'coordenacao') return 'Coordenação';
  if (v === 'supervisao') return 'Supervisão';
  if (v === 'colaborador') return 'Colaborador';
  return String(value).trim();
}

function normalizeRoleAlias(body) {
  const b = body && typeof body === 'object' ? { ...body } : {};
  if (b.company_role_id === undefined && b.structural_role_id !== undefined) {
    b.company_role_id = b.structural_role_id;
  }
  return b;
}

async function assertRoleCompany(companyId, roleId) {
  if (!roleId) return true;
  const r = await db.query(
    `SELECT id FROM company_roles WHERE id = $1 AND company_id = $2 AND active`,
    [roleId, companyId]
  );
  return r.rows.length > 0;
}

const createUserSchema = z.object({
  name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres').max(100),
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Senha deve ter no mínimo 8 caracteres')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Senha deve conter maiúscula, minúscula e número'),
  role: z.enum(['colaborador', 'supervisor', 'coordenador', 'gerente', 'diretor', 'ceo']),
  area: z.preprocess(v => (typeof v === 'string' ? v.trim() : v), z.string().min(2).max(80).optional()),
  job_title: z.preprocess(v => (typeof v === 'string' ? v.trim() : v), z.string().max(120).optional()),
  department: z.preprocess(v => (typeof v === 'string' ? v.trim().toLowerCase().replace(/\s+/g, ' ') : v), z.string().max(80).optional()),
  department_id: z.preprocess(v => v === '' ? undefined : v, z.string().uuid().optional()),
  supervisor_id: z.preprocess(v => v === '' ? undefined : v, z.string().uuid().nullable().optional()),
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
  permissions: z.array(z.string()).optional(),
  functional_area: z.enum(FUNCTIONAL_AREA_OPTIONS).optional(),
  hr_responsibilities: z.preprocess(v => (typeof v === 'string' ? v.trim() : v), z.string().max(2000).nullable().optional()),
  descricao: z.preprocess(v => (typeof v === 'string' ? v.trim() : v), z.string().max(2000).nullable().optional()),
  company_role_id: z.preprocess((v) => {
    if (v === '' || v === null || v === undefined) return undefined;
    const s = typeof v === 'string' ? v.trim() : String(v).trim();
    return s === '' ? undefined : s;
  }, z.string().uuid().optional())
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
  area: z.preprocess(v => (typeof v === 'string' ? v.trim() : v), z.string().min(2).max(80).nullable().optional()),
  job_title: z.preprocess(v => (typeof v === 'string' ? v.trim() : v), z.string().max(120).nullable().optional()),
  department: z.preprocess(v => (typeof v === 'string' ? v.trim().toLowerCase().replace(/\s+/g, ' ') : v), z.string().max(80).nullable().optional()),
  department_id: z.preprocess(v => v === '' ? undefined : v, z.string().uuid().nullable().optional()),
  supervisor_id: z.preprocess(v => v === '' ? undefined : v, z.string().uuid().nullable().optional()),
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
  active: z.boolean().optional(),
  functional_area: z.enum(FUNCTIONAL_AREA_OPTIONS).nullable().optional(),
  dashboard_profile: z.string().max(64).nullable().optional(),
  hr_responsibilities: z.preprocess(v => (typeof v === 'string' ? v.trim() : v), z.string().max(2000).nullable().optional()),
  descricao: z.preprocess(v => (typeof v === 'string' ? v.trim() : v), z.string().max(2000).nullable().optional()),
  company_role_id: z.preprocess((v) => {
    if (v === null) return null;
    if (v === '' || v === undefined) return undefined;
    const s = typeof v === 'string' ? v.trim() : String(v).trim();
    return s === '' ? undefined : s;
  }, z.union([z.string().uuid(), z.null()]).optional())
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
          u.functional_area, u.dashboard_profile,
          u.supervisor_id, u.permissions, u.active, u.executive_verified,
          u.hr_responsibilities,
          u.descricao,
          u.company_role_id,
          u.company_role_id as structural_role_id,
          u.created_at, u.last_login, u.last_seen,
          u.lgpd_consent, u.lgpd_consent_date,
          d.name as department_name,
          d.id as department_id,
          cr.name as structural_role_name,
          (SELECT COUNT(*) FROM sessions s WHERE s.user_id = u.id AND s.expires_at > now()) as active_sessions
        FROM users u
        LEFT JOIN departments d ON u.department_id = d.id
        LEFT JOIN company_roles cr ON cr.id = u.company_role_id
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
      const validatedData = createUserSchema.parse(normalizeRoleAlias(req.body));
      if (validatedData.hr_responsibilities !== undefined && validatedData.descricao === undefined) {
        validatedData.descricao = validatedData.hr_responsibilities;
      } else if (validatedData.descricao !== undefined && validatedData.hr_responsibilities === undefined) {
        validatedData.hr_responsibilities = validatedData.descricao;
      }
      if (validatedData.company_role_id && !(await assertRoleCompany(req.user.company_id, validatedData.company_role_id))) {
        return res.status(400).json({ ok: false, error: 'Cargo estrutural inválido ou inativo' });
      }

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

      const area = validatedData.area ? normalizeAreaLabel(validatedData.area) : null;
      const hierarchyLevel = validatedData.role === 'ceo'
        ? 0
        : (area && AREA_TO_LEVEL[area] ? AREA_TO_LEVEL[area] : (validatedData.hierarchy_level ?? 5));

      let hrResponsibilitiesParsed = [];
      const hrText = validatedData.hr_responsibilities || validatedData.descricao || '';
      if (hrText) {
        try {
          const hrService = require('../../services/hrIntelligenceService');
          hrResponsibilitiesParsed = hrService.parseResponsibilities(hrText);
        } catch (_) {}
      }

      // Criar usuário (CEO: executive_verified = false até verificação via WhatsApp)
      const result = await db.query(`
        INSERT INTO users (
          company_id, name, email, password_hash, role,
          area, job_title, department, department_id, supervisor_id, phone, whatsapp_number,
          hierarchy_level, permissions, active, executive_verified, functional_area,
          hr_responsibilities, hr_responsibilities_parsed, company_role_id
          , descricao
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, true, $15, $16, $17, $18::jsonb, $19, $20)
        RETURNING id, name, email, role, hierarchy_level, area, job_title, department, functional_area, hr_responsibilities, descricao, company_role_id, created_at
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
        validatedData.supervisor_id || null,
        validatedData.phone || null,
        validatedData.whatsapp_number || null,
        validatedData.role === 'ceo' ? 0 : hierarchyLevel,
        JSON.stringify(validatedData.permissions || []),
        false,
        validatedData.functional_area || null,
        hrText || null,
        JSON.stringify(hrResponsibilitiesParsed),
        validatedData.company_role_id || null,
        hrText || null
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

      try {
        await orgVal.syncAfterUserProfileChange(result.rows[0].id, req.user.company_id, {
          beforeSnapshot: null,
          actorUserId: req.user.id,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent']
        });
      } catch (e) {
        console.error('[ADMIN_CREATE_USER_ORG_VALIDATION_SYNC_ERROR]', e);
      }

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
      const validatedData = updateUserSchema.parse(normalizeRoleAlias(req.body));
      if (validatedData.hr_responsibilities !== undefined && validatedData.descricao === undefined) {
        validatedData.descricao = validatedData.hr_responsibilities;
      } else if (validatedData.descricao !== undefined && validatedData.hr_responsibilities === undefined) {
        validatedData.hr_responsibilities = validatedData.descricao;
      }
      if (Object.prototype.hasOwnProperty.call(validatedData, 'company_role_id')) {
        const roleId = validatedData.company_role_id;
        if (roleId !== null && !(await assertRoleCompany(req.user.company_id, roleId))) {
          return res.status(400).json({ ok: false, error: 'Cargo estrutural inválido ou inativo' });
        }
      }

      // Verificar se usuário existe + snapshot para detecção de alterações sensíveis
      const existingUser = await db.query(
        `SELECT
           u.id, u.email, u.name, u.department_id, u.functional_area, u.hierarchy_level,
           u.role, u.area, u.job_title, u.company_role_id, u.hr_responsibilities, u.supervisor_id,
           u.updated_at, d.name as department_name, cr.name as structural_role_name
         FROM users u
         LEFT JOIN departments d ON d.id = u.department_id
         LEFT JOIN company_roles cr ON cr.id = u.company_role_id
         WHERE u.id = $1 AND u.company_id = $2 AND u.deleted_at IS NULL`,
        [req.params.id, req.user.company_id]
      );

      if (existingUser.rows.length === 0) {
        return res.status(404).json({
          ok: false,
          error: 'Usuário não encontrado'
        });
      }

      const beforeSnapshot = orgVal.snapshotFromUserRow(existingUser.rows[0]);

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
        const normalizedArea = normalizeAreaLabel(validatedData.area);
        validatedData.area = normalizedArea;
        validatedData.hierarchy_level = normalizedArea === 'Direção' ? 1 : AREA_TO_LEVEL[normalizedArea] ?? validatedData.hierarchy_level;
      }

      // Construir query de update
      const updateFields = [];
      const params = [];
      let paramCount = 0;

      let hrResponsibilitiesParsed = null;
      Object.keys(validatedData).forEach(key => {
        if (validatedData[key] !== undefined && key !== 'hr_responsibilities') {
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
        } else if (key === 'hr_responsibilities') {
          paramCount++;
          updateFields.push('hr_responsibilities = $' + paramCount + '');
          params.push(validatedData[key]);
          try {
            const hrService = require('../../services/hrIntelligenceService');
            hrResponsibilitiesParsed = hrService.parseResponsibilities(validatedData[key] || '');
          } catch (_) {}
        }
      });
      if (hrResponsibilitiesParsed !== null) {
        paramCount++;
        updateFields.push('hr_responsibilities_parsed = $' + paramCount + '::jsonb');
        params.push(JSON.stringify(hrResponsibilitiesParsed));
      }

      updateFields.push('updated_at = now()');
      params.push(req.params.id, req.user.company_id);

      const result = await db.query(`
        UPDATE users
        SET ${updateFields.join(', ')}
        WHERE id = $${paramCount + 1} AND company_id = $${paramCount + 2} AND deleted_at IS NULL
        RETURNING id, name, email, role, hierarchy_level, active, company_role_id, updated_at
      `, params);

      invalidateScopeCache(req.params.id);

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

      try {
        await orgVal.syncAfterUserProfileChange(req.params.id, req.user.company_id, {
          beforeSnapshot,
          actorUserId: req.user.id,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent']
        });
      } catch (e) {
        console.error('[ADMIN_UPDATE_USER_ORG_VALIDATION_SYNC_ERROR]', e);
      }

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
 * PATCH /api/admin/users/:id/profile-context
 * Atualiza contexto de perfil do dashboard (ai_profile_context, preferred_kpis, dashboard_preferences)
 */
const profileContextSchema = z.object({
  ai_profile_context: z.object({
    focus: z.array(z.string()).optional(),
    language_style: z.string().optional()
  }).optional(),
  preferred_kpis: z.array(z.string()).optional(),
  dashboard_preferences: z.object({
    favorite_period: z.string().optional(),
    favorite_sector: z.string().optional(),
    compact_mode: z.boolean().optional(),
    cards_order: z.array(z.string()).optional()
  }).optional(),
  seniority_level: z.enum(['estrategico', 'tatico', 'operacional']).optional(),
  onboarding_completed: z.boolean().optional()
});

router.patch('/:id/profile-context',
  requireAuth,
  requireHierarchy(1),
  async (req, res) => {
    try {
      const { id } = req.params;
      const parsed = profileContextSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ ok: false, error: parsed.error.errors?.[0]?.message || 'Dados inválidos' });
      }
      const data = parsed.data;
      const updates = [];
      const params = [];
      let p = 1;
      if (data.ai_profile_context) {
        params.push(JSON.stringify(data.ai_profile_context));
        updates.push(`ai_profile_context = $${p++}`);
      }
      if (data.preferred_kpis) {
        params.push(JSON.stringify(data.preferred_kpis));
        updates.push(`preferred_kpis = $${p++}`);
      }
      if (data.dashboard_preferences) {
        params.push(JSON.stringify(data.dashboard_preferences));
        updates.push(`dashboard_preferences = COALESCE(dashboard_preferences, '{}')::jsonb || $${p++}::jsonb`);
      }
      if (data.seniority_level) {
        params.push(data.seniority_level);
        updates.push(`seniority_level = $${p++}`);
      }
      if (typeof data.onboarding_completed === 'boolean') {
        params.push(data.onboarding_completed);
        updates.push(`onboarding_completed = $${p++}`);
      }
      if (updates.length === 0) {
        return res.status(400).json({ ok: false, error: 'Nenhum campo para atualizar' });
      }
      params.push(id, req.user.company_id);
      const ph = (i) => `$${i}`;
      const r = await db.query(`
        UPDATE users SET ${updates.join(', ')}, updated_at = now()
        WHERE id = ${ph(p++)} AND company_id = ${ph(p)} AND deleted_at IS NULL
        RETURNING id, name, ai_profile_context, preferred_kpis, dashboard_preferences, seniority_level, onboarding_completed
      `, params);
      if (r.rows.length === 0) {
        return res.status(404).json({ ok: false, error: 'Usuário não encontrado' });
      }
      res.json({ ok: true, data: r.rows[0] });
    } catch (err) {
      console.error('[ADMIN_PROFILE_CONTEXT_ERROR]', err);
      res.status(500).json({ ok: false, error: 'Erro ao atualizar perfil' });
    }
  }
);

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
