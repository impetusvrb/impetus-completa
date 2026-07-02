'use strict';

/**
 * Emissão de licença (apenas ambiente emissor IMPETUS — nunca no cliente).
 * Chave privada via LICENSE_ISSUER_PRIVATE_KEY ou LICENSE_ISSUER_PRIVATE_KEY_PATH.
 */

const crypto = require('crypto');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { canonicalPayload } = require('./enterpriseLicenseLocal');

function loadPrivateKey() {
  const inline = String(process.env.LICENSE_ISSUER_PRIVATE_KEY || '').trim();
  if (inline.includes('BEGIN PRIVATE KEY') || inline.includes('BEGIN EC PRIVATE KEY')) {
    return inline.replace(/\\n/g, '\n');
  }
  const p = String(process.env.LICENSE_ISSUER_PRIVATE_KEY_PATH || '').trim();
  if (p && fs.existsSync(p)) return fs.readFileSync(p, 'utf8');
  return null;
}

/**
 * @param {object} fields
 * @returns {object}
 */
function signLicenseDocument(fields) {
  const privateKey = loadPrivateKey();
  if (!privateKey) {
    throw new Error('LICENSE_ISSUER_PRIVATE_KEY ou LICENSE_ISSUER_PRIVATE_KEY_PATH obrigatório para emitir');
  }

  const doc = {
    license_id: fields.license_id || uuidv4(),
    installation_id: fields.installation_id,
    company_id: fields.company_id,
    company_name: fields.company_name,
    plan: fields.plan || 'enterprise',
    issued_at: fields.issued_at || new Date().toISOString(),
    expires_at: fields.expires_at,
    max_users: fields.max_users ?? 100,
    min_version: fields.min_version || '0.1.0',
    capabilities: fields.capabilities || ['core', 'anam', 'digital_twin', 'executive'],
    signature_algorithm: 'Ed25519',
  };

  const payload = canonicalPayload(doc);
  const signature = crypto.sign(null, Buffer.from(payload, 'utf8'), privateKey).toString('base64');
  return { ...doc, signature };
}

module.exports = {
  signLicenseDocument,
  loadPrivateKey,
};
