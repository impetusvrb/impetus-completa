/**
 * REGISTRO INTELIGENTE - Serviço de processamento por IA
 * Analisa relatos livres dos usuários e transforma em informação estruturada
 */
const db = require('../db');
const ai = require('./ai');
const documentContext = require('./documentContext');

const CATEGORIAS = ['operacional', 'producao', 'manutencao', 'qualidade', 'seguranca', 'melhoria', 'comunicacao', 'gestao', 'rotina', 'pendencia_critica', 'observacao_relevante'];
const PRIORIDADES = ['normal', 'atencao', 'urgente', 'critico'];

function parseJsonFromText(text) {
  if (!text || typeof text !== 'string') return null;
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return null;
  } catch {
    return null;
  }
}

function safeArray(val) {
  if (Array.isArray(val)) return val.filter(Boolean);
  if (typeof val === 'string') return val ? [val] : [];
  return [];
}

function safeString(val) {
  if (val == null) return null;
  const s = String(val).trim();
  return s || null;
}

/**
 * Processa o texto do usuário com IA e retorna estrutura parseada
 */
async function processWithAI(originalText, companyId, userName = '') {
  const docContext = await documentContext.buildAIContext({ companyId, queryText: originalText });

  const prompt = `Você é o Impetus, assistente de inteligência operacional industrial. Analise o relato abaixo e extraia informações estruturadas.

RELATO DO USUÁRIO:
"""
${(originalText || '').slice(0, 3000)}
"""

${docContext ? `CONTEXTO DA EMPRESA:\n${docContext.slice(0, 2000)}\n\n` : ''}

Responda APENAS com um JSON válido (sem markdown, sem texto extra), no formato:
{
  "summary": "resumo claro e objetivo em 1-2 frases",
  "main_category": "uma de: operacional, producao, manutencao, qualidade, seguranca, melhoria, comunicacao, gestao, rotina, pendencia_critica, observacao_relevante",
  "subcategories": ["subcategoria1", "subcategoria2"],
  "priority": "uma de: normal, atencao, urgente, critico",
  "needs_followup": true ou false,
  "needs_escalation": true ou false,
  "sector_identified": "setor se mencionado ou null",
  "department_identified": "departamento se mencionado ou null",
  "line_identified": "linha de produção se mencionada ou null",
  "machine_identified": "máquina/equipamento se mencionado ou null",
  "process_identified": "processo se mencionado ou null",
  "product_identified": "produto se mencionado ou null",
  "activities_detected": ["atividade1", "atividade2"],
  "problems_detected": ["problema1"],
  "pendencies_detected": ["pendencia1"],
  "suggestions_detected": ["sugestao1"]
}`;

  const raw = await ai.chatCompletion(prompt, { max_tokens: 1200, timeout: 45000 });
  const parsed = parseJsonFromText(raw);

  if (!parsed) {
    return {
      summary: (raw || originalText.slice(0, 200)).replace(/FALLBACK:.*/i, '').trim() || originalText.slice(0, 300),
      main_category: 'rotina',
      subcategories: [],
      priority: 'normal',
      needs_followup: false,
      needs_escalation: false,
      sector_identified: null,
      department_identified: null,
      line_identified: null,
      machine_identified: null,
      process_identified: null,
      product_identified: null,
      activities_detected: [],
      problems_detected: [],
      pendencies_detected: [],
      suggestions_detected: []
    };
  }

  const cat = CATEGORIAS.includes(parsed.main_category) ? parsed.main_category : 'rotina';
  const prio = PRIORIDADES.includes(parsed.priority) ? parsed.priority : 'normal';

  return {
    summary: safeString(parsed.summary) || originalText.slice(0, 300),
    main_category: cat,
    subcategories: safeArray(parsed.subcategories),
    priority: prio,
    needs_followup: !!parsed.needs_followup,
    needs_escalation: !!parsed.needs_escalation,
    sector_identified: safeString(parsed.sector_identified),
    department_identified: safeString(parsed.department_identified),
    line_identified: safeString(parsed.line_identified),
    machine_identified: safeString(parsed.machine_identified),
    process_identified: safeString(parsed.process_identified),
    product_identified: safeString(parsed.product_identified),
    activities_detected: safeArray(parsed.activities_detected),
    problems_detected: safeArray(parsed.problems_detected),
    pendencies_detected: safeArray(parsed.pendencies_detected),
    suggestions_detected: safeArray(parsed.suggestions_detected)
  };
}

/**
 * Cria registro inteligente (texto + processamento IA + persistência)
 */
async function createRegistration(companyId, userId, originalText, shiftName = null) {
  if (!originalText || typeof originalText !== 'string' || originalText.trim().length < 3) {
    throw new Error('Texto muito curto. Descreva o que aconteceu no seu dia de trabalho.');
  }

  const userResult = await db.query('SELECT name FROM users WHERE id = $1', [userId]);
  const userName = userResult.rows[0]?.name || 'Usuário';

  const processed = await processWithAI(originalText.trim(), companyId, userName);

  const r = await db.query(`
    INSERT INTO intelligent_registrations (
      company_id, user_id, original_text, ai_summary, main_category, subcategories,
      priority, needs_followup, needs_escalation,
      sector_identified, department_identified, line_identified, machine_identified,
      process_identified, product_identified,
      activities_detected, problems_detected, pendencies_detected, suggestions_detected,
      shift_name
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
    RETURNING *
  `, [
    companyId, userId, originalText.trim(), processed.summary, processed.main_category,
    processed.subcategories, processed.priority, processed.needs_followup, processed.needs_escalation,
    processed.sector_identified, processed.department_identified, processed.line_identified,
    processed.machine_identified, processed.process_identified, processed.product_identified,
    processed.activities_detected, processed.problems_detected, processed.pendencies_detected,
    processed.suggestions_detected, shiftName
  ]);

  return r.rows[0];
}

/**
 * Lista registros do usuário (meus registros)
 */
async function listMyRegistrations(companyId, userId, opts = {}) {
  const limit = Math.min(opts.limit || 50, 100);
  const offset = opts.offset || 0;
  const dateFrom = opts.dateFrom || null;
  const dateTo = opts.dateTo || null;

  let sql = `
    SELECT ir.*, u.name as user_name
    FROM intelligent_registrations ir
    JOIN users u ON ir.user_id = u.id
    WHERE ir.company_id = $1 AND ir.user_id = $2
  `;
  const params = [companyId, userId];

  if (dateFrom) {
    params.push(dateFrom);
    sql += ` AND ir.registration_date >= $${params.length}`;
  }
  if (dateTo) {
    params.push(dateTo);
    sql += ` AND ir.registration_date <= $${params.length}`;
  }

  sql += ` ORDER BY ir.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(limit, offset);

  const r = await db.query(sql, params);
  return r.rows;
}

/**
 * Lista registros para liderança (todos da empresa ou por setor)
 */
async function listForLeadership(companyId, opts = {}) {
  const limit = Math.min(opts.limit || 50, 100);
  const offset = opts.offset || 0;
  const dateFrom = opts.dateFrom || null;
  const dateTo = opts.dateTo || null;
  const userId = opts.userId || null;
  const priority = opts.priority || null;

  let sql = `
    SELECT ir.*, u.name as user_name, u.department, u.area
    FROM intelligent_registrations ir
    JOIN users u ON ir.user_id = u.id
    WHERE ir.company_id = $1
  `;
  const params = [companyId];

  if (userId) {
    params.push(userId);
    sql += ` AND ir.user_id = $${params.length}`;
  }
  if (dateFrom) {
    params.push(dateFrom);
    sql += ` AND ir.registration_date >= $${params.length}`;
  }
  if (dateTo) {
    params.push(dateTo);
    sql += ` AND ir.registration_date <= $${params.length}`;
  }
  if (priority) {
    params.push(priority);
    sql += ` AND ir.priority = $${params.length}`;
  }

  sql += ` ORDER BY ir.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(limit, offset);

  const r = await db.query(sql, params);
  return r.rows;
}

module.exports = {
  processWithAI,
  createRegistration,
  listMyRegistrations,
  listForLeadership
};
