/**
 * CONTEXTO DE COMUNICAÇÕES PARA IA
 * Retorna comunicações relevantes (inbound+outbound) filtradas pelo escopo hierárquico.
 * Uso: chatUserContext injeta no prompt da IA para rastreabilidade e precisão.
 */
const db = require('../db');
const hierarchicalFilter = require('./hierarchicalFilter');

const DEFAULT_LIMIT = 15;

/**
 * Busca comunicações recentes da empresa, respeitando hierarquia
 * @param {Object} user - req.user (id, company_id, hierarchy_level, department_id, supervisor_id...)
 * @param {Object} options - { limit?, source?, includeOutbound? }
 * @returns {Array<{ role, content, sender_name, direction, created_at }>}
 */
async function getRelevantCommunications(user, options = {}) {
  const { limit = DEFAULT_LIMIT, source = 'whatsapp', includeOutbound = true } = options;
  const companyId = user?.company_id;
  const userId = user?.id;
  if (!companyId) return [];

  try {
    const scope = await hierarchicalFilter.resolveHierarchyScope(user);
    const { whereClause, params } = hierarchicalFilter.buildCommunicationsFilter(scope, companyId, { tableAlias: 'c', paramOffset: 1 });

    const directionFilter = includeOutbound ? '' : `AND c.direction = 'inbound'`;
    const sourceFilter = source ? `AND c.source = $${params.length + 1}` : '';
    const queryParams = [...params];
    if (source) queryParams.push(source);

    const r = await db.query(`
      SELECT c.id, c.direction, c.text_content, c.sender_name, c.sender_phone, c.created_at
      FROM communications c
      WHERE ${whereClause}
        ${sourceFilter}
        ${directionFilter}
        AND c.text_content IS NOT NULL AND TRIM(c.text_content) != ''
      ORDER BY c.created_at DESC
      LIMIT $${queryParams.length + 1}
    `, [...queryParams, limit]);

    return r.rows.map((row) => ({
      role: row.direction === 'outbound' ? 'assistant' : 'user',
      content: (row.text_content || '').slice(0, 500),
      sender_name: row.sender_name || row.sender_phone || 'Contato',
      direction: row.direction || 'inbound',
      created_at: row.created_at
    })).reverse();
  } catch (err) {
    console.warn('[COMMUNICATION_CONTEXT] getRelevantCommunications:', err.message);
    return [];
  }
}

/**
 * Monta bloco de texto para injetar no prompt da IA
 */
async function buildCommunicationsBlockForAI(user, options = {}) {
  const comms = await getRelevantCommunications(user, options);
  if (comms.length === 0) return '';

  const lines = comms.map((c) => {
    const label = c.role === 'user' ? c.sender_name : 'Sistema';
    const time = c.created_at ? new Date(c.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '';
    return `[${time}] ${label}: ${c.content}`;
  });

  return `\n## Comunicações recentes da empresa (WhatsApp e canais):\n${lines.join('\n')}\n`;
}

/**
 * Busca comunicações de um contato específico (para decisões proativas da IA)
 * @param {string} companyId - UUID da empresa
 * @param {string} senderPhone - Telefone normalizado do contato
 * @param {number} limit - Máximo de registros
 */
async function getCommunicationsForContact(companyId, senderPhone, limit = 20) {
  if (!companyId || !senderPhone || senderPhone.length < 10) return [];
  try {
    const normalized = senderPhone.replace(/\D/g, '');
    const r = await db.query(`
      SELECT id, direction, text_content, sender_name, sender_phone, created_at
      FROM communications
      WHERE company_id = $1 AND source = 'whatsapp'
        AND regexp_replace(sender_phone, '\D', '', 'g') = $2
        AND text_content IS NOT NULL AND TRIM(text_content) != ''
      ORDER BY created_at DESC
      LIMIT $3
    `, [companyId, normalized, limit]);
    return r.rows;
  } catch (err) {
    console.warn('[COMMUNICATION_CONTEXT] getCommunicationsForContact:', err.message);
    return [];
  }
}

/**
 * Contexto completo para IA proativa: comunicações da empresa (respeitando hierarquia)
 */
async function getFullCommunicationContextForAI(companyId, user, options = {}) {
  if (!user || !companyId) return '';
  const comms = await getRelevantCommunications(user, { ...options, limit: options.limit || 30 });
  if (comms.length === 0) return '';
  const lines = comms.map((c) => {
    const label = c.role === 'user' ? c.sender_name : 'Sistema';
    const time = c.created_at ? new Date(c.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '';
    return `[${time}] ${label}: ${c.content}`;
  });
  return lines.join('\n');
}

module.exports = {
  getRelevantCommunications,
  buildCommunicationsBlockForAI,
  getCommunicationsForContact,
  getFullCommunicationContextForAI
};
