/**
 * ROTAS DE CONFIGURAÇÕES DO SISTEMA
 * Configuração de Z-API, OpenAI, POPs, manuais técnicos, notificações, LGPD
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const db = require('../../db');
const { requireAuth, requireHierarchy } = require('../../middleware/auth');
const { auditMiddleware, logAction } = require('../../middleware/audit');
const zapiService = require('../../services/zapi');
const manualsService = require('../../services/manuals');
const dashboardVisibility = require('../../services/dashboardVisibility');
const { encrypt } = require('../../utils/crypto');
const { isValidUUID } = require('../../utils/security');

function maybeEncryptToken(val) {
  try {
    return process.env.ENCRYPTION_KEY ? encrypt(val) : val;
  } catch {
    return val;
  }
}

// Configuração do Multer para upload de arquivos
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../../uploads');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (err) {
      cb(err);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /pdf|doc|docx|txt|jpg|jpeg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Tipo de arquivo não permitido'));
    }
  }
});

// ============================================================================
// CONFIGURAÇÕES GERAIS DA EMPRESA
// ============================================================================

/**
 * GET /api/admin/settings/company
 * Buscar configurações da empresa
 */
router.get('/company', 
  requireAuth, 
  requireHierarchy(2),
  async (req, res) => {
    try {
      const result = await db.query(`
        SELECT 
          id, name, cnpj, industry_segment, address, city, state, country,
          company_policy_text, config, active, subscription_tier,
          contract_start_date, contract_end_date,
          data_controller_name, data_controller_email, data_controller_phone,
          created_at, updated_at
        FROM companies
        WHERE id = $1
      `, [req.user.company_id]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          ok: false,
          error: 'Empresa não encontrada'
        });
      }

      res.json({
        ok: true,
        company: result.rows[0]
      });

    } catch (err) {
      console.error('[ADMIN_GET_COMPANY_SETTINGS_ERROR]', err);
      res.status(500).json({
        ok: false,
        error: 'Erro ao buscar configurações da empresa'
      });
    }
});

// ============================================================================
// VISIBILIDADE DO DASHBOARD (Diretor configura o que cada nível vê)
// ============================================================================

/**
 * GET /api/admin/settings/dashboard-visibility
 * Listar configurações de visibilidade por nível (apenas Diretor)
 */
router.get('/dashboard-visibility',
  requireAuth,
  requireHierarchy(1),
  async (req, res) => {
    try {
      const configs = await dashboardVisibility.listConfigs(req.user.company_id);
      res.json({ ok: true, configs });
    } catch (err) {
      console.error('[DASHBOARD_VISIBILITY_LIST_ERROR]', err);
      res.status(500).json({ ok: false, error: 'Erro ao listar configurações' });
    }
  }
);

/**
 * PUT /api/admin/settings/dashboard-visibility/:level
 * Salvar configuração de visibilidade para um nível (2-5)
 */
router.put('/dashboard-visibility/:level',
  requireAuth,
  requireHierarchy(1),
  auditMiddleware({
    action: 'dashboard_visibility_updated',
    entityType: 'settings',
    severity: 'info'
  }),
  async (req, res) => {
    try {
      const level = parseInt(req.params.level, 10);
      if (isNaN(level) || level < 2 || level > 5) {
        return res.status(400).json({ ok: false, error: 'Nível deve ser entre 2 e 5' });
      }
      const { sections } = req.body;
      if (!sections || typeof sections !== 'object') {
        return res.status(400).json({ ok: false, error: 'sections obrigatório (objeto)' });
      }
      await dashboardVisibility.saveConfig(req.user.company_id, level, sections);
      res.json({ ok: true });
    } catch (err) {
      console.error('[DASHBOARD_VISIBILITY_SAVE_ERROR]', err);
      res.status(500).json({ ok: false, error: err.message || 'Erro ao salvar' });
    }
  }
);

// ============================================================================
// CONFIGURAÇÕES GERAIS DA EMPRESA
// ============================================================================

/**
 * PUT /api/admin/settings/company
 * Atualizar configurações da empresa
 */
router.put('/company', 
  requireAuth, 
  requireHierarchy(1),
  auditMiddleware({ 
    action: 'company_settings_updated', 
    entityType: 'company',
    severity: 'info'
  }),
  async (req, res) => {
    try {
      const {
        name, cnpj, industry_segment, address, city, state,
        company_policy_text, config,
        data_controller_name, data_controller_email, data_controller_phone
      } = req.body;

      const updateFields = [];
      const params = [];
      let paramCount = 0;

      if (name) { paramCount++; updateFields.push(`name = $${paramCount}`); params.push(name); }
      if (cnpj) { paramCount++; updateFields.push(`cnpj = $${paramCount}`); params.push(cnpj); }
      if (industry_segment) { paramCount++; updateFields.push(`industry_segment = $${paramCount}`); params.push(industry_segment); }
      if (address) { paramCount++; updateFields.push(`address = $${paramCount}`); params.push(address); }
      if (city) { paramCount++; updateFields.push(`city = $${paramCount}`); params.push(city); }
      if (state) { paramCount++; updateFields.push(`state = $${paramCount}`); params.push(state); }
      if (company_policy_text !== undefined) { paramCount++; updateFields.push(`company_policy_text = $${paramCount}`); params.push(company_policy_text); }
      if (config) { paramCount++; updateFields.push(`config = $${paramCount}::jsonb`); params.push(JSON.stringify(config)); }
      if (data_controller_name) { paramCount++; updateFields.push(`data_controller_name = $${paramCount}`); params.push(data_controller_name); }
      if (data_controller_email) { paramCount++; updateFields.push(`data_controller_email = $${paramCount}`); params.push(data_controller_email); }
      if (data_controller_phone) { paramCount++; updateFields.push(`data_controller_phone = $${paramCount}`); params.push(data_controller_phone); }

      if (updateFields.length === 0) {
        return res.status(400).json({
          ok: false,
          error: 'Nenhum campo para atualizar'
        });
      }

      updateFields.push('updated_at = now()');
      params.push(req.user.company_id);

      const result = await db.query(`
        UPDATE companies
        SET ${updateFields.join(', ')}
        WHERE id = $${paramCount + 1}
        RETURNING *
      `, params);

      await logAction({
        companyId: req.user.company_id,
        userId: req.user.id,
        action: 'company_settings_updated',
        entityType: 'company',
        entityId: req.user.company_id,
        details: { updated_fields: Object.keys(req.body) },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      res.json({
        ok: true,
        company: result.rows[0],
        message: 'Configurações atualizadas com sucesso'
      });

    } catch (err) {
      console.error('[ADMIN_UPDATE_COMPANY_SETTINGS_ERROR]', err);
      res.status(500).json({
        ok: false,
        error: 'Erro ao atualizar configurações'
      });
    }
});

// ============================================================================
// CONFIGURAÇÕES Z-API (WHATSAPP)
// ============================================================================

/**
 * GET /api/admin/settings/zapi
 * Buscar configuração Z-API
 */
router.get('/zapi', 
  requireAuth, 
  requireHierarchy(2),
  async (req, res) => {
    try {
      const result = await db.query(`
        SELECT 
          id, company_id, instance_id, api_url, business_phone,
          active, connection_status, last_connection_test, created_at, updated_at
        FROM zapi_configurations
        WHERE company_id = $1
      `, [req.user.company_id]);

      // Não retornar tokens sensíveis
      res.json({
        ok: true,
        config: result.rows[0] || null
      });

    } catch (err) {
      console.error('[ADMIN_GET_ZAPI_CONFIG_ERROR]', err);
      res.status(500).json({
        ok: false,
        error: 'Erro ao buscar configuração Z-API'
      });
    }
});

/**
 * POST /api/admin/settings/zapi
 * Criar/atualizar configuração Z-API
 */
router.post('/zapi', 
  requireAuth, 
  requireHierarchy(2),
  auditMiddleware({ 
    action: 'zapi_config_updated', 
    entityType: 'zapi_config',
    severity: 'warning'
  }),
  async (req, res) => {
    try {
      const {
        instance_id,
        instance_token,
        client_token,
        api_url,
        business_phone
      } = req.body;

      // Validar campos obrigatórios
      if (!instance_id || !instance_token || !client_token || !api_url) {
        return res.status(400).json({
          ok: false,
          error: 'Campos obrigatórios: instance_id, instance_token, client_token, api_url'
        });
      }

      // Verificar se já existe configuração
      const existing = await db.query(
        'SELECT id FROM zapi_configurations WHERE company_id = $1',
        [req.user.company_id]
      );

      let result;
      if (existing.rows.length > 0) {
        // Atualizar
        result = await db.query(`
          UPDATE zapi_configurations
          SET 
            instance_id = $1,
            instance_token = $2,
            client_token = $3,
            api_url = $4,
            business_phone = $5,
            updated_at = now()
          WHERE company_id = $6
          RETURNING id, instance_id, api_url, business_phone
        `, [instance_id, maybeEncryptToken(instance_token), maybeEncryptToken(client_token), api_url, business_phone, req.user.company_id]);
      } else {
        // Criar
        result = await db.query(`
          INSERT INTO zapi_configurations (
            company_id, instance_id, instance_token, client_token,
            api_url, business_phone, active
          ) VALUES ($1, $2, $3, $4, $5, $6, true)
          RETURNING id, instance_id, api_url, business_phone
        `, [req.user.company_id, instance_id, maybeEncryptToken(instance_token), maybeEncryptToken(client_token), api_url, business_phone]);
      }

      await logAction({
        companyId: req.user.company_id,
        userId: req.user.id,
        action: 'zapi_config_updated',
        entityType: 'zapi_config',
        entityId: result.rows[0].id,
        details: { instance_id },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        severity: 'warning'
      });

      res.json({
        ok: true,
        config: result.rows[0],
        message: 'Configuração Z-API salva com sucesso'
      });

    } catch (err) {
      console.error('[ADMIN_SAVE_ZAPI_CONFIG_ERROR]', err);
      res.status(500).json({
        ok: false,
        error: 'Erro ao salvar configuração Z-API'
      });
    }
});

/**
 * POST /api/admin/settings/zapi/test
 * Testar conexão Z-API
 */
router.post('/zapi/test', 
  requireAuth, 
  requireHierarchy(2),
  async (req, res) => {
    try {
      const testResult = await zapiService.testConnection(req.user.company_id);

      res.json({
        ok: true,
        test: testResult
      });

    } catch (err) {
      console.error('[ADMIN_TEST_ZAPI_ERROR]', err);
      res.status(500).json({
        ok: false,
        error: 'Erro ao testar conexão Z-API',
        details: err.message
      });
    }
});

// ============================================================================
// POPs (PROCEDIMENTOS OPERACIONAIS PADRÃO)
// ============================================================================

/**
 * GET /api/admin/settings/pops
 * Listar POPs
 */
router.get('/pops', 
  requireAuth,
  async (req, res) => {
    try {
      const result = await db.query(`
        SELECT 
          id, title, category, content, version, file_url,
          active, compliance_required, created_at, updated_at
        FROM pops
        WHERE company_id = $1
        ORDER BY category, title
      `, [req.user.company_id]);

      res.json({
        ok: true,
        pops: result.rows
      });

    } catch (err) {
      console.error('[ADMIN_LIST_POPS_ERROR]', err);
      res.status(500).json({
        ok: false,
        error: 'Erro ao listar POPs'
      });
    }
});

/**
 * POST /api/admin/settings/pops
 * Criar POP
 */
router.post('/pops', 
  requireAuth, 
  requireHierarchy(2),
  upload.single('file'),
  auditMiddleware({ 
    action: 'pop_created', 
    entityType: 'pop',
    severity: 'info'
  }),
  async (req, res) => {
    try {
      const { title, category, content, version, compliance_required } = req.body;
      const fileUrl = req.file ? `/uploads/${req.file.filename}` : null;

      const result = await db.query(`
        INSERT INTO pops (
          company_id, title, category, content, version,
          file_url, compliance_required, active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, true)
        RETURNING *
      `, [
        req.user.company_id, title, category, content, version,
        fileUrl, compliance_required === 'true'
      ]);

      await logAction({
        companyId: req.user.company_id,
        userId: req.user.id,
        action: 'pop_created',
        entityType: 'pop',
        entityId: result.rows[0].id,
        details: { title, category },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      res.status(201).json({
        ok: true,
        pop: result.rows[0],
        message: 'POP criado com sucesso'
      });

    } catch (err) {
      console.error('[ADMIN_CREATE_POP_ERROR]', err);
      res.status(500).json({
        ok: false,
        error: 'Erro ao criar POP'
      });
    }
});

/**
 * DELETE /api/admin/settings/pops/:id
 * Desativar POP
 */
router.delete('/pops/:id', 
  requireAuth, 
  requireHierarchy(2),
  async (req, res) => {
    try {
      if (!isValidUUID(req.params.id)) return res.status(400).json({ ok: false, error: 'ID inválido' });

      await db.query(`
        UPDATE pops SET active = false WHERE id = $1 AND company_id = $2
      `, [req.params.id, req.user.company_id]);

      res.json({
        ok: true,
        message: 'POP desativado com sucesso'
      });

    } catch (err) {
      console.error('[ADMIN_DELETE_POP_ERROR]', err);
      res.status(500).json({
        ok: false,
        error: 'Erro ao desativar POP'
      });
    }
});

// ============================================================================
// MANUAIS TÉCNICOS
// ============================================================================

/**
 * GET /api/admin/settings/manuals
 * Listar manuais técnicos
 */
router.get('/manuals', 
  requireAuth,
  async (req, res) => {
    try {
      const result = await db.query(`
        SELECT 
          m.id, m.equipment_type, m.model, m.manufacturer,
          m.file_url, m.upload_date, m.uploaded_by,
          m.embedding_processed, m.embedding_status,
          COALESCE(m.manual_type, 'maquina') as manual_type,
          u.name as uploaded_by_name
        FROM manuals m
        LEFT JOIN users u ON m.uploaded_by = u.id
        WHERE m.company_id = $1
        ORDER BY m.upload_date DESC
      `, [req.user.company_id]);

      res.json({
        ok: true,
        manuals: result.rows
      });

    } catch (err) {
      console.error('[ADMIN_LIST_MANUALS_ERROR]', err);
      res.status(500).json({
        ok: false,
        error: 'Erro ao listar manuais'
      });
    }
});

/**
 * POST /api/admin/settings/manuals
 * Upload de manual técnico
 */
router.post('/manuals', 
  requireAuth, 
  requireHierarchy(2),
  upload.single('file'),
  auditMiddleware({ 
    action: 'manual_uploaded', 
    entityType: 'manual',
    severity: 'info'
  }),
  async (req, res) => {
    try {
      const { equipment_type, model, manufacturer, manual_type } = req.body;
      const tipo = (manual_type === 'operacional') ? 'operacional' : 'maquina';
      
      if (!req.file) {
        return res.status(400).json({
          ok: false,
          error: 'Arquivo não enviado'
        });
      }

      const fileUrl = `/uploads/${req.file.filename}`;

      const result = await db.query(`
        INSERT INTO manuals (
          company_id, equipment_type, model, manufacturer,
          file_url, uploaded_by, embedding_processed, manual_type
        ) VALUES ($1, $2, $3, $4, $5, $6, false, $7)
        RETURNING *
      `, [
        req.user.company_id, equipment_type, model, manufacturer,
        fileUrl, req.user.id, tipo
      ]);

      const manualId = result.rows[0].id;
      try {
        const filePath = req.file.path;
        const contentText = await manualsService.extractTextFromFile(filePath);
        if (contentText && contentText.length > 50) {
          await manualsService.chunkAndEmbedManual(manualId, contentText);
          await db.query('UPDATE manuals SET embedding_processed = true WHERE id = $1', [manualId]);
        }
      } catch (embErr) {
        console.warn('[ADMIN_UPLOAD_MANUAL] Embeddings não processados:', embErr.message);
      }

      await logAction({
        companyId: req.user.company_id,
        userId: req.user.id,
        action: 'manual_uploaded',
        entityType: 'manual',
        entityId: result.rows[0].id,
        details: { equipment_type, model, manufacturer },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      // TODO: Processar embeddings em background
      // queueEmbeddingProcessing(result.rows[0].id);

      res.status(201).json({
        ok: true,
        manual: result.rows[0],
        message: 'Manual enviado com sucesso. Processamento de embeddings iniciado.'
      });

    } catch (err) {
      console.error('[ADMIN_UPLOAD_MANUAL_ERROR]', err);
      res.status(500).json({
        ok: false,
        error: 'Erro ao enviar manual'
      });
    }
});

/**
 * DELETE /api/admin/settings/manuals/:id
 * Deletar manual técnico
 */
router.delete('/manuals/:id', 
  requireAuth, 
  requireHierarchy(2),
  async (req, res) => {
    try {
      if (!isValidUUID(req.params.id)) return res.status(400).json({ ok: false, error: 'ID inválido' });

      const result = await db.query(`
        DELETE FROM manuals
        WHERE id = $1 AND company_id = $2
        RETURNING file_url
      `, [req.params.id, req.user.company_id]);

      if (result.rows.length > 0 && result.rows[0].file_url) {
        // Deletar arquivo físico
        const filePath = path.join(__dirname, '../../../', result.rows[0].file_url);
        try {
          await fs.unlink(filePath);
        } catch (err) {
          console.warn('Erro ao deletar arquivo:', err.message);
        }
      }

      res.json({
        ok: true,
        message: 'Manual deletado com sucesso'
      });

    } catch (err) {
      console.error('[ADMIN_DELETE_MANUAL_ERROR]', err);
      res.status(500).json({
        ok: false,
        error: 'Erro ao deletar manual'
      });
    }
});

// ============================================================================
// NOTIFICAÇÕES
// ============================================================================

/**
 * GET /api/admin/settings/notifications
 * Buscar configurações de notificações
 */
router.get('/notifications', 
  requireAuth,
  async (req, res) => {
    try {
      // Buscar config de notificações no JSONB da empresa
      const result = await db.query(`
        SELECT config->'notifications' as notifications_config
        FROM companies
        WHERE id = $1
      `, [req.user.company_id]);

      res.json({
        ok: true,
        config: result.rows[0]?.notifications_config || {
          email_enabled: true,
          whatsapp_enabled: true,
          push_enabled: false,
          failure_alerts: true,
          maintenance_alerts: true,
          proacao_alerts: true
        }
      });

    } catch (err) {
      console.error('[ADMIN_GET_NOTIFICATION_CONFIG_ERROR]', err);
      res.status(500).json({
        ok: false,
        error: 'Erro ao buscar configurações de notificações'
      });
    }
});

/**
 * PUT /api/admin/settings/notifications
 * Atualizar configurações de notificações
 */
router.put('/notifications', 
  requireAuth, 
  requireHierarchy(2),
  async (req, res) => {
    try {
      const notificationConfig = req.body;

      await db.query(`
        UPDATE companies
        SET config = jsonb_set(
          COALESCE(config, '{}'::jsonb),
          '{notifications}',
          $1::jsonb
        ),
        updated_at = now()
        WHERE id = $2
      `, [JSON.stringify(notificationConfig), req.user.company_id]);

      res.json({
        ok: true,
        message: 'Configurações de notificações atualizadas'
      });

    } catch (err) {
      console.error('[ADMIN_UPDATE_NOTIFICATION_CONFIG_ERROR]', err);
      res.status(500).json({
        ok: false,
        error: 'Erro ao atualizar configurações'
      });
    }
});

// ============================================================================
// CONTATOS WHATSAPP (para IA e comunicação)
// ============================================================================

router.get('/whatsapp-contacts',
  requireAuth,
  async (req, res) => {
    try {
      const r = await db.query(`
        SELECT config->'whatsapp_contacts' as contacts
        FROM companies WHERE id = $1
      `, [req.user.company_id]);
      const contacts = r.rows[0]?.contacts || [];
      res.json({ ok: true, contacts: Array.isArray(contacts) ? contacts : [] });
    } catch (err) {
      console.error('[ADMIN_GET_WHATSAPP_CONTACTS_ERROR]', err);
      res.status(500).json({ ok: false, error: 'Erro ao buscar contatos', contacts: [] });
    }
  }
);

router.post('/whatsapp-contacts',
  requireAuth,
  requireHierarchy(2),
  async (req, res) => {
    try {
      const { name, phone, role, sector } = req.body;
      if (!name || !phone) {
        return res.status(400).json({ ok: false, error: 'Nome e telefone obrigatórios' });
      }
      const r = await db.query(`
        SELECT config FROM companies WHERE id = $1
      `, [req.user.company_id]);
      const config = r.rows[0]?.config || {};
      const contacts = config.whatsapp_contacts || [];
      const novo = { id: `wc_${Date.now()}_${Math.random().toString(36).slice(2)}`, name, phone, role: role || '', sector: sector || '', created_at: new Date().toISOString() };
      contacts.push(novo);
      await db.query(`
        UPDATE companies SET config = jsonb_set(COALESCE(config, '{}'::jsonb), '{whatsapp_contacts}', $1::jsonb), updated_at = now()
        WHERE id = $2
      `, [JSON.stringify(contacts), req.user.company_id]);
      res.status(201).json({ ok: true, contact: novo, contacts });
    } catch (err) {
      console.error('[ADMIN_ADD_WHATSAPP_CONTACT]', err);
      res.status(500).json({ ok: false, error: 'Erro ao adicionar contato' });
    }
  }
);

router.delete('/whatsapp-contacts/:id',
  requireAuth,
  requireHierarchy(2),
  async (req, res) => {
    try {
      const r = await db.query(`
        SELECT config FROM companies WHERE id = $1
      `, [req.user.company_id]);
      const config = r.rows[0]?.config || {};
      const contacts = (config.whatsapp_contacts || []).filter(c => c.id !== req.params.id);
      await db.query(`
        UPDATE companies SET config = jsonb_set(COALESCE(config, '{}'::jsonb), '{whatsapp_contacts}', $1::jsonb), updated_at = now()
        WHERE id = $2
      `, [JSON.stringify(contacts), req.user.company_id]);
      res.json({ ok: true, contacts });
    } catch (err) {
      res.status(500).json({ ok: false, error: 'Erro ao remover contato' });
    }
  }
);

module.exports = router;
