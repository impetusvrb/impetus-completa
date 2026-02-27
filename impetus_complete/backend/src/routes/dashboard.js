/**
 * ROTAS DE DASHBOARD E MÉTRICAS
 * KPIs, Estatísticas, Gráficos
 * Fase 4: Cache em memória para reduzir carga no banco
 */

const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { requireCompanyActive } = require('../middleware/multiTenant');
const { promptFirewall } = require('../middleware/promptFirewall');
const { userRateLimit } = require('../middleware/userRateLimit');
const { authorize } = require('../middleware/authorize');
const secureContextBuilder = require('../services/secureContextBuilder');
const aiAudit = require('../services/aiAudit');
const { cached, TTL } = require('../utils/cache');
const smartSummary = require('../services/smartSummary');
const ai = require('../services/ai');
const documentContext = require('../services/documentContext');
const dashboardVisibility = require('../services/dashboardVisibility');
const executiveMode = require('../services/executiveMode');
const userContext = require('../services/userContext');
const dashboardFilter = require('../services/dashboardFilter');

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
    const filterCtx = dashboardFilter.getFilterContext(req.user);

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

    const scopeKey = filterCtx.hierarchyLevel <= 1 ? 'full'
      : filterCtx.departmentId ? `d:${filterCtx.departmentId}` : `u:${filterCtx.userId}`;

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

        const commFilter = dashboardFilter.getCommunicationsFilter(filterCtx, 'c', 1);
        const commWhere = commFilter.whereClause || `c.company_id = $1`;
        const commParams = commFilter.params.length ? commFilter.params : [companyId];

        try {
          const communicationsResult = await db.query(`
            SELECT COUNT(*) FILTER (WHERE c.created_at >= now() - INTERVAL '1 week') as current_week,
                   COUNT(*) FILTER (WHERE c.created_at >= now() - INTERVAL '2 weeks' AND c.created_at < now() - INTERVAL '1 week') as previous_week
            FROM communications c
            WHERE ${commWhere}
          `, commParams);
          if (communicationsResult.rows[0]) {
            comms = communicationsResult.rows[0];
          }
        } catch (err) {
          try {
            const fallback = await db.query(`
              SELECT COUNT(*) FILTER (WHERE created_at >= now() - INTERVAL '1 week') as current_week,
                     COUNT(*) FILTER (WHERE created_at >= now() - INTERVAL '2 weeks' AND created_at < now() - INTERVAL '1 week') as previous_week
              FROM communications WHERE company_id = $1
            `, [companyId]);
            comms = fallback.rows[0] || comms;
          } catch {}
        }

        try {
          const insightsResult = await db.query(`
            SELECT COUNT(*) FILTER (WHERE c.ai_priority <= 2 AND c.created_at >= now() - INTERVAL '1 week') as current_week,
                   COUNT(*) FILTER (WHERE c.ai_priority <= 2 AND c.created_at >= now() - INTERVAL '2 weeks' AND c.created_at < now() - INTERVAL '1 week') as previous_week
            FROM communications c
            WHERE ${commWhere}
          `, commParams);
          insights = insightsResult.rows[0] || insights;
        } catch (err) {
          try {
            const fallback = await db.query(`
              SELECT COUNT(*) FILTER (WHERE ai_priority <= 2 AND created_at >= now() - INTERVAL '1 week') as current_week,
                     COUNT(*) FILTER (WHERE ai_priority <= 2 AND created_at >= now() - INTERVAL '2 weeks' AND created_at < now() - INTERVAL '1 week') as previous_week
              FROM communications WHERE company_id = $1
            `, [companyId]);
            insights = fallback.rows[0] || insights;
          } catch {}
        }

        try {
          let pointsFilter = 'company_id = $1 AND active = true';
          const pointsParams = [companyId];
          if (filterCtx.hierarchyLevel >= 4 && filterCtx.departmentId) {
            pointsFilter += ' AND (department_id = $2 OR department_id IS NULL)';
            pointsParams.push(filterCtx.departmentId);
          } else if (filterCtx.hierarchyLevel >= 2 && filterCtx.hierarchyLevel <= 3 && filterCtx.departmentId) {
            pointsFilter += ' AND (department_id = $2 OR department_id IS NULL)';
            pointsParams.push(filterCtx.departmentId);
          }
          const pointsResult = await db.query(
            `SELECT COUNT(*) as total FROM monitored_points WHERE ${pointsFilter}`,
            pointsParams
          );
          pointsTotal = parseInt(pointsResult.rows[0]?.total || 0);
        } catch {
          try {
            const fallback = await db.query(`SELECT COUNT(*) as total FROM monitored_points WHERE company_id = $1 AND active = true`, [companyId]);
            pointsTotal = parseInt(fallback.rows[0]?.total || 0);
          } catch {}
        }

        try {
          let propFilter = 'company_id = $1';
          const propParams = [companyId];
          if (filterCtx.hierarchyLevel >= 4) {
            propFilter += ' AND created_by = $2';
            propParams.push(filterCtx.userId);
          } else if (filterCtx.hierarchyLevel >= 2 && filterCtx.hierarchyLevel <= 3 && filterCtx.departmentId) {
            propFilter += ' AND (department_id = $2 OR department_id IS NULL)';
            propParams.push(filterCtx.departmentId);
          }
          const propResult = await db.query(`SELECT COUNT(*) as total FROM proposals WHERE ${propFilter}`, propParams);
          proposalsTotal = parseInt(propResult.rows[0]?.total || 0);
        } catch {
          try {
            const fallback = await db.query(`SELECT COUNT(*) as total FROM proposals WHERE company_id = $1`, [companyId]);
            proposalsTotal = parseInt(fallback.rows[0]?.total || 0);
          } catch {}
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
          proposals: { total: proposalsTotal },
          viewType: dashboardFilter.getViewType(filterCtx.hierarchyLevel)
        };
      },
      () => `${companyId}:${scopeKey}`,
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
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const offset = Math.max(0, parseInt(req.query.offset) || 0);
    const filterCtx = dashboardFilter.getFilterContext(req.user);
    const scopeKey = filterCtx.hierarchyLevel <= 1 ? 'full'
      : filterCtx.departmentId ? `d:${filterCtx.departmentId}` : `u:${filterCtx.userId}`;

    const insights = await cached(
      'dashboard:insights',
      async () => {
        const commFilter = dashboardFilter.getCommunicationsFilter(filterCtx, 'c', 1);
        const commWhere = commFilter.whereClause || 'c.company_id = $1';
        const pLimit = commFilter.paramOffset;
        const pOffset = pLimit + 1;
        const params = [...commFilter.params, limit, offset];
        const result = await db.query(`
          SELECT 
            c.id,
            c.text_content,
            c.ai_classification,
            c.ai_priority,
            c.ai_sentiment,
            c.created_at,
            c.related_equipment_id
          FROM communications c
          WHERE ${commWhere}
            AND c.ai_priority <= 2
            AND (c.status IS NULL OR c.status != 'resolved')
          ORDER BY c.ai_priority ASC, c.created_at DESC
          LIMIT $${pLimit} OFFSET $${pOffset}
        `, params);

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
      () => `${companyId}:${scopeKey}:${limit}:${offset}`,
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
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const offset = Math.max(0, parseInt(req.query.offset) || 0);
    const companyId = req.user.company_id;
    const filterCtx = dashboardFilter.getFilterContext(req.user);
    const scopeKey = filterCtx.hierarchyLevel <= 1 ? 'full'
      : filterCtx.departmentId ? `d:${filterCtx.departmentId}` : `u:${filterCtx.userId}`;

    const interactions = await cached(
      'dashboard:interactions',
      async () => {
        const commFilter = dashboardFilter.getCommunicationsFilter(filterCtx, 'c', 1);
        const commWhere = commFilter.whereClause || 'c.company_id = $1';
        const pLimit = commFilter.paramOffset;
        const pOffset = pLimit + 1;
        const params = [...commFilter.params, limit, offset];
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
          WHERE ${commWhere}
          ORDER BY c.created_at DESC
          LIMIT $${pLimit} OFFSET $${pOffset}
        `, params);
        return result.rows.map(r => ({ ...r, text: r.text_content }));
      },
      () => `${companyId}:${scopeKey}:${limit}:${offset}`,
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

/** Resposta de fallback quando IA indisponível - conquista o usuário de teste */
const CHAT_FALLBACK_IMPETUS = `Olá! Sou o **Impetus**, assistente de inteligência operacional industrial.

**O que o Impetus faz pela sua indústria:**

• **Comunicação inteligente** – Integração com WhatsApp para receber falhas, tarefas e dúvidas da equipe  
• **Manutenção assistida** – Análise de falhas técnicas com base em manuais e diagnósticos orientados  
• **Pró-Ação** – Gestão de propostas de melhoria contínua com avaliação por IA  
• **Documentação em contexto** – Consulta automática a POPs, políticas e manuais da empresa  
• **Insights operacionais** – Resumos diários e KPIs personalizados por área  

No momento, o serviço de IA está temporariamente indisponível. Em produção, responderei com base na documentação da sua empresa. Entre em contato com o suporte para configurar a API.`;

/**
 * POST /api/dashboard/chat
 * Fluxo: Auth → Company → Prompt Firewall → Rate Limit → Authorize → Secure Context → OpenAI → Audit
 * A IA nunca decide permissões. Toda decisão no backend.
 */
router.post('/chat',
  requireAuth,
  requireCompanyActive,
  promptFirewall,
  userRateLimit('ai_chat'),
  async (req, res) => {
    if (req.promptFirewall?.blocked) {
      await aiAudit.logAIInteraction({
        userId: req.user?.id,
        companyId: req.user?.company_id,
        action: 'chat',
        question: req.body?.message,
        blocked: true,
        blockReason: req.promptFirewall.reason,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });
      return res.status(403).json({
        ok: false,
        error: req.promptFirewall.message || 'Você não possui permissão para acessar informações estratégicas.',
        code: 'PROMPT_BLOCKED'
      });
    }

    let reply = '';
    try {
      const { message, history = [] } = req.body;
      if (!message || typeof message !== 'string' || !message.trim()) {
        return res.status(400).json({ ok: false, error: 'Mensagem obrigatória' });
      }
      const companyId = req.user.company_id;
      const userName = req.user.name || 'Usuário';

      let docContext = '';
      let manualsBlock = '(Nenhum trecho relevante)';
      let langInstruction = '';

      try {
        const ctx = userContext.buildUserContext(req.user);
        langInstruction = userContext.getLanguageInstructions(ctx) || '';
      } catch (_) {}

      try {
        const secureCtx = await secureContextBuilder.buildContext(req.user, { companyId, queryText: message });
        docContext = secureCtx.context || '';
      } catch (err) {
        try {
          docContext = await documentContext.buildAIContext({ companyId, queryText: message }) || '';
        } catch (e) {
          console.warn('[CHAT] buildAIContext:', e.message);
        }
      }

      try {
        const manuals = await documentContext.searchCompanyManuals(companyId, message, 6);
        if (manuals.length > 0) {
          manualsBlock = manuals.map((m, i) => `[${i + 1}] ${m.title}: ${(m.chunk_text || '').slice(0, 400)}`).join('\n---\n');
        }
      } catch (err) {
        console.warn('[CHAT] searchCompanyManuals:', err.message);
      }

      const historyBlock = (Array.isArray(history) ? history.slice(-6) : []).map((m) => {
        const role = m.role === 'user' ? 'Usuário' : 'IA';
        return `${role}: ${(m.content || '').slice(0, 300)}`;
      }).join('\n');

      const IMPETUS_CAPABILITIES = `
## O que o Impetus oferece (apresente quando perguntarem "o que é" ou "o que faz"):
- **Comunicação Rastreada Inteligente** – Integração WhatsApp, mensagens operacionais, tarefas e diagnósticos
- **Pró-Ação (Melhoria Contínua)** – Propostas de melhoria avaliadas por IA, acompanhamento de projetos
- **Manutenção Assistida** – Análise de falhas com base em manuais, POPs e políticas da empresa
- **Insights e KPIs** – Resumos diários, tendências e indicadores por área
- **Documentação em contexto** – A IA sempre consulta POPs, políticas e manuais internos
Seja proativo: ao dar as boas-vindas ou em respostas curtas, mencione brevemente que o Impetus auxilia em operação, manutenção e melhoria contínua industrial.`;

    const systemPrompt = `Você é o **Impetus**, assistente de inteligência operacional industrial. Use apenas o nome "Impetus" ao se identificar.

**IMPORTANTE:** Seja acolhedor e comunicativo. Em primeiros contatos ou quando o usuário perguntar o que você faz, apresente de forma clara e objetiva as capacidades do Impetus. Conquiste o usuário na primeira interação.
${IMPETUS_CAPABILITIES}
${langInstruction ? `\n${langInstruction}` : ''}
${docContext ? `\n${docContext}\n` : ''}
## Trechos de manuais/POPs (se relevantes):
${manualsBlock}`;

    const userPrompt = historyBlock
      ? `Histórico recente:\n${historyBlock}\n\nUsuário: ${message.trim()}`
      : message.trim();

    const fullPrompt = `${systemPrompt}\n\n---\n\n${userPrompt}\n\nResponda de forma clara, em português, e em conformidade com a Política Impetus quando aplicável.`;

    reply = await ai.chatCompletion(fullPrompt, { max_tokens: 800 });

    const isFallback = (reply || '').startsWith('FALLBACK:');
    if (isFallback) {
      reply = CHAT_FALLBACK_IMPETUS;
    }

    const finalReply = (reply || '').trim() || 'Desculpe, não consegui processar. Tente novamente.';
      await aiAudit.logAIInteraction({
        userId: req.user?.id,
        companyId: req.user?.company_id,
        action: 'chat',
        question: message,
        response: finalReply,
        blocked: false,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });
      return res.json({ ok: true, reply: finalReply });
    } catch (err) {
      console.error('[CHAT_ERROR]', err);
      await aiAudit.logAIInteraction({
        userId: req.user?.id,
        companyId: req.user?.company_id,
        action: 'chat',
        question: req.body?.message,
        blocked: false,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      }).catch(() => {});
      return res.json({
        ok: true,
        reply: CHAT_FALLBACK_IMPETUS
      });
    }
  });

module.exports = router;
