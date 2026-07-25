'use strict';

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { IMPETUS_ADMIN_JWT_SECRET } = require('../middleware/adminPortalAuth');

const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const CHALLENGE_TTL_SEC = 300;

function turnstileConfigured() {
  const site = (process.env.ADMIN_PORTAL_TURNSTILE_SITE_KEY || '').trim();
  const secret = (process.env.ADMIN_PORTAL_TURNSTILE_SECRET_KEY || '').trim();
  return !!(site && secret);
}

function botModePreference() {
  const raw = (process.env.ADMIN_PORTAL_BOT_MODE || 'auto').trim().toLowerCase();
  if (raw === 'challenge' || raw === 'turnstile' || raw === 'auto') return raw;
  return 'auto';
}

function useTurnstileForLogin() {
  if (botModePreference() === 'challenge') return false;
  if (botModePreference() === 'turnstile') return turnstileConfigured();
  return turnstileConfigured();
}

function humanCheckEnabled() {
  const raw = process.env.ADMIN_PORTAL_HUMAN_CHECK_ENABLED;
  if (raw == null || raw === '') return true;
  return /^(1|true|yes|on)$/i.test(String(raw).trim());
}

function getPublicConfig() {
  if (useTurnstileForLogin()) {
    return {
      mode: 'turnstile',
      siteKey: process.env.ADMIN_PORTAL_TURNSTILE_SITE_KEY.trim(),
      humanCheckEnabled: humanCheckEnabled()
    };
  }
  return {
    mode: 'challenge',
    siteKey: null,
    humanCheckEnabled: humanCheckEnabled()
  };
}

function issueHumanChallenge() {
  const a = crypto.randomInt(2, 10);
  const b = crypto.randomInt(2, 10);
  const challengeToken = jwt.sign(
    { typ: 'admin_human_check', a, b },
    IMPETUS_ADMIN_JWT_SECRET,
    { expiresIn: CHALLENGE_TTL_SEC, issuer: 'impetus-admin-portal' }
  );
  return {
    mode: 'challenge',
    challengeToken,
    question: `Quanto é ${a} + ${b}?`,
    expiresInSec: CHALLENGE_TTL_SEC
  };
}

function verifyHumanChallenge(challengeToken, answerRaw) {
  if (!humanCheckEnabled()) return { ok: true, mode: 'disabled' };
  if (!challengeToken) {
    return { ok: false, code: 'HUMAN_CHECK_REQUIRED', error: 'Confirme que não é um robô.' };
  }
  let decoded;
  try {
    decoded = jwt.verify(challengeToken, IMPETUS_ADMIN_JWT_SECRET, {
      issuer: 'impetus-admin-portal'
    });
  } catch {
    return { ok: false, code: 'HUMAN_CHECK_EXPIRED', error: 'Verificação expirada. Recarregue a página.' };
  }
  if (decoded.typ !== 'admin_human_check') {
    return { ok: false, code: 'HUMAN_CHECK_INVALID', error: 'Verificação inválida.' };
  }
  const answer = Number.parseInt(String(answerRaw ?? '').trim(), 10);
  if (!Number.isFinite(answer) || answer !== decoded.a + decoded.b) {
    return { ok: false, code: 'HUMAN_CHECK_FAILED', error: 'Resposta incorreta. Tente novamente.' };
  }
  return { ok: true, mode: 'challenge' };
}

async function verifyTurnstile(token, remoteIp) {
  const secret = (process.env.ADMIN_PORTAL_TURNSTILE_SECRET_KEY || '').trim();
  if (!secret) {
    return { ok: false, code: 'TURNSTILE_MISCONFIGURED', error: 'Captcha não configurado no servidor.' };
  }
  if (!token) {
    return { ok: false, code: 'TURNSTILE_REQUIRED', error: 'Complete a verificação anti-robô.' };
  }
  try {
    const body = new URLSearchParams({
      secret,
      response: token,
      remoteip: remoteIp || ''
    });
    const res = await fetch(TURNSTILE_VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
      signal: AbortSignal.timeout(8000)
    });
    const data = await res.json().catch(() => ({}));
    if (data.success) return { ok: true, mode: 'turnstile' };
    return {
      ok: false,
      code: 'TURNSTILE_FAILED',
      error: 'Verificação anti-robô falhou. Tente novamente.'
    };
  } catch (e) {
    console.error('[adminPortalBotGuard] turnstile', e.message);
    return { ok: false, code: 'TURNSTILE_UNAVAILABLE', error: 'Captcha indisponível. Tente em instantes.' };
  }
}

function verifyHoneypot(honeypot) {
  if (honeypot != null && String(honeypot).trim() !== '') {
    return { ok: false, code: 'BOT_DETECTED', error: 'Pedido rejeitado.' };
  }
  return { ok: true };
}

async function verifyLoginBotGuard(req, body) {
  const honeypot = verifyHoneypot(body?._hp);
  if (!honeypot.ok) return honeypot;

  if (!humanCheckEnabled()) return { ok: true, mode: 'disabled' };

  if (useTurnstileForLogin()) {
    return verifyTurnstile(body?.turnstileToken, req.ip);
  }

  return verifyHumanChallenge(body?.challengeToken, body?.challengeAnswer);
}

module.exports = {
  getPublicConfig,
  issueHumanChallenge,
  verifyLoginBotGuard,
  turnstileConfigured,
  useTurnstileForLogin,
  humanCheckEnabled
};
