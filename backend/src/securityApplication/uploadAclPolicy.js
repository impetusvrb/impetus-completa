'use strict';

/**
 * APPSEC-01 — Enterprise Upload ACL (deny-by-default)
 * Política central para userCanReadUpload.
 */

const path = require('path');
const db = require('../db');
const { resolveUploadFile } = require('../paths');

/** Prefixos relativos permitidos por tenant (deny-by-default fora desta lista + regras BD) */
const TENANT_SCOPED_PREFIXES = Object.freeze([
  'equipment-library/{companyId}/',
  'chat/',
  'chat-multimodal/',
  'registro-inteligente/',
  'cadastrar-ia/',
  'manuals/',
  'manuals-legacy-',
  'role-verification/',
  'avatars/',
  'company-policies/',
  'technical-library/'
]);

function normalizeRel(relativeFromUploads) {
  return String(relativeFromUploads || '').replace(/^\/+/, '');
}

function matchesTenantPrefix(rel, companyId) {
  for (const p of TENANT_SCOPED_PREFIXES) {
    const pattern = p.replace('{companyId}', companyId);
    if (rel.startsWith(pattern)) return true;
  }
  if (rel.startsWith(`equipment-library/${companyId}/`)) return true;
  return false;
}

async function lookupChatMessageAccess(user, cid, rel, base) {
  const r = await db.query(
    `SELECT 1 FROM chat_messages m
     INNER JOIN chat_conversations c ON c.id = m.conversation_id
     INNER JOIN chat_participants cp ON cp.conversation_id = c.id AND cp.user_id = $2
     WHERE c.company_id = $1 AND (m.file_url = $3 OR m.file_url LIKE $4 OR m.file_url LIKE $5)
     LIMIT 1`,
    [cid, user.id, `/uploads/${rel}`, `%/${base}`, `%${base}`]
  );
  return r.rows.length > 0;
}

async function lookupManualAccess(cid, rel, base) {
  const r = await db.query(
    `SELECT 1 FROM manuals WHERE company_id = $1 AND (file_url = $2 OR file_url LIKE $3) LIMIT 1`,
    [cid, `/uploads/${rel}`, `%${base}`]
  );
  return r.rows.length > 0;
}

async function lookupRoleVerification(cid, abs, base) {
  const r = await db.query(
    `SELECT 1 FROM role_verification_documents
     WHERE company_id = $1 AND (file_path = $2 OR file_name = $3 OR file_path LIKE $4)
     LIMIT 1`,
    [cid, abs, base, `%${base}`]
  );
  return r.rows.length > 0;
}

async function lookupIntelligentRegistration(cid, rel, base) {
  try {
    const r = await db.query(
      `SELECT 1 FROM intelligent_registration_files
       WHERE company_id = $1 AND (file_path = $2 OR file_path LIKE $3 OR file_name = $4)
       LIMIT 1`,
      [cid, `/uploads/${rel}`, `%${base}`, base]
    );
    return r.rows.length > 0;
  } catch {
    return false;
  }
}

async function lookupCadastrarIa(cid, rel, base) {
  try {
    const r = await db.query(
      `SELECT 1 FROM cadastro_ia_documents
       WHERE company_id = $1 AND (file_url = $2 OR file_url LIKE $3)
       LIMIT 1`,
      [cid, `/uploads/${rel}`, `%${base}`]
    );
    return r.rows.length > 0;
  } catch {
    return false;
  }
}

async function lookupAvatar(user, cid, rel, base) {
  const rSelf = await db.query(
    `SELECT 1 FROM users WHERE id = $1 AND company_id = $2 AND (
      foto_perfil LIKE $3 OR avatar_url LIKE $3 OR foto_perfil LIKE $4 OR avatar_url LIKE $4
    ) LIMIT 1`,
    [user.id, cid, `%${base}`, `/uploads/${rel}`]
  );
  if (rSelf.rows.length) return true;
  const rCo = await db.query(
    `SELECT 1 FROM users WHERE company_id = $1 AND active AND deleted_at IS NULL AND (
      foto_perfil = $2 OR avatar_url = $2 OR foto_perfil LIKE $3 OR avatar_url LIKE $3
    ) LIMIT 1`,
    [cid, `/uploads/${rel}`, `%/${base}`]
  );
  return rCo.rows.length > 0;
}

/**
 * ACL deny-by-default — substitui lógica dispersa em uploadAccessService.
 * @param {object} user
 * @param {string} relativeFromUploads
 */
async function userCanReadUploadStrict(user, relativeFromUploads) {
  if (!user || !user.company_id || !relativeFromUploads) return false;
  const cid = user.company_id;
  const rel = normalizeRel(relativeFromUploads);
  const abs = resolveUploadFile(rel);
  if (!abs) return false;
  const base = path.basename(abs);

  if (rel.startsWith(`equipment-library/${cid}/`)) return true;

  if (rel.startsWith('chat/') || rel.startsWith('chat-multimodal/')) {
    return lookupChatMessageAccess(user, cid, rel, base);
  }
  if (rel.startsWith('manuals/') || rel.startsWith('manuals-legacy-')) {
    return lookupManualAccess(cid, rel, base);
  }
  if (rel.startsWith('registro-inteligente/')) {
    return lookupIntelligentRegistration(cid, rel, base);
  }
  if (rel.startsWith('cadastrar-ia/')) {
    return lookupCadastrarIa(cid, rel, base);
  }
  if (rel.startsWith('role-verification/')) {
    return lookupRoleVerification(cid, abs, base);
  }
  if (rel.startsWith('avatars/') || rel.includes('avatar-')) {
    return lookupAvatar(user, cid, rel, base);
  }
  if (rel.startsWith('company-policies/') || rel.startsWith('technical-library/')) {
    try {
      const r = await db.query(
        `SELECT 1 FROM company_policy_documents
         WHERE company_id = $1 AND (file_path LIKE $2 OR file_path LIKE $3) LIMIT 1`,
        [cid, `%${base}`, `/uploads/${rel}`]
      );
      if (r.rows.length) return true;
    } catch (_) { /* table optional */ }
  }

  if (matchesTenantPrefix(rel, cid)) {
    return false;
  }

  return false;
}

module.exports = {
  TENANT_SCOPED_PREFIXES,
  userCanReadUploadStrict,
  normalizeRel
};
