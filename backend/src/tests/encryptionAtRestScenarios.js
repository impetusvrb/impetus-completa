'use strict';

/**
 * Criptografia em repouso — testes.
 * Executar: node src/tests/encryptionAtRestScenarios.js
 */

const assert = require('assert');
const crypto = require('crypto');
const encryptionService = require('../services/encryptionService');

const testKeyB64 = crypto.randomBytes(32).toString('base64');

function withKey(fn) {
  const prev = process.env.DATA_ENCRYPTION_KEY;
  process.env.DATA_ENCRYPTION_KEY = testKeyB64;
  encryptionService._resetKeyCacheForTests();
  try {
    fn();
  } finally {
    if (prev === undefined) delete process.env.DATA_ENCRYPTION_KEY;
    else process.env.DATA_ENCRYPTION_KEY = prev;
    encryptionService._resetKeyCacheForTests();
  }
}

function testRoundTripObject() {
  withKey(() => {
    const orig = { user_prompt: 'segredo', n: 42 };
    const enc = encryptionService.encryptField(orig);
    assert.strictEqual(encryptionService.isEncrypted(enc), true);
    const dec = encryptionService.decryptField(enc);
    assert.deepStrictEqual(dec, orig);
  });
}

function testRoundTripString() {
  withKey(() => {
    const orig = 'texto simples';
    const enc = encryptionService.encryptField(orig);
    const dec = encryptionService.decryptField(enc);
    assert.strictEqual(dec, orig);
  });
}

function testPlaintextNotReadableInEnvelope() {
  withKey(() => {
    const enc = encryptionService.encryptField({ cpf: '000.000.000-00' });
    const s = JSON.stringify(enc);
    assert.ok(!s.includes('000.000'));
    assert.ok(enc.content.length > 8);
  });
}

function testNoDoubleEncryption() {
  withKey(() => {
    const enc = encryptionService.encryptField({ a: 1 });
    const enc2 = encryptionService.encryptField(enc);
    assert.strictEqual(enc2.content, enc.content);
  });
}

function testLegacyPlainPassthrough() {
  withKey(() => {
    const plain = { hello: 'world' };
    const out = encryptionService.tryDecryptValue(plain);
    assert.deepStrictEqual(out, plain);
  });
}

function testInvalidKeyDecryptFails() {
  withKey(() => {
    const enc = encryptionService.encryptField({ x: 1 });
    process.env.DATA_ENCRYPTION_KEY = crypto.randomBytes(32).toString('base64');
    encryptionService._resetKeyCacheForTests();
    let threw = false;
    try {
      encryptionService.decryptField(enc);
    } catch {
      threw = true;
    }
    assert.strictEqual(threw, true);
  });
}

function testAuthTagTamper() {
  withKey(() => {
    const enc = encryptionService.encryptField({ k: 'v' });
    const bad = { ...enc, auth_tag: Buffer.from(enc.auth_tag, 'base64').map((b, i) => (i === 0 ? b ^ 1 : b)).toString('base64') };
    let threw = false;
    try {
      encryptionService.decryptField(bad);
    } catch {
      threw = true;
    }
    assert.strictEqual(threw, true);
  });
}

function testShouldEncryptClassification() {
  assert.strictEqual(
    encryptionService.shouldEncryptAtRest({ primary_category: 'PERSONAL' }, null, null),
    true
  );
  assert.strictEqual(
    encryptionService.shouldEncryptAtRest({ contains_sensitive_data: true }, null, null),
    true
  );
  assert.strictEqual(
    encryptionService.shouldEncryptAtRest({ risk_level: 'HIGH' }, null, null),
    true
  );
  assert.strictEqual(
    encryptionService.shouldEncryptAtRest({ primary_category: 'OPERATIONAL' }, null, null),
    false
  );
  assert.strictEqual(
    encryptionService.shouldEncryptAtRest({}, { force_encryption: true }, null),
    true
  );
}

function testDisabledWithoutKey() {
  const prev = process.env.DATA_ENCRYPTION_KEY;
  delete process.env.DATA_ENCRYPTION_KEY;
  encryptionService._resetKeyCacheForTests();
  try {
    assert.strictEqual(encryptionService.isEncryptionAvailable(), false);
    const o = { a: 1 };
    assert.deepStrictEqual(encryptionService.encryptField(o), o);
  } finally {
    if (prev !== undefined) process.env.DATA_ENCRYPTION_KEY = prev;
    encryptionService._resetKeyCacheForTests();
  }
}

const suite = [
  testRoundTripObject,
  testRoundTripString,
  testPlaintextNotReadableInEnvelope,
  testNoDoubleEncryption,
  testLegacyPlainPassthrough,
  testInvalidKeyDecryptFails,
  testAuthTagTamper,
  testShouldEncryptClassification,
  testDisabledWithoutKey
];

let failed = false;
for (const t of suite) {
  try {
    t();
    console.log('OK', t.name);
  } catch (e) {
    failed = true;
    console.error('FAIL', t.name, e);
  }
}
if (failed) process.exit(1);
console.log('encryptionAtRestScenarios: all passed');
