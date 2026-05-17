'use strict';

function truthy(v) {
  return String(v || '').toLowerCase() === 'true' || v === '1';
}

function isNavigationEnabled() {
  return truthy(process.env.IMPETUS_LOGISTICS_NAVIGATION_RUNTIME_ENABLED);
}

function isPublicationEnabled() {
  return truthy(process.env.IMPETUS_LOGISTICS_PUBLICATION_RUNTIME_ENABLED);
}

function isOperationalEnabled() {
  return truthy(process.env.IMPETUS_LOGISTICS_OPERATIONAL_RUNTIME_ENABLED);
}

function isShadowPublication() {
  return truthy(process.env.IMPETUS_LOGISTICS_PUBLICATION_SHADOW_MODE);
}

function isAudiencePreview() {
  return truthy(process.env.IMPETUS_LOGISTICS_PUBLICATION_AUDIENCE_PREVIEW);
}

module.exports = {
  isNavigationEnabled,
  isPublicationEnabled,
  isOperationalEnabled,
  isShadowPublication,
  isAudiencePreview,
  snapshot() {
    return {
      navigation: isNavigationEnabled(),
      publication: isPublicationEnabled(),
      operational: isOperationalEnabled(),
      rollout_shadow: isShadowPublication(),
      audience_preview: isAudiencePreview()
    };
  }
};
