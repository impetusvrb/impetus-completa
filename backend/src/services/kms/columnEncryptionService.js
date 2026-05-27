'use strict';

/**
 * Column-Level Encryption Service — Enterprise PII Protection
 *
 * Encripta/desencripta campos PII específicos em tabelas designadas.
 * Opera de forma transparente como middleware de persistência.
 *
 * Colunas protegidas (PII_DIRECT + PII_SENSITIVE):
 *   - users.email, users.phone (se existirem)
 *   - memoria_usuario.respostas_raw
 *   - ai_interaction_traces.input_payload, output_response (via encryptionService existente)
 *   - time_clock_integrations.api_key_encrypted, credentials_encrypted
 *
 * Flag: IMPETUS_KMS_COLUMN_ENCRYPTION=off|audit|on
 *   off   → no-op (passthrough)
 *   audit → loga o que SERIA encriptado, zero mutations
 *   on    → encripta/desencripta real
 *
 * Princípios: additive-only, backward-compatible, tenant-scoped
 */

const kmsGovernance = require('./kmsGovernanceService');

const LAYER = 'COLUMN_ENCRYPTION';

function _getMode() {
  const v = String(process.env.IMPETUS_KMS_COLUMN_ENCRYPTION || '').trim().toLowerCase();
  if (['on', 'audit'].includes(v)) return v;
  return 'off';
}

function _log(event, data) {
  try {
    console.info('[COLUMN_ENCRYPTION]', JSON.stringify({
      _type: 'column_encryption',
      layer: LAYER,
      event,
      ts: new Date().toISOString(),
      mode: _getMode(),
      ...data,
    }));
  } catch { /* never throw */ }
}

/**
 * Registry de colunas protegidas por tabela.
 * Cada entrada define quais campos encriptar e a classificação.
 */
const PROTECTED_COLUMNS = Object.freeze({
  memoria_usuario: {
    columns: ['respostas_raw'],
    classification: 'PII_AI_DERIVED',
    tenant_column: 'company_id',
  },
  ai_interaction_traces: {
    columns: ['input_payload', 'output_response'],
    classification: 'PII_SENSITIVE',
    tenant_column: 'company_id',
  },
  whatsapp_contacts: {
    columns: ['phone_number', 'name'],
    classification: 'PII_DIRECT',
    tenant_column: 'company_id',
  },
  time_clock_integrations: {
    columns: ['api_key_encrypted', 'credentials_encrypted'],
    classification: 'CREDENTIAL',
    tenant_column: 'company_id',
  },
});

/**
 * Encripta um campo para persistência.
 * @param {string} table - nome da tabela
 * @param {string} column - nome da coluna
 * @param {*} value - valor a encriptar
 * @param {string} tenantId - company_id para tenant boundary
 * @returns {*} envelope encriptado ou valor original (se off/audit)
 */
function encryptColumn(table, column, value, tenantId) {
  if (value == null) return value;

  const mode = _getMode();
  if (mode === 'off') return value;

  const config = PROTECTED_COLUMNS[table];
  if (!config || !config.columns.includes(column)) return value;

  if (mode === 'audit') {
    _log('column_would_encrypt', { table, column, tenant_id: tenantId, classification: config.classification });
    return value;
  }

  // Already encrypted — idempotent
  if (typeof value === 'object' && value !== null && value.encrypted === true) return value;

  const plaintext = typeof value === 'string' ? value : JSON.stringify(value);
  const result = kmsGovernance.encryptForTenant(plaintext, tenantId);

  if (result.encrypted) {
    _log('column_encrypted', { table, column, tenant_id: tenantId });
    return result;
  }

  return value;
}

/**
 * Desencripta um campo da BD.
 * @param {string} table - nome da tabela
 * @param {string} column - nome da coluna
 * @param {*} value - valor (pode ser envelope ou plaintext legado)
 * @param {string} tenantId - company_id
 * @returns {*} valor desencriptado ou original
 */
function decryptColumn(table, column, value, tenantId) {
  if (value == null) return value;

  const mode = _getMode();
  if (mode === 'off') return value;

  // Not an encrypted envelope — return as-is (backward compatible)
  if (typeof value !== 'object' || value === null || value.encrypted !== true) return value;

  const config = PROTECTED_COLUMNS[table];
  if (!config || !config.columns.includes(column)) return value;

  if (mode === 'audit') {
    _log('column_would_decrypt', { table, column, tenant_id: tenantId });
    return value;
  }

  return kmsGovernance.decryptForTenant(value, tenantId);
}

/**
 * Encripta todos os campos protegidos de um row (para INSERT/UPDATE).
 */
function encryptRow(table, row, tenantId) {
  if (!row || typeof row !== 'object') return row;

  const mode = _getMode();
  if (mode === 'off') return row;

  const config = PROTECTED_COLUMNS[table];
  if (!config) return row;

  const tid = tenantId || row[config.tenant_column];
  const result = { ...row };

  for (const col of config.columns) {
    if (result[col] != null) {
      result[col] = encryptColumn(table, col, result[col], tid);
    }
  }

  return result;
}

/**
 * Desencripta todos os campos protegidos de um row (para SELECT).
 */
function decryptRow(table, row, tenantId) {
  if (!row || typeof row !== 'object') return row;

  const mode = _getMode();
  if (mode === 'off') return row;

  const config = PROTECTED_COLUMNS[table];
  if (!config) return row;

  const tid = tenantId || row[config.tenant_column];
  const result = { ...row };

  for (const col of config.columns) {
    if (result[col] != null) {
      result[col] = decryptColumn(table, col, result[col], tid);
    }
  }

  return result;
}

function getProtectedTables() {
  return Object.keys(PROTECTED_COLUMNS);
}

function getDiagnostics() {
  return {
    mode: _getMode(),
    protected_tables: Object.keys(PROTECTED_COLUMNS),
    protected_columns_count: Object.values(PROTECTED_COLUMNS).reduce((sum, c) => sum + c.columns.length, 0),
    kms_governance: kmsGovernance.getDiagnostics(),
  };
}

module.exports = {
  encryptColumn,
  decryptColumn,
  encryptRow,
  decryptRow,
  getProtectedTables,
  getDiagnostics,
  PROTECTED_COLUMNS,
};
