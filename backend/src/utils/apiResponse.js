'use strict';

/**
 * Respostas JSON padronizadas para APIs internas (ex.: admin structural).
 */
function sendSuccess(res, data = null, status = 200) {
  return res.status(status).json({ success: true, data });
}

function sendFail(res, error, status = 400, extras = null) {
  const msg = typeof error === 'string' ? error : error?.message || 'Erro';
  const body = { success: false, error: msg };
  if (extras && typeof extras === 'object') {
    for (const k of Object.keys(extras)) {
      if (k !== 'success' && k !== 'error') body[k] = extras[k];
    }
  }
  return res.status(status).json(body);
}

module.exports = { sendSuccess, sendFail };
