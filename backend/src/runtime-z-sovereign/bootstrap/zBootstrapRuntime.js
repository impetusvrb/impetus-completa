'use strict';

const flags = require('../config/phaseSZ1FeatureFlags');
const { resolveModuleAuthority } = require('../modules/zModuleAuthorityRuntime');
const { resolveSections } = require('../sections/zSectionRuntime');
const { resolveKpis } = require('../kpi/zKpiRuntime');
const { assembleContext } = require('../context/zContextAssemblyRuntime');
const { buildBootstrapPayload } = require('./zBootstrapPayloadBuilder');
const { validateBootstrap } = require('./zBootstrapValidationEngine');
const { ensureCompatibility } = require('./zBootstrapCompatibilityRuntime');
const { recordBootstrapLatency, emitSZ1 } = require('../observability/zSovereignObservability');

let _profileResolver = null;
let _userContext = null;
let _hierFilter = null;

function _lazyProfile() {
  if (_profileResolver) return _profileResolver;
  try {
    _profileResolver = require('../../services/dashboardProfileResolver');
  } catch (_) {
    _profileResolver = null;
  }
  return _profileResolver;
}

function _lazyUserContext() {
  if (_userContext) return _userContext;
  try {
    _userContext = require('../../services/userContext');
  } catch (_) {
    _userContext = null;
  }
  return _userContext;
}

function _lazyHier() {
  if (_hierFilter) return _hierFilter;
  try {
    _hierFilter = require('../../services/hierarchicalDataFilter');
  } catch (_) {
    _hierFilter = null;
  }
  return _hierFilter;
}

/**
 * zBootstrapRuntime — produz payload equivalente ao `legacyResponse` da
 * rota `/api/dashboard/me` sem depender estruturalmente do Motor A.
 *
 * Internaliza:
 *   - dashboardProfileResolver        → resolve perfil
 *   - dashboardAccessService          → módulos / permissões
 *   - dashboardVisibility             → sections
 *   - dashboardKPIs                   → KPIs
 *   - dashboardComposerService        → personalização
 *   - V2 compositionEngine            → composition opcional
 *
 * Modo padrão: SHADOW (corre em paralelo com Motor A para diff).
 */
async function bootstrapSovereign(user = {}, ctx = {}) {
  if (!flags.isBootstrapRuntimeEnabled()) {
    return { payload: null, runtime_skipped: true };
  }

  const t0 = Date.now();
  emitSZ1('BOOTSTRAP_STARTED', { tenant_id: user?.company_id });

  const profileResolver = _lazyProfile();
  const ucMod = _lazyUserContext();
  const hier = _lazyHier();

  let profile = null;
  try {
    profile = profileResolver?.getDashboardConfigForUser
      ? profileResolver.getDashboardConfigForUser(user)
      : null;
  } catch (_) {
    profile = null;
  }

  const hierarchyLevel = user?.hierarchy_level ?? ucMod?.buildUserContext?.(user)?.hierarchy_level ?? 5;
  let scope = ctx.hierarchy_scope || null;
  if (!scope && hier?.resolveHierarchyScope) {
    try {
      scope = await hier.resolveHierarchyScope(user);
    } catch (_) {
      scope = null;
    }
  }

  const [modulesOut, sectionsOut, kpisOut, contextOut] = await Promise.all([
    resolveModuleAuthority(user),
    resolveSections(user, hierarchyLevel),
    resolveKpis(user, { hierarchy_scope: scope }),
    assembleContext(user, ctx)
  ]);

  let userContextObj = null;
  try {
    userContextObj = ucMod?.buildUserContext?.(user) || null;
  } catch (_) {
    userContextObj = null;
  }

  const payload = buildBootstrapPayload({
    profile,
    modulesOut,
    sectionsOut,
    kpisOut,
    contextOut,
    userContext: userContextObj,
    user
  });

  const validation = validateBootstrap(payload);
  const compatibility = ensureCompatibility(payload, ctx.legacy_payload || null);

  const latency_ms = Date.now() - t0;
  recordBootstrapLatency(latency_ms);
  emitSZ1('BOOTSTRAP_COMPLETED', {
    tenant_id: user?.company_id,
    latency_ms,
    safety_score: validation.safety_score,
    compatible: compatibility.compatible
  });

  return {
    payload: compatibility.payload,
    raw_payload: payload,
    validation,
    compatibility,
    sub_runtimes: {
      modules: modulesOut.source,
      sections: sectionsOut.source,
      kpis: kpisOut.source,
      context: contextOut.source
    },
    latency_ms,
    runtime: 'runtime_z',
    source: 'z_bootstrap_runtime',
    delegated_to: [
      'dashboardProfileResolver',
      'dashboardAccessService',
      'dashboardVisibility',
      'dashboardKPIs',
      'dashboardComposerService',
      'engine_v2_composition (opcional)'
    ],
    auto_mutation: false
  };
}

module.exports = { bootstrapSovereign };
