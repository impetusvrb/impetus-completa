'use strict';

/**
 * APPSEC-01 — Enterprise Application Security Hardening Audit
 * node backend/src/tests/securityApplication/APPSEC_01.test.js
 */

process.env.NODE_ENV = 'test';
process.env.ALLOW_PARTIAL_ENV = 'true';
process.env.IMPETUS_APPSEC_ENABLED = 'true';

const assert = require('assert');
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '../../..');
const SRC = path.join(ROOT, 'src');

let passed = 0;
let failed = 0;

async function test(label, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ✅  ${label}`);
  } catch (e) {
    failed++;
    console.error(`  ❌  ${label}\n       ${e.message}`);
  }
}

function fresh(modulePath) {
  const resolved = require.resolve(modulePath);
  delete require.cache[resolved];
  return require(modulePath);
}

(async () => {
  console.log('\n  APPSEC-01 — ENTERPRISE APPLICATION SECURITY HARDENING\n');

  await test('01 — módulo securityApplication exporta API pública', () => {
    const appsec = fresh('../../securityApplication/index.js');
    assert.ok(appsec.crossTenantAccessValidator);
    assert.ok(appsec.ssrfProtectionEngine);
    assert.ok(appsec.publicEndpointPolicy);
    assert.ok(appsec.generateOwaspComplianceReport);
  });

  await test('02 — SSRF bloqueia localhost', async () => {
    const { assertSafeOutboundUrl } = fresh('../../securityApplication/ssrfProtectionEngine.js');
    let threw = false;
    try {
      await assertSafeOutboundUrl('https://localhost/admin', { integration: 'test' });
    } catch (e) {
      threw = true;
      assert.ok(e.code === 'SSRF_URL_DENIED' || /bloqueado/i.test(e.message));
    }
    assert.ok(threw, 'deveria bloquear localhost');
  });

  await test('03 — SSRF bloqueia IP privado RFC1918', async () => {
    const { isPrivateOrReservedIp } = fresh('../../securityApplication/ssrfProtectionEngine.js');
    assert.strictEqual(isPrivateOrReservedIp('10.0.0.1'), true);
    assert.strictEqual(isPrivateOrReservedIp('192.168.1.1'), true);
    assert.strictEqual(isPrivateOrReservedIp('127.0.0.1'), true);
  });

  await test('04 — SSRF bloqueia http (só HTTPS)', async () => {
    const { validateUrlSyntax } = fresh('../../securityApplication/ssrfProtectionEngine.js');
    const r = validateUrlSyntax('http://example.com/path');
    assert.strictEqual(r.ok, false);
  });

  await test('05 — uploadPolicy octet-stream exige extensão whitelist', () => {
    const policy = fresh('../../config/uploadPolicy.js');
    assert.strictEqual(policy.isMimeAllowed('application/octet-stream', ['document'], '.exe'), false);
    assert.strictEqual(policy.isMimeAllowed('application/octet-stream', ['document'], '.pdf'), true);
  });

  await test('06 — magic bytes rejeita PDF falso', () => {
    const os = require('os');
    const { validateMagicBytes } = fresh('../../securityApplication/uploadSecurity.js');
    const tmp = path.join(os.tmpdir(), `appsec-fake-${Date.now()}.pdf`);
    fs.writeFileSync(tmp, 'NOT A PDF');
    const r = validateMagicBytes(tmp, '.pdf');
    assert.strictEqual(r.ok, false);
    fs.unlinkSync(tmp);
  });

  await test('07 — publicEndpointPolicy resolve MINIMAL sem chave', async () => {
    const { resolvePublicAccess, ACCESS } = fresh('../../securityApplication/publicEndpointPolicy.js');
    const req = {
      ip: '203.0.113.50',
      get: (h) => (h === 'x-forwarded-for' ? '203.0.113.50' : ''),
      headers: {},
      socket: { remoteAddress: '203.0.113.50' }
    };
    const access = await resolvePublicAccess(req);
    assert.strictEqual(access, ACCESS.MINIMAL);
  });

  await test('08 — secretManagement detecta fallbacks inseguros', () => {
    const { isInsecureValue } = fresh('../../securityApplication/secretManagement.js');
    assert.strictEqual(isInsecureValue('impetus-default-key-32b'), true);
    assert.strictEqual(isInsecureValue('changeme'), true);
  });

  await test('09 — runtimeConfigurationValidator detecta LICENSE_VALIDATION=false em prod', () => {
    const prev = process.env.NODE_ENV;
    const prevLic = process.env.LICENSE_VALIDATION_ENABLED;
    process.env.NODE_ENV = 'production';
    process.env.LICENSE_VALIDATION_ENABLED = 'false';
    delete require.cache[require.resolve('../../securityApplication/runtimeConfigurationValidator.js')];
    delete require.cache[require.resolve('../../securityApplication/config/appsecFlags.js')];
    const { validateRuntimeConfiguration } = require('../../securityApplication/runtimeConfigurationValidator');
    const r = validateRuntimeConfiguration();
    assert.ok(r.errors.some((e) => /LICENSE_VALIDATION/.test(e)));
    process.env.NODE_ENV = prev;
    process.env.LICENSE_VALIDATION_ENABLED = prevLic;
  });

  await test('10 — routeSecurityAudit inventaria mounts', () => {
    const { auditServerMounts } = fresh('../../securityApplication/routeSecurityAudit.js');
    const mounts = auditServerMounts(path.join(SRC, 'server.js'));
    assert.ok(mounts.length > 100);
  });

  await test('11 — chatService importa crossTenantAccessValidator', () => {
    const src = fs.readFileSync(path.join(SRC, 'services/chatService.js'), 'utf8');
    assert.ok(/crossTenantAccessValidator/.test(src));
    assert.ok(/validatePrivateConversationTarget/.test(src));
  });

  await test('12 — timeClock usa safeFetch', () => {
    const src = fs.readFileSync(path.join(SRC, 'services/timeClockIntegrationService.js'), 'utf8');
    assert.ok(/safeFetch/.test(src));
  });

  await test('13 — restAdapter usa safeAxiosRequest', () => {
    const src = fs.readFileSync(path.join(SRC, 'services/plcAdapters/restAdapter.js'), 'utf8');
    assert.ok(/safeAxiosRequest/.test(src));
  });

  await test('14 — chat.js usa impetusUploadMiddleware', () => {
    const src = fs.readFileSync(path.join(SRC, 'routes/chat.js'), 'utf8');
    assert.ok(/createUploadMiddleware/.test(src));
    assert.ok(!/multer\(\{ storage, limits: \{ fileSize: 52428800 \} \}\)/.test(src));
  });

  await test('15 — manuals.js usa impetusUploadMiddleware', () => {
    const src = fs.readFileSync(path.join(SRC, 'routes/manuals.js'), 'utf8');
    assert.ok(/createUploadMiddleware/.test(src));
  });

  await test('16 — uploadAccessService delega ACL APPSEC', () => {
    const src = fs.readFileSync(path.join(SRC, 'services/uploadAccessService.js'), 'utf8');
    assert.ok(/uploadAclPolicy/.test(src));
  });

  await test('17 — documentação APPSEC_01.md existe', () => {
    assert.ok(fs.existsSync(path.join(ROOT, 'docs/APPSEC_01.md')));
  });

  await test('18 — OWASP compliance report gera schema', () => {
    const { generateOwaspComplianceReport } = fresh('../../securityApplication/owaspCompliance.js');
    const report = generateOwaspComplianceReport(ROOT);
    assert.strictEqual(report.schema_version, 'appsec_owasp_compliance_v1');
    assert.ok(Array.isArray(report.red_team_remediation));
    assert.ok(report.red_team_remediation.length >= 9);
  });

  await test('19 — SEC-01→SEC-21C não alterados (securityObservatory intacto)', () => {
    assert.ok(fs.existsSync(path.join(SRC, 'securityObservatory/index.js')));
    const src = fs.readFileSync(path.join(SRC, 'securityObservatory/index.js'), 'utf8');
    assert.ok(/getAuditPayload/.test(src));
  });

  await test('20 — endpoint audit /appsec-01 registado', () => {
    const src = fs.readFileSync(path.join(SRC, 'routes/audit.js'), 'utf8');
    assert.ok(/\/appsec-01/.test(src));
  });

  console.log(`\n  Resultado: ${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
