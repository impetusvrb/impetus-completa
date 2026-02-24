/**
 * ROTAS DE DASHBOARD E MÉTRICAS
 * KPIs, Estatísticas, Gráficos
 * Fase 4: Cache em memória para reduzir carga no banco
 */

const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { cached, TTL } = require('../utils/cache');
const smartSummary = require('../services/smartSummary');
const ai = require('../services/ai');
const documentContext = require('../services/documentContext');
const dashboardVisibility = require('../services/dashboardVisibility');
const executiveMode = require('../services/executiveMode');
const userContext = require('../services/userContext');

/**
 * GET /api/dashboard/user-context
 * Contexto organizacional do usuário (área, cargo, setor, escopo)
 */
router.get('/user-context', requireAuth, (req, res) => {
  try {
    const ctx = userContext.buildUserContext(req.user);
    res.json({ ok: true, context: ctx });
  } catch (err) {
    console.error('[USER_CONTEXT_ERROR]', err);
    res.status(500).json({ ok: false, error: 'Erro ao buscar contexto' });
  }
});

/**
 * GET /api/dashboard/visibility
 * Retorna seções visíveis + contexto organizacional (personalização por área/cargo)
 */
router.get('/visibility', requireAuth, async (req, res) => {
  try {
    const hierarchyLevel = req.user.hierarchy_level ?? 5;
    const companyId = req.user.company_id;
    const sections = await dashboardVisibility.getVisibilityForUser(hierarchyLevel, companyId);

    const ctx = userContext.buildUserContext(req.user);
    const languageInstruction = userContext.getLanguageInstructions(ctx);
    const combinedFocus = userContext.getCombinedFocus(ctx);

    res.json({
      ok: true,
      sections,
      userContext: ctx,
      languageInstruction,
      focus: combinedFocus
    });
  } catch (err) {
    console.error('[DASHBOARD_VISIBILITY_ERROR]', err);
    res.status(500).json({ ok: false, error: 'Erro ao buscar visibilidade' });
  }
});

/**
 * POST /api/dashboard/executive-query
 * Consulta estratégica (apenas CEO verificado)
 */
/**
 * POST /api/dashboard/org-ai-assistant
 * Assistente IA Organizacional - perguntas internas/externas com governança
 */
router.post('/org-ai-assistant', requireAuth, async (req, res) => {
  try {
    const { question } = req.body;
    if (!question || typeof question !== 'string' || question.trim().length < 3) {
      return res.status(400).json({ ok: false, error: 'Pergunta obrigatória' });
    }
    const orgAI = require('../services/organizationalAI');
    const low = question.toLowerCase();
    const isExternal = /preço|cotação|litro|mercado|quanto está|valor do|aço|óleo/i.test(low);
    const reply = isExternal
      ? await orgAI.answerExternalQuestion(question.trim())
      : await orgAI.answerInternalQuestion(req.user.company_id, question.trim(), req.user);
    res.json({ ok: true, reply });
  } catch (err) {
    console.error('[ORG_AI_ASSISTANT]', err);
    res.status(500).json({ ok: false, error: 'Erro ao processar pergunta' });
  }
});

/**
 * POST /api/dashboard/communication-classify
 * Classifica mensagem e retorna destinatários sugeridos (escalonamento)
 */
router.post('/communication-classify', requireAuth, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ ok: false, error: 'Mensagem obrigatória' });
    }
    const escalation = require('../services/communicationEscalation');
    const ctx = userContext.buildUserContext(req.user);
    const result = await escalation.processCommunication(
      message.trim(),
      req.user.company_id,
      ctx
    );
    res.json({ ok: true, ...result });
  } catch (err) {
    console.error('[COMMUNICATION_CLASSIFY_ERROR]', err);
    res.status(500).json({ ok: false, error: 'Erro ao classificar' });
  }
});

router.post('/executive-query', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'ceo') {
      return res.status(403).json({ ok: false, error: 'Acesso restrito a CEO' });
    }

    const userResult = await db.query(
      'SELECT executive_verified FROM users WHERE id = $1',
      [req.user.id]
    );
    if (!userResult.rows[0]?.executive_verified) {
      return res.status(403).json({
        ok: false,
        error: 'Verificação executiva pendente. Envie o certificado IPC via WhatsApp para liberar acesso.'
      });
    }

    const { query, modoApresentacao = false } = req.body;
    if (!query || typeof query !== 'string' || query.trim().length < 3) {
      return res.status(400).json({ ok: false, error: 'Consulta inválida' });
    }

    const response = await executiveMode.processExecutiveQuery(
      req.user.company_id,
      req.user.id,
      query.trim(),
      !!modoApresentacao
    );

    await executiveMode.logExecutiveAction({
      companyId: req.user.company_id,
      userId: req.user.id,
      action: 'strategic_query_web',
      channel: 'web',
      requestSummary: query.slice(0, 300),
      responseSummary: response?.slice(0, 300),
      metadata: { modoApresentacao: !!modoApresentacao }
    });

    res.json({ ok: true, response });
  } catch (err) {
    console.error('[EXECUTIVE_QUERY_ERROR]', err);
    res.status(500).json({ ok: false, error: 'Erro ao processar consulta' });
  }
});

/**
 * GET /api/dashboard/summary
 * Resumo geral do dashboard (cache 2 min)
 */
router.get('/summary', requireAuth, async (req, res) => {
  try {
    const companyId = req.user.company_id;

    if (!companyId) {
      return res.json({
        ok: true,
        summary: {
          operational_interactions: { total: 0, growth_percentage: 0 },
          ai_insights: { total: 0, growth_percentage: 0 },
          monitored_points: { total: 0 },
          proposals: { total: 0 }
        }
      });
    }

    const summary = await cached(
      'dashboard:summary',
      async () => {
        const emptyResult = {
          operational_interactions: { total: 0, growth_percentage: 0 },
          ai_insights: { total: 0, growth_percentage: 0 },
          monitored_points: { total: 0 },
          proposals: { total: 0 }
        };

        let comms = { current_week: 0, previous_week: 0 };
        let insights = { current_week: 0, previous_week: 0 };
        let pointsTotal = 0;
        let proposalsTotal = 0;

        try {
          const communicationsResult = await db.query(`
            SELECT COUNT(*) FILTER (WHERE created_at >= now() - INTERVAL '1 week') as current_week,
                   COUNT(*) FILTER (WHERE created_at >= now() - INTERVAL '2 weeks' AND created_at < now() - INTERVAL '1 week') as previous_week
            FROM communications WHERE company_id = $1
          `, [companyId]);
          comms = communicationsResult.rows[0] || comms;
        } catch {
          // Tabela communications pode não existir
        }

        try {
          const insightsResult = await db.query(`
            SELECT COUNT(*) FILTER (WHERE ai_priority <= 2 AND created_at >= now() - INTERVAL '1 week') as current_week,
                   COUNT(*) FILTER (WHERE ai_priority <= 2 AND created_at >= now() - INTERVAL '2 weeks' AND created_at < now() - INTERVAL '1 week') as previous_week
            FROM communications WHERE company_id = $1
          `, [companyId]);
          insights = insightsResult.rows[0] || insights;
        } catch {
          // Tabela pode não existir
        }

        try {
          const pointsResult = await db.query(`
            SELECT COUNT(*) as total FROM monitored_points WHERE company_id = $1 AND active = true
          `, [companyId]);
          pointsTotal = parseInt(pointsResult.rows[0]?.total || 0);
        } catch {
          // Tabela pode não existir
        }

        try {
          const propResult = await db.query(`SELECT COUNT(*) as total FROM proposals WHERE company_id = $1`, [companyId]);
          proposalsTotal = parseInt(propResult.rows[0]?.total || 0);
        } catch {
          // Tabela pode não existir
        }

        const commGrowth = comms.previous_week > 0
          ? ((comms.current_week - comms.previous_week) / comms.previous_week * 100).toFixed(1)
          : 0;
        const insightsGrowth = insights.previous_week > 0
          ? ((insights.current_week - insights.previous_week) / insights.previous_week * 100).toFixed(1)
          : 0;

        return {
          operational_interactions: { total: parseInt(comms.current_week || 0), growth_percentage: parseFloat(commGrowth) },
          ai_insights: { total: parseInt(insights.current_week || 0), growth_percentage: parseFloat(insightsGrowth) },
          monitored_points: { total: pointsTotal },
          proposals: { total: proposalsTotal }
        };
      },
      () => companyId || 'no-company',
      TTL.DASHBOARD_SUMMARY
    );

    res.json({ ok: true, summary });

  } catch (err) {
    console.error('[DASHBOARD_SUMMARY_ERROR]', err);
    res.status(500).json({
      ok: false,
      error: 'Erro ao buscar resumo do dashboard'
    });
  }
});

/**
 * GET /api/dashboard/trend
 * Tendência operacional (gráfico de área) - cache 5 min
 */
router.get('/trend', requireAuth, async (req, res) => {
  try {
    const months = parseInt(req.query.months) || 6;
    const companyId = req.user.company_id;

    const trend = await cached(
      'dashboard:trend',
      async () => {
        const result = await db.query(`
          SELECT 
            DATE_TRUNC('month', created_at) as month,
            COUNT(*) as interactions
          FROM communications
          WHERE company_id = $1
            AND created_at >= now() - ($2 * interval '1 month')
          GROUP BY DATE_TRUNC('month', created_at)
          ORDER BY month ASC
        `, [companyId, months]);
        return result.rows;
      },
      () => `${companyId}:${months}`,
      TTL.DASHBOARD_TREND
    );

    res.json({
      ok: true,
      trend
    });

  } catch (err) {
    console.error('[DASHBOARD_TREND_ERROR]', err);
    res.status(500).json({
      ok: false,
      error: 'Erro ao buscar tendência'
    });
  }
});

/**
 * GET /api/dashboard/insights
 * Insights prioritários da IA - cache 1 min
 */
router.get('/insights', requireAuth, async (req, res) => {
  try {
    const companyId = req.user.company_id;

    const insights = await cached(
      'dashboard:insights',
      async () => {
        const result = await db.query(`
          SELECT 
            id,
            text_content,
            ai_classification,
            ai_priority,
            ai_sentiment,
            created_at,
            related_equipment_id
          FROM communications
          WHERE company_id = $1
            AND ai_priority <= 2
            AND status != 'resolved'
          ORDER BY ai_priority ASC, created_at DESC
          LIMIT 10
        `, [companyId]);

        return result.rows.map(row => ({
      id: row.id,
      title: row.ai_classification?.type || 'Insight',
      description: row.text_content?.substring(0, 100),
      severity: row.ai_priority === 1 ? 'crítico' : 'alto',
          impact: row.ai_sentiment === 'urgente' ? 'Alto' : 'Médio',
          reference: `Ref: ${row.id.substring(0, 11)}`,
          created_at: row.created_at
        }));
      },
      () => companyId,
      TTL.DASHBOARD_INSIGHTS
    );

    res.json({
      ok: true,
      insights
    });

  } catch (err) {
    console.error('[DASHBOARD_INSIGHTS_ERROR]', err);
    res.status(500).json({
      ok: false,
      error: 'Erro ao buscar insights'
    });
  }
});

/**
 * GET /api/dashboard/monitored-points-distribution
 * Distribuição de pontos monitorados - cache 5 min
 */
router.get('/monitored-points-distribution', requireAuth, async (req, res) => {
  try {
    const companyId = req.user.company_id;

    const distribution = await cached(
      'dashboard:points',
      async () => {
        const result = await db.query(`
          SELECT 
            type,
            COUNT(*) as count
          FROM monitored_points
          WHERE company_id = $1 AND active = true
          GROUP BY type
          ORDER BY count DESC
        `, [companyId]);
        return result.rows;
      },
      () => companyId,
      TTL.DASHBOARD_POINTS
    );

    res.json({
      ok: true,
      distribution
    });

  } catch (err) {
    console.error('[DASHBOARD_POINTS_DISTRIBUTION_ERROR]', err);
    res.status(500).json({
      ok: false,
      error: 'Erro ao buscar distribuição'
    });
  }
});

/**
 * GET /api/dashboard/recent-interactions
 * Interações recentes (feed) - cache 1 min
 */
router.get('/recent-interactions', requireAuth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;
    const companyId = req.user.company_id;

    const interactions = await cached(
      'dashboard:interactions',
      async () => {
        const result = await db.query(`
          SELECT 
            c.id,
            c.source,
            c.text_content,
            c.created_at,
            u.name as sender_name,
            u.avatar_url
          FROM communications c
          LEFT JOIN users u ON c.sender_id = u.id
          WHERE c.company_id = $1
          ORDER BY c.created_at DESC
          LIMIT $2
        `, [companyId, limit]);
        return result.rows;
      },
      () => `${companyId}:${limit}`,
      TTL.DASHBOARD_INTERACTIONS
    );

    res.json({
      ok: true,
      interactions
    });

  } catch (err) {
    console.error('[DASHBOARD_RECENT_INTERACTIONS_ERROR]', err);
    res.status(500).json({
      ok: false,
      error: 'Erro ao buscar interações recentes'
    });
  }
});

/**
 * POST /api/dashboard/log-activity
 * Registra atividade do usuário (buscas, visualizações, contexto)
 */
router.post('/log-activity', requireAuth, async (req, res) => {
  try {
    const { activity_type, entity_type, entity_id, context } = req.body;
    if (!activity_type) {
      return res.status(400).json({ ok: false, error: 'activity_type obrigatório' });
    }
    await db.query(`
      INSERT INTO user_activity_logs (user_id, company_id, activity_type, entity_type, entity_id, context)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      req.user.id,
      req.user.company_id,
      activity_type,
      entity_type || null,
      entity_id || null,
      context ? JSON.stringify(context) : '{}'
    ]);
    res.json({ ok: true });
  } catch (err) {
    if (err.message?.includes('does not exist')) {
      return res.json({ ok: true }); // Tabela pode não existir ainda
    }
    console.error('[LOG_ACTIVITY]', err);
    res.status(500).json({ ok: false, error: 'Erro ao registrar atividade' });
  }
});

/**
 * GET /api/dashboard/smart-summary
 * Resumo Inteligente Diário/Semanal - IA analisa histórico + dados da fábrica
 * Sexta-feira: relatório semanal. Demais dias: relatório diário.
 */
router.get('/smart-summary', requireAuth, async (req, res) => {
  try {
    const result = await smartSummary.buildSmartSummary(
      req.user.id,
      req.user.name,
      req.user.company_id,
      req.user
    );
    res.json({
      ok: true,
      ...result
    });
  } catch (err) {
    console.error('[SMART_SUMMARY_ERROR]', err);
    res.status(500).json({
      ok: false,
      error: 'Erro ao gerar resumo',
      fallback: 'Resumo temporariamente indisponível.'
    });
  }
});

/**
 * POST /api/dashboard/chat
 * Chat com IA Operacional - contexto completo (Política Impetus + docs da empresa)
 */
router.post('/chat', requireAuth, async (req, res) => {
  try {
    const { message, history = [] } = req.body;
    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ ok: false, error: 'Mensagem obrigatória' });
    }
    const companyId = req.user.company_id;
    const userName = req.user.name || 'Usuário';

    const ctx = userContext.buildUserContext(req.user);
    const langInstruction = userContext.getLanguageInstructions(ctx);

    const docContext = await documentContext.buildAIContext({ companyId, queryText: message });
    const manuals = await documentContext.searchCompanyManuals(companyId, message, 6);
    const manualsBlock = manuals.length > 0
      ? manuals.map((m, i) => `[${i + 1}] ${m.title}: ${(m.chunk_text || '').slice(0, 400)}`).join('\n---\n')
      : '(Nenhum trecho relevante)';

    const historyBlock = history.slice(-6).map((m) => {
      const role = m.role === 'user' ? 'Usuário' : 'IA';
      return `${role}: ${(m.content || '').slice(0, 300)}`;
    }).join('\n');

    const systemPrompt = `Você é o Impetus, assistente de inteligência operacional industrial. Ao se identificar nas respostas, use apenas o nome "Impetus". Assista ${userName} com perguntas sobre operação, manutenção, procedimentos e melhoria contínua.
${langInstruction ? `\n${langInstruction}` : ''}
${docContext ? `\n${docContext}\n` : ''}
## Trechos de manuais/POPs (se relevantes):
${manualsBlock}`;

    const userPrompt = historyBlock
      ? `Histórico recente:\n${historyBlock}\n\nUsuário: ${message.trim()}`
      : message.trim();

    const fullPrompt = `${systemPrompt}\n\n---\n\n${userPrompt}\n\nResponda de forma clara e em conformidade com a Política Impetus e documentação da empresa.`;

    const reply = await ai.chatCompletion(fullPrompt, { max_tokens: 800 });

    res.json({
      ok: true,
      reply: reply || 'Desculpe, não consegui processar. Tente novamente.'
    });
  } catch (err) {
    console.error('[CHAT_ERROR]', err);
    res.status(500).json({
      ok: false,
      error: 'Erro ao processar mensagem',
      fallback: 'Resposta temporariamente indisponível. Tente novamente.'
    });
  }
});

module.exports = router;
