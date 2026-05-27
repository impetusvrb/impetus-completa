'use strict';

/**
 * Retention Eligibility Resolver — Enterprise-grade T1.7
 *
 * Resolve quais registos são elegíveis para purge/anonymize com base:
 *   - Políticas do retentionPolicyRegistry
 *   - TTL por tabela
 *   - Tenant isolation
 *   - Imutabilidade (AUDIT_IMMUTABLE nunca elegível)
 *   - Soft-delete markers (idempotência)
 *
 * Não executa mutações — apenas resolve elegibilidade.
 *
 * Princípios: deny-first, tenant-scoped, idempotent, auditable
 */

const db = require('../db');
const registry = require('./retentionPolicyRegistry');

const LAYER = 'RETENTION_ELIGIBILITY';

function _log(event, data) {
  try {
    console.info('[RETENTION_ELIGIBILITY]', JSON.stringify({
      _type: 'retention_eligibility',
      layer: LAYER,
      event,
      ts: new Date().toISOString(),
      ...data,
    }));
  } catch { /* never throw */ }
}

/**
 * Tabelas-alvo obrigatórias para T1.7 com mapeamento de colunas reais.
 */
const TARGET_TABLE_CONFIG = Object.freeze({
  chat_messages: {
    timestampColumn: 'created_at',
    companyColumn: null,
    companyJoin: 'INNER JOIN chat_conversations cc ON cc.id = chat_messages.conversation_id',
    companyRef: 'cc.company_id',
    idempotentFilter: `content != '[RETENTION_ANONYMIZED]'`,
  },
  z_conversation_message_index: {
    timestampColumn: 'created_at',
    companyColumn: 'company_id',
    companyJoin: null,
    companyRef: 'company_id',
    idempotentFilter: '1=1',
  },
  industrial_event_outbox: {
    timestampColumn: 'created_at',
    companyColumn: 'company_id',
    companyJoin: null,
    companyRef: 'company_id',
    idempotentFilter: '1=1',
  },
  eventos_empresa: {
    timestampColumn: 'data',
    companyColumn: 'company_id',
    companyJoin: null,
    companyRef: 'company_id',
    idempotentFilter: `descricao != '[RETENTION_ANONYMIZED]'`,
  },
  memoria_usuario: {
    timestampColumn: 'created_at',
    companyColumn: 'company_id',
    companyJoin: null,
    companyRef: 'company_id',
    idempotentFilter: `perfil_tecnico IS NOT NULL AND perfil_tecnico != '[SZ5_PURGED]'`,
  },
  ai_interaction_traces: {
    timestampColumn: 'created_at',
    companyColumn: 'company_id',
    companyJoin: null,
    companyRef: 'company_id',
    idempotentFilter: `(input_payload->>'_anonymized') IS NULL`,
  },
  manual_chunks: {
    timestampColumn: null,
    companyColumn: null,
    companyJoin: 'INNER JOIN manuals m ON m.id = manual_chunks.manual_id',
    companyRef: 'm.company_id',
    idempotentFilter: 'embedding IS NOT NULL',
  },
  operational_memory: {
    timestampColumn: 'created_at',
    companyColumn: 'company_id',
    companyJoin: null,
    companyRef: 'company_id',
    idempotentFilter: `content != '[RETENTION_ANONYMIZED]'`,
  },
});

/**
 * Verifica se uma tabela existe no BD.
 */
async function _tableExists(tableName) {
  try {
    const r = await db.query(
      `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = $1)`,
      [tableName]
    );
    return r.rows[0].exists;
  } catch { return false; }
}

/**
 * Resolve elegibilidade para uma tabela específica.
 * @returns { table, eligible, policy, threshold, idempotent, error? }
 */
async function resolveForTable(tableName, opts = {}) {
  const policy = registry.getPolicy(tableName);
  if (!policy) {
    return { table: tableName, eligible: 0, reason: 'no_policy_registered' };
  }

  if (policy.data_class === registry.DATA_CLASS.AUDIT_IMMUTABLE) {
    return { table: tableName, eligible: 0, reason: 'audit_immutable_protected', policy };
  }

  if (policy.ttl_days === null && policy.action === registry.ACTIONS.RETAIN) {
    return { table: tableName, eligible: 0, reason: 'indefinite_retention', policy };
  }

  if (policy.ttl_days === null) {
    return { table: tableName, eligible: 0, reason: 'no_ttl_defined', policy };
  }

  const config = TARGET_TABLE_CONFIG[tableName];
  if (!config) {
    return { table: tableName, eligible: 0, reason: 'no_target_config', policy };
  }

  if (!config.timestampColumn) {
    return { table: tableName, eligible: 0, reason: 'no_timestamp_column', policy };
  }

  const exists = await _tableExists(tableName);
  if (!exists) {
    return { table: tableName, eligible: 0, reason: 'table_not_exists', policy };
  }

  const threshold = new Date(Date.now() - policy.ttl_days * 86400000);
  const tenantId = opts.tenantId || null;

  try {
    let fromClause = `"${tableName}"`;
    let whereClause = `"${tableName}"."${config.timestampColumn}" < $1`;
    const params = [threshold];

    if (config.companyJoin) {
      fromClause = `"${tableName}" ${config.companyJoin}`;
    }

    if (config.idempotentFilter && config.idempotentFilter !== '1=1') {
      whereClause += ` AND ${config.idempotentFilter}`;
    }

    if (tenantId) {
      params.push(tenantId);
      whereClause += ` AND ${config.companyRef} = $${params.length}`;
    }

    const result = await db.query(
      `SELECT COUNT(*) as cnt FROM ${fromClause} WHERE ${whereClause}`,
      params
    );

    const eligible = parseInt(result.rows[0].cnt, 10);

    return {
      table: tableName,
      eligible,
      policy: { action: policy.action, ttl_days: policy.ttl_days, legal_basis: policy.legal_basis },
      threshold: threshold.toISOString(),
      tenant_scoped: !!tenantId,
    };
  } catch (err) {
    _log('resolve_error', { table: tableName, error: err?.message });
    return { table: tableName, eligible: 0, error: err?.message, policy };
  }
}

/**
 * Resolve elegibilidade para TODAS as tabelas-alvo T1.7.
 */
async function resolveAll(opts = {}) {
  const tables = Object.keys(TARGET_TABLE_CONFIG);
  const results = [];
  let totalEligible = 0;

  for (const table of tables) {
    const result = await resolveForTable(table, opts);
    results.push(result);
    totalEligible += result.eligible || 0;
  }

  _log('resolve_all_completed', {
    tables_resolved: results.length,
    total_eligible: totalEligible,
    tenant_scoped: !!opts.tenantId,
  });

  return {
    ok: true,
    total_eligible: totalEligible,
    tables_resolved: results.length,
    results,
    resolved_at: new Date().toISOString(),
  };
}

/**
 * Lista tabelas-alvo com suas políticas.
 */
function getTargetTables() {
  return Object.keys(TARGET_TABLE_CONFIG).map(t => {
    const policy = registry.getPolicy(t);
    return {
      table: t,
      policy: policy ? { action: policy.action, ttl_days: policy.ttl_days, legal_basis: policy.legal_basis } : null,
      config: TARGET_TABLE_CONFIG[t],
    };
  });
}

module.exports = {
  resolveForTable,
  resolveAll,
  getTargetTables,
  TARGET_TABLE_CONFIG,
};
