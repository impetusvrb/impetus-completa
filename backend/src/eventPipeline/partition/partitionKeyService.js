'use strict';

/**
 * Particionamento lógico WAVE 2 — tenant + mês (YYYY-MM).
 * Não cria partições físicas PostgreSQL (evita migração destrutiva); index + archive por partition_month.
 */

const { isIndustrialPartitioningEnabled } = require('../industrialFlags');

function derivePartitionMonth(isoDate) {
  const d = isoDate ? new Date(isoDate) : new Date();
  if (Number.isNaN(d.getTime())) return new Date().toISOString().slice(0, 7);
  return d.toISOString().slice(0, 7);
}

/**
 * @param {{ company_id: string, occurred_at?: string, partition_key?: string }} envelope
 */
function enrichPartitionFields(envelope) {
  if (!envelope || !envelope.company_id) return envelope;
  const month = derivePartitionMonth(envelope.occurred_at);
  if (!isIndustrialPartitioningEnabled()) {
    return {
      ...envelope,
      partition_month: month,
      partition_key: String(envelope.partition_key || envelope.company_id).slice(0, 128)
    };
  }
  const composite = `${envelope.company_id}:${month}`;
  return {
    ...envelope,
    partition_month: month,
    partition_key: composite.slice(0, 128)
  };
}

function parsePartitionKey(partitionKey) {
  const parts = String(partitionKey || '').split(':');
  if (parts.length >= 2 && /^[0-9a-f-]{36}$/i.test(parts[0])) {
    return { company_id: parts[0], partition_month: parts.slice(1).join(':').slice(0, 7) };
  }
  return { company_id: null, partition_month: null };
}

module.exports = {
  derivePartitionMonth,
  enrichPartitionFields,
  parsePartitionKey
};
