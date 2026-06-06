#!/usr/bin/env node
'use strict';

/**
 * FASE 46.6 — ping live Gemini (temporário, diagnóstico).
 * Uso: node scripts/gemini-live-ping.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const geminiService = require('../src/services/geminiService');
const { GoogleGenAI } = require('@google/genai');

const PROMPT = 'Responda apenas OK';
const MODEL = (process.env.GEMINI_MODEL || 'gemini-2.5-flash').trim();

function classifyError(err) {
  const msg = String(err?.message || err || '').toLowerCase();
  const code = String(err?.code || err?.status || err?.error?.code || '').toUpperCase();
  const reason = String(
    err?.error?.details?.[0]?.reason ||
      err?.details?.[0]?.reason ||
      err?.reason ||
      ''
  ).toUpperCase();

  if (
    reason === 'API_KEY_INVALID' ||
    code === 'API_KEY_INVALID' ||
    /api key not valid|invalid.?api.?key|invalid_argument.*api key/i.test(msg)
  ) {
    return 'INVALID_API_KEY';
  }
  if (/permission_denied|403|forbidden/i.test(msg) || code === 'PERMISSION_DENIED') {
    return 'PERMISSION_DENIED';
  }
  if (/quota|rate limit|429|resource_exhausted/i.test(msg) || code === 'RESOURCE_EXHAUSTED') {
    return 'QUOTA_EXCEEDED';
  }
  if (/model not found|not found.*model|404.*model/i.test(msg) || code === 'NOT_FOUND') {
    return 'MODEL_NOT_FOUND';
  }
  if (
    /econnrefused|etimedout|enotfound|network|fetch failed|socket/i.test(msg) ||
    code === 'ECONNREFUSED' ||
    code === 'ETIMEDOUT'
  ) {
    return 'NETWORK_ERROR';
  }
  return 'UNKNOWN';
}

function serializeError(err) {
  if (!err) return null;
  const out = {
    name: err.name,
    message: err.message,
    code: err.code,
    status: err.status,
    stack: err.stack
  };
  if (err.error) out.error = err.error;
  if (err.response) {
    out.response = {
      status: err.response.status,
      statusText: err.response.statusText,
      data: err.response.data
    };
  }
  try {
    out.raw_json = JSON.parse(JSON.stringify(err, Object.getOwnPropertyNames(err)));
  } catch (_e) {
    out.raw_string = String(err);
  }
  return out;
}

async function directSdkPing() {
  const apiKey = (process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey) {
    return {
      ok: false,
      path: 'direct_sdk',
      error: { message: 'No API key in env' },
      classification: 'INVALID_API_KEY'
    };
  }
  const client = new GoogleGenAI({ apiKey });
  const t0 = Date.now();
  try {
    const response = await client.models.generateContent({
      model: MODEL,
      contents: [{ role: 'user', parts: [{ text: PROMPT }] }]
    });
    const text = response?.text ?? null;
    return {
      ok: Boolean(text && String(text).trim()),
      path: 'direct_sdk',
      model: MODEL,
      latency_ms: Date.now() - t0,
      response_text: text,
      classification: text ? null : 'UNKNOWN'
    };
  } catch (err) {
    return {
      ok: false,
      path: 'direct_sdk',
      model: MODEL,
      latency_ms: Date.now() - t0,
      error: serializeError(err),
      classification: classifyError(err)
    };
  }
}

async function main() {
  const report = {
    generated_at: new Date().toISOString(),
    phase: '46.6',
    env: {
      GEMINI_API_KEY_set: Boolean(String(process.env.GEMINI_API_KEY || '').trim()),
      GOOGLE_API_KEY_set: Boolean(String(process.env.GOOGLE_API_KEY || '').trim()),
      GOOGLE_GENAI_USE_VERTEXAI: process.env.GOOGLE_GENAI_USE_VERTEXAI ?? null,
      GEMINI_MODEL: MODEL,
      geminiService_isAvailable: geminiService.isAvailable()
    },
    geminiService_generateText: null,
    direct_sdk: null
  };

  const t0 = Date.now();
  let serviceText = null;
  let serviceThrown = null;
  try {
    serviceText = await geminiService.generateText(PROMPT, { model: MODEL });
  } catch (err) {
    serviceThrown = serializeError(err);
  }

  report.geminiService_generateText = {
    prompt: PROMPT,
    model: MODEL,
    latency_ms: Date.now() - t0,
    returned: serviceText,
    ok: Boolean(serviceText && String(serviceText).trim()),
    thrown: serviceThrown
  };

  report.direct_sdk = await directSdkPing();

  report.classification =
    report.direct_sdk.classification ||
    (report.geminiService_generateText.ok ? null : 'UNKNOWN');

  console.log(JSON.stringify(report, null, 2));
  process.exit(report.direct_sdk.ok || report.geminiService_generateText.ok ? 0 : 1);
}

main().catch((err) => {
  console.error(JSON.stringify({ fatal: serializeError(err), classification: classifyError(err) }, null, 2));
  process.exit(1);
});
