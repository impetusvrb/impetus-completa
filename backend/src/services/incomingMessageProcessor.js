/**
 * Processador de mensagens recebidas (webhook)
 * Cria tarefas a partir de mensagens classificadas pela IA
 */
const db = require('../db');

/**
 * Cria tarefa a partir de mensagem
 * @param {object} opts - { companyId, title, description, assignee, metadata }
 * @returns {string|null} ID da tarefa criada
 */
async function createTaskFromMessage(opts = {}) {
  const { companyId, title, description, assignee } = opts;
  try {
    const r = await db.query(
      'INSERT INTO tasks (company_id, title, description, assignee, status) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [companyId || null, title, description || null, assignee || null, 'open']
    );
    return r.rows?.[0]?.id || null;
  } catch (err) {
    if (err.message?.includes('column "company_id" does not exist')) {
      const r = await db.query(
        'INSERT INTO tasks (title, description, assignee, status) VALUES ($1, $2, $3, $4) RETURNING id',
        [title, description || null, assignee || null, 'open']
      );
      return r.rows?.[0]?.id || null;
    }
    console.warn('[INCOMING_MSG] createTask:', err.message);
    return null;
  }
}

module.exports = { createTaskFromMessage };
