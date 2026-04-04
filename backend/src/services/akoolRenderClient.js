/**
 * Cliente opcional para enviar comandos de renderização ao Akool (ou API compatível).
 * Configure AKOOL_API_KEY + AKOOL_RENDER_URL (POST JSON). Sem credenciais, não envia rede.
 */

const axios = require('axios');

function isEnabled() {
  const key = String(process.env.AKOOL_API_KEY || '').trim();
  const url = String(process.env.AKOOL_RENDER_URL || '').trim();
  return !!(key && url);
}

/**
 * @param {object} renderCommand — tipicamente buildRenderCommand(...)
 */
async function sendRenderState(renderCommand) {
  if (!isEnabled()) {
    return { ok: false, skipped: true, reason: 'akool_not_configured' };
  }
  const url = process.env.AKOOL_RENDER_URL.trim();
  const key = process.env.AKOOL_API_KEY.trim();
  try {
    const { data, status } = await axios.post(
      url,
      { command: renderCommand },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`
        },
        timeout: 8000,
        validateStatus: () => true
      }
    );
    if (status < 200 || status >= 300) {
      return { ok: false, error: data?.error || `HTTP ${status}` };
    }
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: e.message || String(e) };
  }
}

module.exports = { isEnabled, sendRenderState };
