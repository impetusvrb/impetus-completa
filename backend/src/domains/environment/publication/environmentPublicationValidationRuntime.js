'use strict';

const { environmentPublicationRuntime } = require('./environmentPublicationRuntime');
const enterpriseAudience = require('../../../runtime-validation/enterpriseAudienceValidationRuntime');
const enterpriseUx = require('../../../runtime-validation/enterpriseContextualUxValidator');
const multiDomain = require('../../../enterprise-shadow-stabilization/multiDomainPublicationValidator');

function environmentPublicationValidationRuntime(ctx = {}) {
  const user = ctx.user || { company_id: ctx.tenant_id, role: ctx.role || 'coordenador' };
  const pub = environmentPublicationRuntime(user, ctx);
  const audience = enterpriseAudience.validateAudienceMatrix(ctx.audience_samples || []);
  const ux = enterpriseUx.validateContextualUx(ctx.ux_input || { domain: 'environment', band: pub.audience_band });
  const multi = multiDomain.validateMultiDomainPublication();

  const issues = [];
  if (!pub.shadow_only && pub.activation_stage === 'shadow') {
    issues.push({ code: 'shadow_stage_mismatch' });
  }
  if (pub.auto_promotion) {
    issues.push({ code: 'auto_promotion_forbidden' });
  }
  if (!multi.pipeline_order.includes('environment')) {
    issues.push({ code: 'environment_missing_from_pipeline' });
  }

  return {
    ok: issues.length === 0 && pub.ok !== false,
    domain: 'environment',
    publication: pub,
    audience_validation: audience,
    contextual_ux: ux,
    multi_domain: multi,
    issues,
    bounded: true,
    shadow_only: true
  };
}

module.exports = { environmentPublicationValidationRuntime };
