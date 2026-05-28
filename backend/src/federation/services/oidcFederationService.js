'use strict';

const crypto = require('crypto');
const { Issuer, generators } = require('openid-client');
const db = require('../../db');
const flags = require('../config/federationFlags');
const gov = require('../governance/federationGovernanceService');
const configSvc = require('./federationConfigService');
const sessionBridge = require('./federationSessionBridge');
const tracing = require('../observability/federationLoginTracing');
const { getPublicAppBaseUrl } = require('../../utils/publicAppUrl');

const _issuerCache = new Map();

async function _getClient(provider) {
  const issuerUrl = provider.issuer_url;
  if (!issuerUrl || !provider.client_id) throw new Error('OIDC_PROVIDER_INCOMPLETE');

  let issuer = _issuerCache.get(issuerUrl);
  if (!issuer) {
    issuer = await Issuer.discover(issuerUrl);
    _issuerCache.set(issuerUrl, issuer);
  }

  const secret = configSvc.resolveClientSecret(provider);
  const redirectUri = provider.redirect_uri_override
    || `${flags.federationBaseUrl()}/api/federation/oidc/callback`;

  return new issuer.Client({
    client_id: provider.client_id,
    client_secret: secret || undefined,
    redirect_uris: [redirectUri],
    response_types: ['code'],
  });
}

async function _saveAuthState({ state, companyId, providerId, nonce, codeVerifier }) {
  const expires = new Date(Date.now() + 15 * 60 * 1000);
  await db.query(
    `INSERT INTO federation_auth_states
     (state_token, company_id, provider_id, protocol, nonce, code_verifier, expires_at)
     VALUES ($1, $2::uuid, $3::uuid, 'oidc', $4, $5, $6)`,
    [state, companyId, providerId, nonce, codeVerifier, expires]
  );
}

async function _consumeAuthState(state) {
  const r = await db.query(
    `DELETE FROM federation_auth_states
     WHERE state_token = $1 AND expires_at > now()
     RETURNING *`,
    [state]
  );
  return r.rows[0] || null;
}

async function startOidcLogin(companyId, providerId, req = {}) {
  if (!flags.isOidcEnabled()) return { ok: false, code: 'OIDC_DISABLED' };
  if (!gov.isActiveForTenant(companyId)) return { ok: false, code: 'TENANT_NOT_IN_PILOT' };

  const provider = providerId
    ? await configSvc.getProviderById(providerId, companyId)
    : await configSvc.getPrimaryProvider(companyId, 'oidc');

  if (!provider) return { ok: false, code: 'PROVIDER_NOT_FOUND' };

  const effectiveMode = configSvc.getEffectiveProviderMode(provider);
  const trace = await tracing.startTrace({
    company_id: companyId,
    provider_id: provider.id,
  });
  trace.protocol = 'oidc';

  await tracing.recordEvent(trace, 'oidc_login_start', 'ok', {
    protocol: 'oidc',
    mode: effectiveMode,
    ip: req.ip,
    user_agent: req.headers?.['user-agent'],
  });

  const client = await _getClient(provider);
  const codeVerifier = generators.codeVerifier();
  const codeChallenge = generators.codeChallenge(codeVerifier);
  const state = generators.state();
  const nonce = generators.nonce();

  await _saveAuthState({
    state,
    companyId,
    providerId: provider.id,
    nonce,
    codeVerifier,
  });

  const redirectUri = provider.redirect_uri_override
    || `${flags.federationBaseUrl()}/api/federation/oidc/callback`;

  const url = client.authorizationUrl({
    scope: provider.scopes || 'openid profile email',
    state,
    nonce,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    redirect_uri: redirectUri,
  });

  return { ok: true, redirect_url: url, trace_id: trace.trace_id, mode: effectiveMode };
}

async function handleOidcCallback(query = {}, req = {}) {
  const { code, state, error, error_description: errorDesc } = query;
  const trace = await tracing.startTrace({ trace_id: query.trace_id });

  if (error) {
    await tracing.recordEvent(trace, 'oidc_callback_error', 'error', { error, errorDesc });
    return { ok: false, code: 'OIDC_IDP_ERROR', error, error_description: errorDesc };
  }

  if (!code || !state) {
    return { ok: false, code: 'OIDC_INVALID_CALLBACK' };
  }

  const authState = await _consumeAuthState(state);
  if (!authState) {
    await tracing.recordEvent(trace, 'oidc_state_invalid', 'error', { protocol: 'oidc' });
    return { ok: false, code: 'OIDC_STATE_EXPIRED' };
  }

  trace.company_id = authState.company_id;
  trace.provider_id = authState.provider_id;

  const provider = await configSvc.getProviderById(authState.provider_id, authState.company_id);
  if (!provider) return { ok: false, code: 'PROVIDER_NOT_FOUND' };

  const effectiveMode = configSvc.getEffectiveProviderMode(provider);
  trace.protocol = 'oidc';

  try {
    const client = await _getClient(provider);
    const redirectUri = provider.redirect_uri_override
      || `${flags.federationBaseUrl()}/api/federation/oidc/callback`;

    const tokenSet = await client.callback(
      redirectUri,
      { code, state },
      { state, nonce: authState.nonce, code_verifier: authState.code_verifier }
    );

    const claims = tokenSet.claims();
    const externalSubject = claims.sub;
    const externalEmail = claims.email || claims.preferred_username || null;

    await tracing.recordEvent(trace, 'oidc_token_validated', 'ok', {
      protocol: 'oidc',
      mode: effectiveMode,
      sub_hash: crypto.createHash('sha256').update(String(externalSubject)).digest('hex').slice(0, 16),
      ip: req.ip,
    });

    const user = await sessionBridge.resolveUserByFederationLink(
      authState.company_id,
      provider.id,
      externalSubject,
      externalEmail
    );

    if (!user) {
      await tracing.recordEvent(trace, 'oidc_user_not_linked', 'blocked', {
        protocol: 'oidc',
        mode: effectiveMode,
      });
      await tracing.emitAudit('federation_oidc_user_not_linked', {
        company_id: authState.company_id,
        provider_id: provider.id,
        mode: effectiveMode,
      });
      return {
        ok: false,
        code: 'FEDERATION_USER_NOT_LINKED',
        mode: effectiveMode,
        redirect_url: `${getPublicAppBaseUrl()}/login?federation=unlinked`,
      };
    }

    if (gov.isShadowOnly(effectiveMode)) {
      await tracing.recordEvent(trace, 'oidc_shadow_complete', 'shadow', {
        protocol: 'oidc',
        user_id: user.id,
        mode: effectiveMode,
      });
      return {
        ok: true,
        shadow: true,
        mode: effectiveMode,
        message: 'OIDC validado em modo shadow — sessão não emitida',
        redirect_url: `${getPublicAppBaseUrl()}/login?federation=shadow_ok`,
      };
    }

    if (!gov.canIssueSession(effectiveMode)) {
      await tracing.recordEvent(trace, 'oidc_audit_complete', 'audit', {
        protocol: 'oidc',
        user_id: user.id,
        mode: effectiveMode,
      });
      await tracing.emitAudit('federation_oidc_audit_login', {
        company_id: authState.company_id,
        provider_id: provider.id,
        user_id: user.id,
        mode: effectiveMode,
      });
      return {
        ok: true,
        audit: true,
        mode: effectiveMode,
        redirect_url: `${getPublicAppBaseUrl()}/login?federation=audit_ok`,
      };
    }

    const session = await sessionBridge.issueSessionForUser(user, {
      federation: true,
      provider_id: provider.id,
    });

    await db.query(
      `UPDATE federation_identity_links SET last_login_at = now()
       WHERE company_id = $1::uuid AND provider_id = $2::uuid AND user_id = $3::uuid`,
      [authState.company_id, provider.id, user.id]
    );

    await tracing.recordEvent(trace, 'oidc_session_issued', 'ok', {
      protocol: 'oidc',
      user_id: user.id,
      mode: effectiveMode,
    });

    return {
      ok: true,
      mode: effectiveMode,
      session,
      redirect_url: `${getPublicAppBaseUrl()}/login?federation=token#token=${encodeURIComponent(session.token)}`,
    };
  } catch (err) {
    await tracing.recordEvent(trace, 'oidc_callback_exception', 'error', {
      protocol: 'oidc',
      error: err?.message,
    });
    return { ok: false, code: 'OIDC_CALLBACK_FAILED', error: err?.message };
  }
}

module.exports = {
  startOidcLogin,
  handleOidcCallback,
};
