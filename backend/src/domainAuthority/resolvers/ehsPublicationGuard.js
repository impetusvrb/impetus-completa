'use strict';

const catalog = require('../../config/functionalAreaCatalog');
const domainFlags = require('../config/domainFeatureFlags');
const { logPhaseD } = require('../observability/phaseDLogger');

const BLOCK_ENV_PUBLICATION_AXES = new Set(['safety', 'environmental_health_safety', 'ehs_shared']);
const BLOCK_ENV_PUBLICATION_AREA_IDS = new Set(['safety', 'environmental_health_safety']);

function resolvePublicationAxis(user) {
  if (!user) return null;
  const explicit = user.functional_axis || user.functional_area || user.company_role_dashboard_hint;
  if (explicit) {
    const id = catalog.isKnownId(catalog.normKey(explicit)) ?
      catalog.normKey(explicit) :
      catalog.resolveIdFromText(explicit);
    if (id) return catalog.getAxis(id) || id;
  }
  const blob = [user.department, user.job_title, user.company_role_name, user.area].filter(Boolean).join(' ');
  const id = catalog.resolveIdFromText(blob);
  if (id) return catalog.getAxis(id) || id;
  return null;
}

/**
 * Safety / EHS puro NÃO deve publicar menu ambiental corporativo (ESG, telemetria, cognitive).
 */
function shouldPublishEnvironmentNavigation(user) {
  if (!domainFlags.isSafetyDomainIsolationEnabled()) return true;
  const axis = resolvePublicationAxis(user);
  const areaId = catalog.resolveIdFromText(
    [user.functional_area, user.department, user.job_title].filter(Boolean).join(' ')
  );

  if (axis && BLOCK_ENV_PUBLICATION_AXES.has(axis)) {
    logPhaseD('SAFETY_ENVIRONMENTAL_CONFLICT', {
      user_id: user?.id,
      action: 'block_environment_publication',
      axis
    });
    return false;
  }
  if (areaId && BLOCK_ENV_PUBLICATION_AREA_IDS.has(areaId)) {
    logPhaseD('SAFETY_ENVIRONMENTAL_CONFLICT', {
      user_id: user?.id,
      action: 'block_environment_publication',
      area_id: areaId
    });
    return false;
  }

  const blob = [user.department, user.job_title].filter(Boolean).join(' ').toLowerCase();
  if (
    /(seguranca do trabalho|segurança do trabalho|\bsst\b|sso\b|nr-?\d)/.test(blob) &&
    !catalog.hasEnvironmentalSemanticSignal(blob)
  ) {
    logPhaseD('DOMAIN_CONTEXT_RESOLVED', {
      user_id: user?.id,
      domain: 'safety',
      environment_publication: false
    });
    return false;
  }

  return true;
}

function shouldPublishSafetyNavigation(user) {
  const axis = resolvePublicationAxis(user);
  const areaId = catalog.resolveIdFromText(
    [user.functional_area, user.department, user.job_title].filter(Boolean).join(' ')
  );
  return axis === 'safety' || areaId === 'safety' || areaId === 'environmental_health_safety';
}

module.exports = {
  resolvePublicationAxis,
  shouldPublishEnvironmentNavigation,
  shouldPublishSafetyNavigation
};
