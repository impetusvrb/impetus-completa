'use strict';

const axios = require('axios');

const DID_BASE = (process.env.D_ID_API_BASE || 'https://api.d-id.com').replace(/\/$/, '');

function authHeaders() {
  const raw = (process.env.D_ID_API_KEY || '').trim();
  if (!raw) {
    const err = new Error('D_ID_API_KEY não configurada');
    err.code = 'DID_NO_KEY';
    throw err;
  }
  const basic = Buffer.from(raw, 'utf8').toString('base64');
  return {
    Authorization: `Basic ${basic}`,
    'Content-Type': 'application/json'
  };
}

/**
 * Cria um talk (vídeo com avatar + TTS interno da D-ID).
 * @param {{ sourceUrl: string, text: string, provider?: object }} opts
 */
async function createTalk({ sourceUrl, text, provider }) {
  const headers = authHeaders();
  const input = String(text || '').trim();
  if (input.length < 3) {
    const err = new Error('Texto muito curto (mín. 3 caracteres para a D-ID)');
    err.code = 'DID_BAD_INPUT';
    throw err;
  }
  const body = {
    source_url: sourceUrl,
    script: {
      type: 'text',
      input: input.slice(0, 12000),
      ...(provider ? { provider } : {})
    }
  };
  const res = await axios.post(`${DID_BASE}/talks`, body, {
    headers,
    timeout: 120000,
    validateStatus: () => true
  });
  if (res.status !== 201) {
    const err = new Error(res.data?.description || res.data?.message || `D-ID HTTP ${res.status}`);
    err.response = { status: res.status, data: res.data };
    throw err;
  }
  return res.data;
}

async function getTalk(talkId) {
  const headers = authHeaders();
  const id = String(talkId || '').trim();
  if (!id) {
    const err = new Error('ID do talk obrigatório');
    err.code = 'DID_BAD_ID';
    throw err;
  }
  const res = await axios.get(`${DID_BASE}/talks/${encodeURIComponent(id)}`, {
    headers,
    timeout: 60000,
    validateStatus: () => true
  });
  if (res.status !== 200) {
    const err = new Error(res.data?.description || `D-ID HTTP ${res.status}`);
    err.response = { status: res.status, data: res.data };
    throw err;
  }
  return res.data;
}

module.exports = { createTalk, getTalk, DID_BASE };
