/**
 * RATE LIMIT POR USUÁRIO - Proteção contra abuso
 * Limite de requisições por usuário por janela.
 * Bloqueio automático em comportamento suspeito.
 */
const db = require('../db');

const WINDOW_MINUTES = 60;
const MAX_REQUESTS_PER_WINDOW = {
  ai_chat: 60,
  executive_query: 20,
  smart_summary: 10,
  default: 100
};

function getWindowKey(action) {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const h = String(now.getHours()).padStart(2, '0');
  return `${action}:${y}-${m}-${d}-${h}`;
}

async function checkUserRateLimit(userId, action = 'default') {
  try {
    const limit = MAX_REQUESTS_PER_WINDOW[action] ?? MAX_REQUESTS_PER_WINDOW.default;
    const windowKey = getWindowKey(action);

    const r = await db.query(`
      INSERT INTO user_rate_limits (user_id, window_key, request_count, window_start)
      VALUES ($1, $2, 1, now())
      ON CONFLICT (user_id, window_key)
      DO UPDATE SET request_count = user_rate_limits.request_count + 1
      RETURNING request_count
    `, [userId, windowKey]);

    const count = r.rows[0]?.request_count || 1;

    // Limpar janelas antigas (manutenção)
    await db.query(`
      DELETE FROM user_rate_limits
      WHERE window_start < now() - ($1 * interval '1 minute')
    `, [WINDOW_MINUTES * 2]);

    if (count > limit) {
      return { allowed: false, count, limit };
    }
    return { allowed: true, count, limit };
  } catch (err) {
    if (err.message?.includes('user_rate_limits')) {
      return { allowed: true, count: 0, limit: 999 };
    }
    console.error('[USER_RATE_LIMIT]', err);
    return { allowed: true };
  }
}

/**
 * Middleware de rate limit por usuário para rotas de IA
 */
function userRateLimit(action = 'ai_chat') {
  return async (req, res, next) => {
    const user = req.user;
    if (!user) {
      return next();
    }

    const result = await checkUserRateLimit(user.id, action);
    req.rateLimit = result;

    if (!result.allowed) {
      return res.status(429).json({
        ok: false,
        error: 'Muitas requisições. Aguarde alguns minutos antes de tentar novamente.',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: 300
      });
    }

    next();
  };
}

module.exports = { checkUserRateLimit, userRateLimit };
