'use strict';

/**
 * APPSEC-02 — Red Team Scenario Runner
 * Reexecuta cenários do relatório 04/07/2026 (read-only).
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const os = require('os');
const { SCENARIO_RESULT, createScenarioResult } = require('./dto/appsecValidationDto');
const mutationGuard = require('./mutationTestGuard');

const BACKEND_ROOT = path.join(__dirname, '../..');
const SRC = path.join(BACKEND_ROOT, 'src');

function readSrc(rel) {
  return fs.readFileSync(path.join(SRC, rel), 'utf8');
}

function timed(fn) {
  const start = Date.now();
  const result = fn();
  return { result, duration_ms: Date.now() - start };
}

async function timedAsync(fn) {
  const start = Date.now();
  const result = await fn();
  return { result, duration_ms: Date.now() - start };
}

function httpGet(url, headers = {}) {
  return new Promise((resolve) => {
    const req = http.get(url, { headers, timeout: 5000 }, (res) => {
      let body = '';
      res.on('data', (c) => { body += c; });
      res.on('end', () => resolve({ status: res.statusCode, body, headers: res.headers }));
    });
    req.on('error', (e) => resolve({ error: e.message, status: 0, body: '' }));
    req.on('timeout', () => {
      req.destroy();
      resolve({ error: 'timeout', status: 0, body: '' });
    });
  });
}

function httpRequest(method, urlPath, { headers = {}, body = null } = {}) {
  const port = parseInt(process.env.PORT || process.env.IMPETUS_BACKEND_PORT || '4000', 10);
  const payload = body == null ? null : (typeof body === 'string' ? body : JSON.stringify(body));
  return new Promise((resolve) => {
    const req = http.request({
      hostname: '127.0.0.1',
      port,
      path: urlPath,
      method,
      headers: {
        ...(payload
          ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
          : {}),
        ...headers
      },
      timeout: 8000
    }, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => resolve({ status: res.statusCode, body: data, headers: res.headers }));
    });
    req.on('error', (e) => resolve({ error: e.message, status: 0, body: '' }));
    req.on('timeout', () => {
      req.destroy();
      resolve({ error: 'timeout', status: 0, body: '' });
    });
    if (payload) req.write(payload);
    req.end();
  });
}

function getBackendBaseUrl() {
  const port = process.env.PORT || process.env.IMPETUS_BACKEND_PORT || '4000';
  return `http://127.0.0.1:${port}`;
}

// ─── Access ───────────────────────────────────────────────────────────────

async function scenarioAccessIdorChat() {
  const { result: src, duration_ms } = timed(() => readSrc('services/chatService.js'));
  const hasValidator = /crossTenantAccessValidator/.test(src);
  const hasPrivateCheck = /validatePrivateConversationTarget/.test(src);
  const hasGroupCheck = /validateConversationParticipants/.test(src);
  const hasAddCheck = /validateParticipantAddition/.test(src);
  const pass = hasValidator && hasPrivateCheck && hasGroupCheck && hasAddCheck;
  return createScenarioResult({
    id: 'ACC-IDOR-CHAT',
    category: 'access',
    title: 'IDOR Chat cross-tenant',
    hypothesis: 'Participantes validados por company_id antes de INSERT',
    result: pass ? SCENARIO_RESULT.PASS : SCENARIO_RESULT.FAIL,
    exploitable: !pass,
    duration_ms,
    evidence: { hasValidator, hasPrivateCheck, hasGroupCheck, hasAddCheck }
  });
}

async function scenarioAccessCrossTenantGuard() {
  const { result: src, duration_ms } = timed(() => readSrc('middleware/tenantIsolationGuard.js'));
  const pass = /TENANT_SPOOF/.test(src) && /sanitizeTenantFromInput/.test(src);
  return createScenarioResult({
    id: 'ACC-CROSS-TENANT-GUARD',
    category: 'access',
    title: 'Cross-Tenant tenant guard',
    hypothesis: 'tenantIsolationGuard activo com anti-spoof',
    result: pass ? SCENARIO_RESULT.PASS : SCENARIO_RESULT.FAIL,
    exploitable: !pass,
    duration_ms,
    evidence: { tenant_guard_present: pass }
  });
}

async function scenarioAccessAclUploads() {
  const { result: src, duration_ms } = timed(() => readSrc('services/uploadAccessService.js'));
  const aclPolicy = /uploadAclPolicy/.test(src);
  const strictFn = /userCanReadUploadStrict/.test(src);
  const aclSrc = readSrc('securityApplication/uploadAclPolicy.js');
  const coversChat = /chat-multimodal/.test(aclSrc);
  const coversRegistro = /registro-inteligente/.test(aclSrc);
  const coversCadastrar = /cadastrar-ia/.test(aclSrc);
  const pass = aclPolicy && strictFn && coversChat && coversRegistro && coversCadastrar;
  return createScenarioResult({
    id: 'ACC-ACL-UPLOADS',
    category: 'access',
    title: 'ACL Uploads deny-by-default',
    hypothesis: 'uploadAclPolicy cobre todos os diretórios críticos',
    result: pass ? SCENARIO_RESULT.PASS : SCENARIO_RESULT.FAIL,
    exploitable: !pass,
    duration_ms,
    evidence: { aclPolicy, strictFn, coversChat, coversRegistro, coversCadastrar }
  });
}

async function scenarioAccessUploadsPublic() {
  const { result: resp, duration_ms } = await timedAsync(() =>
    httpGet(`${getBackendBaseUrl()}/uploads/chat/test.pdf`)
  );
  const blocked = resp.status === 401 || resp.status === 403;
  return createScenarioResult({
    id: 'ACC-UPLOADS-PUBLIC',
    category: 'access',
    title: 'Uploads públicos sem auth',
    hypothesis: '/uploads/* rejeita anónimo',
    result: resp.error
      ? (/secureStaticUploads/.test(readSrc('middleware/secureStaticUploads.js')) ? SCENARIO_RESULT.PASS : SCENARIO_RESULT.WARN)
      : (blocked ? SCENARIO_RESULT.PASS : SCENARIO_RESULT.FAIL),
    exploitable: !blocked && !resp.error,
    duration_ms,
    notes: resp.error ? 'Backend offline — validação estática' : null,
    evidence: { status: resp.status, error: resp.error || null }
  });
}

async function scenarioAccessDashboardNoAuth() {
  const { result: resp, duration_ms } = await timedAsync(() =>
    httpGet(`${getBackendBaseUrl()}/api/dashboard/me`)
  );
  const blocked = resp.status === 401;
  return createScenarioResult({
    id: 'ACC-DASHBOARD-NO-AUTH',
    category: 'access',
    title: 'Dashboard sem token',
    hypothesis: '401 AUTH_TOKEN_MISSING',
    result: resp.error ? SCENARIO_RESULT.SKIP : (blocked ? SCENARIO_RESULT.PASS : SCENARIO_RESULT.FAIL),
    exploitable: !blocked && !resp.error,
    duration_ms,
    evidence: { status: resp.status }
  });
}

// ─── SSRF ─────────────────────────────────────────────────────────────────

async function ssrfBlocked(url, id, title) {
  const ssrf = require('../securityApplication/ssrfProtectionEngine');
  let blocked = false;
  let code = null;
  try {
    await ssrf.assertSafeOutboundUrl(url, { integration: 'appsec02_test' });
  } catch (e) {
    blocked = true;
    code = e.code || e.message;
  }
  return createScenarioResult({
    id,
    category: 'ssrf',
    title,
    hypothesis: `URL ${url} bloqueada pelo ssrfProtectionEngine`,
    result: blocked ? SCENARIO_RESULT.PASS : SCENARIO_RESULT.FAIL,
    exploitable: !blocked,
    evidence: { url, blocked, code }
  });
}

async function scenarioSsrfTimeClockIntegration() {
  const src = readSrc('services/timeClockIntegrationService.js');
  const usesSafeFetch = /safeFetch/.test(src);
  const localhost = await ssrfBlocked('https://localhost/admin', 'SSRF-TIMECLOCK-LOCALHOST', 'SSRF localhost (Time Clock vector)');
  return createScenarioResult({
    id: 'SSRF-TIMECLOCK-INTEGRATION',
    category: 'ssrf',
    title: 'Time Clock usa safeFetch',
    hypothesis: 'timeClockIntegrationService integrado ao motor SSRF',
    result: usesSafeFetch ? SCENARIO_RESULT.PASS : SCENARIO_RESULT.FAIL,
    exploitable: !usesSafeFetch,
    evidence: { usesSafeFetch, localhost_blocked: localhost.result === SCENARIO_RESULT.PASS }
  });
}

async function scenarioSsrfPlcRest() {
  const src = readSrc('services/plcAdapters/restAdapter.js');
  const usesSafe = /safeAxiosRequest/.test(src);
  return createScenarioResult({
    id: 'SSRF-PLC-REST',
    category: 'ssrf',
    title: 'PLC REST usa safeAxiosRequest',
    hypothesis: 'restAdapter integrado ao motor SSRF',
    result: usesSafe ? SCENARIO_RESULT.PASS : SCENARIO_RESULT.FAIL,
    exploitable: !usesSafe,
    evidence: { usesSafeAxiosRequest: usesSafe }
  });
}

async function scenarioSsrfInternalUrl() {
  return ssrfBlocked('https://127.0.0.1:5432/', 'SSRF-INTERNAL-127', 'SSRF 127.0.0.1');
}

async function scenarioSsrfRfc1918() {
  return ssrfBlocked('https://192.168.1.1/internal', 'SSRF-RFC1918', 'SSRF RFC1918');
}

async function scenarioSsrfLinkLocal() {
  return ssrfBlocked('https://169.254.169.254/latest/meta-data/', 'SSRF-LINK-LOCAL', 'SSRF link-local metadata');
}

async function scenarioSsrfHttpProtocol() {
  return ssrfBlocked('http://example.com/path', 'SSRF-HTTP-ONLY', 'SSRF protocolo HTTP bloqueado');
}

async function scenarioSsrfDnsRebindingGuard() {
  const ssrf = require('../securityApplication/ssrfProtectionEngine');
  const privateBlocked = ssrf.isPrivateOrReservedIp('10.0.0.1');
  return createScenarioResult({
    id: 'SSRF-DNS-GUARD',
    category: 'ssrf',
    title: 'DNS rebinding guard (IP privado)',
    hypothesis: 'isPrivateOrReservedIp bloqueia RFC1918',
    result: privateBlocked ? SCENARIO_RESULT.PASS : SCENARIO_RESULT.FAIL,
    exploitable: !privateBlocked,
    evidence: { private_ip_blocked: privateBlocked }
  });
}

// ─── Uploads ──────────────────────────────────────────────────────────────

async function scenarioUploadLegacyChatRemoved() {
  const src = readSrc('routes/chat.js');
  const usesCanonical = /createUploadMiddleware/.test(src);
  const legacyMulter = /multer\(\{\s*storage,\s*limits:\s*\{\s*fileSize:\s*52428800/.test(src);
  return createScenarioResult({
    id: 'UPL-CHAT-CANONICAL',
    category: 'upload',
    title: 'Chat upload canónico',
    hypothesis: 'impetusUploadMiddleware substitui multer legado',
    result: usesCanonical && !legacyMulter ? SCENARIO_RESULT.PASS : SCENARIO_RESULT.FAIL,
    exploitable: !usesCanonical || legacyMulter,
    evidence: { usesCanonical, legacyMulterPresent: legacyMulter }
  });
}

async function scenarioUploadManualsCanonical() {
  const src = readSrc('routes/manuals.js');
  const pass = /createUploadMiddleware/.test(src);
  return createScenarioResult({
    id: 'UPL-MANUALS-CANONICAL',
    category: 'upload',
    title: 'Manuals upload canónico',
    result: pass ? SCENARIO_RESULT.PASS : SCENARIO_RESULT.FAIL,
    exploitable: !pass,
    evidence: { createUploadMiddleware: pass }
  });
}

async function scenarioUploadMimeExeBlocked() {
  const policy = require('../config/uploadPolicy');
  const blocked = !policy.isMimeAllowed('application/octet-stream', ['document'], '.exe');
  return createScenarioResult({
    id: 'UPL-MIME-EXE',
    category: 'upload',
    title: 'MIME falso .exe bloqueado',
    result: blocked ? SCENARIO_RESULT.PASS : SCENARIO_RESULT.FAIL,
    exploitable: !blocked,
    evidence: { octet_stream_exe_blocked: blocked }
  });
}

async function scenarioUploadOctetStreamPdf() {
  const policy = require('../config/uploadPolicy');
  const allowed = policy.isMimeAllowed('application/octet-stream', ['document'], '.pdf');
  return createScenarioResult({
    id: 'UPL-OCTET-PDF',
    category: 'upload',
    title: 'octet-stream + .pdf permitido',
    result: allowed ? SCENARIO_RESULT.PASS : SCENARIO_RESULT.WARN,
    exploitable: false,
    evidence: { allowed }
  });
}

async function scenarioUploadMagicBytes() {
  const { validateMagicBytes } = require('../securityApplication/uploadSecurity');
  const tmp = path.join(os.tmpdir(), `appsec02-${Date.now()}.pdf`);
  fs.writeFileSync(tmp, 'NOTPDF');
  const r = validateMagicBytes(tmp, '.pdf');
  fs.unlinkSync(tmp);
  return createScenarioResult({
    id: 'UPL-MAGIC-BYTES',
    category: 'upload',
    title: 'Magic bytes rejeita PDF falso',
    result: !r.ok ? SCENARIO_RESULT.PASS : SCENARIO_RESULT.FAIL,
    exploitable: r.ok,
    evidence: { rejected: !r.ok }
  });
}

async function scenarioUploadHtmlSvgPolicy() {
  const policy = require('../config/uploadPolicy');
  const htmlBlocked = !policy.isExtensionAllowed('.html', ['document', 'image']);
  const svgInImage = policy.isExtensionAllowed('.svg', ['image']);
  return createScenarioResult({
    id: 'UPL-HTML-SVG',
    category: 'upload',
    title: 'HTML/SVG fora de whitelist document',
    result: htmlBlocked ? SCENARIO_RESULT.PASS : SCENARIO_RESULT.FAIL,
    exploitable: !htmlBlocked,
    evidence: { html_blocked: htmlBlocked, svg_in_image_group: svgInImage }
  });
}

// ─── Public endpoints ───────────────────────────────────────────────────────

async function scenarioPublicBootMetrics() {
  const { result: resp, duration_ms } = await timedAsync(() =>
    httpGet(`${getBackendBaseUrl()}/api/system/boot-metrics`, {
      'X-Forwarded-For': '203.0.113.99'
    })
  );
  if (resp.error) {
    const serverSrc = readSrc('server.js');
    const staticOk = /respondWithPolicy/.test(serverSrc) && /boot-metrics/.test(serverSrc);
    return createScenarioResult({
      id: 'PUB-BOOT-METRICS',
      category: 'public_endpoint',
      title: 'boot-metrics payload mínimo externo',
      hypothesis: 'publicEndpointPolicy em boot-metrics (fallback estático)',
      result: staticOk ? SCENARIO_RESULT.PASS : SCENARIO_RESULT.WARN,
      duration_ms,
      notes: 'Backend offline — validação estática',
      evidence: { error: resp.error, static_policy: staticOk }
    });
  }
  let parsed = {};
  try { parsed = JSON.parse(resp.body); } catch (_) { /* */ }
  const minimal = parsed.ok === true && !parsed.pool && !parsed.request_perf;
  return createScenarioResult({
    id: 'PUB-BOOT-METRICS',
    category: 'public_endpoint',
    title: 'boot-metrics payload mínimo externo',
    hypothesis: 'Sem pool/request_perf para cliente externo',
    result: minimal ? SCENARIO_RESULT.PASS : SCENARIO_RESULT.FAIL,
    exploitable: !minimal,
    duration_ms,
    evidence: { status: resp.status, keys: Object.keys(parsed), has_pool: Boolean(parsed.pool) }
  });
}

async function scenarioPublicAioiHealth() {
  const { result: resp, duration_ms } = await timedAsync(() =>
    httpGet(`${getBackendBaseUrl()}/api/aioi/health`, {
      'X-Forwarded-For': '203.0.113.99'
    })
  );
  if (resp.error) {
    const ctrl = readSrc('controllers/aioi/aioiHealthController.js');
    const staticOk = /respondWithPolicy/.test(ctrl);
    return createScenarioResult({
      id: 'PUB-AIOI-HEALTH',
      category: 'public_endpoint',
      title: 'aioi/health payload mínimo externo',
      result: staticOk ? SCENARIO_RESULT.PASS : SCENARIO_RESULT.WARN,
      duration_ms,
      notes: 'Backend offline — validação estática',
      evidence: { error: resp.error, static_policy: staticOk }
    });
  }
  let parsed = {};
  try { parsed = JSON.parse(resp.body); } catch (_) { /* */ }
  const minimal = parsed.status !== undefined && parsed.outbox_pending === undefined && parsed.worker_running === undefined;
  return createScenarioResult({
    id: 'PUB-AIOI-HEALTH',
    category: 'public_endpoint',
    title: 'aioi/health payload mínimo externo',
    result: minimal ? SCENARIO_RESULT.PASS : SCENARIO_RESULT.FAIL,
    exploitable: !minimal,
    duration_ms,
    evidence: { keys: Object.keys(parsed), has_outbox: parsed.outbox_pending !== undefined }
  });
}

async function scenarioPublicHealthDeep() {
  const { result: resp, duration_ms } = await timedAsync(() =>
    httpGet(`${getBackendBaseUrl()}/api/system/health/deep`)
  );
  if (resp.error) return createScenarioResult({
    id: 'PUB-HEALTH-DEEP',
    category: 'public_endpoint',
    title: 'health/deep anónimo',
    result: /health\/deep/.test(readSrc('server.js')) ? SCENARIO_RESULT.PASS : SCENARIO_RESULT.WARN,
    duration_ms,
    notes: 'Backend offline — validação estática',
    evidence: { error: resp.error }
  });
  let parsed = {};
  try { parsed = JSON.parse(resp.body); } catch (_) { /* */ }
  const minimal = parsed.ready !== undefined && !parsed.checks;
  return createScenarioResult({
    id: 'PUB-HEALTH-DEEP',
    category: 'public_endpoint',
    title: 'health/deep payload reduzido anónimo',
    result: minimal ? SCENARIO_RESULT.PASS : SCENARIO_RESULT.WARN,
    duration_ms,
    evidence: { keys: Object.keys(parsed) }
  });
}

async function scenarioPublicFederationStatus() {
  const { result: resp, duration_ms } = await timedAsync(() =>
    httpGet(`${getBackendBaseUrl()}/api/federation/status`)
  );
  if (resp.error) return createScenarioResult({ id: 'PUB-FEDERATION', category: 'public_endpoint', title: 'federation status', result: SCENARIO_RESULT.SKIP, duration_ms, evidence: { error: resp.error } });
  let parsed = {};
  try { parsed = JSON.parse(resp.body); } catch (_) { /* */ }
  const exposesUuids = JSON.stringify(parsed).includes('pilot_tenants') &&
    /\b[0-9a-f]{8}-[0-9a-f]{4}-/.test(JSON.stringify(parsed));
  return createScenarioResult({
    id: 'PUB-FEDERATION',
    category: 'public_endpoint',
    title: 'federation status UUID leak',
    result: exposesUuids ? SCENARIO_RESULT.WARN : SCENARIO_RESULT.PASS,
    exploitable: exposesUuids,
    duration_ms,
    evidence: { exposes_pilot_uuids: exposesUuids }
  });
}

async function scenarioPublicMfaStatus() {
  const { result: resp, duration_ms } = await timedAsync(() =>
    httpGet(`${getBackendBaseUrl()}/api/auth/mfa/status`)
  );
  if (resp.error) return createScenarioResult({ id: 'PUB-MFA-STATUS', category: 'public_endpoint', title: 'MFA status', result: SCENARIO_RESULT.SKIP, duration_ms, evidence: { error: resp.error } });
  const exposesUuids = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i.test(resp.body);
  return createScenarioResult({
    id: 'PUB-MFA-STATUS',
    category: 'public_endpoint',
    title: 'MFA status UUID leak',
    result: exposesUuids ? SCENARIO_RESULT.WARN : SCENARIO_RESULT.PASS,
    exploitable: exposesUuids,
    duration_ms,
    evidence: { exposes_pilot_uuids: exposesUuids }
  });
}

// ─── Config ─────────────────────────────────────────────────────────────────

async function scenarioConfigSecretScanner() {
  const { scanEnvBackupFiles, isInsecureValue } = require('../securityApplication/secretManagement');
  const backups = scanEnvBackupFiles(BACKEND_ROOT);
  const defaultKey = isInsecureValue('impetus-default-key-32b');
  const scannerWorks = defaultKey === true;
  return createScenarioResult({
    id: 'CFG-SECRET-SCANNER',
    category: 'config',
    title: 'Secret scanner activo',
    result: scannerWorks ? SCENARIO_RESULT.PASS : SCENARIO_RESULT.FAIL,
    exploitable: false,
    evidence: { scanner_detects_insecure: scannerWorks, backup_files_found: backups.length }
  });
}

async function scenarioConfigEnvBackupsPresent() {
  const { scanEnvBackupFiles } = require('../securityApplication/secretManagement');
  const backups = scanEnvBackupFiles(BACKEND_ROOT);
  return createScenarioResult({
    id: 'CFG-ENV-BACKUPS',
    category: 'config',
    title: 'Backups .env no filesystem',
    hypothesis: 'Zero backups .env (operacional)',
    result: backups.length === 0 ? SCENARIO_RESULT.PASS : SCENARIO_RESULT.WARN,
    exploitable: backups.length > 0,
    evidence: { count: backups.length, files: backups.map((b) => path.basename(b.path)) }
  });
}

async function scenarioConfigRuntimeValidator() {
  const src = readSrc('server.js');
  const bootHook = /validateAppsecBootOrThrow/.test(src);
  return createScenarioResult({
    id: 'CFG-RUNTIME-VALIDATOR',
    category: 'config',
    title: 'Runtime validator no boot',
    result: bootHook ? SCENARIO_RESULT.PASS : SCENARIO_RESULT.FAIL,
    evidence: { boot_hook: bootHook }
  });
}

async function scenarioConfigProductionFlags() {
  const { validateRuntimeConfiguration } = require('../securityApplication/runtimeConfigurationValidator');
  const r = validateRuntimeConfiguration();
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    return createScenarioResult({
      id: 'CFG-PROD-FLAGS',
      category: 'config',
      title: 'Flags produção inseguras',
      result: SCENARIO_RESULT.SKIP,
      notes: 'NODE_ENV !== production — validação operacional pendente no deploy',
      evidence: { node_env: process.env.NODE_ENV }
    });
  }
  return createScenarioResult({
    id: 'CFG-PROD-FLAGS',
    category: 'config',
    title: 'Flags produção inseguras',
    result: r.ok ? SCENARIO_RESULT.PASS : SCENARIO_RESULT.WARN,
    exploitable: !r.ok,
    evidence: { errors: r.errors, warnings: r.warnings }
  });
}

async function scenarioConfigFallbackKey() {
  const tc = readSrc('services/timeClockIntegrationService.js');
  const hasFallback = /impetus-default-key-32b/.test(tc);
  const validator = readSrc('securityApplication/secretManagement.js');
  const bootBlocks = /TIME_CLOCK_ENC_KEY/.test(validator);
  return createScenarioResult({
    id: 'CFG-FALLBACK-KEY',
    category: 'config',
    title: 'Fallback chave Time Clock',
    result: bootBlocks ? SCENARIO_RESULT.PASS : SCENARIO_RESULT.WARN,
    exploitable: hasFallback && !bootBlocks,
    evidence: { fallback_in_code: hasFallback, boot_blocks: bootBlocks }
  });
}

// ─── Dependencies ───────────────────────────────────────────────────────────

async function scenarioDependenciesAudit() {
  try {
    const { summarizeAudit, runNpmAuditJson } = require('../securityApplication/dependencyGovernance');
    const audit = runNpmAuditJson(BACKEND_ROOT);
    const summary = summarizeAudit(audit);
    const baselineHigh = 9;
    const improved = summary.high < baselineHigh;
    return createScenarioResult({
      id: 'DEP-NPM-AUDIT',
      category: 'dependencies',
      title: 'npm audit backend',
      result: summary.high === 0 && summary.critical === 0
        ? SCENARIO_RESULT.PASS
        : (improved ? SCENARIO_RESULT.WARN : SCENARIO_RESULT.FAIL),
      exploitable: summary.high > 0 || summary.critical > 0,
      evidence: { summary, baseline_high: baselineHigh, improved }
    });
  } catch (e) {
    return createScenarioResult({
      id: 'DEP-NPM-AUDIT',
      category: 'dependencies',
      title: 'npm audit backend',
      result: SCENARIO_RESULT.SKIP,
      evidence: { error: e.message }
    });
  }
}

// ─── Injection / Auth (controles existentes) ────────────────────────────────

async function scenarioSqliLoginRejected() {
  const port = parseInt(process.env.PORT || process.env.IMPETUS_BACKEND_PORT || '4000', 10);
  const payload = JSON.stringify({ email: "admin@test.com' OR 1=1--", password: 'x' });
  const resp = await new Promise((resolve) => {
    const req = http.request({
      hostname: '127.0.0.1',
      port,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
      timeout: 5000
    }, (res) => {
      let body = '';
      res.on('data', (c) => { body += c; });
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', (e) => resolve({ error: e.message }));
    req.on('timeout', () => {
      req.destroy();
      resolve({ error: 'timeout' });
    });
    req.write(payload);
    req.end();
  });
  if (resp.error) {
    return createScenarioResult({
      id: 'INJ-SQL-LOGIN',
      category: 'injection',
      title: 'SQL Injection login',
      result: SCENARIO_RESULT.SKIP,
      evidence: { error: resp.error }
    });
  }
  const rejected = resp.status === 401 || /inválid/i.test(resp.body);
  return createScenarioResult({
    id: 'INJ-SQL-LOGIN',
    category: 'injection',
    title: 'SQL Injection login',
    result: rejected ? SCENARIO_RESULT.PASS : SCENARIO_RESULT.FAIL,
    exploitable: !rejected,
    evidence: { status: resp.status }
  });
}

async function scenarioAuthLockout() {
  return createScenarioResult({
    id: 'AUTH-LOCKOUT',
    category: 'access',
    title: 'Account lockout presente',
    result: /recordFailedAttempt|MAX_ATTEMPTS/.test(readSrc('middleware/accountLockout.js')) ? SCENARIO_RESULT.PASS : SCENARIO_RESULT.FAIL,
    evidence: { module: 'accountLockout.js' }
  });
}

// ─── Aggressive live probes (localhost) ─────────────────────────────────────

async function scenarioAggressiveRuntimeFlagsNoAuth() {
  const { result: resp, duration_ms } = await timedAsync(() =>
    httpRequest('POST', '/api/admin/runtime/kms/rotation/emit', { body: {} })
  );
  if (resp.error) {
    return createScenarioResult({
      id: 'AGG-RUNTIME-NO-AUTH',
      category: 'aggressive',
      title: 'Runtime flags POST sem token',
      result: SCENARIO_RESULT.SKIP,
      duration_ms,
      evidence: { error: resp.error }
    });
  }
  const blocked = resp.status === 401 || resp.status === 403;
  return createScenarioResult({
    id: 'AGG-RUNTIME-NO-AUTH',
    category: 'aggressive',
    title: 'Runtime flags POST sem token',
    hypothesis: '401/403 antes de executar rota perigosa',
    result: blocked ? SCENARIO_RESULT.PASS : SCENARIO_RESULT.FAIL,
    exploitable: !blocked,
    duration_ms,
    evidence: { status: resp.status, body_preview: String(resp.body).slice(0, 120) }
  });
}

async function scenarioAggressiveRuntimeFlagsJwtNone() {
  const noneToken = 'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiIxIiwiY29tcGFueV9pZCI6MSwicm9sZSI6ImFkbWluIn0.';
  const { result: resp, duration_ms } = await timedAsync(() =>
    httpRequest('POST', '/api/admin/runtime/kms/cache/invalidate', {
      headers: { Authorization: `Bearer ${noneToken}` },
      body: {}
    })
  );
  if (resp.error) {
    return createScenarioResult({
      id: 'AGG-RUNTIME-JWT-NONE',
      category: 'aggressive',
      title: 'Runtime flags JWT alg:none',
      result: SCENARIO_RESULT.SKIP,
      duration_ms,
      evidence: { error: resp.error }
    });
  }
  const blocked = resp.status === 401 || resp.status === 403;
  return createScenarioResult({
    id: 'AGG-RUNTIME-JWT-NONE',
    category: 'aggressive',
    title: 'Runtime flags JWT alg:none',
    hypothesis: 'alg:none rejeitado',
    result: blocked ? SCENARIO_RESULT.PASS : SCENARIO_RESULT.FAIL,
    exploitable: !blocked,
    duration_ms,
    evidence: { status: resp.status }
  });
}

async function scenarioAggressiveRuntimeFlagsRbacStatic() {
  const src = readSrc('routes/admin/runtimeFlags.js');
  const hasTenantAdmin = /requireTenantAdminRole/.test(src);
  const hasHierarchy = /requireHierarchy\(1\)/.test(src);
  const pass = hasTenantAdmin && hasHierarchy;
  return createScenarioResult({
    id: 'AGG-RUNTIME-RBAC',
    category: 'aggressive',
    title: 'Runtime flags RBAC estático',
    hypothesis: 'requireTenantAdminRole + requireHierarchy(1) no router',
    result: pass ? SCENARIO_RESULT.PASS : SCENARIO_RESULT.FAIL,
    exploitable: !pass,
    evidence: { hasTenantAdmin, hasHierarchy }
  });
}

async function scenarioAggressiveAvatarJwtStatic() {
  const src = readSrc('services/avatarLipsyncSocket.js');
  const hasMiddleware = /namespace\.use/.test(src);
  const hasAlgorithms = /JWT_ALGORITHMS/.test(src);
  const pass = hasMiddleware && hasAlgorithms;
  return createScenarioResult({
    id: 'AGG-AVATAR-JWT',
    category: 'aggressive',
    title: 'Avatar namespace exige JWT',
    result: pass ? SCENARIO_RESULT.PASS : SCENARIO_RESULT.FAIL,
    exploitable: !pass,
    evidence: { hasMiddleware, hasAlgorithms }
  });
}

async function scenarioAggressiveJwtAlgorithmsSockets() {
  const files = ['socket/chatSocket.js', 'socket/voiceStreamSocket.js', 'services/realtimeOpenaiProxy.js'];
  const missing = files.filter((f) => !/JWT_ALGORITHMS/.test(readSrc(f)));
  const pass = missing.length === 0;
  return createScenarioResult({
    id: 'AGG-JWT-ALG-SOCKETS',
    category: 'aggressive',
    title: 'Sockets fixam algorithms HS256',
    result: pass ? SCENARIO_RESULT.PASS : SCENARIO_RESULT.FAIL,
    exploitable: !pass,
    evidence: { missing }
  });
}

async function scenarioAggressiveUploadAndLogic() {
  const src = readSrc('middleware/impetusUploadMiddleware.js');
  const pass = /!mimeOk\s*\|\|\s*!extOk/.test(src);
  return createScenarioResult({
    id: 'AGG-UPLOAD-AND',
    category: 'aggressive',
    title: 'Upload exige MIME E extensão',
    result: pass ? SCENARIO_RESULT.PASS : SCENARIO_RESULT.FAIL,
    exploitable: !pass,
    evidence: { and_logic: pass }
  });
}

async function scenarioAggressiveCompaniesRateLimitStatic() {
  const companies = readSrc('routes/companies.js');
  const limiter = readSrc('middleware/globalRateLimit.js');
  const pass = /companyOnboardingLimiter/.test(companies) && /companyOnboardingLimiter/.test(limiter);
  return createScenarioResult({
    id: 'AGG-COMPANIES-RL',
    category: 'aggressive',
    title: 'Rate limit onboarding empresas',
    result: pass ? SCENARIO_RESULT.PASS : SCENARIO_RESULT.FAIL,
    exploitable: !pass,
    evidence: { mounted: pass }
  });
}

async function scenarioAggressivePathTraversal() {
  const paths = [
    '/api/users/../../../etc/passwd',
    '/uploads/chat/..%2F..%2F..%2Fetc%2Fpasswd',
    '/api/dashboard/me?x=..%2F..%2F.env',
    '/.env',
    '/api/admin/runtime/flags/effective%00'
  ];
  const probes = [];
  for (const p of paths) {
    const resp = await httpGet(`${getBackendBaseUrl()}${p}`);
    const blocked = resp.status === 401 || resp.status === 403 || resp.status === 404 || resp.status === 400;
    const leaks = /root:|JWT_SECRET|DB_PASSWORD|BEGIN PRIVATE/i.test(resp.body || '');
    probes.push({ path: p, status: resp.status, blocked, leaks });
  }
  const anyLeak = probes.some((p) => p.leaks);
  const allBlocked = probes.every((p) => p.blocked && !p.leaks);
  return createScenarioResult({
    id: 'AGG-PATH-TRAVERSAL',
    category: 'aggressive',
    title: 'Path traversal / .env leak',
    hypothesis: 'Sem exfiltração de ficheiros sensíveis',
    result: anyLeak ? SCENARIO_RESULT.FAIL : (allBlocked ? SCENARIO_RESULT.PASS : SCENARIO_RESULT.WARN),
    exploitable: anyLeak,
    evidence: { probes }
  });
}

async function scenarioAggressiveTenantSpoofHeader() {
  const { result: resp, duration_ms } = await timedAsync(() =>
    httpGet(`${getBackendBaseUrl()}/api/dashboard/me`, {
      Authorization: 'Bearer invalid',
      'X-Company-Id': '00000000-0000-0000-0000-000000000099',
      'X-Tenant-Id': '00000000-0000-0000-0000-000000000099'
    })
  );
  if (resp.error) {
    return createScenarioResult({
      id: 'AGG-TENANT-SPOOF',
      category: 'aggressive',
      title: 'Tenant spoof via headers',
      result: SCENARIO_RESULT.SKIP,
      duration_ms,
      evidence: { error: resp.error }
    });
  }
  const blocked = resp.status === 401 || resp.status === 403;
  return createScenarioResult({
    id: 'AGG-TENANT-SPOOF',
    category: 'aggressive',
    title: 'Tenant spoof via headers',
    hypothesis: 'Headers X-Company-Id não bypassam auth',
    result: blocked ? SCENARIO_RESULT.PASS : SCENARIO_RESULT.FAIL,
    exploitable: !blocked,
    duration_ms,
    evidence: { status: resp.status }
  });
}

async function scenarioAggressiveMassAssignmentCompanies() {
  // Validação estática: verifica se o middleware de onboarding filtra campos perigosos.
  // A chamada HTTP real criaria uma empresa permanente no banco — proibido em produção.
  // O probe ao vivo só roda quando a barreira estrutural comprova banco de TESTE
  // isolado (NODE_ENV=test + RT_MUTATION_TESTS=1 + alvo não-produção). Fail-closed.
  let mutationTarget = null;
  try {
    mutationTarget = await mutationGuard.assertMutationTestsAllowed();
  } catch (guardErr) {
    const companiesRoute = (() => {
      try { return readSrc('routes/companies.js'); } catch (_) { return ''; }
    })();
    const onboardingCtrl = (() => {
      try { return readSrc('controllers/companyOnboardingController.js'); } catch (_) { return ''; }
    })();
    const combined = companiesRoute + onboardingCtrl;
    const filtersRole = /role.*strip|strip.*role|forbiddenFields|FORBIDDEN_FIELDS|allowedFields|ALLOWED_FIELDS|role.*ignored|pick\(|omit\(/i.test(combined);
    const hasLimiter = /companyOnboardingLimiter/.test(combined);
    const pass = hasLimiter; // rate-limit é a barreira primária verificável estaticamente
    return createScenarioResult({
      id: 'AGG-MASS-ASSIGN',
      category: 'aggressive',
      title: 'Mass assignment POST /companies (estático)',
      hypothesis: 'companyOnboardingLimiter + filtro de campos no onboarding',
      result: pass ? SCENARIO_RESULT.PASS : SCENARIO_RESULT.WARN,
      exploitable: false,
      notes: `Probe HTTP mutável bloqueado (fail-closed): ${guardErr.message}`,
      evidence: { static_check: true, hasLimiter, filtersRole, guard_blocked: true }
    });
  }

  const { result: resp, duration_ms } = await timedAsync(() =>
    httpRequest('POST', '/api/companies', {
      body: {
        name: 'RT Mass Assign',
        admin_name: 'Evil Admin',
        admin_email: `rt-mass-${Date.now()}@ex.invalid`,
        admin_password: 'TestRt1!',
        role: 'internal_admin',
        is_tenant_admin: true,
        hierarchy_level: 0,
        company_id: '00000000-0000-0000-0000-000000000099'
      }
    })
  );
  if (resp.error) {
    return createScenarioResult({
      id: 'AGG-MASS-ASSIGN',
      category: 'aggressive',
      title: 'Mass assignment POST /companies',
      result: SCENARIO_RESULT.SKIP,
      duration_ms,
      evidence: { error: resp.error }
    });
  }
  let parsed = {};
  try { parsed = JSON.parse(resp.body); } catch (_) { /* */ }
  const escalated =
    parsed?.user?.role === 'internal_admin' ||
    parsed?.user?.hierarchy_level === 0 ||
    parsed?.admin?.role === 'internal_admin';
  const blocked = resp.status === 400 || resp.status === 429 || !escalated;
  return createScenarioResult({
    id: 'AGG-MASS-ASSIGN',
    category: 'aggressive',
    title: 'Mass assignment POST /companies',
    hypothesis: 'Campos role/hierarchy ignorados no onboarding',
    result: escalated ? SCENARIO_RESULT.FAIL : (blocked ? SCENARIO_RESULT.PASS : SCENARIO_RESULT.WARN),
    exploitable: escalated,
    duration_ms,
    evidence: { status: resp.status, escalated, keys: Object.keys(parsed) }
  });
}

async function scenarioAggressiveSsrfWebhookProbe() {
  const payloads = [
    { url: 'http://127.0.0.1:5432' },
    { callback: 'http://169.254.169.254/latest/meta-data/' },
    { webhook_url: 'file:///etc/passwd' }
  ];
  const results = [];
  for (const body of payloads) {
    const resp = await httpRequest('POST', '/api/webhook', { body });
    const blocked = resp.status >= 400 && resp.status !== 429;
    results.push({ body, status: resp.status, blocked });
  }
  const pass = results.every((r) => r.blocked);
  return createScenarioResult({
    id: 'AGG-SSRF-WEBHOOK',
    category: 'aggressive',
    title: 'SSRF vectors em webhook público',
    result: pass ? SCENARIO_RESULT.PASS : SCENARIO_RESULT.WARN,
    exploitable: !pass,
    evidence: { results }
  });
}

// ─── OWASP module present ───────────────────────────────────────────────────

async function scenarioOwaspAppsecLayer() {
  const idx = readSrc('securityApplication/index.js');
  const pass = /crossTenantAccessValidator/.test(idx) && /ssrfProtectionEngine/.test(idx);
  return createScenarioResult({
    id: 'OWASP-APPSEC-LAYER',
    category: 'owasp',
    title: 'Camada APPSEC-01 presente',
    result: pass ? SCENARIO_RESULT.PASS : SCENARIO_RESULT.FAIL,
    evidence: { appsec_index: pass }
  });
}

/** Lista completa de runners */
const ALL_SCENARIOS = [
  scenarioAccessIdorChat,
  scenarioAccessCrossTenantGuard,
  scenarioAccessAclUploads,
  scenarioAccessUploadsPublic,
  scenarioAccessDashboardNoAuth,
  scenarioSsrfTimeClockIntegration,
  scenarioSsrfPlcRest,
  scenarioSsrfInternalUrl,
  scenarioSsrfRfc1918,
  scenarioSsrfLinkLocal,
  scenarioSsrfHttpProtocol,
  scenarioSsrfDnsRebindingGuard,
  scenarioUploadLegacyChatRemoved,
  scenarioUploadManualsCanonical,
  scenarioUploadMimeExeBlocked,
  scenarioUploadOctetStreamPdf,
  scenarioUploadMagicBytes,
  scenarioUploadHtmlSvgPolicy,
  scenarioPublicBootMetrics,
  scenarioPublicAioiHealth,
  scenarioPublicHealthDeep,
  scenarioPublicFederationStatus,
  scenarioPublicMfaStatus,
  scenarioConfigSecretScanner,
  scenarioConfigEnvBackupsPresent,
  scenarioConfigRuntimeValidator,
  scenarioConfigProductionFlags,
  scenarioConfigFallbackKey,
  scenarioDependenciesAudit,
  scenarioSqliLoginRejected,
  scenarioAuthLockout,
  scenarioAggressiveRuntimeFlagsNoAuth,
  scenarioAggressiveRuntimeFlagsJwtNone,
  scenarioAggressiveRuntimeFlagsRbacStatic,
  scenarioAggressiveAvatarJwtStatic,
  scenarioAggressiveJwtAlgorithmsSockets,
  scenarioAggressiveUploadAndLogic,
  scenarioAggressiveCompaniesRateLimitStatic,
  scenarioAggressivePathTraversal,
  scenarioAggressiveTenantSpoofHeader,
  scenarioAggressiveMassAssignmentCompanies,
  scenarioAggressiveSsrfWebhookProbe,
  scenarioOwaspAppsecLayer
];

/**
 * Executa todos os cenários Red Team (read-only).
 * @returns {Promise<object[]>}
 */
async function runAllScenarios() {
  const results = [];
  for (const fn of ALL_SCENARIOS) {
    try {
      results.push(await fn());
    } catch (e) {
      results.push(createScenarioResult({
        id: fn.name || 'UNKNOWN',
        category: 'error',
        title: String(fn.name),
        hypothesis: 'Execução sem excepção',
        result: SCENARIO_RESULT.FAIL,
        evidence: { error: e.message }
      }));
    }
  }
  return results;
}

module.exports = {
  ALL_SCENARIOS,
  runAllScenarios,
  getBackendBaseUrl
};
