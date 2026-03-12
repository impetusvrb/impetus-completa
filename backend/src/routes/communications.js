/**
 * ROTAS DE COMUNICAÇÕES
 * Gerenciamento de comunicações rastreadas (WhatsApp + Sistema)
 */

const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { requireHierarchyScope } = require('../middleware/hierarchyScope');
const { buildCommunicationsFilter } = require('../services/hierarchicalFilter');
const { safeInteger, isValidUUID } = require('../utils/security');
const { sensitiveContentMiddleware } = require('../middleware/lgpd');
const { auditMiddleware } = require('../middleware/audit');
const aiService = require('../services/ai');

/**
 * POST /api/communications
 * Criar nova comunicação
 */
router.post('/', 
  requireAuth, 
  sensitiveContentMiddleware,
  auditMiddleware({ 
    action: 'communication_created', 
    entityType: 'communication',
    severity: 'info'
  }),
  async (req, res) => {
    try {
      const {
        source = 'web',
        source_message_id,
        text_content,
        message_type = 'text',
        media_url,
        recipient_id,
        recipient_department_id,
        related_equipment_id,
        priority
      } = req.body;

      // Classificação básica pela IA
      let aiClassification = null;
      let aiSentiment = 'neutro';
      let aiPriority = priority || 3;
      let aiKeywords = [];

      if (text_content) {
        try {
          const classificationPrompt = `
Analise esta mensagem operacional industrial e classifique:

Mensagem: "${text_content}"

Retorne JSON:
{
  "type": "falha|tarefa|sugestao|pergunta|comunicado",
  "sentiment": "urgente|negativo|neutro|positivo",
  "priority": 1-5,
  "keywords": ["palavra1", "palavra2"]
}
`;
          const aiResponse = await aiService.chatCompletion(classificationPrompt, { max_tokens: 200 });
          let parsed = null;
          try {
            parsed = JSON.parse(aiResponse);
          } catch (_) {
            const jsonMatch = String(aiResponse || '').match(/\{[\s\S]*\}/);
            if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
          }
          if (parsed && typeof parsed === 'object') {
            aiClassification = parsed;
            aiSentiment = parsed.sentiment || 'neutro';
            aiPriority = parsed.priority || 3;
            aiKeywords = Array.isArray(parsed.keywords) ? parsed.keywords : [];
          }
        } catch (aiErr) {
          console.warn('[AI_CLASSIFICATION_ERROR]', aiErr.message);
          // Continuar mesmo sem IA
        }
      }

      const result = await db.query(`
        INSERT INTO communications (
          company_id, source, source_message_id,
          sender_id, sender_name, sender_phone, sender_whatsapp,
          recipient_id, recipient_department_id,
          message_type, text_content, media_url,
          ai_classification, ai_sentiment, ai_priority, ai_keywords,
          related_equipment_id,
          contains_sensitive_data
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
        RETURNING id, created_at, ai_classification, ai_priority
      `, [
        req.user.company_id,
        source,
        source_message_id,
        req.user.id,
        req.user.name,
        req.user.phone,
        req.user.whatsapp_number,
        recipient_id,
        recipient_department_id,
        message_type,
        text_content,
        media_url,
        aiClassification ? JSON.stringify(aiClassification) : null,
        aiSentiment,
        aiPriority,
        aiKeywords,
        related_equipment_id,
        req.containsSensitiveData || false
      ]);

      res.status(201).json({
        ok: true,
        communication: result.rows[0]
      });

    } catch (err) {
      console.error('[CREATE_COMMUNICATION_ERROR]', err);
      res.status(500).json({
        ok: false,
        error: 'Erro ao criar comunicação'
      });
    }
});

/**
 * GET /api/communications
 * Listar comunicações (filtro hierárquico aplicado)
 */
router.get('/', requireAuth, requireHierarchyScope, async (req, res) => {
  try {
    const limit = safeInteger(req.query.limit, 50, 1, 200);
    const offset = safeInteger(req.query.offset, 0, 0, 100000);
    const {
      status,
      priority,
      source,
      start_date,
      end_date 
    } = req.query;

    const commFilter = buildCommunicationsFilter(req.hierarchyScope, req.user.company_id);
    const conditions = [commFilter.whereClause];
    const params = [...commFilter.params];
    let paramCount = commFilter.paramOffset;

    if (status) {
      paramCount++;
      conditions.push(`c.status = $${paramCount}`);
      params.push(status);
    }

    if (priority) {
      paramCount++;
      conditions.push(`c.ai_priority <= $${paramCount}`);
      params.push(safeInteger(priority, 3, 1, 5));
    }

    if (source) {
      paramCount++;
      conditions.push(`c.source = $${paramCount}`);
      params.push(source);
    }

    if (start_date) {
      paramCount++;
      conditions.push(`c.created_at >= $${paramCount}`);
      params.push(start_date);
    }

    if (end_date) {
      paramCount++;
      conditions.push(`c.created_at <= $${paramCount}`);
      params.push(end_date);
    }

    const whereClause = conditions.join(' AND ');

    const result = await db.query(`
      SELECT c.*, 
             u.name as sender_user_name, u.avatar_url as sender_avatar
      FROM communications c
      LEFT JOIN users u ON c.sender_id = u.id
      WHERE ${whereClause}
      ORDER BY c.created_at DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `, [...params, limit, offset]);

    const countResult = await db.query(`
      SELECT COUNT(*) as total
      FROM communications c
      WHERE ${whereClause}
    `, params);

    res.json({
      ok: true,
      communications: result.rows,
      pagination: {
        total: parseInt(countResult.rows[0].total),
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });

  } catch (err) {
    console.error('[GET_COMMUNICATIONS_ERROR]', err);
    res.status(500).json({
      ok: false,
      error: 'Erro ao buscar comunicações'
    });
  }
});

/**
 * GET /api/communications/recent
 * Interações recentes (para dashboard, filtro hierárquico)
 */
router.get('/recent', requireAuth, requireHierarchyScope, async (req, res) => {
  try {
    const limit = safeInteger(req.query.limit, 10, 1, 50);
    const commFilter = buildCommunicationsFilter(req.hierarchyScope, req.user.company_id);

    const result = await db.query(`
      SELECT 
        c.id,
        c.source,
        c.text_content,
        c.ai_classification,
        c.ai_priority,
        c.created_at,
        u.name as sender_name,
        u.avatar_url
      FROM communications c
      LEFT JOIN users u ON c.sender_id = u.id
      WHERE ${commFilter.whereClause}
      ORDER BY c.created_at DESC
      LIMIT $${commFilter.paramOffset}
    `, [...commFilter.params, limit]);

    res.json({
      ok: true,
      interactions: result.rows
    });

  } catch (err) {
    console.error('[GET_RECENT_COMMUNICATIONS_ERROR]', err);
    res.status(500).json({
      ok: false,
      error: 'Erro ao buscar interações recentes'
    });
  }
});

/**
 * GET /api/communications/:id
 * Buscar comunicação específica (verifica escopo hierárquico)
 */
router.get('/:id', requireAuth, requireHierarchyScope, async (req, res) => {
  try {
    if (!isValidUUID(req.params.id)) return res.status(400).json({ ok: false, error: 'ID inválido' });
    const commFilter = buildCommunicationsFilter(req.hierarchyScope, req.user.company_id, { paramOffset: 2 });
    const result = await db.query(`
      SELECT c.*,
             u.name as sender_user_name, u.email as sender_email, u.avatar_url as sender_avatar,
             r.name as recipient_name,
             d.name as department_name
      FROM communications c
      LEFT JOIN users u ON c.sender_id = u.id
      LEFT JOIN users r ON c.recipient_id = r.id
      LEFT JOIN departments d ON c.recipient_department_id = d.id
      WHERE c.id = $1 AND ${commFilter.whereClause}
    `, [req.params.id, ...commFilter.params]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        ok: false,
        error: 'Comunicação não encontrada'
      });
    }

    res.json({
      ok: true,
      communication: result.rows[0]
    });

  } catch (err) {
    console.error('[GET_COMMUNICATION_ERROR]', err);
    res.status(500).json({
      ok: false,
      error: 'Erro ao buscar comunicação'
      });
  }
});

module.exports = router;
