/**
 * ROTAS DE VISUALIZAÇÃO DE LOGS
 * Logs de auditoria do sistema e logs de acesso a dados (LGPD)
 */

const express = require('express');
const router = express.Router();
const db = require('../../db');
const { requireAuth, requireHierarchy } = require('../../middleware/auth');
const { sanitizeSearchTerm, safeInteger, isValidUUID } = require('../../utils/security');

/**
 * GET /api/admin/logs/audit
 * Listar logs de auditoria
 */
router.get('/audit', 
  requireAuth, 
  requireHierarchy(2), // Gerentes e diretores
  async (req, res) => {
    try {
      const limit = safeInteger(req.query.limit, 100, 1, 500);
      const offset = safeInteger(req.query.offset, 0, 0, 100000);
      const { 
        user_id,
        action,
        entity_type,
        severity,
        start_date,
        end_date,
        search
      } = req.query;

      let conditions = ['company_id = $1'];
      const params = [req.user.company_id];
      let paramCount = 1;

      if (user_id) {
        paramCount++;
        conditions.push(`user_id = $${paramCount}`);
        params.push(user_id);
      }

      if (action) {
        paramCount++;
        conditions.push(`action = $${paramCount}`);
        params.push(action);
      }

      if (entity_type) {
        paramCount++;
        conditions.push(`entity_type = $${paramCount}`);
        params.push(entity_type);
      }

      if (severity) {
        paramCount++;
        conditions.push(`severity = $${paramCount}`);
        params.push(severity);
      }

      if (start_date) {
        paramCount++;
        conditions.push(`created_at >= $${paramCount}`);
        params.push(start_date);
      }

      if (end_date) {
        paramCount++;
        conditions.push(`created_at <= $${paramCount}`);
        params.push(end_date);
      }

      if (search) {
        paramCount++;
        const safeSearch = sanitizeSearchTerm(search);
        conditions.push(`(user_name ILIKE $${paramCount} OR action ILIKE $${paramCount} OR entity_type ILIKE $${paramCount})`);
        params.push(`%${safeSearch}%`);
      }

      const whereClause = conditions.join(' AND ');

      const result = await db.query(`
        SELECT 
          id, company_id, user_id, user_name,
          action, entity_type, entity_id, description,
          ip_address, user_agent, severity, created_at
        FROM audit_logs
        WHERE ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
      `, [...params, limit, offset]);

      const countResult = await db.query(`
        SELECT COUNT(*) as total
        FROM audit_logs
        WHERE ${whereClause}
      `, params);

      res.json({
        ok: true,
        logs: result.rows,
        pagination: {
          total: parseInt(countResult.rows[0].total),
          limit: parseInt(limit),
          offset: parseInt(offset)
        }
      });

    } catch (err) {
      console.error('[ADMIN_AUDIT_LOGS_ERROR]', err);
      res.status(500).json({
        ok: false,
        error: 'Erro ao buscar logs de auditoria'
      });
    }
});

/**
 * GET /api/admin/logs/data-access
 * Listar logs de acesso a dados (LGPD Art. 37)
 */
router.get('/data-access', 
  requireAuth, 
  requireHierarchy(2),
  async (req, res) => {
    try {
      const limit = safeInteger(req.query.limit, 100, 1, 500);
      const offset = safeInteger(req.query.offset, 0, 0, 100000);
      const { 
        user_id,
        accessed_user_id,
        entity_type,
        start_date,
        end_date
      } = req.query;

      let conditions = ['company_id = $1'];
      const params = [req.user.company_id];
      let paramCount = 1;

      if (user_id) {
        paramCount++;
        conditions.push(`accessed_by = $${paramCount}`);
        params.push(user_id);
      }

      if (accessed_user_id) {
        paramCount++;
        conditions.push(`entity_id = $${paramCount} AND entity_type = 'user'`);
        params.push(accessed_user_id);
      }

      if (entity_type) {
        paramCount++;
        conditions.push(`entity_type = $${paramCount}`);
        params.push(entity_type);
      }

      if (start_date) {
        paramCount++;
        conditions.push(`created_at >= $${paramCount}`);
        params.push(start_date);
      }

      if (end_date) {
        paramCount++;
        conditions.push(`created_at <= $${paramCount}`);
        params.push(end_date);
      }

      const whereClause = conditions.join(' AND ');

      const result = await db.query(`
        SELECT 
          dal.id, dal.accessed_by as user_id, dal.accessed_by_name as user_name,
          dal.entity_type, dal.entity_id as accessed_user_id,
          COALESCE(u.name, dal.entity_type) as accessed_user_name,
          dal.action, dal.justification, dal.ip_address, dal.created_at as accessed_at
        FROM data_access_logs dal
        LEFT JOIN users u ON dal.entity_type = 'user' AND dal.entity_id = u.id
        WHERE ${whereClause}
        ORDER BY dal.created_at DESC
        LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
      `, [...params, limit, offset]);

      const countResult = await db.query(`
        SELECT COUNT(*) as total
        FROM data_access_logs
        WHERE ${whereClause}
      `, params);

      res.json({
        ok: true,
        logs: result.rows,
        pagination: {
          total: parseInt(countResult.rows[0].total),
          limit: parseInt(limit),
          offset: parseInt(offset)
        }
      });

    } catch (err) {
      console.error('[ADMIN_DATA_ACCESS_LOGS_ERROR]', err);
      res.status(500).json({
        ok: false,
        error: 'Erro ao buscar logs de acesso a dados'
      });
    }
});

/**
 * GET /api/admin/logs/audit/:id
 * Buscar log de auditoria específico
 */
router.get('/audit/:id', 
  requireAuth, 
  requireHierarchy(2),
  async (req, res) => {
    try {
      if (!isValidUUID(req.params.id)) return res.status(400).json({ ok: false, error: 'ID inválido' });

      const result = await db.query(`
        SELECT *
        FROM audit_logs
        WHERE id = $1 AND company_id = $2
      `, [req.params.id, req.user.company_id]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          ok: false,
          error: 'Log não encontrado'
        });
      }

      res.json({
        ok: true,
        log: result.rows[0]
      });

    } catch (err) {
      console.error('[ADMIN_GET_AUDIT_LOG_ERROR]', err);
      res.status(500).json({
        ok: false,
        error: 'Erro ao buscar log'
      });
    }
});

/**
 * GET /api/admin/logs/stats/summary
 * Estatísticas de logs
 */
router.get('/stats/summary', 
  requireAuth, 
  requireHierarchy(2),
  async (req, res) => {
    try {
      const days = safeInteger(req.query.days, 7, 1, 365);

      const stats = await db.query(`
        SELECT
          COUNT(*) as total_events,
          COUNT(*) FILTER (WHERE severity = 'critical') as critical_events,
          COUNT(*) FILTER (WHERE severity = 'warning') as warning_events,
          COUNT(*) FILTER (WHERE severity = 'info') as info_events,
          COUNT(*) FILTER (WHERE created_at > now() - interval '24 hours') as last_24h,
          COUNT(*) FILTER (WHERE created_at > now() - interval '7 days') as last_7d,
          COUNT(DISTINCT user_id) as unique_users,
          COUNT(DISTINCT action) as unique_actions
        FROM audit_logs
        WHERE company_id = $1 AND created_at > now() - ($2::integer || ' days')::interval
      `, [req.user.company_id, days]);

      const topActions = await db.query(`
        SELECT action, COUNT(*) as count
        FROM audit_logs
        WHERE company_id = $1 AND created_at > now() - ($2::integer || ' days')::interval
        GROUP BY action
        ORDER BY count DESC
        LIMIT 10
      `, [req.user.company_id, days]);

      const topUsers = await db.query(`
        SELECT user_id, user_name, COUNT(*) as actions_count
        FROM audit_logs
        WHERE company_id = $1 AND created_at > now() - ($2::integer || ' days')::interval
        GROUP BY user_id, user_name
        ORDER BY actions_count DESC
        LIMIT 10
      `, [req.user.company_id, days]);

      const activityByHour = await db.query(`
        SELECT 
          EXTRACT(HOUR FROM created_at) as hour,
          COUNT(*) as count
        FROM audit_logs
        WHERE company_id = $1 AND created_at > now() - interval '7 days'
        GROUP BY hour
        ORDER BY hour
      `, [req.user.company_id]);

      res.json({
        ok: true,
        summary: stats.rows[0],
        top_actions: topActions.rows,
        top_users: topUsers.rows,
        activity_by_hour: activityByHour.rows
      });

    } catch (err) {
      console.error('[ADMIN_LOGS_STATS_ERROR]', err);
      res.status(500).json({
        ok: false,
        error: 'Erro ao buscar estatísticas de logs'
      });
    }
});

/**
 * GET /api/admin/logs/stats/security
 * Dashboard de segurança
 */
router.get('/stats/security', 
  requireAuth, 
  requireHierarchy(1), // Apenas diretores
  async (req, res) => {
    try {
      // Tentativas de login falhadas
      const failedLogins = await db.query(`
        SELECT 
          user_name as attempted_email,
          ip_address,
          COUNT(*) as attempts,
          MAX(created_at) as last_attempt
        FROM audit_logs
        WHERE company_id = $1 
          AND action = 'login_failed'
          AND created_at > now() - interval '24 hours'
        GROUP BY user_name, ip_address
        HAVING COUNT(*) >= 3
        ORDER BY attempts DESC
      `, [req.user.company_id]);

      // Acessos fora do horário
      const afterHoursAccess = await db.query(`
        SELECT 
          user_id, user_name,
          COUNT(*) as access_count,
          MAX(created_at) as last_access
        FROM audit_logs
        WHERE company_id = $1
          AND created_at > now() - interval '7 days'
          AND (EXTRACT(HOUR FROM created_at) < 6 OR EXTRACT(HOUR FROM created_at) > 22)
        GROUP BY user_id, user_name
        ORDER BY access_count DESC
        LIMIT 20
      `, [req.user.company_id]);

      // Ações críticas recentes
      const criticalActions = await db.query(`
        SELECT *
        FROM audit_logs
        WHERE company_id = $1
          AND severity = 'critical'
          AND created_at > now() - interval '7 days'
        ORDER BY created_at DESC
        LIMIT 50
      `, [req.user.company_id]);

      // Acessos a dados sensíveis
      const sensitiveDataAccess = await db.query(`
        SELECT 
          accessed_by as user_id, accessed_by_name as user_name,
          entity_type,
          COUNT(*) as access_count,
          MAX(created_at) as last_access
        FROM data_access_logs
        WHERE company_id = $1
          AND created_at > now() - interval '7 days'
        GROUP BY accessed_by, accessed_by_name, entity_type
        ORDER BY access_count DESC
        LIMIT 20
      `, [req.user.company_id]);

      res.json({
        ok: true,
        security: {
          failed_logins: failedLogins.rows,
          after_hours_access: afterHoursAccess.rows,
          critical_actions: criticalActions.rows,
          sensitive_data_access: sensitiveDataAccess.rows
        }
      });

    } catch (err) {
      console.error('[ADMIN_SECURITY_STATS_ERROR]', err);
      res.status(500).json({
        ok: false,
        error: 'Erro ao buscar estatísticas de segurança'
      });
    }
});

/**
 * POST /api/admin/logs/export
 * Exportar logs (CSV/JSON)
 */
router.post('/export', 
  requireAuth, 
  requireHierarchy(2),
  async (req, res) => {
    try {
      const { 
        type = 'audit', // audit ou data-access
        format = 'json', // json ou csv
        filters = {}
      } = req.body;

      let query, params;

      const exportLimit = Math.min(parseInt(req.body?.limit, 10) || 5000, 5000);
      if (type === 'audit') {
        query = 'SELECT * FROM audit_logs WHERE company_id = $1 ORDER BY created_at DESC LIMIT $2';
        params = [req.user.company_id, exportLimit];
      } else {
        query = 'SELECT * FROM data_access_logs WHERE company_id = $1 ORDER BY created_at DESC LIMIT $2';
        params = [req.user.company_id, exportLimit];
      }

      const result = await db.query(query, params);

      if (format === 'csv') {
        // Converter para CSV
        const headers = Object.keys(result.rows[0] || {}).join(',');
        const rows = result.rows.map(row => 
          Object.values(row).map(v => 
            typeof v === 'object' ? JSON.stringify(v) : v
          ).join(',')
        ).join('\n');
        
        const csv = `${headers}\n${rows}`;

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="logs_${type}_${Date.now()}.csv"`);
        res.send(csv);
      } else {
        // JSON
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="logs_${type}_${Date.now()}.json"`);
        res.json({
          export_date: new Date().toISOString(),
          type,
          total_records: result.rows.length,
          data: result.rows
        });
      }

    } catch (err) {
      console.error('[ADMIN_EXPORT_LOGS_ERROR]', err);
      res.status(500).json({
        ok: false,
        error: 'Erro ao exportar logs'
      });
    }
});

module.exports = router;
