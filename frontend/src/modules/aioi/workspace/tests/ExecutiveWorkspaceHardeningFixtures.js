'use strict';

/**
 * AIOI-P6.4.1 — Fixtures de degradação (test-only · READ ONLY)
 */

const DEGRADED_WORKSPACE_MODELS = {
  navigationNotReady: {
    modules_total: 4,
    modules_ready: 4,
    deep_links_total: 5,
    deep_links_ready: 5,
    navigation_ready: false,
    governance_ready: true
  },
  governanceNotReady: {
    modules_total: 4,
    modules_ready: 4,
    deep_links_total: 5,
    deep_links_ready: 5,
    navigation_ready: true,
    governance_ready: false
  },
  deepLinksDegraded: {
    modules_total: 4,
    modules_ready: 4,
    deep_links_total: 5,
    deep_links_ready: 4,
    navigation_ready: false,
    governance_ready: false
  },
  modulesMostlyReady: {
    modules_total: 4,
    modules_ready: 3,
    deep_links_total: 5,
    deep_links_ready: 5,
    navigation_ready: false,
    governance_ready: false
  },
  modulesPartial: {
    modules_total: 4,
    modules_ready: 2,
    deep_links_total: 5,
    deep_links_ready: 5,
    navigation_ready: false,
    governance_ready: false
  },
  modulesIncomplete: {
    modules_total: 4,
    modules_ready: 1,
    deep_links_total: 5,
    deep_links_ready: 5,
    navigation_ready: false,
    governance_ready: false
  },
  workspaceNotReadyComposite: {
    modules_total: 4,
    modules_ready: 4,
    deep_links_total: 5,
    deep_links_ready: 5,
    navigation_ready: false,
    governance_ready: false
  }
};

function buildBlockedHealth(healthMod, modelKey) {
  const model = DEGRADED_WORKSPACE_MODELS[modelKey];
  return healthMod.buildExecutiveWorkspaceHealth(model);
}

module.exports = {
  DEGRADED_WORKSPACE_MODELS,
  buildBlockedHealth
};
