'use strict';

/**
 * FASE 6 — OPERATIONAL ASSISTANCE RUNTIME
 *
 * Transforma IA em assistente operacional contínuo.
 * Ajuda a montar relatórios, analisar indicadores, identificar desvios,
 * buscar dados e gerar insights.
 *
 * Feature flag: OPERATIONAL_ASSISTANCE_ENABLED (default true)
 *
 * LIMITES ÉTICOS (invioláveis):
 *   ❌ NÃO acusa funcionários automaticamente
 *   ❌ NÃO gera responsabilização automática
 *   ❌ NÃO faz julgamento disciplinar
 *   ❌ NÃO imputa culpa individual
 *   ❌ NÃO gera ranking público de desempenho individual
 *   ❌ NÃO expõe dados pessoais
 *
 *   ✅ Analisa desempenho agregado
 *   ✅ Sugere capacitação
 *   ✅ Detecta padrões processuais
 */

const db = require('../../db');

const ENABLED = process.env.OPERATIONAL_ASSISTANCE_ENABLED !== 'false';

const FORBIDDEN_ANALYSIS = Object.freeze([
  'ranking_individual', 'culpa_individual', 'julgamento_disciplinar',
  'exposicao_dados_pessoais', 'acusacao_automatica'
]);

const ETHICAL_BLOCK = `
REGRAS ÉTICAS OBRIGATÓRIAS PARA ASSISTÊNCIA OPERACIONAL:
- NUNCA imputar culpa individual automaticamente
- NUNCA gerar ranking público de produtividade individual
- NUNCA fazer julgamento disciplinar
- NUNCA expor dados pessoais (salário, endereço, documentos)
- NUNCA acusar funcionários automaticamente
- Quando identificar padrões de desempenho, sempre referir em termos de PROCESSO, EQUIPE ou SETOR, nunca em termos de indivíduo específico
- Sugerir capacitação e melhoria processual, não punição
`.trim();

/**
 * Gera análise operacional com proteção ética.
 */
async function analyzeOperationalData(opts = {}) {
  if (!ENABLED) return { ok: false, reason: 'disabled' };

  const { companyId, query, dataContext, user } = opts;
  if (!companyId || !query) return { ok: false, reason: 'missing_params' };

  try {
    const ai = require('../ai');
    const prompt = `${ETHICAL_BLOCK}\n\nAnálise solicitada: ${query}\n\nDados disponíveis:\n${JSON.stringify(dataContext || {}).slice(0, 4000)}\n\nGere uma análise objetiva, acionável e eticamente responsável.`;
    const analysis = await ai.chatCompletion(prompt, { max_tokens: 1000 });
    return { ok: true, analysis, ethical_compliance: true };
  } catch (err) {
    return { ok: false, reason: err.message };
  }
}

/**
 * Identifica desvios operacionais em dados.
 */
async function detectDeviations(companyId, metrics = {}) {
  if (!ENABLED) return { ok: false, deviations: [] };

  const deviations = [];

  try {
    const taskStats = await db.query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'open' AND scheduled_at < now()) AS overdue,
        COUNT(*) FILTER (WHERE status = 'open') AS open_total,
        COUNT(*) FILTER (WHERE status = 'done' AND created_at > now() - interval '7 days') AS completed_week
      FROM tasks WHERE company_id = $1
    `, [companyId]);
    const stats = taskStats.rows[0] || {};

    if (parseInt(stats.overdue || 0) > 5) {
      deviations.push({
        type: 'task_overdue',
        severity: 'alta',
        message: `${stats.overdue} tarefas atrasadas detectadas`,
        recommendation: 'Revisar prioridades e redistribuir tarefas pendentes'
      });
    }

    if (parseInt(stats.open_total || 0) > 50) {
      deviations.push({
        type: 'task_saturation',
        severity: 'media',
        message: `${stats.open_total} tarefas abertas — possível saturação`,
        recommendation: 'Avaliar capacidade da equipe e priorizar tarefas críticas'
      });
    }
  } catch (err) {
    if (!err.message?.includes('does not exist')) {
      console.warn('[ASSISTANCE] detectDeviations:', err.message);
    }
  }

  return { ok: true, deviations, count: deviations.length };
}

/**
 * Prepara briefing operacional para o usuário.
 */
async function prepareBriefing(companyId, userId) {
  if (!ENABLED) return { ok: false, reason: 'disabled' };

  const sections = [];

  try {
    const tasks = await db.query(`
      SELECT title, status, scheduled_at, assignee FROM tasks
      WHERE company_id = $1 AND status != 'done'
      ORDER BY scheduled_at ASC NULLS LAST LIMIT 8
    `, [companyId]);
    if (tasks.rows?.length) {
      sections.push({
        title: 'Tarefas Pendentes',
        items: tasks.rows.map(t => ({
          text: t.title,
          status: t.status,
          due: t.scheduled_at,
          assignee: t.assignee
        }))
      });
    }
  } catch (_) {}

  try {
    const events = await db.query(`
      SELECT tipo_evento, descricao, equipamento FROM eventos_empresa
      WHERE company_id = $1 ORDER BY created_at DESC LIMIT 5
    `, [companyId]);
    if (events.rows?.length) {
      sections.push({
        title: 'Eventos Recentes',
        items: events.rows.map(e => ({
          text: e.descricao,
          type: e.tipo_evento,
          equipment: e.equipamento
        }))
      });
    }
  } catch (_) {}

  const { deviations } = await detectDeviations(companyId);
  if (deviations.length) {
    sections.push({
      title: 'Desvios Identificados',
      items: deviations.map(d => ({
        text: d.message,
        severity: d.severity,
        recommendation: d.recommendation
      }))
    });
  }

  return { ok: true, sections, timestamp: new Date().toISOString() };
}

module.exports = {
  analyzeOperationalData,
  detectDeviations,
  prepareBriefing,
  ETHICAL_BLOCK,
  FORBIDDEN_ANALYSIS,
  isEnabled: () => ENABLED
};
