'use strict';

/**
 * Normaliza DATA_ENCRYPTION_KMS_PROVIDER para integração real.
 * Suporta valores pedidos (aws|gcp) e legados (AWS_KMS, GCP_KMS, etc.).
 *
 * @param {string|null|undefined} hint — valor bruto de env
 * @returns {'aws'|'gcp'|null}
 */
function normalizeKmsProvider(hint) {
  if (hint == null || String(hint).trim() === '') return null;
  const raw = String(hint).trim();
  const upper = raw.toUpperCase().replace(/-/g, '_');
  if (upper === 'AWS' || upper === 'AWS_KMS') return 'aws';
  if (upper === 'GCP' || upper === 'GCP_KMS' || upper === 'GCP_CMEK' || upper === 'GOOGLE') return 'gcp';
  const lower = raw.toLowerCase();
  if (lower === 'aws') return 'aws';
  if (lower === 'gcp') return 'gcp';
  return null;
}

module.exports = { normalizeKmsProvider };
