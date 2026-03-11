/**
 * MEMÓRIA OPERACIONAL - Serviço de persistência e consulta
 * Armazena fatos estruturados extraídos por Claude.
 * Respeita: company_id, perfil do usuário, auditoria.
 */
const db = require('../db');

const VALID_SCOPE_TYPES = ['user', 'sector', 'machine', 'line', 'process', 'org'];
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUUID(val) {
  if (val == null) return false;
  const s = typeof val === 'string' ? val : String(val);
  return UUID_REGEX.test(s.trim());
}

/** Sanitiza query para plainto_tsquery - remove caracteres que causam erro */
function sanitizeTsQuery(q) {
  if (!q || typeof q !== 'string') return '';
  return q
    .trim()
    .replace(/[&|:!*()\\'"]/g, ' ')
    .replace(/\s+/g, ' ')
    .slice(0, 500);
}
const VALID_FACT_TYPES = [
  'pendencia', 'risco', 'decisao', 'solicitacao', 'falha', 'tarefa',
  'informacao', 'observacao', 'padrao', 'recorrencia', 'feedback', 'contexto'
];

/**
 * Insere fatos na memória operacional
 * @param {Object} opts - { companyId, facts, sourceType, sourceId, sourceMetadata }
 */
async function storeFacts(opts) {
  const { companyId, facts = [], sourceType, sourceId, sourceMetadata = {} } = opts;
  if (!companyId || !Array.isArray(facts) || facts.length === 0) return { inserted: 0 };

  let inserted = 0;
  for (const f of facts) {
    const scopeType = VALID_SCOPE_TYPES.includes(f.scope_type) ? f.scope_type : 'org';
    const factType = VALID_FACT_TYPES.includes(f.fact_type) ? f.fact_type : 'informacao';
    const priority = ['baixa', 'normal', 'alta', 'critica'].includes(f.priority) ? f.priority : 'normal';
    const scopeId = isValidUUID(f.scope_id) ? f.scope_id?.trim() : null;

    try {
      await db.query(
        `INSERT INTO operational_memory (
          company_id, scope_type, scope_id, scope_label, fact_type, content, summary,
          priority, source_type, source_id, source_metadata, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          companyId,
          scopeType,
          scopeId,
          (f.scope_label || '').slice(0, 500),
          factType,
          (f.content || '').slice(0, 4000),
          (f.summary || '').slice(0, 1000),
          priority,
          sourceType || 'generic',
          sourceId || null,
          JSON.stringify(sourceMetadata),
          JSON.stringify(f.metadata || {})
        ]
      );
      inserted++;
    } catch (err) {
      console.warn('[OPERATIONAL_MEMORY] storeFacts insert:', err.message);
    }
  }
  return { inserted };
}

/**
 * Busca fatos relevantes para uma consulta (ChatGPT)
 * Respeita company_id e opcionalmente filtros por escopo/perfil
 * @param {Object} opts - { companyId, userId, query, limit, scopeFilters }
 * @returns {Promise<Array>}
 */
async function getRelevantContext(opts) {
  const {
    companyId,
    userId = null,
    query = '',
    limit = 20,
    scopeFilters = {},
    includePriority = ['alta', 'critica', 'normal']
  } = opts;

  if (!companyId) return [];

  try {
    let sql = `
      SELECT id, scope_type, scope_id, scope_label, fact_type, content, summary, priority, created_at
      FROM operational_memory
      WHERE company_id = $1 AND is_active = true
    `;
    const params = [companyId];
    let paramIndex = 2;

    if (includePriority?.length) {
      sql += ` AND priority = ANY($${paramIndex})`;
      params.push(includePriority);
      paramIndex++;
    }

    if (scopeFilters?.scope_type) {
      sql += ` AND scope_type = $${paramIndex}`;
      params.push(scopeFilters.scope_type);
      paramIndex++;
    }
    if (scopeFilters?.scope_id) {
      sql += ` AND (scope_id = $${paramIndex} OR scope_id IS NULL)`;
      params.push(scopeFilters.scope_id);
      paramIndex++;
    }

    sql += ` ORDER BY 
      CASE priority WHEN 'critica' THEN 1 WHEN 'alta' THEN 2 WHEN 'normal' THEN 3 ELSE 4 END,
      created_at DESC
    `;
    sql += ` LIMIT $${paramIndex}`;
    params.push(limit);

    if (query && query.trim().length >= 3) {
      const sanitized = sanitizeTsQuery(query);
      if (sanitized) {
        try {
          const searchSql = `
            SELECT id, scope_type, scope_id, scope_label, fact_type, content, summary, priority, created_at,
              ts_rank(to_tsvector('portuguese', coalesce(content,'') || ' ' || coalesce(summary,'') || ' ' || coalesce(scope_label,'')),
                plainto_tsquery('portuguese', $2)) AS rank
            FROM operational_memory
            WHERE company_id = $1 AND is_active = true
              AND to_tsvector('portuguese', coalesce(content,'') || ' ' || coalesce(summary,'') || ' ' || coalesce(scope_label,''))
                @@ plainto_tsquery('portuguese', $2)
            ORDER BY rank DESC, created_at DESC
            LIMIT $3
          `;
          const searchParams = [companyId, sanitized, limit];
          const result = await db.query(searchSql, searchParams);
          return result.rows || [];
        } catch (tsErr) {
          if (tsErr.message?.includes('tsquery') || tsErr.message?.includes('plainto_tsquery')) {
            console.warn('[OPERATIONAL_MEMORY] plainto_tsquery falhou, usando query simples:', tsErr.message?.slice(0, 80));
          } else {
            throw tsErr;
          }
        }
      }
    }

    const result = await db.query(sql, params);
    return result.rows || [];
  } catch (err) {
    if (err.message?.includes('does not exist')) return [];
    console.warn('[OPERATIONAL_MEMORY] getRelevantContext:', err.message);
    return [];
  }
}

/**
 * Registra auditoria de consulta à memória
 */
/** Normaliza IP para INET - retorna null se inválido */
function safeIpAddress(ip) {
  if (!ip || typeof ip !== 'string') return null;
  const trimmed = ip.trim();
  if (!trimmed) return null;
  const v4 = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;
  const v6 = /^([0-9a-f]*:){2,7}[0-9a-f]*$/i;
  if (v4.test(trimmed) || v6.test(trimmed)) return trimmed;
  return null;
}

async function logAudit(opts) {
  const { companyId, userId, action, scopeFilter = {}, factsCount = 0, sourceType, sourceId, req } = opts;
  if (!companyId) return;

  const ip = req ? safeIpAddress(req.ip || req.connection?.remoteAddress) : null;

  try {
    await db.query(
      `INSERT INTO memory_audit_log (company_id, user_id, action, scope_filter, facts_count, source_type, source_id, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        companyId,
        userId || null,
        action,
        JSON.stringify(scopeFilter),
        factsCount,
        sourceType || null,
        sourceId || null,
        ip,
        req?.get?.('user-agent') || null
      ]
    );
  } catch (err) {
    if (err.message?.includes('invalid input syntax for type inet')) {
      try {
        await db.query(
          `INSERT INTO memory_audit_log (company_id, user_id, action, scope_filter, facts_count, source_type, source_id, ip_address, user_agent)
           VALUES ($1, $2, $3, $4, $5, $6, $7, NULL, $8)`,
          [companyId, userId || null, action, JSON.stringify(scopeFilter), factsCount, sourceType || null, sourceId || null, req?.get?.('user-agent') || null]
        );
      } catch (e2) {
        console.warn('[OPERATIONAL_MEMORY] logAudit (sem IP):', e2.message);
      }
    } else {
      console.warn('[OPERATIONAL_MEMORY] logAudit:', err.message);
    }
  }
}

module.exports = {
  storeFacts,
  getRelevantContext,
  logAudit,
  VALID_SCOPE_TYPES,
  VALID_FACT_TYPES
};
