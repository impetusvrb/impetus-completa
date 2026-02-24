/**
 * Resumo Inteligente Diário/Semanal
 * IA analisa histórico do usuário + dados da fábrica e gera relatório executivo
 */
const db = require('../db');
const ai = require('./ai');
const documentContext = require('./documentContext');
const userContext = require('./userContext');

const isFriday = () => new Date().getDay() === 5;

/**
 * Busca atividades do usuário nos últimos N dias
 */
async function getUserActivity(userId, companyId, days = 7) {
  try {
    const r = await db.query(`
      SELECT activity_type, entity_type, entity_id, context, created_at
      FROM user_activity_logs
      WHERE user_id = $1 AND company_id = $2
        AND created_at >= now() - INTERVAL '1 day' * $3
      ORDER BY created_at DESC
      LIMIT 200
    `, [userId, companyId, days]);
    return r.rows || [];
  } catch (err) {
    if (err.message?.includes('does not exist')) return [];
    console.warn('[SMART_SUMMARY] getUserActivity:', err.message);
    return [];
  }
}

/**
 * Busca comunicações (problemas/ocorrências) do período
 */
async function getCommunicationsSummary(companyId, days = 1) {
  try {
    const r = await db.query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status NOT IN ('resolved', 'archived')) as open_count,
        COUNT(*) FILTER (WHERE ai_priority <= 2) as priority_count,
        array_agg(DISTINCT ai_classification->>'type') FILTER (WHERE ai_classification->>'type' IS NOT NULL) as types
      FROM communications
      WHERE company_id = $1 AND created_at >= now() - INTERVAL '1 day' * $2
    `, [companyId, days]);
    return r.rows[0] || {};
  } catch (err) {
    return {};
  }
}

/**
 * Busca comunicações abertas (detalhes) para o resumo
 */
async function getOpenCommunications(companyId, days = 7) {
  try {
    const r = await db.query(`
      SELECT id, text_content, ai_priority, ai_classification, status, created_at
      FROM communications
      WHERE company_id = $1
        AND created_at >= now() - INTERVAL '1 day' * $2
        AND status NOT IN ('resolved', 'archived')
      ORDER BY ai_priority ASC, created_at DESC
      LIMIT 15
    `, [companyId, days]);
    return r.rows || [];
  } catch (err) {
    return [];
  }
}

/**
 * Propostas Pró-Ação em aberto
 */
async function getOpenProposals(companyId) {
  try {
    const r = await db.query(`
      SELECT id, COALESCE(title, LEFT(proposed_solution, 200), problem_category, 'Proposta') as title,
             problem_category, status, current_phase, urgency, created_at
      FROM proposals
      WHERE company_id = $1
        AND status NOT IN ('completed', 'rejected')
      ORDER BY urgency ASC NULLS LAST, created_at DESC
      LIMIT 10
    `, [companyId]);
    return r.rows || [];
  } catch (err) {
    return [];
  }
}

/**
 * Gera o resumo executivo via IA
 */
async function generateSummary(opts) {
  const {
    userName,
    userId,
    companyId,
    isWeekly,
    activities,
    commSummary,
    openComms,
    openProposals,
  } = opts;

  const periodo = isWeekly ? 'últimos 7 dias' : 'ontem';

  const actividadesTexto = activities.length > 0
    ? activities.slice(0, 50).map((a) => {
        const ctx = a.context ? JSON.stringify(a.context).slice(0, 100) : '';
        return `- ${a.activity_type} ${a.entity_type || ''} em ${new Date(a.created_at).toLocaleDateString('pt-BR')} ${ctx}`;
      }).join('\n')
    : '(sem registros de atividade)';

  const comunicoesAbertas =
    openComms.length > 0
      ? openComms
          .slice(0, 10)
          .map(
            (c) =>
              `[Prioridade ${c.ai_priority}] ${(c.text_content || '').slice(0, 120)}... (${c.status})`
          )
          .join('\n')
      : 'Nenhuma comunicação pendente.';

  const propostasAbertas =
    openProposals.length > 0
      ? openProposals
          .map(
            (p) =>
              `- ${p.title} (${p.problem_category || '-'}) - ${p.status} - Urgência ${p.urgency || '-'}`
          )
          .join('\n')
      : 'Nenhuma proposta em aberto.';

  const tipoRelatorio = isWeekly
    ? 'relatório semanal executivo'
    : 'relatório diário';

  const langInstruction = userCtx ? userContext.getLanguageInstructions(userCtx) : '';
  const focusHint = userCtx?.area_focus?.length ? ` Priorize para área ${userCtx.area}: ${(userCtx.area_focus || []).slice(0, 3).join(', ')}.` : '';

  const prompt = `Você é o Impetus, assistente de inteligência operacional industrial. Crie um ${tipoRelatorio} para ${userName}. Ao se identificar nas respostas, use apenas o nome "Impetus".
${langInstruction ? `${langInstruction}` : ''}${focusHint}

## Dados do período (${periodo}):

### Atividade do usuário (o que foi buscado/acessado):
${actividadesTexto}

### Resumo de comunicações:
- Total: ${commSummary.total || 0}
- Em aberto: ${commSummary.open_count || 0}
- Alta prioridade: ${commSummary.priority_count || 0}

### Comunicações ainda não resolvidas:
${comunicoesAbertas}

### Propostas Pró-Ação em aberto:
${propostasAbertas}

---

INSTRUÇÕES: Gere uma saudação cordial seguida do relatório em formato markdown. Estruture em seções:
1. **Saudação** - cumprimente brevemente
2. **Problemas/Comunicações em aberto** - itens que precisam de atenção
3. **Propostas Pró-Ação pendentes** - o que ainda não foi resolvido
4. **Resumo de suas atividades** - o que você solicitou ou visualizou (para não esquecer)
5. **Recomendações** - 2-3 ações sugeridas

Seja conciso e acionável. Máximo 600 palavras.`;

  const docContext = await documentContext.buildAIContext({
    companyId: opts.companyId,
    queryText: '',
    forDiagnostic: false
  });
  const fullPrompt = docContext
    ? `${prompt}\n\n${docContext}`
    : prompt;

  return await ai.chatCompletion(fullPrompt, { max_tokens: 1000 });
}

/**
 * Fluxo principal: coleta dados e gera resumo
 * @param {Object} user - req.user (com area, job_title, department, hierarchy_level)
 */
async function buildSmartSummary(userId, userName, companyId, user = null) {
  const isWeekly = isFriday();
  const days = isWeekly ? 7 : 1;

  const [activities, commSummary, openComms, openProposals] = await Promise.all([
    getUserActivity(userId, companyId, 7),
    getCommunicationsSummary(companyId, days),
    getOpenCommunications(companyId, days),
    getOpenProposals(companyId),
  ]);

  const ctx = user ? userContext.buildUserContext(user) : null;

  const summary = await generateSummary({
    userName: userName || 'Usuário',
    userId,
    companyId,
    isWeekly,
    activities,
    commSummary,
    openComms,
    openProposals,
    userContext: ctx,
  });

  return {
    summary,
    isWeekly,
    periodo: isWeekly ? 'semanal' : 'diário',
    openCommsCount: commSummary.open_count || 0,
    openProposalsCount: openProposals.length,
  };
}

module.exports = { buildSmartSummary, getUserActivity };
