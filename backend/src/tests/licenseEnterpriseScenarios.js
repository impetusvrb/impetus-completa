'use strict';

/**
 * Testes CERT-LICENSE-01 — licenciamento Enterprise local.
 * node src/tests/licenseEnterpriseScenarios.js
 */

const crypto = require('crypto');
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const local = require('../services/license/enterpriseLicenseLocal');
const { signLicenseDocument } = require('../services/license/licenseIssuer');
const { hasCapability, normalizeCapabilities } = require('../services/license/licenseCapabilities');
const { shouldBlockAccess } = require('../services/license');

function makeKeyPair() {
  return crypto.generateKeyPairSync('ed25519', {
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
}

function withTempLicense(testFn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'impetus-lic-'));
  const prevHome = process.env.IMPETUS_HOME;
  const prevPriv = process.env.LICENSE_ISSUER_PRIVATE_KEY;
  const prevPub = process.env.LICENSE_PUBLIC_KEY;
  process.env.IMPETUS_HOME = dir;
  fs.mkdirSync(path.join(dir, 'licenses'), { recursive: true });
  const keys = makeKeyPair();
  process.env.LICENSE_ISSUER_PRIVATE_KEY = keys.privateKey;
  process.env.LICENSE_PUBLIC_KEY = keys.publicKey;
  fs.writeFileSync(path.join(dir, 'licenses', 'installation.id'), 'inst-test-001\n');
  try {
    return testFn({ dir, keys });
  } finally {
    if (prevHome === undefined) delete process.env.IMPETUS_HOME;
    else process.env.IMPETUS_HOME = prevHome;
    if (prevPriv === undefined) delete process.env.LICENSE_ISSUER_PRIVATE_KEY;
    else process.env.LICENSE_ISSUER_PRIVATE_KEY = prevPriv;
    if (prevPub === undefined) delete process.env.LICENSE_PUBLIC_KEY;
    else process.env.LICENSE_PUBLIC_KEY = prevPub;
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log('  OK', name);
  } catch (e) {
    failed += 1;
    console.error('  FAIL', name, '-', e.message);
  }
}

async function testAsync(name, fn) {
  try {
    await fn();
    passed += 1;
    console.log('  OK', name);
  } catch (e) {
    failed += 1;
    console.error('  FAIL', name, '-', e.message);
  }
}

console.log('=== licenseEnterpriseScenarios ===');

withTempLicense(({ dir }) => {
  const installationId = 'inst-test-001';
  const companyId = '11111111-1111-4111-8111-111111111111';

  test('licença válida assinada', () => {
    const doc = signLicenseDocument({
      installation_id: installationId,
      company_id: companyId,
      company_name: 'Test Co',
      expires_at: new Date(Date.now() + 86400000 * 90).toISOString(),
      capabilities: ['core', 'anam', 'digital_twin'],
    });
    const fp = path.join(dir, 'licenses', 'impetus.license.json');
    fs.writeFileSync(fp, JSON.stringify(doc));
    const r = local.validateLocalLicense();
    assert.strictEqual(r.operational, true);
    assert.strictEqual(r.state, 'valid');
    assert.ok(hasCapability(r, 'anam'));
  });

  test('licença expirada entra em grace', () => {
    const doc = signLicenseDocument({
      installation_id: installationId,
      company_id: companyId,
      expires_at: new Date(Date.now() - 86400000).toISOString(),
      capabilities: ['core'],
    });
    fs.writeFileSync(path.join(dir, 'licenses', 'impetus.license.json'), JSON.stringify(doc));
    const r = local.validateLocalLicense({ graceDays: 14 });
    assert.strictEqual(r.state, 'grace');
    assert.strictEqual(r.operational, true);
    assert.strictEqual(r.block, false);
  });

  test('pós grace bloqueia', () => {
    const doc = signLicenseDocument({
      installation_id: installationId,
      company_id: companyId,
      expires_at: new Date(Date.now() - 86400000 * 30).toISOString(),
      capabilities: ['core'],
    });
    fs.writeFileSync(path.join(dir, 'licenses', 'impetus.license.json'), JSON.stringify(doc));
    const r = local.validateLocalLicense({ graceDays: 7 });
    assert.strictEqual(r.state, 'expired');
    assert.strictEqual(r.operational, false);
    assert.strictEqual(r.block, true);
  });

  test('assinatura inválida', () => {
    const doc = signLicenseDocument({
      installation_id: installationId,
      company_id: companyId,
      expires_at: new Date(Date.now() + 86400000).toISOString(),
    });
    doc.signature = Buffer.from('invalid').toString('base64');
    fs.writeFileSync(path.join(dir, 'licenses', 'impetus.license.json'), JSON.stringify(doc));
    const r = local.validateLocalLicense();
    assert.strictEqual(r.reason, 'invalid_signature');
    assert.strictEqual(r.operational, false);
  });

  test('installation id incorreto', () => {
    const doc = signLicenseDocument({
      installation_id: 'wrong-id',
      company_id: companyId,
      expires_at: new Date(Date.now() + 86400000).toISOString(),
    });
    fs.writeFileSync(path.join(dir, 'licenses', 'impetus.license.json'), JSON.stringify(doc));
    const r = local.validateLocalLicense();
    assert.strictEqual(r.reason, 'installation_id_mismatch');
  });

  test('company id incorreto quando esperado', () => {
    const doc = signLicenseDocument({
      installation_id: installationId,
      company_id: companyId,
      expires_at: new Date(Date.now() + 86400000).toISOString(),
    });
    fs.writeFileSync(path.join(dir, 'licenses', 'impetus.license.json'), JSON.stringify(doc));
    const r = local.validateLocalLicense({ expectedCompanyId: 'other-uuid' });
    assert.strictEqual(r.reason, 'company_id_mismatch');
  });

  test('ficheiro corrompido', () => {
    fs.writeFileSync(path.join(dir, 'licenses', 'impetus.license.json'), '{not-json');
    const read = local.readLicenseFile();
    assert.strictEqual(read.ok, false);
    assert.strictEqual(read.reason, 'license_file_corrupt');
  });

  test('capabilities normalizadas', () => {
    const caps = normalizeCapabilities(['anam', 'boardroom', 'core']);
    assert.ok(caps.has('executive_boardroom'));
    assert.ok(caps.has('anam'));
  });

  test('shouldBlockAccess grace não bloqueia', () => {
    assert.strictEqual(shouldBlockAccess({ block: false, operational: true, state: 'grace' }), false);
  });
});

(async () => {
  await testAsync('validation_disabled via license.js', async () => {
    const prev = process.env.LICENSE_VALIDATION_ENABLED;
    process.env.LICENSE_VALIDATION_ENABLED = 'false';
    delete require.cache[require.resolve('../services/license')];
    const { validateLicense } = require('../services/license');
    const r = await validateLicense(true);
    assert.strictEqual(r.reason, 'validation_disabled');
    if (prev === undefined) delete process.env.LICENSE_VALIDATION_ENABLED;
    else process.env.LICENSE_VALIDATION_ENABLED = prev;
  });
  console.log(`\nResultado: ${passed} OK, ${failed} FAIL`);
  process.exit(failed ? 1 : 0);
})();
