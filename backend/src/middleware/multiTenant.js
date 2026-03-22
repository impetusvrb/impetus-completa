const db = require('../db');

/**
 * Garante que a empresa do usuário existe e está ativa (coluna companies.active).
 */
async function requireCompanyActive(req, res, next) {
  try {
    const cid = req.user?.company_id;
    if (!cid) {
      return res.status(403).json({ ok: false, error: 'Empresa não vinculada ao usuário' });
    }
    const r = await db.query('SELECT id, active FROM companies WHERE id = $1', [cid]);
    if (!r.rows.length || r.rows[0].active !== true) {
      return res.status(403).json({ ok: false, error: 'Empresa inativa ou não encontrada' });
    }
    next();
  } catch (e) {
    next(e);
  }
}

module.exports = { requireCompanyActive };
