'use strict';

const { KMSClient, DecryptCommand, GenerateDataKeyCommand } = require('@aws-sdk/client-kms');

const KEY_LENGTH = 32;

/**
 * Obtém material AES-256 (32 bytes) via AWS KMS.
 *
 * Modos:
 * - `DATA_ENCRYPTION_KMS_ENCRYPTED_DEK` (base64 do CiphertextBlob) → Decrypt
 * - `DATA_ENCRYPTION_KMS_BOOTSTRAP_GENERATE=true` + `DATA_ENCRYPTION_KMS_KEY_ID` → GenerateDataKey (apenas dev/bootstrap; ver docs)
 *
 * @returns {Promise<Buffer>}
 */
async function fetchAwsKmsPlaintextKey({ hasWrapped, bootstrap }) {
  const region =
    process.env.AWS_REGION ||
    process.env.AWS_DEFAULT_REGION ||
    process.env.DATA_ENCRYPTION_KMS_REGION ||
    undefined;
  const client = new KMSClient(region ? { region } : {});

  if (hasWrapped) {
    const b64 = String(process.env.DATA_ENCRYPTION_KMS_ENCRYPTED_DEK).trim();
    const ciphertext = Buffer.from(b64, 'base64');
    if (ciphertext.length < 1) {
      throw new Error('AWS_KMS_ENCRYPTED_DEK_INVALID');
    }
    const out = await client.send(new DecryptCommand({ CiphertextBlob: ciphertext }));
    if (!out.Plaintext || out.Plaintext.length !== KEY_LENGTH) {
      throw new Error('AWS_KMS_PLAINTEXT_UNEXPECTED_LENGTH');
    }
    return Buffer.from(out.Plaintext);
  }

  if (bootstrap) {
    const keyId = process.env.DATA_ENCRYPTION_KMS_KEY_ID && String(process.env.DATA_ENCRYPTION_KMS_KEY_ID).trim();
    if (!keyId) {
      throw new Error('AWS_KMS_KEY_ID_REQUIRED_FOR_GENERATE');
    }
    const out = await client.send(
      new GenerateDataKeyCommand({
        KeyId: keyId,
        KeySpec: 'AES_256'
      })
    );
    if (!out.Plaintext || out.Plaintext.length !== KEY_LENGTH) {
      throw new Error('AWS_KMS_GENERATE_UNEXPECTED_PLAINTEXT');
    }
    return Buffer.from(out.Plaintext);
  }

  throw new Error('AWS_KMS_NO_MATERIAL_PATH');
}

module.exports = { fetchAwsKmsPlaintextKey };
