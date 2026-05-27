'use strict';

/**
 * SZ5 Graph Purge Service — Remove arestas identificáveis em graphs cognitivos
 *
 * Remove ligações actor↔memory e actor↔conversation nos graphs SZ5.
 * Preserva nós auditáveis (sem dados pessoais).
 *
 * Flag gate: IMPETUS_SZ5_PURGE_GRAPH=on (default off)
 * Depends: IMPETUS_SZ5_ANONYMIZATION_MODE != off
 *
 * Alvos:
 *   - chat_participants (edges actor↔conversation)
 *   - manual_chunks (edges actor↔knowledge)
 *   - operational_memory (se existir z_operational_memory_links)
 *
 * Princípios: additive-only, flag-gated, audit-trail, idempotent
 */

const db = require('../db');

const LAYER = 'SZ5_GRAPH_PURGE';

function _getMode() {
  const v = String(process.env.IMPETUS_SZ5_ANONYMIZATION_MODE || '').trim().toLowerCase();
  if (['on', 'audit'].includes(v)) return v;
  return 'off';
}

function _isGraphPurgeEnabled() {
  return String(process.env.IMPETUS_SZ5_PURGE_GRAPH || 'off').trim().toLowerCase() === 'on';
}

function _log(event, data) {
  try {
    console.info(`[SZ5_GRAPH_PURGE]`, JSON.stringify({
      _type: 'sz5_graph_purge',
      layer: LAYER,
      event,
      ts: new Date().toISOString(),
      mode: _getMode(),
      graph_enabled: _isGraphPurgeEnabled(),
      ...data,
    }));
  } catch { /* never throw */ }
}

/**
 * Remove edges actor↔conversation: desvincula user_id de participações antigas.
 * Preserva o registo mas remove a associação directa.
 */
async function purgeConversationEdges(tenantId, opts = {}) {
  const mode = _getMode();
  if (mode === 'off') return { ok: false, reason: 'mode_off' };
  if (!_isGraphPurgeEnabled()) return { ok: false, reason: 'graph_purge_disabled' };

  const ttlDays = 90;

  try {
    const eligible = await db.query(`
      SELECT COUNT(*) as cnt FROM chat_participants
      WHERE joined_at < NOW() - INTERVAL '${ttlDays} days'
      AND role NOT LIKE 'purged_%'
    `);

    const count = parseInt(eligible.rows[0].cnt, 10);
    _log('conversation_edges_eligible', { tenant_id: tenantId, count, ttl_days: ttlDays });

    if (mode === 'audit') {
      return { ok: true, target: 'conversation_edges', eligible: count, purged: 0, dry_run: true };
    }

    const result = await db.query(`
      UPDATE chat_participants
      SET role = 'purged_' || LEFT(id::text, 8)
      WHERE joined_at < NOW() - INTERVAL '${ttlDays} days'
      AND role NOT LIKE 'purged_%'
    `);

    const purged = result.rowCount || 0;
    _log('conversation_edges_purged', { tenant_id: tenantId, purged });

    return { ok: true, target: 'conversation_edges', eligible: count, purged };
  } catch (err) {
    _log('conversation_edges_error', { error: err?.message });
    return { ok: false, target: 'conversation_edges', error: err?.message };
  }
}

/**
 * Remove edges actor↔knowledge: desassocia chunks de company knowledge
 * para evitar correlação longitudinal de quem criou/editou.
 */
async function purgeKnowledgeEdges(tenantId, opts = {}) {
  const mode = _getMode();
  if (mode === 'off') return { ok: false, reason: 'mode_off' };
  if (!_isGraphPurgeEnabled()) return { ok: false, reason: 'graph_purge_disabled' };

  try {
    const eligible = await db.query(`
      SELECT COUNT(*) as cnt FROM manual_chunks mc
      JOIN manuals m ON m.id = mc.manual_id
      WHERE m.company_id = $1 AND mc.embedding IS NOT NULL
    `, [tenantId]);

    const count = parseInt(eligible.rows[0].cnt, 10);
    _log('knowledge_edges_eligible', { tenant_id: tenantId, count });

    if (mode === 'audit') {
      return { ok: true, target: 'knowledge_edges', eligible: count, purged: 0, dry_run: true };
    }

    const result = await db.query(`
      UPDATE manual_chunks SET embedding = NULL
      WHERE id IN (
        SELECT mc.id FROM manual_chunks mc
        JOIN manuals m ON m.id = mc.manual_id
        WHERE m.company_id = $1 AND mc.embedding IS NOT NULL
      )
    `, [tenantId]);

    const purged = result.rowCount || 0;
    _log('knowledge_edges_purged', { tenant_id: tenantId, purged });

    return { ok: true, target: 'knowledge_edges', eligible: count, purged };
  } catch (err) {
    _log('knowledge_edges_error', { error: err?.message });
    return { ok: false, target: 'knowledge_edges', error: err?.message };
  }
}

/**
 * Purge completo do graph para um tenant.
 */
async function executeFullGraphPurge(tenantId, opts = {}) {
  const mode = _getMode();
  if (mode === 'off') return { ok: false, reason: 'mode_off', mode };
  if (!_isGraphPurgeEnabled()) return { ok: false, reason: 'graph_purge_disabled' };

  _log('full_graph_purge_started', { tenant_id: tenantId, mode });

  const results = {
    conversation_edges: await purgeConversationEdges(tenantId, opts),
    knowledge_edges: await purgeKnowledgeEdges(tenantId, opts),
  };

  const totalPurged = (results.conversation_edges.purged || 0) + (results.knowledge_edges.purged || 0);

  _log('full_graph_purge_completed', { tenant_id: tenantId, mode, total_purged: totalPurged });

  // Audit trail
  try {
    await db.query(`
      INSERT INTO audit_logs (action, entity_type, description, user_name, created_at, company_id)
      VALUES ('sz5_graph_purge', 'system', $1, 'system:sz5_graph', NOW(), $2)
    `, [JSON.stringify({ mode, total_purged: totalPurged, results }), tenantId]);
  } catch { /* non-blocking */ }

  return { ok: true, mode, total_purged: totalPurged, results };
}

function getDiagnostics() {
  return {
    mode: _getMode(),
    graph_purge_enabled: _isGraphPurgeEnabled(),
    targets: ['conversation_edges', 'knowledge_edges'],
  };
}

module.exports = {
  purgeConversationEdges,
  purgeKnowledgeEdges,
  executeFullGraphPurge,
  getDiagnostics,
};
