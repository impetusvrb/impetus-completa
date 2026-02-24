/**
 * ROTAS DE ADMINISTRAÇÃO DE DEPARTAMENTOS
 * Gestão completa de departamentos e hierarquia organizacional
 */

const express = require('express');
const router = express.Router();
const db = require('../../db');
const { requireAuth, requireHierarchy } = require('../../middleware/auth');
const { auditMiddleware, logAction } = require('../../middleware/audit');
const { z } = require('zod');
const { isValidUUID } = require('../../utils/security');

// Schemas de validação
const createDepartmentSchema = z.object({
  name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres').max(100),
  description: z.string().optional(),
  parent_department_id: z.string().uuid().nullable().optional(),
  level: z.number().int().min(1).max(4),
  type: z.enum(['producao', 'manutencao', 'qualidade', 'logistica', 'administrativo', 'outro']).optional(),
  manager_id: z.string().uuid().nullable().optional()
});

const updateDepartmentSchema = z.object({
  name: z.string().min(3).max(100).optional(),
  description: z.string().nullable().optional(),
  parent_department_id: z.string().uuid().nullable().optional(),
  level: z.number().int().min(1).max(4).optional(),
  type: z.enum(['producao', 'manutencao', 'qualidade', 'logistica', 'administrativo', 'outro']).optional(),
  manager_id: z.string().uuid().nullable().optional(),
  active: z.boolean().optional()
});

/**
 * GET /api/admin/departments
 * Listar departamentos (com hierarquia)
 */
router.get('/', 
  requireAuth, 
  async (req, res) => {
    try {
      const { include_inactive } = req.query;

      let query = `
        SELECT 
          d.id, d.name, d.description, d.level, d.type, d.active,
          d.parent_department_id, d.created_at, d.updated_at,
          pd.name as parent_department_name,
          u.id as manager_id, u.name as manager_name,
          (SELECT COUNT(*) FROM users WHERE department_id = d.id AND deleted_at IS NULL) as users_count,
          (SELECT COUNT(*) FROM departments WHERE parent_department_id = d.id) as subdepartments_count
        FROM departments d
        LEFT JOIN departments pd ON d.parent_department_id = pd.id
        LEFT JOIN users u ON d.manager_id = u.id
        WHERE d.company_id = $1
      `;

      const params = [req.user.company_id];

      if (!include_inactive) {
        query += ' AND d.active = true';
      }

      query += ' ORDER BY d.level ASC, d.name ASC';

      const result = await db.query(query, params);

      res.json({
        ok: true,
        departments: result.rows
      });

    } catch (err) {
      console.error('[ADMIN_LIST_DEPARTMENTS_ERROR]', err);
      res.status(500).json({
        ok: false,
        error: 'Erro ao listar departamentos'
      });
    }
});

/**
 * GET /api/admin/departments/tree
 * Listar departamentos em estrutura de árvore
 */
router.get('/tree', 
  requireAuth,
  async (req, res) => {
    try {
      const result = await db.query(`
        WITH RECURSIVE department_tree AS (
          -- Departamentos raiz (sem pai)
          SELECT 
            d.id, d.name, d.description, d.level, d.type, d.active,
            d.parent_department_id, d.manager_id,
            u.name as manager_name,
            (SELECT COUNT(*) FROM users WHERE department_id = d.id AND deleted_at IS NULL) as users_count,
            ARRAY[d.id] as path,
            0 as depth
          FROM departments d
          LEFT JOIN users u ON d.manager_id = u.id
          WHERE d.company_id = $1 AND d.parent_department_id IS NULL AND d.active = true
          
          UNION ALL
          
          -- Departamentos filhos
          SELECT 
            d.id, d.name, d.description, d.level, d.type, d.active,
            d.parent_department_id, d.manager_id,
            u.name as manager_name,
            (SELECT COUNT(*) FROM users WHERE department_id = d.id AND deleted_at IS NULL) as users_count,
            dt.path || d.id,
            dt.depth + 1
          FROM departments d
          LEFT JOIN users u ON d.manager_id = u.id
          INNER JOIN department_tree dt ON d.parent_department_id = dt.id
          WHERE d.company_id = $1 AND d.active = true
        )
        SELECT * FROM department_tree
        ORDER BY path
      `, [req.user.company_id]);

      res.json({
        ok: true,
        tree: result.rows
      });

    } catch (err) {
      console.error('[ADMIN_DEPARTMENTS_TREE_ERROR]', err);
      res.status(500).json({
        ok: false,
        error: 'Erro ao buscar árvore de departamentos'
      });
    }
});

/**
 * GET /api/admin/departments/:id
 * Buscar departamento específico
 */
router.get('/:id', 
  requireAuth,
  async (req, res) => {
    try {
      if (!isValidUUID(req.params.id)) return res.status(400).json({ ok: false, error: 'ID inválido' });
      const result = await db.query(`
        SELECT 
          d.*,
          pd.name as parent_department_name,
          u.id as manager_id, u.name as manager_name, u.email as manager_email,
          (SELECT json_agg(json_build_object('id', id, 'name', name, 'role', role))
           FROM users WHERE department_id = d.id AND deleted_at IS NULL) as users,
          (SELECT json_agg(json_build_object('id', id, 'name', name))
           FROM departments WHERE parent_department_id = d.id) as subdepartments
        FROM departments d
        LEFT JOIN departments pd ON d.parent_department_id = pd.id
        LEFT JOIN users u ON d.manager_id = u.id
        WHERE d.id = $1 AND d.company_id = $2
      `, [req.params.id, req.user.company_id]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          ok: false,
          error: 'Departamento não encontrado'
        });
      }

      res.json({
        ok: true,
        department: result.rows[0]
      });

    } catch (err) {
      console.error('[ADMIN_GET_DEPARTMENT_ERROR]', err);
      res.status(500).json({
        ok: false,
        error: 'Erro ao buscar departamento'
      });
    }
});

/**
 * POST /api/admin/departments
 * Criar novo departamento
 */
router.post('/', 
  requireAuth, 
  requireHierarchy(2),
  auditMiddleware({ 
    action: 'department_created', 
    entityType: 'department',
    severity: 'info'
  }),
  async (req, res) => {
    try {
      // Validar dados
      const validatedData = createDepartmentSchema.parse(req.body);

      // Se tem departamento pai, verificar se existe
      if (validatedData.parent_department_id) {
        const parentExists = await db.query(
          'SELECT id FROM departments WHERE id = $1 AND company_id = $2',
          [validatedData.parent_department_id, req.user.company_id]
        );

        if (parentExists.rows.length === 0) {
          return res.status(404).json({
            ok: false,
            error: 'Departamento pai não encontrado'
          });
        }
      }

      // Se tem manager, verificar se existe e está na empresa
      if (validatedData.manager_id) {
        const managerExists = await db.query(
          'SELECT id FROM users WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL',
          [validatedData.manager_id, req.user.company_id]
        );

        if (managerExists.rows.length === 0) {
          return res.status(404).json({
            ok: false,
            error: 'Gestor não encontrado'
          });
        }
      }

      // Criar departamento
      const result = await db.query(`
        INSERT INTO departments (
          company_id, name, description, parent_department_id,
          level, type, manager_id, active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, true)
        RETURNING id, name, level, created_at
      `, [
        req.user.company_id,
        validatedData.name,
        validatedData.description || null,
        validatedData.parent_department_id || null,
        validatedData.level,
        validatedData.type || null,
        validatedData.manager_id || null
      ]);

      // Log de auditoria
      await logAction({
        companyId: req.user.company_id,
        userId: req.user.id,
        action: 'department_created',
        entityType: 'department',
        entityId: result.rows[0].id,
        details: { 
          department_name: validatedData.name,
          level: validatedData.level
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      res.status(201).json({
        ok: true,
        department: result.rows[0],
        message: 'Departamento criado com sucesso'
      });

    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          ok: false,
          error: 'Dados inválidos',
          details: err.errors
        });
      }

      console.error('[ADMIN_CREATE_DEPARTMENT_ERROR]', err);
      res.status(500).json({
        ok: false,
        error: 'Erro ao criar departamento'
      });
    }
});

/**
 * PUT /api/admin/departments/:id
 * Atualizar departamento
 */
router.put('/:id', 
  requireAuth, 
  requireHierarchy(2),
  auditMiddleware({ 
    action: 'department_updated', 
    entityType: 'department',
    severity: 'info'
  }),
  async (req, res) => {
    try {
      if (!isValidUUID(req.params.id)) return res.status(400).json({ ok: false, error: 'ID inválido' });

      // Validar dados
      const validatedData = updateDepartmentSchema.parse(req.body);

      // Verificar se departamento existe
      const existingDept = await db.query(
        'SELECT id, name FROM departments WHERE id = $1 AND company_id = $2',
        [req.params.id, req.user.company_id]
      );

      if (existingDept.rows.length === 0) {
        return res.status(404).json({
          ok: false,
          error: 'Departamento não encontrado'
        });
      }

      // Se está mudando departamento pai, evitar ciclos
      if (validatedData.parent_department_id) {
        if (validatedData.parent_department_id === req.params.id) {
          return res.status(400).json({
            ok: false,
            error: 'Departamento não pode ser pai de si mesmo'
          });
        }

        // Verificar se não está criando um ciclo na hierarquia
        const wouldCreateCycle = await db.query(`
          WITH RECURSIVE parent_chain AS (
            SELECT id, parent_department_id
            FROM departments
            WHERE id = $1
            
            UNION ALL
            
            SELECT d.id, d.parent_department_id
            FROM departments d
            INNER JOIN parent_chain pc ON d.id = pc.parent_department_id
          )
          SELECT id FROM parent_chain WHERE id = $2
        `, [validatedData.parent_department_id, req.params.id]);

        if (wouldCreateCycle.rows.length > 0) {
          return res.status(400).json({
            ok: false,
            error: 'Não é possível criar ciclo na hierarquia de departamentos'
          });
        }
      }

      // Construir query de update
      const updateFields = [];
      const params = [];
      let paramCount = 0;

      Object.keys(validatedData).forEach(key => {
        if (validatedData[key] !== undefined) {
          paramCount++;
          updateFields.push(`${key} = $${paramCount}`);
          params.push(validatedData[key]);
        }
      });

      updateFields.push('updated_at = now()');
      params.push(req.params.id, req.user.company_id);

      const result = await db.query(`
        UPDATE departments
        SET ${updateFields.join(', ')}
        WHERE id = $${paramCount + 1} AND company_id = $${paramCount + 2}
        RETURNING id, name, level, active, updated_at
      `, params);

      // Log de auditoria
      await logAction({
        companyId: req.user.company_id,
        userId: req.user.id,
        action: 'department_updated',
        entityType: 'department',
        entityId: req.params.id,
        details: { updated_fields: Object.keys(validatedData) },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      res.json({
        ok: true,
        department: result.rows[0],
        message: 'Departamento atualizado com sucesso'
      });

    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          ok: false,
          error: 'Dados inválidos',
          details: err.errors
        });
      }

      console.error('[ADMIN_UPDATE_DEPARTMENT_ERROR]', err);
      res.status(500).json({
        ok: false,
        error: 'Erro ao atualizar departamento'
      });
    }
});

/**
 * DELETE /api/admin/departments/:id
 * Desativar departamento
 */
router.delete('/:id', 
  requireAuth, 
  requireHierarchy(1),
  auditMiddleware({ 
    action: 'department_deleted', 
    entityType: 'department',
    severity: 'warning'
  }),
  async (req, res) => {
    try {
      if (!isValidUUID(req.params.id)) return res.status(400).json({ ok: false, error: 'ID inválido' });

      // Verificar se departamento tem usuários
      const hasUsers = await db.query(
        'SELECT COUNT(*) as count FROM users WHERE department_id = $1 AND deleted_at IS NULL',
        [req.params.id]
      );

      if (parseInt(hasUsers.rows[0].count) > 0) {
        return res.status(400).json({
          ok: false,
          error: 'Não é possível desativar departamento com usuários ativos. Remova ou transfira os usuários primeiro.',
          code: 'DEPARTMENT_HAS_USERS'
        });
      }

      // Verificar se departamento tem subdepartamentos
      const hasSubdepartments = await db.query(
        'SELECT COUNT(*) as count FROM departments WHERE parent_department_id = $1 AND active = true',
        [req.params.id]
      );

      if (parseInt(hasSubdepartments.rows[0].count) > 0) {
        return res.status(400).json({
          ok: false,
          error: 'Não é possível desativar departamento com subdepartamentos ativos. Desative ou remova os subdepartamentos primeiro.',
          code: 'DEPARTMENT_HAS_SUBDEPARTMENTS'
        });
      }

      const result = await db.query(`
        UPDATE departments
        SET active = false, updated_at = now()
        WHERE id = $1 AND company_id = $2
        RETURNING id, name
      `, [req.params.id, req.user.company_id]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          ok: false,
          error: 'Departamento não encontrado'
        });
      }

      // Log de auditoria
      await logAction({
        companyId: req.user.company_id,
        userId: req.user.id,
        action: 'department_deleted',
        entityType: 'department',
        entityId: req.params.id,
        details: { department_name: result.rows[0].name },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        severity: 'warning'
      });

      res.json({
        ok: true,
        message: 'Departamento desativado com sucesso'
      });

    } catch (err) {
      console.error('[ADMIN_DELETE_DEPARTMENT_ERROR]', err);
      res.status(500).json({
        ok: false,
        error: 'Erro ao desativar departamento'
      });
    }
});

/**
 * GET /api/admin/departments/stats/summary
 * Estatísticas de departamentos
 */
router.get('/stats/summary', 
  requireAuth,
  async (req, res) => {
    try {
      const stats = await db.query(`
        SELECT
          COUNT(*) FILTER (WHERE active = true) as active_departments,
          COUNT(*) FILTER (WHERE active = false) as inactive_departments,
          COUNT(*) FILTER (WHERE type = 'producao') as production_depts,
          COUNT(*) FILTER (WHERE type = 'manutencao') as maintenance_depts,
          COUNT(*) FILTER (WHERE type = 'qualidade') as quality_depts,
          COUNT(*) FILTER (WHERE level = 1) as level_1_depts,
          COUNT(*) FILTER (WHERE level = 2) as level_2_depts,
          COUNT(*) FILTER (WHERE level = 3) as level_3_depts,
          COUNT(*) FILTER (WHERE level = 4) as level_4_depts
        FROM departments
        WHERE company_id = $1
      `, [req.user.company_id]);

      res.json({
        ok: true,
        stats: stats.rows[0]
      });

    } catch (err) {
      console.error('[ADMIN_DEPARTMENT_STATS_ERROR]', err);
      res.status(500).json({
        ok: false,
        error: 'Erro ao buscar estatísticas'
      });
    }
});

module.exports = router;
