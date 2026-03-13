/**
 * MIDDLEWARE DE LICENÇA
 * Bloqueia acesso às rotas core se licença inválida
 */

const { validateLicense } = require('../services/license');
const { ERRORS } = require('../constants/messages');

let cachedResult = null;
let lastCheck = 0;
const CACHE_MS = 5 * 60 * 1000; // 5 min entre verificações

async function requireValidLicense(req, res, next) {
  // Webhooks (Asaas, genérico) devem funcionar mesmo com licença em validação
  if (req.path.includes('webhook')) return next();

  if (Date.now() - lastCheck < CACHE_MS && cachedResult) {
    if (!cachedResult.valid) {
      return res.status(403).json({
        ok: false,
        error: ERRORS.LICENSE_INVALID,
        code: 'LICENSE_INVALID'
      });
    }
    return next();
  }
  const result = await validateLicense();
  lastCheck = Date.now();
  cachedResult = result;
  if (!result.valid) {
    return res.status(403).json({
      ok: false,
      error: ERRORS.LICENSE_INVALID,
      code: 'LICENSE_INVALID'
    });
  }
  req.license = result;
  next();
}

module.exports = { requireValidLicense };
