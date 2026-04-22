/**
 * Controlo de acesso a ficheiros em /uploads (multi-tenant).
 */
const path = require('path');
const db = require('../db');
const { resolveUploadFile } = require('../paths');

/**
 * @param {object} user — req.user com id, company_id
 * @param {string} relativeFromUploads — ex.: chat/abc.pdf (sem prefixo uploads/)
 * @returns {Promise<boolean>}
 */
async function userCanReadUpload(user, relativeFromUploads) {
  if (!user || !user.company_id || !relativeFromUploads) return false;
  const cid = user.company_id;
  const rel = relativeFromUploads.replace(/^\/+/, '');
  const abs = resolveUploadFile(rel);
  if (!abs) return false;
  const base = path.basename(abs);

  if (rel.startsWith(`equipment-library/${cid}/`)) return true;

  try {
    const r1 = await db.query(
      `SELECT 1 FROM role_verification_documents
       WHERE company_id = $1 AND (file_path = $2 OR file_name = $3 OR file_path LIKE $4)
       LIMIT 1`,
      [cid, abs, base, `%${base}`]
    );
    if (r1.rows.length) return true;
  } catch {
    /* tabela/coluna em falta */
  }

  try {
    const r2 = await db.query(
      `SELECT 1 FROM chat_messages m
       INNER JOIN chat_conversations c ON c.id = m.conversation_id
       INNER JOIN chat_participants cp ON cp.conversation_id = c.id AND cp.user_id = $2
       WHERE c.company_id = $1 AND (m.file_url = $3 OR m.file_url LIKE $4 OR m.file_url LIKE $5)
       LIMIT 1`,
      [cid, user.id, `/uploads/${rel}`, `%/${base}`, `%${base}`]
    );
    if (r2.rows.length) return true;
  } catch {
    /* schema chat opcional */
  }

  try {
    const r3 = await db.query(
      `SELECT 1 FROM manuals WHERE company_id = $1 AND (file_url = $2 OR file_url LIKE $3) LIMIT 1`,
      [cid, `/uploads/${rel}`, `%${base}`]
    );
    if (r3.rows.length) return true;
  } catch {
    /* */
  }

  try {
    const r4 = await db.query(
      `SELECT 1 FROM users WHERE id = $1 AND company_id = $2 AND (
        foto_perfil LIKE $3 OR avatar_url LIKE $3 OR foto_perfil LIKE $4 OR avatar_url LIKE $4
      ) LIMIT 1`,
      [user.id, cid, `%${base}`, `/uploads/${rel}`]
    );
    if (r4.rows.length) return true;
  } catch {
    /* */
  }

  try {
    const r5 = await db.query(
      `SELECT 1 FROM users WHERE company_id = $1 AND active AND deleted_at IS NULL AND (
        foto_perfil = $2 OR avatar_url = $2 OR foto_perfil LIKE $3 OR avatar_url LIKE $3
      ) LIMIT 1`,
      [cid, `/uploads/${rel}`, `%/${base}`]
    );
    if (r5.rows.length) return true;
  } catch {
    /* */
  }

  return false;
}

module.exports = {
  userCanReadUpload
};
