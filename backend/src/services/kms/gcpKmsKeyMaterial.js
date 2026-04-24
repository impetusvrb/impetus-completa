'use strict';

const { KeyManagementServiceClient } = require('@google-cloud/kms');

const KEY_LENGTH = 32;

/**
 * Obtém material AES-256 (32 bytes) via Google Cloud KMS (unwrap da DEK).
 *
 * Requer:
 * - `DATA_ENCRYPTION_KMS_KEY_ID` — nome completo do CryptoKey
 *   (ex.: projects/P/locations/L/keyRings/R/cryptoKeys/K)
 * - `DATA_ENCRYPTION_KMS_ENCRYPTED_DEK` — ciphertext em base64 devolvido pelo encrypt
 *   correspondente (ou fluxo envelope da sua operação).
 *
 * Opcional (apenas dev): `DATA_ENCRYPTION_KMS_BOOTSTRAP_GENERATE=true` chama
 * `encrypt` com plaintext aleatório de 32 bytes para produzir um ciphertext —
 * útil só para laboratório; em produção use um pipeline de envelope documentado.
 *
 * @returns {Promise<Buffer>}
 */
async function fetchGcpKmsPlaintextKey({ hasWrapped, bootstrap }) {
  const name = process.env.DATA_ENCRYPTION_KMS_KEY_ID && String(process.env.DATA_ENCRYPTION_KMS_KEY_ID).trim();
  if (!name) {
    throw new Error('GCP_KMS_KEY_ID_REQUIRED');
  }

  const client = new KeyManagementServiceClient();

  if (hasWrapped) {
    const b64 = String(process.env.DATA_ENCRYPTION_KMS_ENCRYPTED_DEK).trim();
    const ciphertext = Buffer.from(b64, 'base64');
    if (ciphertext.length < 1) {
      throw new Error('GCP_KMS_ENCRYPTED_DEK_INVALID');
    }
    const [result] = await client.decrypt({
      name,
      ciphertext
    });
    if (!result.plaintext || result.plaintext.length !== KEY_LENGTH) {
      throw new Error('GCP_KMS_PLAINTEXT_UNEXPECTED_LENGTH');
    }
    return Buffer.from(result.plaintext);
  }

  if (bootstrap) {
    const crypto = require('crypto');
    const plaintext = crypto.randomBytes(KEY_LENGTH);
    const [enc] = await client.encrypt({
      name,
      plaintext
    });
    if (!enc.ciphertext) {
      throw new Error('GCP_KMS_ENCRYPT_EMPTY_CIPHERTEXT');
    }
    const [dec] = await client.decrypt({
      name,
      ciphertext: enc.ciphertext
    });
    if (!dec.plaintext || dec.plaintext.length !== KEY_LENGTH) {
      throw new Error('GCP_KMS_BOOTSTRAP_DECRYPT_UNEXPECTED');
    }
    return Buffer.from(dec.plaintext);
  }

  throw new Error('GCP_KMS_NO_MATERIAL_PATH');
}

module.exports = { fetchGcpKmsPlaintextKey };
