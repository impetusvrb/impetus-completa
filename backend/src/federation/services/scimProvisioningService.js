'use strict';

const crypto = require('crypto');
const bcrypt = require('bcrypt');
const db = require('../../db');
const flags = require('../config/federationFlags');
const gov = require('../governance/federationGovernanceService');
const tracing = require('../observability/federationLoginTracing');

function hashScimToken(raw) {
  return crypto.createHash('sha256').update(String(raw)).digest('hex');
}

async function validateScimBearer(authorizationHeader) {
  if (!flags.isScimEnabled() || !flags.isFederationEnabled()) {
    return { ok: false, code: 'SCIM_DISABLED' };
  }
  const raw = String(authorizationHeader || '');
  const m = raw.match(/^Bearer\s+(.+)$/i);
  if (!m) return { ok: false, code: 'SCIM_AUTH_REQUIRED' };

  const tokenHash = hashScimToken(m[1]);
  const r = await db.query(
    `SELECT id, company_id, scopes, active
     FROM scim_provisioning_tokens
     WHERE token_hash = $1 AND active = true
       AND (expires_at IS NULL OR expires_at > now())`,
    [tokenHash]
  );
  const row = r.rows[0];
  if (!row) return { ok: false, code: 'SCIM_TOKEN_INVALID' };
  if (!gov.isActiveForTenant(row.company_id)) return { ok: false, code: 'TENANT_NOT_IN_PILOT' };

  return { ok: true, company_id: row.company_id, token_id: row.id, scopes: row.scopes || ['Users'] };
}

async function auditScim(companyId, operation, outcome, meta = {}) {
  try {
    await db.query(
      `INSERT INTO scim_provisioning_audit
       (company_id, operation, resource_type, external_id, user_id, outcome, metadata)
       VALUES ($1::uuid,$2,'User',$3,$4::uuid,$5,$6::jsonb)`,
      [
        companyId,
        operation,
        meta.external_id || null,
        meta.user_id || null,
        outcome,
        JSON.stringify(meta),
      ]
    );
    await tracing.emitAudit(`scim_${operation}`, { company_id: companyId, outcome, ...meta });
  } catch (err) {
    console.warn('[SCIM_AUDIT]', err?.message);
  }
}

function scimUserResource(user, externalId) {
  return {
    schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
    id: externalId || user.id,
    externalId: externalId || user.id,
    userName: user.email,
    active: user.active !== false,
    name: { formatted: user.name || user.email },
    emails: [{ value: user.email, primary: true }],
    meta: {
      resourceType: 'User',
      location: `/api/federation/scim/v2/Users/${externalId || user.id}`,
    },
  };
}

async function listUsers(companyId, { startIndex = 1, count = 100 } = {}) {
  const offset = Math.max(0, startIndex - 1);
  const limit = Math.min(200, Math.max(1, count));
  const r = await db.query(
    `SELECT u.id, u.email, u.name, u.active, fil.external_subject
     FROM users u
     LEFT JOIN federation_identity_links fil ON fil.user_id = u.id AND fil.company_id = u.company_id
     WHERE u.company_id = $1::uuid AND u.deleted_at IS NULL
     ORDER BY u.created_at DESC
     OFFSET $2 LIMIT $3`,
    [companyId, offset, limit]
  );
  const total = await db.query(
    `SELECT COUNT(*)::int AS cnt FROM users WHERE company_id = $1::uuid AND deleted_at IS NULL`,
    [companyId]
  );
  const resources = r.rows.map((row) =>
    scimUserResource(row, row.external_subject || row.id)
  );
  return {
    schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
    totalResults: total.rows[0]?.cnt || 0,
    startIndex,
    itemsPerPage: limit,
    Resources: resources,
  };
}

async function getUser(companyId, resourceId) {
  const r = await db.query(
    `SELECT u.id, u.email, u.name, u.active, fil.external_subject
     FROM users u
     LEFT JOIN federation_identity_links fil ON fil.user_id = u.id AND fil.company_id = u.company_id
     WHERE u.company_id = $1::uuid
       AND (u.id::text = $2 OR fil.external_subject = $2)
       AND u.deleted_at IS NULL
     LIMIT 1`,
    [companyId, resourceId]
  );
  if (!r.rows[0]) return null;
  return scimUserResource(r.rows[0], r.rows[0].external_subject || r.rows[0].id);
}

async function createUser(companyId, body = {}, mode = 'shadow') {
  const userName = body.userName || body.emails?.[0]?.value;
  const externalId = body.externalId || body.id || crypto.randomUUID();
  const name = body.name?.formatted || body.displayName || userName;
  const active = body.active !== false;

  if (!userName) throw new Error('SCIM_USER_NAME_REQUIRED');

  const existing = await db.query(
    `SELECT id FROM users WHERE company_id = $1::uuid AND lower(trim(email)) = lower(trim($2))`,
    [companyId, userName]
  );

  if (existing.rows[0]) {
    await auditScim(companyId, 'create', 'exists', { external_id: externalId, user_id: existing.rows[0].id });
    const user = await getUser(companyId, existing.rows[0].id);
    return { user, status: 200 };
  }

  if (gov.isShadowOnly(mode) || mode === 'audit') {
    await auditScim(companyId, 'create', mode === 'shadow' ? 'shadow' : 'audit', {
      external_id: externalId,
      email: userName,
    });
    return {
      user: scimUserResource({ id: externalId, email: userName, name, active }, externalId),
      status: mode === 'shadow' ? 202 : 201,
      shadow: mode === 'shadow',
      audit: mode === 'audit',
    };
  }

  const tempPassword = crypto.randomBytes(24).toString('base64url');
  const passwordHash = await bcrypt.hash(tempPassword, 10);

  const ins = await db.query(
    `INSERT INTO users (company_id, email, name, password_hash, role, active, is_first_access)
     VALUES ($1::uuid, lower(trim($2)), $3, $4, 'colaborador', $5, true)
     RETURNING id, email, name, active`,
    [companyId, userName, name || userName, passwordHash, active]
  );
  const user = ins.rows[0];

  await db.query(
    `INSERT INTO federation_identity_links (company_id, provider_id, user_id, external_subject, external_email)
     SELECT $1::uuid, p.id, $2::uuid, $3, $4
     FROM tenant_federation_providers p
     WHERE p.company_id = $1::uuid AND p.enabled = true
     ORDER BY p.updated_at DESC LIMIT 1
     ON CONFLICT DO NOTHING`,
    [companyId, user.id, externalId, userName]
  ).catch(() => {});

  await auditScim(companyId, 'create', 'ok', { external_id: externalId, user_id: user.id });
  return { user: scimUserResource(user, externalId), status: 201 };
}

async function patchUser(companyId, resourceId, body = {}, mode = 'shadow') {
  const user = await getUser(companyId, resourceId);
  if (!user) return null;

  const active = body.active;
  if (active === undefined) return { user, status: 200 };

  if (gov.isShadowOnly(mode) || mode === 'audit') {
    await auditScim(companyId, 'patch', mode, { external_id: resourceId, active });
    return { user: { ...user, active }, status: 200, shadow: mode === 'shadow' };
  }

  await db.query(
    `UPDATE users SET active = $3, updated_at = now()
     WHERE company_id = $1::uuid
       AND (
         id::text = $2
         OR id IN (
           SELECT user_id FROM federation_identity_links
           WHERE company_id = $1::uuid AND external_subject = $2
         )
       )`,
    [companyId, resourceId, active === true || active === 'true']
  );

  await auditScim(companyId, 'patch', 'ok', { external_id: resourceId, active });
  return { user: await getUser(companyId, resourceId), status: 200 };
}

async function deactivateUser(companyId, resourceId, mode = 'shadow') {
  return patchUser(companyId, resourceId, { active: false }, mode);
}

async function generateScimToken(companyId, label = 'SCIM provisioning') {
  const raw = `scim_${crypto.randomBytes(32).toString('hex')}`;
  const tokenHash = hashScimToken(raw);
  await db.query(
    `INSERT INTO scim_provisioning_tokens (company_id, token_hash, label)
     VALUES ($1::uuid, $2, $3)`,
    [companyId, tokenHash, label]
  );
  return { token: raw, token_preview: `${raw.slice(0, 12)}…` };
}

module.exports = {
  validateScimBearer,
  listUsers,
  getUser,
  createUser,
  patchUser,
  deactivateUser,
  generateScimToken,
  auditScim,
  scimUserResource,
};
