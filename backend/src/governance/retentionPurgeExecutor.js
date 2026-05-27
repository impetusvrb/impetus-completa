'use strict';

/**
 * Retention Purge Executor — Enterprise-grade T1.7
 *
 * Executa purge/anonymize real com base na elegibilidade resolvida.
 * Opera em 3 modos governados:
 *   - shadow: zero mutations (delegado ao shadow worker existente)
 *   - pilot: mutations limitadas (tenant allowlist + batch cap)
 *   - enforce: mutations globais (todos tenants, batch-rate-limited)
 *
 * Princípios: idempotent, tenant-locked, batch-safe, audit-trail, rollback-safe
 */

const db = require('../db');
const registry = require('./retentionPolicyRegistry');

const LAYER = 'RETENTION_PURGE_EXECUTOR';
const DEFAULT_BATCH_SIZE = 200;
const BATCH_PAUSE_MS = 150;
const MAX_CONSECUTIVE_ERRORS = 3;

function _getMode() {
  const v = String(process.env.IMPETUS_RETENTION_MODE || '').trim().toLowerCase();
  if (['shadow', 'pilot', 'enforce'].includes(v)) return v;
  return 'off';
}

function _isEnabled() {
  const enabled = String(process.env.IMPETUS_RETENTION_ENABLED || 'true').trim().toLowerCase();
  return enabled !== 'false' && enabled !== '0';
}

function _getBatchSize() {
  const v = parseInt(process.env.IMPETUS_RETENTION_BATCH_SIZE || '', 10);
  return Number.isFinite(v) && v > 0 ? Math.min(v, 2000) : DEFAULT_BATCH_SIZE;
}

function _getPilotLimit() {
  const v = parseInt(process.env.IMPETUS_RETENTION_PILOT_LIMIT || '', 10);
  return Number.isFinite(v) && v > 0 ? v : 500;
}

function _getPilotTenants() {
  const raw = String(process.env.IMPETUS_RETENTION_PILOT_TENANTS || '').trim();
  if (!raw) return [];
  return raw.split(',').map(s => s.trim()).filter(s => s.length >= 8);
}

function _log(event, data) {
  try {
    console.info('[RETENTION_PURGE_EXECUTOR]', JSON.stringify({
      _type: 'retention_purge_executor',
      layer: LAYER,
      event,
      ts: new Date().toISOString(),
      mode: _getMode(),
      ...data,
    }));
  } catch { /* never throw */ }
}

function _sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * SQL templates por tabela + action para execução real.
 */
const PURGE_SQL = Object.freeze({
  industrial_event_outbox: {
    action: 'purge',
    sql: `DELETE FROM "industrial_event_outbox" WHERE id IN (SELECT id FROM "industrial_event_outbox" WHERE created_at < $1 LIMIT $2)`,
    tenantSql: `DELETE FROM "industrial_event_outbox" WHERE id IN (SELECT id FROM "industrial_event_outbox" WHERE company_id = $1 AND created_at < $2 LIMIT $3)`,
  },
  eventos_empresa: {
    action: 'anonymize',
    sql: `UPDATE "eventos_empresa" SET descricao = '[RETENTION_ANONYMIZED]', equipamento = NULL, linha = NULL WHERE id IN (SELECT id FROM "eventos_empresa" WHERE data < $1 AND descricao != '[RETENTION_ANONYMIZED]' LIMIT $2)`,
    tenantSql: `UPDATE "eventos_empresa" SET descricao = '[RETENTION_ANONYMIZED]', equipamento = NULL, linha = NULL WHERE id IN (SELECT id FROM "eventos_empresa" WHERE company_id = $1 AND data < $2 AND descricao != '[RETENTION_ANONYMIZED]' LIMIT $3)`,
  },
  chat_messages: {
    action: 'anonymize',
    sql: `UPDATE "chat_messages" SET content = '[RETENTION_ANONYMIZED]' WHERE id IN (SELECT id FROM "chat_messages" WHERE created_at < $1 AND content != '[RETENTION_ANONYMIZED]' LIMIT $2)`,
    tenantSql: `UPDATE "chat_messages" SET content = '[RETENTION_ANONYMIZED]' WHERE id IN (SELECT cm.id FROM "chat_messages" cm INNER JOIN chat_conversations cc ON cc.id = cm.conversation_id WHERE cc.company_id = $1 AND cm.created_at < $2 AND cm.content != '[RETENTION_ANONYMIZED]' LIMIT $3)`,
  },
  operational_memory: {
    action: 'anonymize',
    sql: `UPDATE "operational_memory" SET content = '[RETENTION_ANONYMIZED]', metadata = '{"_retention":"anonymized"}'::jsonb WHERE id IN (SELECT id FROM "operational_memory" WHERE created_at < $1 AND content != '[RETENTION_ANONYMIZED]' LIMIT $2)`,
    tenantSql: `UPDATE "operational_memory" SET content = '[RETENTION_ANONYMIZED]', metadata = '{"_retention":"anonymized"}'::jsonb WHERE id IN (SELECT id FROM "operational_memory" WHERE company_id = $1 AND created_at < $2 AND content != '[RETENTION_ANONYMIZED]' LIMIT $3)`,
  },
  ai_interaction_traces: {
    action: 'anonymize',
    sql: `UPDATE "ai_interaction_traces" SET input_payload = '{"_anonymized":true,"_retention":true}'::jsonb, output_response = '{"_anonymized":true}'::jsonb WHERE id IN (SELECT id FROM "ai_interaction_traces" WHERE created_at < $1 AND (input_payload->>'_anonymized') IS NULL LIMIT $2)`,
    tenantSql: `UPDATE "ai_interaction_traces" SET input_payload = '{"_anonymized":true,"_retention":true}'::jsonb, output_response = '{"_anonymized":true}'::jsonb WHERE id IN (SELECT id FROM "ai_interaction_traces" WHERE company_id = $1 AND created_at < $2 AND (input_payload->>'_anonymized') IS NULL LIMIT $3)`,
  },
});

/**
 * Executa purge/anonymize para uma tabela em batch com rate-limiting.
 * @param {string} table - nome da tabela
 * @param {Date} threshold - data limite (registos antes desta são elegíveis)
 * @param {object} opts - { tenantId?, maxRows? }
 * @returns {{ table, action, affected, batches, errors, aborted }}
 */
async function executePurge(table, threshold, opts = {}) {
  const mode = _getMode();
  if (mode === 'off' || mode === 'shadow') {
    return { table, affected: 0, reason: 'mode_no_mutation', mode };
  }

  if (!_isEnabled()) {
    return { table, affected: 0, reason: 'retention_disabled' };
  }

  const config = PURGE_SQL[table];
  if (!config) {
    return { table, affected: 0, reason: 'no_purge_config' };
  }

  const tenantId = opts.tenantId || null;
  const maxRows = opts.maxRows || (mode === 'pilot' ? _getPilotLimit() : 2000);
  const batchSize = _getBatchSize();

  // Pilot mode requires tenant allowlist
  if (mode === 'pilot') {
    const allowedTenants = _getPilotTenants();
    if (!tenantId || !allowedTenants.includes(tenantId)) {
      return { table, affected: 0, reason: 'tenant_not_in_pilot_allowlist', mode };
    }
  }

  const sql = tenantId ? config.tenantSql : config.sql;

  let totalAffected = 0;
  let batches = 0;
  let consecutiveErrors = 0;
  const errors = [];

  while (totalAffected < maxRows) {
    const remaining = Math.min(batchSize, maxRows - totalAffected);
    const params = tenantId ? [tenantId, threshold, remaining] : [threshold, remaining];

    try {
      const result = await db.query(sql, params);
      const affected = result.rowCount || 0;
      totalAffected += affected;
      batches++;
      consecutiveErrors = 0;

      if (affected === 0) break;

      _log('batch_executed', { table, action: config.action, batch: batches, affected, total: totalAffected, tenant: tenantId || 'global' });
      await _sleep(BATCH_PAUSE_MS);
    } catch (err) {
      consecutiveErrors++;
      errors.push({ batch: batches + 1, error: err?.message });
      _log('batch_error', { table, batch: batches + 1, error: err?.message });

      if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
        _log('table_aborted', { table, reason: 'max_consecutive_errors' });
        break;
      }
      await _sleep(BATCH_PAUSE_MS * 2);
    }
  }

  return {
    table,
    action: config.action,
    affected: totalAffected,
    batches,
    errors,
    aborted: consecutiveErrors >= MAX_CONSECUTIVE_ERRORS,
    mode,
    tenant: tenantId || 'global',
  };
}

function getDiagnostics() {
  return {
    mode: _getMode(),
    enabled: _isEnabled(),
    batch_size: _getBatchSize(),
    pilot_limit: _getPilotLimit(),
    pilot_tenants: _getPilotTenants(),
    supported_tables: Object.keys(PURGE_SQL),
  };
}

module.exports = {
  executePurge,
  getDiagnostics,
  PURGE_SQL,
};
