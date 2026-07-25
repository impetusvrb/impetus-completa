'use strict';

/**
 * APPSEC-01 — Enterprise SSRF Protection Engine
 * Motor central para fetch/axios a URLs configuráveis por utilizador ou integração.
 */

const dns = require('dns').promises;
const net = require('net');
const { URL } = require('url');
const flags = require('./config/appsecFlags');

const AUDIT_EVENT = 'APPSEC_SSRF_VALIDATION';
const DEFAULT_TIMEOUT_MS = parseInt(process.env.IMPETUS_APPSEC_SSRF_TIMEOUT_MS || '8000', 10);
const MAX_REDIRECTS = 0;

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'localhost.localdomain',
  'metadata.google.internal',
  'metadata',
  '0.0.0.0'
]);

function auditSsrf(outcome, meta) {
  try {
    console.info(`[${AUDIT_EVENT}]`, JSON.stringify({ outcome, at: new Date().toISOString(), ...meta }));
  } catch (_) { /* never break */ }
}

function isPrivateOrReservedIp(ip) {
  if (!ip) return true;
  const kind = net.isIP(ip);
  if (kind === 4) {
    const parts = ip.split('.').map(Number);
    const [a, b] = parts;
    if (a === 127) return true;
    if (a === 10) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 169 && b === 254) return true;
    if (a === 0) return true;
    if (a >= 224) return true;
    return false;
  }
  if (kind === 6) {
    const n = ip.toLowerCase();
    if (n === '::1' || n === '::') return true;
    if (n.startsWith('fc') || n.startsWith('fd')) return true;
    if (n.startsWith('fe80')) return true;
    if (n.startsWith('::ffff:127.')) return true;
    if (n.startsWith('::ffff:10.')) return true;
    if (n.startsWith('::ffff:192.168.')) return true;
    if (n.startsWith('::ffff:169.254.')) return true;
    if (n.startsWith('::ffff:172.')) {
      const m = n.match(/^::ffff:172\.(\d+)\./);
      if (m && Number(m[1]) >= 16 && Number(m[1]) <= 31) return true;
    }
    return false;
  }
  return true;
}

/**
 * @param {string} rawUrl
 * @returns {{ ok: true, url: URL } | { ok: false, error: string }}
 */
function validateUrlSyntax(rawUrl) {
  let parsed;
  try {
    parsed = new URL(String(rawUrl || '').trim());
  } catch {
    return { ok: false, error: 'URL inválida' };
  }
  if (parsed.protocol !== 'https:') {
    return { ok: false, error: 'Apenas HTTPS é permitido para integrações externas' };
  }
  if (parsed.username || parsed.password) {
    return { ok: false, error: 'Credenciais embebidas na URL não são permitidas' };
  }
  const host = (parsed.hostname || '').toLowerCase();
  if (!host) return { ok: false, error: 'Host ausente na URL' };
  if (BLOCKED_HOSTNAMES.has(host)) {
    return { ok: false, error: 'Host bloqueado por política SSRF' };
  }
  if (host.endsWith('.local') || host.endsWith('.internal')) {
    return { ok: false, error: 'Host interno bloqueado por política SSRF' };
  }
  return { ok: true, url: parsed };
}

/**
 * Resolve DNS e valida todos os IPs (anti DNS rebinding).
 * @param {string} hostname
 */
async function assertResolvedIpsSafe(hostname) {
  if (net.isIP(hostname)) {
    if (isPrivateOrReservedIp(hostname)) {
      return { ok: false, error: 'IP privado ou reservado bloqueado' };
    }
    return { ok: true, addresses: [hostname] };
  }
  let records;
  try {
    records = await dns.lookup(hostname, { all: true, verbatim: true });
  } catch (e) {
    return { ok: false, error: `Falha na resolução DNS: ${e.message}` };
  }
  if (!records?.length) {
    return { ok: false, error: 'Host sem endereço DNS' };
  }
  for (const r of records) {
    if (isPrivateOrReservedIp(r.address)) {
      return { ok: false, error: `IP bloqueado (${r.address}) para host ${hostname}` };
    }
  }
  return { ok: true, addresses: records.map((r) => r.address) };
}

/**
 * @param {string} rawUrl
 * @param {{ integration?: string, companyId?: string }} [ctx]
 */
async function assertSafeOutboundUrl(rawUrl, ctx = {}) {
  if (!flags.isSsrfEngineEnabled()) {
    return { ok: true, url: new URL(String(rawUrl)) };
  }
  const syntax = validateUrlSyntax(rawUrl);
  if (!syntax.ok) {
    auditSsrf('DENY_SYNTAX', { ...ctx, url: rawUrl, error: syntax.error });
    const err = new Error(syntax.error);
    err.status = 400;
    err.code = 'SSRF_URL_DENIED';
    throw err;
  }
  const dnsCheck = await assertResolvedIpsSafe(syntax.url.hostname);
  if (!dnsCheck.ok) {
    auditSsrf('DENY_DNS', { ...ctx, url: rawUrl, error: dnsCheck.error });
    const err = new Error(dnsCheck.error);
    err.status = 400;
    err.code = 'SSRF_DNS_DENIED';
    throw err;
  }
  auditSsrf('ALLOW', { ...ctx, url: rawUrl, addresses: dnsCheck.addresses });
  return { ok: true, url: syntax.url, addresses: dnsCheck.addresses };
}

/**
 * fetch seguro com timeout e sem redirects.
 * @param {string} rawUrl
 * @param {RequestInit} [init]
 * @param {{ integration?: string, companyId?: string }} [ctx]
 */
async function safeFetch(rawUrl, init = {}, ctx = {}) {
  await assertSafeOutboundUrl(rawUrl, ctx);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), init.timeout || DEFAULT_TIMEOUT_MS);
  try {
    const res = await fetch(rawUrl, {
      ...init,
      signal: controller.signal,
      redirect: 'error'
    });
    return res;
  } catch (e) {
    if (e.name === 'AbortError') {
      const err = new Error('Timeout na ligação externa');
      err.status = 504;
      err.code = 'SSRF_TIMEOUT';
      throw err;
    }
    if (String(e.message || '').includes('redirect')) {
      const err = new Error('Redireccionamentos não permitidos');
      err.status = 400;
      err.code = 'SSRF_REDIRECT_DENIED';
      throw err;
    }
    throw e;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * axios request seguro.
 * @param {import('axios').AxiosStatic} axios
 * @param {import('axios').AxiosRequestConfig} config
 * @param {{ integration?: string, companyId?: string }} [ctx]
 */
async function safeAxiosRequest(axios, config, ctx = {}) {
  const url = config?.url;
  if (!url) throw new Error('URL obrigatória');
  await assertSafeOutboundUrl(url, ctx);
  return axios.request({
    ...config,
    maxRedirects: MAX_REDIRECTS,
    timeout: config.timeout || DEFAULT_TIMEOUT_MS,
    validateStatus: config.validateStatus
  });
}

module.exports = {
  AUDIT_EVENT,
  DEFAULT_TIMEOUT_MS,
  validateUrlSyntax,
  assertResolvedIpsSafe,
  assertSafeOutboundUrl,
  safeFetch,
  safeAxiosRequest,
  isPrivateOrReservedIp
};
