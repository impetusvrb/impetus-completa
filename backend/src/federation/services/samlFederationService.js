'use strict';

const crypto = require('crypto');
const { SAML } = require('@node-saml/node-saml');
const db = require('../../db');
const flags = require('../config/federationFlags');
const gov = require('../governance/federationGovernanceService');
const configSvc = require('./federationConfigService');
const sessionBridge = require('./federationSessionBridge');
const tracing = require('../observability/federationLoginTracing');
const { getPublicAppBaseUrl } = require('../../utils/publicAppUrl');

function _buildSamlOptions(provider) {
  const base = flags.federationBaseUrl();
  const acs = provider.acs_url_override || `${base}/api/federation/saml/acs`;
  const entityId = provider.sp_entity_id || `${base}/api/federation/saml/metadata/${provider.company_id}`;

  return {
    callbackUrl: acs,
    issuer: entityId,
    entryPoint: provider.idp_sso_url,
    idpCert: provider.idp_certificate_pem,
    identifierFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
    wantAssertionsSigned: true,
    wantAuthnResponseSigned: false,
  };
}

async function _saveSamlState(stateToken, companyId, providerId, relayState) {
  const expires = new Date(Date.now() + 15 * 60 * 1000);
  await db.query(
    `INSERT INTO federation_auth_states
     (state_token, company_id, provider_id, protocol, relay_state, expires_at)
     VALUES ($1, $2::uuid, $3::uuid, 'saml', $4, $5)`,
    [stateToken, companyId, providerId, relayState || null, expires]
  );
}

async function startSamlLogin(companyId, providerId, req = {}) {
  if (!flags.isSamlEnabled()) return { ok: false, code: 'SAML_DISABLED' };
  if (!gov.isActiveForTenant(companyId)) return { ok: false, code: 'TENANT_NOT_IN_PILOT' };

  const provider = providerId
    ? await configSvc.getProviderById(providerId, companyId)
    : await configSvc.getPrimaryProvider(companyId, 'saml');

  if (!provider?.idp_sso_url || !provider?.idp_certificate_pem) {
    return { ok: false, code: 'SAML_PROVIDER_INCOMPLETE' };
  }

  const effectiveMode = configSvc.getEffectiveProviderMode(provider);
  const trace = await tracing.startTrace({
    company_id: companyId,
    provider_id: provider.id,
  });
  trace.protocol = 'saml';

  await tracing.recordEvent(trace, 'saml_login_start', 'ok', {
    protocol: 'saml',
    mode: effectiveMode,
    ip: req.ip,
  });

  const saml = new SAML(_buildSamlOptions(provider));
  const relayState = crypto.randomBytes(16).toString('hex');

  await _saveSamlState(relayState, companyId, provider.id, relayState);

  const url = await saml.getAuthorizeUrlAsync(relayState, flags.federationBaseUrl(), {});

  return {
    ok: true,
    redirect_url: url,
    trace_id: trace.trace_id,
    mode: effectiveMode,
  };
}

async function handleSamlAcs(body = {}, req = {}) {
  const trace = await tracing.startTrace({});
  trace.protocol = 'saml';

  const samlResponse = body.SAMLResponse;
  if (!samlResponse) {
    return { ok: false, code: 'SAML_RESPONSE_MISSING' };
  }

  const relayState = body.RelayState;
  let authState = null;
  if (relayState) {
    const r = await db.query(
      `SELECT * FROM federation_auth_states WHERE relay_state = $1 AND expires_at > now() LIMIT 1`,
      [relayState]
    );
    authState = r.rows[0] || null;
  }

  if (!authState) {
    await tracing.recordEvent(trace, 'saml_state_missing', 'error', { protocol: 'saml' });
    return { ok: false, code: 'SAML_STATE_INVALID' };
  }

  trace.company_id = authState.company_id;
  trace.provider_id = authState.provider_id;

  const provider = await configSvc.getProviderById(authState.provider_id, authState.company_id);
  if (!provider) return { ok: false, code: 'PROVIDER_NOT_FOUND' };

  const effectiveMode = configSvc.getEffectiveProviderMode(provider);
  const saml = new SAML(_buildSamlOptions(provider));

  try {
    const { profile } = await saml.validatePostResponseAsync(body);

    const mapping = typeof provider.attribute_mapping === 'object'
      ? provider.attribute_mapping
      : {};
    const emailAttr = mapping.email || 'email';
    const subAttr = mapping.subject || 'nameID';

    const externalEmail = profile[emailAttr] || profile.email || profile.nameID;
    const externalSubject = profile[subAttr] || profile.nameID || externalEmail;

    await tracing.recordEvent(trace, 'saml_assertion_validated', 'ok', {
      protocol: 'saml',
      mode: effectiveMode,
      ip: req.ip,
    });

    const user = await sessionBridge.resolveUserByFederationLink(
      authState.company_id,
      provider.id,
      String(externalSubject),
      externalEmail ? String(externalEmail) : null
    );

    if (!user) {
      await tracing.recordEvent(trace, 'saml_user_not_linked', 'blocked', { mode: effectiveMode });
      return {
        ok: false,
        code: 'FEDERATION_USER_NOT_LINKED',
        redirect_url: `${getPublicAppBaseUrl()}/login?federation=unlinked`,
      };
    }

    if (gov.isShadowOnly(effectiveMode)) {
      await tracing.recordEvent(trace, 'saml_shadow_complete', 'shadow', { user_id: user.id });
      return {
        ok: true,
        shadow: true,
        redirect_url: `${getPublicAppBaseUrl()}/login?federation=shadow_ok`,
      };
    }

    if (!gov.canIssueSession(effectiveMode)) {
      await tracing.emitAudit('federation_saml_audit_login', {
        company_id: authState.company_id,
        user_id: user.id,
        mode: effectiveMode,
      });
      return {
        ok: true,
        audit: true,
        redirect_url: `${getPublicAppBaseUrl()}/login?federation=audit_ok`,
      };
    }

    const session = await sessionBridge.issueSessionForUser(user, {
      federation: true,
      provider_id: provider.id,
    });

    await tracing.recordEvent(trace, 'saml_session_issued', 'ok', { user_id: user.id });

    return {
      ok: true,
      session,
      redirect_url: `${getPublicAppBaseUrl()}/login?federation=token#token=${encodeURIComponent(session.token)}`,
    };
  } catch (err) {
    await tracing.recordEvent(trace, 'saml_acs_exception', 'error', { error: err?.message });
    return { ok: false, code: 'SAML_ACS_FAILED', error: err?.message };
  }
}

function getSpMetadata(companyId, provider) {
  const base = flags.federationBaseUrl();
  const entityId = provider?.sp_entity_id || `${base}/api/federation/saml/metadata/${companyId}`;
  const acs = provider?.acs_url_override || `${base}/api/federation/saml/acs`;
  return `<?xml version="1.0"?>
<EntityDescriptor xmlns="urn:oasis:names:tc:SAML:2.0:metadata" entityID="${entityId}">
  <SPSSODescriptor AuthnRequestsSigned="false" WantAssertionsSigned="true"
    protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <AssertionConsumerService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
      Location="${acs}" index="0" isDefault="true"/>
  </SPSSODescriptor>
</EntityDescriptor>`;
}

module.exports = {
  startSamlLogin,
  handleSamlAcs,
  getSpMetadata,
};
