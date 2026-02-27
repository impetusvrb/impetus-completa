/**
 * Contexto de documentos para a IA
 * Garante que a IA sempre consulte:
 * - Política Impetus (regras globais)
 * - Documentos da empresa (política, POPs, manuais)
 */
const fs = require('fs');
const path = require('path');
const db = require('../db');
const ai = require('./ai');

let impetusPolicyCache = null;
let impetusPolicyLoadError = null;

/**
 * Carrega a política Impetus do arquivo embutido no software
 * @returns {string} Conteúdo da política ou string vazia se falhar
 */
function getImpetusPolicy() {
  if (impetusPolicyCache !== null) return impetusPolicyCache;
  if (impetusPolicyLoadError) return '';

  const policyPath = path.join(__dirname, '../data/impetus-policy.md');
  try {
    if (fs.existsSync(policyPath)) {
      impetusPolicyCache = fs.readFileSync(policyPath, 'utf8');
      return impetusPolicyCache;
    }
  } catch (err) {
    impetusPolicyLoadError = err;
    console.warn('[DOCUMENT_CONTEXT] Erro ao carregar política Impetus:', err.message);
  }
  return '';
}

/**
 * Busca trechos relevantes de manuais da empresa (via embeddings quando pgvector disponível)
 * Sem pgvector ou em caso de erro: retorna [] silenciosamente para não quebrar o chat
 */
async function searchCompanyManuals(companyId, queryText, limit = 8) {
  try {
    const emb = await ai.embedText(queryText);
    if (!emb) return [];

    const sql = `
      SELECT mc.id, mc.chunk_text, m.title, m.equipment_type, m.model,
             (mc.embedding <=> $1) as distance
    FROM manual_chunks mc
    JOIN manuals m ON mc.manual_id = m.id
    WHERE (m.company_id = $2 OR m.company_id IS NULL)
      AND mc.embedding IS NOT NULL
    ORDER BY mc.embedding <=> $1
    LIMIT $3
    `;
    const r = await db.query(sql, [emb, companyId || null, limit]);
    return (r.rows || []).map(row => ({
      id: row.id,
      title: row.title || `${(row.equipment_type || '')} ${(row.model || '')}`.trim() || 'Manual',
      chunk_text: row.chunk_text,
      distance: parseFloat(row.distance || 0)
    }));
  } catch (err) {
    console.warn('[DOCUMENT_CONTEXT] searchCompanyManuals (sem pgvector?):', err.message);
    return [];
  }
}

/**
 * Busca conteúdo de POPs da empresa (texto direto, para contexto)
 */
async function getCompanyPops(companyId, limit = 5) {
  try {
    const r = await db.query(`
      SELECT title, category, content
      FROM pops
      WHERE company_id = $1 AND active = true AND content IS NOT NULL AND content != ''
      ORDER BY category, title
      LIMIT $2
    `, [companyId, limit]);
    return (r.rows || []).map(row => ({
      title: row.title,
      category: row.category,
      content: (row.content || '').slice(0, 800)
    }));
  } catch (err) {
    if (err.message && err.message.includes('does not exist')) return [];
    console.warn('[DOCUMENT_CONTEXT] getCompanyPops:', err.message);
    return [];
  }
}

/**
 * Busca política da empresa (company_policy_text)
 */
async function getCompanyPolicy(companyId) {
  try {
    const r = await db.query(`
      SELECT company_policy_text FROM companies WHERE id = $1
    `, [companyId]);
    const text = r.rows?.[0]?.company_policy_text;
    return (text || '').trim().slice(0, 3000);
  } catch (err) {
    return '';
  }
}

/**
 * Monta o contexto completo para a IA, incluindo política Impetus e docs da empresa
 * @param {object} opts - { companyId, queryText, forDiagnostic }
 * @returns {string} Bloco de texto para incluir no prompt
 */
async function buildAIContext(opts = {}) {
  const { companyId, queryText = '', forDiagnostic = true } = opts;

  const parts = [];

  // 1. Política Impetus (sempre presente)
  const impetusPolicy = getImpetusPolicy();
  if (impetusPolicy) {
    parts.push(`## Política Impetus (obrigatória)\n${impetusPolicy.slice(0, 2500)}`);
  }

  // 2. Política da empresa
  if (companyId) {
    const companyPolicy = await getCompanyPolicy(companyId);
    if (companyPolicy) {
      parts.push(`## Política e normas da empresa\n${companyPolicy}`);
    }

    // 3. POPs relevantes
    const pops = await getCompanyPops(companyId, 5);
    if (pops.length > 0) {
      const popsText = pops.map(p => `[${p.title}] (${p.category || '-'}): ${p.content}`).join('\n---\n');
      parts.push(`## POPs da empresa\n${popsText}`);
    }
  }

  // 4. Manuais: não incluídos aqui - o chamador (ex: diagnostic) passa candidates separadamente
  // para evitar duplicação, já que searchManuals é chamado pelo fluxo de diagnóstico

  if (parts.length === 0) return '';

  return [
    '\n---\n',
    'CONTEXTO OBRIGATÓRIO: Sua resposta deve estar em conformidade com a política Impetus e, quando disponível, com a documentação interna da empresa (políticas, POPs, manuais).',
    '\n---\n',
    parts.join('\n\n')
  ].join('\n');
}

module.exports = {
  getImpetusPolicy,
  getCompanyPolicy,
  getCompanyPops,
  searchCompanyManuals,
  buildAIContext
};
