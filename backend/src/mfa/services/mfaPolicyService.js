'use strict';

const db = require('../../db');
const gov = require('../governance/mfaGovernanceService');

async function getPolicy(companyId) {
  const r = await db.query(
    'SELECT * FROM tenant_mfa_policies WHERE company_id = $1::uuid',
    [companyId]
  );
  if (r.rows[0]) return r.rows[0];

  return {
    company_id: companyId,
    enabled: true,
    mode: 'shadow',
    enforcement_level: 'recommended',
    require_totp: true,
    allow_webauthn: true,
    allow_backup_codes: true,
    device_trust_days: 14,
    grace_period_days: 14,
    min_hierarchy_level: null,
    _default: true,
  };
}

async function upsertPolicy(companyId, patch = {}) {
  const existing = await getPolicy(companyId);
  if (existing._default) {
    const ins = await db.query(
      `INSERT INTO tenant_mfa_policies
       (company_id, enabled, mode, enforcement_level, require_totp, allow_webauthn,
        allow_backup_codes, device_trust_days, grace_period_days, min_hierarchy_level)
       VALUES ($1::uuid,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [
        companyId,
        patch.enabled !== false,
        patch.mode || 'shadow',
        patch.enforcement_level || 'recommended',
        patch.require_totp !== false,
        patch.allow_webauthn !== false,
        patch.allow_backup_codes !== false,
        patch.device_trust_days || 14,
        patch.grace_period_days || 14,
        patch.min_hierarchy_level ?? null,
      ]
    );
    return ins.rows[0];
  }

  await db.query(
    `UPDATE tenant_mfa_policies SET
       enabled = COALESCE($3, enabled),
       mode = COALESCE($4, mode),
       enforcement_level = COALESCE($5, enforcement_level),
       require_totp = COALESCE($6, require_totp),
       allow_webauthn = COALESCE($7, allow_webauthn),
       allow_backup_codes = COALESCE($8, allow_backup_codes),
       device_trust_days = COALESCE($9, device_trust_days),
       grace_period_days = COALESCE($10, grace_period_days),
       min_hierarchy_level = COALESCE($11, min_hierarchy_level),
       updated_at = now()
     WHERE company_id = $1::uuid`,
    [
      companyId,
      null,
      patch.enabled,
      patch.mode,
      patch.enforcement_level,
      patch.require_totp,
      patch.allow_webauthn,
      patch.allow_backup_codes,
      patch.device_trust_days,
      patch.grace_period_days,
      patch.min_hierarchy_level,
    ]
  );
  return getPolicy(companyId);
}

async function userRequiresMfa(user, policy, enrollment) {
  if (!gov.isActiveForTenant(user.company_id)) {
    return { required: false, reason: 'tenant_not_pilot' };
  }
  if (!policy.enabled) return { required: false, reason: 'policy_disabled' };

  const effectiveMode = gov.getEffectiveMode(policy.mode);
  if (effectiveMode === 'off' || effectiveMode === 'shadow') {
    return { required: false, reason: `mode_${effectiveMode}`, effectiveMode };
  }

  const level = policy.enforcement_level || 'recommended';
  if (level === 'optional') {
    return { required: false, reason: 'optional', effectiveMode };
  }

  const isEnrolled = !!(enrollment?.totp_enabled || enrollment?.webauthn_enabled);
  if (!isEnrolled) {
    if (level === 'required_all' || level === 'required_admin') {
      const grace = policy.grace_period_days || 14;
      return {
        required: false,
        reason: 'grace_not_enrolled',
        effectiveMode,
        enroll_recommended: true,
        grace_period_days: grace,
      };
    }
    return { required: false, reason: 'not_enrolled', effectiveMode };
  }

  if (level === 'required_admin') {
    const isAdmin = user.is_tenant_admin === true || ['admin', 'ceo'].includes(String(user.role || '').toLowerCase());
    if (!isAdmin) return { required: false, reason: 'not_admin_scope', effectiveMode };
  }

  return { required: true, reason: 'policy_match', effectiveMode, level };
}

module.exports = {
  getPolicy,
  upsertPolicy,
  userRequiresMfa,
};
