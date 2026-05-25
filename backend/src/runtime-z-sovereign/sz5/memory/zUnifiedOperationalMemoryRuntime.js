'use strict';

const db = require('../../../db');
const flags = require('../config/sz5FeatureFlags');
const persistence = require('../persistence/zConversationIndexPersistence');

async function upsertLink(tenantId, fromRef, toRef, linkType = 'related', metadata = {}) {
  if (!flags.isOperationalMemoryEnabled()) return { ok: false, skipped: true };
  await persistence.ensureTables();
  try {
    await db.query(
      `INSERT INTO z_operational_memory_links (tenant_id, from_ref, to_ref, link_type, metadata)
       VALUES ($1,$2,$3,$4,$5)`,
      [tenantId, fromRef, toRef, linkType, JSON.stringify(metadata)]
    );
    return { ok: true };
  } catch (err) {
    console.warn('[SZ5_MEMORY_GRAPH]', err?.message);
    return { ok: false };
  }
}

async function linkCrossThreadFacts(tenantId, facts = []) {
  if (!flags.isCrossThreadEnabled() || !tenantId || facts.length < 2) return { linked: 0 };
  let linked = 0;
  const threads = [...new Set(facts.map((f) => f.thread_id).filter(Boolean))];
  for (let i = 0; i < threads.length - 1; i++) {
    const r = await upsertLink(tenantId, threads[i], threads[i + 1], 'cross_thread', {
      workflow_type: facts[0]?.workflow_type,
      actors: facts[0]?.actors
    });
    if (r.ok) linked += 1;
  }
  return { linked };
}

async function getGraphSnapshot(tenantId, userId) {
  await persistence.ensureTables();
  const links = await db.query(
    `SELECT from_ref, to_ref, link_type, metadata, created_at
     FROM z_operational_memory_links WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 100`,
    [tenantId]
  );
  const threads = await persistence.searchIndexedMessages(tenantId, userId, {}, 30);
  return {
    actor_graph: [],
    workflow_graph: threads.map((t) => ({
      thread_id: t.thread_id,
      workflow_type: t.index_record?.workflow_type
    })),
    thread_graph: threads.map((t) => t.thread_id),
    continuity_graph: links.rows || [],
    temporal_graph: threads
      .flatMap((t) => (t.index_record?.temporal_markers || []).map((m) => ({ thread_id: t.thread_id, ...m })))
      .slice(0, 40)
  };
}

module.exports = {
  upsertLink,
  linkCrossThreadFacts,
  getGraphSnapshot
};
