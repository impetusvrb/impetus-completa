/**
 * CRIPTOGRAFIA - Dados sensíveis em repouso (AES-256-GCM)
 * Use para tokens, chaves API e outros segredos no banco
 */

const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 16;

function getEncryptionKey() {
  const key = process.env.ENCRYPTION_KEY || process.env.SALT || '';
  if (!key || key.length < 32) {
    throw new Error('ENCRYPTION_KEY ou SALT com pelo menos 32 caracteres é obrigatório');
  }
  return crypto.createHash('sha256').update(key).digest();
}

function encrypt(plaintext) {
  if (plaintext == null || plaintext === '') return '';
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  const encrypted = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString('base64');
}

function decrypt(ciphertext) {
  if (!ciphertext || typeof ciphertext !== 'string') return '';
  try {
    const key = getEncryptionKey();
    const buf = Buffer.from(ciphertext, 'base64');
    if (buf.length < IV_LENGTH + AUTH_TAG_LENGTH) return ciphertext;
    const iv = buf.subarray(0, IV_LENGTH);
    const authTag = buf.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const encrypted = buf.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
    decipher.setAuthTag(authTag);
    return decipher.update(encrypted) + decipher.final('utf8');
  } catch (e) {
    return ciphertext;
  }
}

function isEncrypted(str) {
  if (!str || typeof str !== 'string') return false;
  try {
    const buf = Buffer.from(str, 'base64');
    return buf.length >= IV_LENGTH + AUTH_TAG_LENGTH;
  } catch {
    return false;
  }
}

module.exports = { encrypt, decrypt, isEncrypted };
