/**
 * IMPETUS - Operational Brain Engine
 * Núcleo de inteligência organizacional que orquestra:
 * - Ingestão de dados (chat, tarefas, eventos, manutenção, áudio, decisões)
 * - Classificação pela IA
 * - Memória da empresa
 * - Insights e alertas
 */
const claudeAnalytics = require('./claudeAnalyticsService');
const corporateMemory = require('./corporateMemoryService');
const patternAnalysis = require('./patternAnalysisService');
const operationalInsights = require('./operationalInsightsService');
const operationalAlerts = require('./operationalAlertsService');

const BRAIN_ENABLED = process.env.OPERATIONAL_BRAIN_ENABLED !== 'false';

// Categorias de classificação alinhadas ao cérebro
const CATEGORIAS = ['producao', 'manutencao', 'qualidade', 'tarefa', 'decisao', 'problema', 'alerta', 'comunicacao_interna'];

/**
 * Ponto único de entrada para o cérebro
 * Dados do sistema → Análise da IA → Classificação → Memória → Insights/Alertas
 * @param {Object} opts - { companyId, sourceType, rawContent, structuredData, metadata }
 */
async function ingest(opts = {}) {
  if (!BRAIN_ENABLED || !opts.companyId) return { ok: false };

  const { companyId, sourceType, rawContent, structuredData, metadata = {} } = opts;

  try {
    const results = { facts: 0, events: 0, insights: 0, alerts: 0 };

    // 1. Se há conteúdo textual, enviar ao pipeline Claude/Corporate
    if (rawContent && typeof rawContent === 'string' && rawContent.trim()) {
      claudeAnalytics.ingestAsync(rawContent, {
        companyId,
        sourceType: sourceType || 'evento',
        sourceId: metadata.sourceId,
        sourceMetadata: metadata
      });
    }

    // 2. Se há dados estruturados (evento direto), persistir na memória corporativa
    if (structuredData && Array.isArray(structuredData.events) && structuredData.events.length) {
      const r = await corporateMemory.persistCorporateEvents({
        companyId,
        corporateEvents: structuredData.events,
        sourceType: sourceType || 'evento',
        sourceId: metadata.sourceId,
        sourceMetadata: metadata
      });
      results.events = r.kmInserted + r.tasksCreated;
    }

    // 3. Análise de padrões (assíncrona, não bloqueia)
    setImmediate(async () => {
      try {
        const patterns = await patternAnalysis.analyze(companyId);
        if (patterns.length) {
          const insights = await operationalInsights.generateFromPatterns(companyId, patterns);
          results.insights += insights.length;
        }
      } catch (e) {
        console.warn('[BRAIN] patternAnalysis:', e?.message);
      }
    });

    return { ok: true, ...results };
  } catch (err) {
    console.warn('[BRAIN] ingest error:', err?.message);
    return { ok: false };
  }
}

/**
 * Dispara verificação de alertas (máquina parada, tarefa atrasada, etc.)
 */
async function checkAlerts(companyId) {
  if (!BRAIN_ENABLED || !companyId) return [];
  return operationalAlerts.checkAndCreate(companyId);
}

/**
 * Retorna resumo do estado operacional para dashboards
 */
async function getOperationalSummary(companyId, opts = {}) {
  if (!companyId) return null;

  const [
    producaoSummary,
    manutencaoSummary,
    gestaoSummary,
    insightsRecentes,
    alertasPendentes,
    timeline
  ] = await Promise.all([
    operationalInsights.getProducaoSummary(companyId, opts),
    operationalInsights.getManutencaoSummary(companyId, opts),
    operationalInsights.getGestaoSummary(companyId, opts),
    operationalInsights.listRecent(companyId, { limit: 10 }),
    operationalAlerts.listPending(companyId, { limit: 10 }),
    operationalAlerts.getTimeline(companyId, opts)
  ]);

  return {
    producao: producaoSummary,
    manutencao: manutencaoSummary,
    gestao: gestaoSummary,
    insights: insightsRecentes,
    alertas: alertasPendentes,
    timeline
  };
}

module.exports = {
  ingest,
  checkAlerts,
  getOperationalSummary,
  CATEGORIAS,
  BRAIN_ENABLED
};
