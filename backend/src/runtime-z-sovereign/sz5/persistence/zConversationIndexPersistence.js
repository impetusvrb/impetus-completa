'use strict';

const db = require('../../../db');

let _tablesReady = false;

async function ensureTables() {
  if (_tablesReady) return true;
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS z_conversation_message_index (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        message_id UUID NOT NULL,
        thread_id UUID NOT NULL,
        sender_id UUID,
        index_record JSONB NOT NULL DEFAULT '{}',
        content_snapshot TEXT,
        indexed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (tenant_id, message_id)
      )
    `);
    await db.query(`
      CREATE TABLE IF NOT EXISTS z_operational_memory_links (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        from_ref TEXT NOT NULL,
        to_ref TEXT NOT NULL,
        link_type TEXT NOT NULL DEFAULT 'related',
        weight NUMERIC(4,2) NOT NULL DEFAULT 1,
        metadata JSONB NOT NULL DEFAULT '{}',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    _tablesReady = true;
    return true;
  } catch (err) {
    console.warn('[SZ5_PERSISTENCE] ensureTables:', err?.message);
    return false;
  }
}

async function upsertIndexRecord(tenantId, messageId, threadId, senderId, indexRecord, contentSnapshot) {
  if (!await ensureTables()) return { ok: false };
  try {
    await db.query(
      `INSERT INTO z_conversation_message_index
        (tenant_id, message_id, thread_id, sender_id, index_record, content_snapshot)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (tenant_id, message_id) DO UPDATE SET
         index_record = EXCLUDED.index_record,
         content_snapshot = EXCLUDED.content_snapshot,
         indexed_at = now()`,
      [tenantId, messageId, threadId, senderId, JSON.stringify(indexRecord), contentSnapshot]
    );
    return { ok: true };
  } catch (err) {
    console.warn('[SZ5_PERSISTENCE] upsert:', err?.message);
    return { ok: false, error: err.message };
  }
}

async function searchIndexedMessages(tenantId, userId, filters = {}, limit = 20) {
  if (!await ensureTables()) return [];
  const params = [tenantId, userId];
  let sql = `
    SELECT idx.message_id, idx.thread_id, idx.sender_id, idx.index_record, idx.content_snapshot, idx.indexed_at
    FROM z_conversation_message_index idx
    WHERE idx.tenant_id = $1
      AND idx.thread_id IN (
        SELECT cp.conversation_id FROM chat_participants cp WHERE cp.user_id = $2
      )
  `;
  if (filters.thread_id) {
    params.push(filters.thread_id);
    sql += ` AND idx.thread_id = $${params.length}`;
  }
  if (filters.actor_name) {
    params.push(`%${filters.actor_name}%`);
    sql += ` AND (idx.index_record::text ILIKE $${params.length} OR idx.content_snapshot ILIKE $${params.length})`;
  }
  if (filters.workflow_type) {
    params.push(filters.workflow_type);
    sql += ` AND idx.index_record->>'workflow_type' = $${params.length}`;
  }
  if (filters.temporal === 'tomorrow') {
    sql += ` AND (idx.index_record::text ILIKE '%tomorrow%' OR idx.content_snapshot ILIKE '%amanh%')`;
  }
  if (filters.q) {
    params.push(`%${filters.q}%`);
    sql += ` AND idx.content_snapshot ILIKE $${params.length}`;
  }
  params.push(limit);
  sql += ` ORDER BY idx.indexed_at DESC LIMIT $${params.length}`;
  const r = await db.query(sql, params);
  return r.rows || [];
}

module.exports = {
  ensureTables,
  upsertIndexRecord,
  searchIndexedMessages
};
