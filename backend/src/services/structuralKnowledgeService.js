'use strict';

/**
 * Leitura segura da base de conhecimento estrutural (por empresa).
 * Não executa acções; só devolve metadados para enriquecer decisão / contexto.
 */

const db = require('../db');

/**
 * @param {string|null|undefined} companyId
 * @returns {Promise<{ title: string|null, summary: string|null }[]>}
 */
async function getStructuralKnowledge(companyId) {
  const cid = companyId != null ? String(companyId).trim() : '';
  if (!cid) {
    console.warn('[STRUCTURAL_KNOWLEDGE_EMPTY]', { reason: 'no_company_id' });
    return [];
  }

  try {
    const r = await db.query(
      `SELECT title, summary
       FROM structural_knowledge_documents
       WHERE company_id = $1::uuid
       ORDER BY created_at DESC
       LIMIT 5`,
      [cid]
    );
    const rows = r.rows || [];
    if (!rows.length) {
      console.warn('[STRUCTURAL_KNOWLEDGE_EMPTY]', { company_id: cid });
    }
    return rows.map((x) => ({
      title: x.title != null ? String(x.title) : null,
      summary: x.summary != null ? String(x.summary) : null
    }));
  } catch (err) {
    console.warn('[STRUCTURAL_KNOWLEDGE_ERROR]', err?.message ?? err);
    return [];
  }
}

module.exports = {
  getStructuralKnowledge
};
