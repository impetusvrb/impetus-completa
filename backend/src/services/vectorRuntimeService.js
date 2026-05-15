'use strict';

/**
 * Vector Runtime Service — Camada de governança da memória vetorial cognitiva.
 *
 * Responsabilidades:
 *   - Schema Registry: dimensão, provider, modelo, índice, métrica
 *   - Capability checks: validar extensão pgvector, índice, dimensão antes de queries
 *   - Dual-read: consultar embeddings em colunas novas vs antigas
 *   - Dual-write: gravar em ambas durante upgrades
 *   - Safe Rebuild Engine: batch rebuild com checkpoint e rollback
 *   - Observabilidade: logs vetoriais, health checks, métricas
 *   - Rollout states: controle de estado da evolução vetorial
 *
 * Princípio: embeddings são memória cognitiva operacional crítica, não dados auxiliares.
 *
 * GARANTIAS:
 *   - Aditivo: nenhum código existente é modificado — este serviço é consumido opcionalmente.
 *   - Fallback: se qualquer check falhar, queries vetoriais degradam graciosamente (retornam []).
 *   - Sem migrations destrutivas: este serviço NUNCA executa DROP/TRUNCATE/ALTER TYPE.
 */

const db = require('../db');

// ─── Schema Registry ────────────────────────────────────────────────────────

const VECTOR_SCHEMA_REGISTRY = Object.freeze({
  primary: {
    table: 'manual_chunks',
    column: 'embedding',
    dimension: 1536,
    provider: 'openai',
    model: 'text-embedding-3-small',
    index_type: 'ivfflat',
    index_name: 'idx_manual_chunks_embedding',
    metric: 'cosine',
    operator: '<=>',
    ops_class: 'vector_cosine_ops'
  }
});

/** Estado do rollout vetorial (em memória, consultável pela observabilidade). */
const ROLLOUT_STATES = Object.freeze({
  STABLE: 'stable',
  DUAL_WRITE: 'dual_write',
  DUAL_READ: 'dual_read',
  SHADOW: 'shadow',
  MIGRATING: 'migrating',
  REBUILDING: 'rebuilding',
  DEGRADED: 'degraded'
});

let _currentRolloutState = ROLLOUT_STATES.STABLE;

let _capabilityCache = null;
let _capabilityCacheAt = 0;
const CAPABILITY_CACHE_TTL_MS = 60_000;

// ─── Observability counters ─────────────────────────────────────────────────

const _metrics = {
  queries_total: 0,
  queries_success: 0,
  queries_failed: 0,
  queries_degraded: 0,
  inserts_total: 0,
  inserts_success: 0,
  inserts_failed: 0,
  rebuilds_started: 0,
  rebuilds_completed: 0,
  rebuilds_failed: 0,
  last_query_latency_ms: 0,
  last_health_check_at: null,
  last_health_status: null
};

// ─── Event log (ring buffer in-memory para últimos N eventos) ───────────────

const EVENT_LOG_MAX = 500;
const _eventLog = [];

function emitVectorEvent(type, detail) {
  const entry = {
    type,
    detail: typeof detail === 'object' ? detail : { message: detail },
    timestamp: new Date().toISOString()
  };
  _eventLog.push(entry);
  if (_eventLog.length > EVENT_LOG_MAX) _eventLog.shift();
  try {
    console.log(`[VECTOR_EVENT:${type}]`, JSON.stringify(entry.detail));
  } catch (_) { /* never throw */ }
  return entry;
}

// ─── Capability Checks ─────────────────────────────────────────────────────

/**
 * Verifica capacidades vetoriais do banco de dados (extensão pgvector,
 * tipo vector, índice, dimensão da coluna).
 * Resultado é cacheado por 60s para evitar queries repetitivas.
 */
async function checkCapabilities() {
  const now = Date.now();
  if (_capabilityCache && (now - _capabilityCacheAt) < CAPABILITY_CACHE_TTL_MS) {
    return _capabilityCache;
  }
  const result = {
    pgvector_extension: false,
    vector_type_available: false,
    table_exists: false,
    column_exists: false,
    column_dimension: null,
    index_exists: false,
    index_type: null,
    embedding_count: 0,
    null_embedding_count: 0,
    total_rows: 0,
    healthy: false,
    checked_at: new Date().toISOString(),
    errors: []
  };

  try {
    const extR = await db.query(
      `SELECT 1 FROM pg_extension WHERE extname = 'vector' LIMIT 1`
    );
    result.pgvector_extension = (extR.rows || []).length > 0;
  } catch (e) {
    result.errors.push({ check: 'pgvector_extension', error: e.message });
  }

  try {
    const typeR = await db.query(
      `SELECT 1 FROM pg_type WHERE typname = 'vector' LIMIT 1`
    );
    result.vector_type_available = (typeR.rows || []).length > 0;
  } catch (e) {
    result.errors.push({ check: 'vector_type', error: e.message });
  }

  try {
    const tblR = await db.query(
      `SELECT 1 FROM information_schema.tables WHERE table_name = 'manual_chunks' LIMIT 1`
    );
    result.table_exists = (tblR.rows || []).length > 0;
  } catch (e) {
    result.errors.push({ check: 'table_exists', error: e.message });
  }

  if (result.table_exists) {
    try {
      const colR = await db.query(`
        SELECT udt_name, character_maximum_length
        FROM information_schema.columns
        WHERE table_name = 'manual_chunks' AND column_name = 'embedding'
        LIMIT 1
      `);
      if (colR.rows.length > 0) {
        result.column_exists = true;
        if (colR.rows[0].udt_name === 'vector') {
          try {
            const dimR = await db.query(`
              SELECT atttypmod FROM pg_attribute
              WHERE attrelid = 'manual_chunks'::regclass
                AND attname = 'embedding'
            `);
            if (dimR.rows.length > 0 && dimR.rows[0].atttypmod > 0) {
              result.column_dimension = dimR.rows[0].atttypmod;
            }
          } catch (_) { /* best effort */ }
        }
      }
    } catch (e) {
      result.errors.push({ check: 'column_exists', error: e.message });
    }

    try {
      const idxR = await db.query(`
        SELECT indexname, indexdef FROM pg_indexes
        WHERE tablename = 'manual_chunks' AND indexname LIKE '%embedding%'
        LIMIT 5
      `);
      if (idxR.rows.length > 0) {
        result.index_exists = true;
        const def = (idxR.rows[0].indexdef || '').toLowerCase();
        if (def.includes('ivfflat')) result.index_type = 'ivfflat';
        else if (def.includes('hnsw')) result.index_type = 'hnsw';
        else result.index_type = 'unknown';
      }
    } catch (e) {
      result.errors.push({ check: 'index_exists', error: e.message });
    }

    try {
      const countR = await db.query(`
        SELECT
          count(*) AS total,
          count(embedding) AS with_embedding,
          count(*) - count(embedding) AS null_embedding
        FROM manual_chunks
      `);
      if (countR.rows.length > 0) {
        result.total_rows = parseInt(countR.rows[0].total, 10) || 0;
        result.embedding_count = parseInt(countR.rows[0].with_embedding, 10) || 0;
        result.null_embedding_count = parseInt(countR.rows[0].null_embedding, 10) || 0;
      }
    } catch (e) {
      result.errors.push({ check: 'embedding_count', error: e.message });
    }
  }

  result.healthy =
    result.pgvector_extension &&
    result.vector_type_available &&
    result.table_exists &&
    result.column_exists &&
    result.index_exists &&
    result.errors.length === 0;

  _capabilityCache = result;
  _capabilityCacheAt = now;
  _metrics.last_health_check_at = result.checked_at;
  _metrics.last_health_status = result.healthy ? 'healthy' : 'degraded';

  if (!result.healthy) {
    _currentRolloutState = ROLLOUT_STATES.DEGRADED;
    emitVectorEvent('VECTOR_HEALTH_DEGRADED', { capabilities: result });
  }
  return result;
}

/**
 * Valida que o runtime está pronto para queries vetoriais antes de executá-las.
 * @returns {boolean}
 */
async function isVectorReady() {
  try {
    const cap = await checkCapabilities();
    return cap.healthy;
  } catch {
    return false;
  }
}

// ─── Governed Vector Query ──────────────────────────────────────────────────

/**
 * Executa uma query de similaridade vetorial governada.
 * Validações prévias, fallback, métricas e logging integrados.
 *
 * @param {Object} opts
 * @param {string} opts.queryVector - Vector string no formato '[0.1,0.2,...]'
 * @param {string|null} opts.companyId
 * @param {number} [opts.limit=8]
 * @param {string} [opts.source='unknown'] - Identificador do chamador para audit
 * @returns {Promise<Array<{id, chunk_text, title, equipment_type, model, distance}>>}
 */
async function governedSimilaritySearch(opts) {
  const { queryVector, companyId, limit = 8, source = 'unknown' } = opts;
  const t0 = Date.now();
  _metrics.queries_total++;

  if (!queryVector) {
    _metrics.queries_degraded++;
    emitVectorEvent('VECTOR_QUERY_SKIP', { reason: 'null_query_vector', source });
    return [];
  }

  const schema = VECTOR_SCHEMA_REGISTRY.primary;
  const sql = `
    SELECT mc.id, mc.chunk_text, m.title, m.equipment_type, m.model,
           (mc.${schema.column} ${schema.operator} $1::vector) as distance
    FROM ${schema.table} mc
    JOIN manuals m ON mc.manual_id = m.id
    WHERE (m.company_id = $2 OR m.company_id IS NULL)
      AND mc.${schema.column} IS NOT NULL
    ORDER BY mc.${schema.column} ${schema.operator} $1::vector
    LIMIT $3
  `;

  try {
    const r = await db.query(sql, [queryVector, companyId || null, limit]);
    const elapsed = Date.now() - t0;
    _metrics.queries_success++;
    _metrics.last_query_latency_ms = elapsed;

    if (elapsed > 2000) {
      emitVectorEvent('VECTOR_QUERY_SLOW', { elapsed_ms: elapsed, source, limit });
    }

    return (r.rows || []).map(row => ({
      id: row.id,
      title: row.title || `${(row.equipment_type || '')} ${(row.model || '')}`.trim() || 'Manual',
      chunk_text: row.chunk_text,
      distance: parseFloat(row.distance || 0)
    }));
  } catch (err) {
    const elapsed = Date.now() - t0;
    _metrics.queries_failed++;
    emitVectorEvent('VECTOR_QUERY_FAILED', {
      error: err.message,
      source,
      elapsed_ms: elapsed
    });
    return [];
  }
}

/**
 * Insere um embedding governado (com validação dimensional).
 *
 * @param {Object} opts
 * @param {string|number} opts.manualId
 * @param {string} opts.chunkText
 * @param {number[]} opts.embedding - Array numérico do embedding
 * @param {string} [opts.source='unknown']
 * @returns {Promise<boolean>}
 */
async function governedInsertEmbedding(opts) {
  const { manualId, chunkText, embedding, source = 'unknown' } = opts;
  _metrics.inserts_total++;

  if (!embedding || !Array.isArray(embedding)) {
    _metrics.inserts_failed++;
    emitVectorEvent('VECTOR_INSERT_SKIP', { reason: 'null_embedding', source });
    return false;
  }

  const schema = VECTOR_SCHEMA_REGISTRY.primary;
  if (embedding.length !== schema.dimension) {
    _metrics.inserts_failed++;
    emitVectorEvent('VECTOR_DIMENSION_MISMATCH', {
      expected: schema.dimension,
      received: embedding.length,
      source
    });
    return false;
  }

  const vectorStr = '[' + embedding.join(',') + ']';
  try {
    await db.query(
      `INSERT INTO ${schema.table}(manual_id, chunk_text, ${schema.column}) VALUES($1,$2,$3::vector)`,
      [manualId, chunkText, vectorStr]
    );
    _metrics.inserts_success++;
    return true;
  } catch (err) {
    _metrics.inserts_failed++;
    emitVectorEvent('VECTOR_INSERT_FAILED', { error: err.message, source });
    return false;
  }
}

// ─── Dual-Read Architecture ─────────────────────────────────────────────────

/**
 * Executa query de similaridade com dual-read (coluna principal + shadow column).
 * Se não houver shadow column configurada, faz single-read normal.
 * Permite comparar qualidade de embeddings durante upgrades de modelo.
 *
 * @param {Object} opts - mesmos params de governedSimilaritySearch + shadowColumn
 * @returns {Promise<{ primary: Array, shadow: Array|null, drift: number|null }>}
 */
async function dualReadSimilaritySearch(opts) {
  const { shadowColumn, ...baseOpts } = opts;
  const primary = await governedSimilaritySearch(baseOpts);

  if (!shadowColumn) {
    return { primary, shadow: null, drift: null };
  }

  try {
    const schema = VECTOR_SCHEMA_REGISTRY.primary;
    const sql = `
      SELECT mc.id,
             (mc.${shadowColumn} ${schema.operator} $1::vector) as shadow_distance
      FROM ${schema.table} mc
      JOIN manuals m ON mc.manual_id = m.id
      WHERE (m.company_id = $2 OR m.company_id IS NULL)
        AND mc.${shadowColumn} IS NOT NULL
      ORDER BY mc.${shadowColumn} ${schema.operator} $1::vector
      LIMIT $3
    `;
    const r = await db.query(sql, [opts.queryVector, opts.companyId || null, opts.limit || 8]);
    const shadow = (r.rows || []).map(row => ({
      id: row.id,
      shadow_distance: parseFloat(row.shadow_distance || 0)
    }));

    // Calcular drift: diferença média de ranking entre primary e shadow
    let drift = null;
    if (primary.length > 0 && shadow.length > 0) {
      const primaryIds = primary.map(r => r.id);
      const shadowIds = shadow.map(r => r.id);
      let rankDiff = 0;
      for (let i = 0; i < Math.min(primaryIds.length, shadowIds.length); i++) {
        const shadowIdx = shadowIds.indexOf(primaryIds[i]);
        rankDiff += shadowIdx >= 0 ? Math.abs(i - shadowIdx) : primaryIds.length;
      }
      drift = rankDiff / Math.max(primaryIds.length, 1);
      if (drift > 3) {
        emitVectorEvent('VECTOR_DRIFT_HIGH', { drift, shadowColumn });
      }
    }

    return { primary, shadow, drift };
  } catch (err) {
    emitVectorEvent('VECTOR_DUAL_READ_FAILED', { error: err.message, shadowColumn });
    return { primary, shadow: null, drift: null };
  }
}

// ─── Safe Rebuild Engine ────────────────────────────────────────────────────

/**
 * Estado persistente de rebuild (checkpoint em memória — extensível a DB).
 */
let _rebuildState = null;

/**
 * Reconstrói embeddings em batch com checkpoint e rollback.
 *
 * @param {Object} opts
 * @param {Function} opts.embedFn - async (text) => number[]|null — função de embedding
 * @param {number} [opts.batchSize=50]
 * @param {number} [opts.delayMs=200] - pausa entre batches para não sobrecarregar
 * @param {string} [opts.targetColumn='embedding'] - coluna destino (pode ser shadow)
 * @param {boolean} [opts.onlyNulls=false] - reconstruir apenas rows sem embedding
 * @param {Function} [opts.onProgress] - callback(progressObj)
 * @param {AbortSignal} [opts.signal] - para abort/rollback
 * @returns {Promise<Object>} resultado do rebuild
 */
async function safeRebuild(opts) {
  const {
    embedFn,
    batchSize = 50,
    delayMs = 200,
    targetColumn = 'embedding',
    onlyNulls = false,
    onProgress,
    signal
  } = opts;

  if (!embedFn || typeof embedFn !== 'function') {
    throw new Error('embedFn é obrigatório para safe rebuild');
  }
  if (_rebuildState && _rebuildState.status === 'running') {
    throw new Error('Já existe um rebuild em andamento');
  }

  _metrics.rebuilds_started++;
  _currentRolloutState = ROLLOUT_STATES.REBUILDING;
  emitVectorEvent('VECTOR_REBUILD_START', { batchSize, targetColumn, onlyNulls });

  _rebuildState = {
    status: 'running',
    started_at: new Date().toISOString(),
    total_rows: 0,
    processed: 0,
    succeeded: 0,
    failed: 0,
    last_processed_id: null,
    batches_completed: 0,
    target_column: targetColumn,
    aborted: false
  };

  try {
    const whereClause = onlyNulls
      ? `WHERE ${targetColumn} IS NULL`
      : '';
    const countR = await db.query(`SELECT count(*) AS c FROM manual_chunks ${whereClause}`);
    _rebuildState.total_rows = parseInt(countR.rows[0].c, 10) || 0;

    if (_rebuildState.total_rows === 0) {
      _rebuildState.status = 'completed';
      _currentRolloutState = ROLLOUT_STATES.STABLE;
      emitVectorEvent('VECTOR_REBUILD_EMPTY', { message: 'Nenhuma row para reconstruir.' });
      _metrics.rebuilds_completed++;
      return { ..._rebuildState };
    }

    let lastId = 0;
    while (true) {
      if (signal && signal.aborted) {
        _rebuildState.aborted = true;
        _rebuildState.status = 'aborted';
        _currentRolloutState = ROLLOUT_STATES.STABLE;
        emitVectorEvent('VECTOR_REBUILD_ABORTED', { processed: _rebuildState.processed });
        return { ..._rebuildState };
      }

      const batchSql = `
        SELECT id, chunk_text FROM manual_chunks
        ${onlyNulls ? `WHERE ${targetColumn} IS NULL AND` : 'WHERE'} id > $1
        ORDER BY id ASC LIMIT $2
      `;
      const batchR = await db.query(batchSql, [lastId, batchSize]);
      if (!batchR.rows || batchR.rows.length === 0) break;

      for (const row of batchR.rows) {
        _rebuildState.processed++;
        _rebuildState.last_processed_id = row.id;
        try {
          const emb = await embedFn(row.chunk_text);
          if (emb && Array.isArray(emb) && emb.length === VECTOR_SCHEMA_REGISTRY.primary.dimension) {
            const vectorStr = '[' + emb.join(',') + ']';
            await db.query(
              `UPDATE manual_chunks SET ${targetColumn} = $1::vector WHERE id = $2`,
              [vectorStr, row.id]
            );
            _rebuildState.succeeded++;
          } else {
            _rebuildState.failed++;
          }
        } catch (e) {
          _rebuildState.failed++;
          emitVectorEvent('VECTOR_REBUILD_ROW_FAILED', { id: row.id, error: e.message });
        }

        lastId = row.id;
      }

      _rebuildState.batches_completed++;
      if (onProgress) {
        try { onProgress({ ..._rebuildState }); } catch (_) { /* never throw */ }
      }
      emitVectorEvent('VECTOR_REBUILD_BATCH', {
        batch: _rebuildState.batches_completed,
        processed: _rebuildState.processed,
        total: _rebuildState.total_rows
      });

      if (delayMs > 0) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    _rebuildState.status = 'completed';
    _rebuildState.completed_at = new Date().toISOString();
    _currentRolloutState = ROLLOUT_STATES.STABLE;
    _metrics.rebuilds_completed++;
    emitVectorEvent('VECTOR_REBUILD_COMPLETE', {
      total: _rebuildState.total_rows,
      succeeded: _rebuildState.succeeded,
      failed: _rebuildState.failed,
      batches: _rebuildState.batches_completed
    });
    return { ..._rebuildState };
  } catch (err) {
    _rebuildState.status = 'failed';
    _rebuildState.error = err.message;
    _currentRolloutState = ROLLOUT_STATES.DEGRADED;
    _metrics.rebuilds_failed++;
    emitVectorEvent('VECTOR_REBUILD_FAILED', { error: err.message });
    return { ..._rebuildState };
  }
}

// ─── Health & Observability ─────────────────────────────────────────────────

/**
 * Health check completo da memória vetorial.
 * Pode ser exposto via rota de administração.
 */
async function getVectorHealth() {
  const capabilities = await checkCapabilities();
  const schema = VECTOR_SCHEMA_REGISTRY.primary;

  const dimensionMatch = capabilities.column_dimension != null
    ? capabilities.column_dimension === schema.dimension
    : null;

  const coverage = capabilities.total_rows > 0
    ? ((capabilities.embedding_count / capabilities.total_rows) * 100).toFixed(1)
    : '0.0';

  const alerts = [];
  if (!capabilities.pgvector_extension) alerts.push({ level: 'critical', message: 'Extensão pgvector não instalada.' });
  if (!capabilities.table_exists) alerts.push({ level: 'critical', message: 'Tabela manual_chunks não existe.' });
  if (!capabilities.column_exists) alerts.push({ level: 'critical', message: 'Coluna embedding não existe.' });
  if (!capabilities.index_exists) alerts.push({ level: 'warning', message: 'Índice de embedding ausente — queries lentas.' });
  if (dimensionMatch === false) alerts.push({ level: 'critical', message: `Dimensão incompatível: esperado ${schema.dimension}, encontrado ${capabilities.column_dimension}.` });
  if (capabilities.null_embedding_count > 0 && capabilities.total_rows > 0) {
    const pct = ((capabilities.null_embedding_count / capabilities.total_rows) * 100).toFixed(1);
    if (parseFloat(pct) > 20) {
      alerts.push({ level: 'warning', message: `${pct}% dos chunks sem embedding (${capabilities.null_embedding_count}/${capabilities.total_rows}).` });
    }
  }

  return {
    status: capabilities.healthy && alerts.every(a => a.level !== 'critical') ? 'healthy' : 'degraded',
    rollout_state: _currentRolloutState,
    schema: {
      table: schema.table,
      column: schema.column,
      dimension: schema.dimension,
      provider: schema.provider,
      model: schema.model,
      index_type: schema.index_type,
      metric: schema.metric
    },
    capabilities,
    dimension_match: dimensionMatch,
    coverage_pct: parseFloat(coverage),
    alerts,
    metrics: { ..._metrics },
    rebuild_state: _rebuildState ? { ..._rebuildState } : null,
    checked_at: new Date().toISOString()
  };
}

/** Retorna os últimos N eventos vetoriais. */
function getVectorEvents(limit = 100) {
  const n = Math.min(limit, EVENT_LOG_MAX);
  return _eventLog.slice(-n);
}

/** Retorna métricas brutas. */
function getMetrics() {
  return { ..._metrics };
}

/** Retorna estado do rollout. */
function getRolloutState() {
  return _currentRolloutState;
}

/** Força um estado de rollout (admin manual). */
function setRolloutState(state) {
  if (!Object.values(ROLLOUT_STATES).includes(state)) {
    throw new Error(`Estado de rollout inválido: ${state}`);
  }
  const prev = _currentRolloutState;
  _currentRolloutState = state;
  emitVectorEvent('VECTOR_ROLLOUT_STATE_CHANGE', { from: prev, to: state });
  return { from: prev, to: state };
}

/** Invalida o cache de capabilities (após mudanças de schema). */
function invalidateCapabilityCache() {
  _capabilityCache = null;
  _capabilityCacheAt = 0;
}

module.exports = {
  VECTOR_SCHEMA_REGISTRY,
  ROLLOUT_STATES,
  checkCapabilities,
  isVectorReady,
  governedSimilaritySearch,
  governedInsertEmbedding,
  dualReadSimilaritySearch,
  safeRebuild,
  getVectorHealth,
  getVectorEvents,
  getMetrics,
  getRolloutState,
  setRolloutState,
  invalidateCapabilityCache,
  emitVectorEvent
};
