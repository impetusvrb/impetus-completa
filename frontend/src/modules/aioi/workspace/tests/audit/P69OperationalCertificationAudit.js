'use strict';

/**
 * AIOI-P6.9 — Operational Certification Audit helpers (test-only)
 */

const fs = require('fs');
const path = require('path');

const AIOI_ROOT = path.resolve(__dirname, '../../..');
const WORKSPACE_ROOT = path.join(AIOI_ROOT, 'workspace');
const SESSION_ROOT = path.join(AIOI_ROOT, 'session');
const FAVORITES_ROOT = path.join(AIOI_ROOT, 'favorites');
const SHORTCUTS_ROOT = path.join(AIOI_ROOT, 'shortcuts');
const DEEP_ROOT = path.join(AIOI_ROOT, 'deep-linking');
const NAV_ROOT = path.join(AIOI_ROOT, 'navigation');
const ACCESS_ROOT = path.join(AIOI_ROOT, 'access');
const ROUTER_ROOT = path.join(AIOI_ROOT, 'router');

const STORAGE_KEYS = {
  preferences: 'aioi.executive.workspace.preferences',
  session: 'aioi.executive.session',
  favorites: 'aioi.executive.favorites',
  shortcuts: 'aioi.executive.shortcuts'
};

const PROVIDER_CHAIN = [
  'ExecutiveAccessGuard',
  'ExecutiveWorkspacePreferencesProvider',
  'ExecutiveSessionProvider',
  'ExecutiveFavoritesProvider',
  'ExecutiveShortcutsProvider',
  'ExecutiveIntelligenceProvider',
  'ExecutiveIntelligenceGovernanceProvider',
  'ExecutiveIntelligenceActivationProvider',
  'ExecutiveCapabilityContractsProvider',
  'ExecutiveInsightsFoundationProvider',
  'ExecutiveRecommendationsFoundationProvider',
  'ExecutiveAssistantFoundationProvider',
  'ExecutiveCognitiveRuntimeProvider',
  'ExecutiveRuntimeGovernanceProvider',
  'ExecutiveRuntimeAuthorizationProvider',
  'ExecutiveRuntimeAuditProvider',
  'ExecutiveInsightsRuntimeProvider',
  'ExecutiveRecommendationsRuntimeProvider',
  'ExecutiveAssistantRuntimeProvider',
  'ExecutiveWorkspaceProvider',
  'ExecutiveModuleRoute',
  'ExecutiveNavigationProvider',
  'ExecutivePortalRoute'
];

const SOVEREIGN_WORKSPACE_FILES = [
  'ExecutiveWorkspaceService.js',
  'ExecutiveWorkspaceHealthService.js',
  'ExecutiveWorkspaceGuard.jsx'
];

const SOVEREIGN_NAV_FILES = [
  path.join(DEEP_ROOT, 'ExecutiveModuleRoute.jsx'),
  path.join(DEEP_ROOT, 'ExecutiveDeepLinkRegistry.js'),
  path.join(NAV_ROOT, 'ExecutiveNavigationProvider.jsx')
];

const EXPERIENCE_LAYERS = [
  { root: WORKSPACE_ROOT, name: 'preferences', files: ['ExecutiveWorkspacePreferencesService.js', 'ExecutiveWorkspacePreferencesProvider.jsx'] },
  { root: SESSION_ROOT, name: 'session', files: ['ExecutiveSessionService.js', 'ExecutiveSessionProvider.jsx'] },
  { root: FAVORITES_ROOT, name: 'favorites', files: ['ExecutiveFavoritesService.js', 'ExecutiveFavoritesProvider.jsx'] },
  { root: SHORTCUTS_ROOT, name: 'shortcuts', files: ['ExecutiveShortcutsService.js', 'ExecutiveShortcutsProvider.jsx'] }
];

const FORBIDDEN_EXPERIENCE_IMPORTS = [
  /from ['"].*access\/ExecutiveAccessGuard/,
  /from ['"].*deep-linking\/ExecutiveDeepLinkRegistry/,
  /from ['"].*navigation\/ExecutiveNavigationProvider/
];

const FORBIDDEN_EXPERIENCE_MUTATIONS = ['Navigate', 'useNavigate', 'ExecutiveDeepLinkRegistry'];

function readFile(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
}

function extractExecutivePortalShell(appSource) {
  const match = appSource.match(/function ExecutivePortalDeepLinkShell\(\)[\s\S]*?^\}/m);
  return match ? match[0] : '';
}

function verifyProviderComposition(appSource) {
  const shell = stripComments(extractExecutivePortalShell(appSource));
  if (!shell) return { ok: false, reason: 'shell missing' };
  let lastIndex = -1;
  for (const provider of PROVIDER_CHAIN) {
    const tag = provider === 'ExecutiveAccessGuard' ? '<ExecutiveAccessGuard>' : `<${provider}`;
    const idx = shell.indexOf(tag);
    if (idx < 0) return { ok: false, reason: `${provider} missing` };
    if (idx < lastIndex) return { ok: false, reason: `${provider} inverted` };
    lastIndex = idx;
  }
  return { ok: true, shell };
}

function verifyStorageKeyIsolation() {
  const keys = Object.values(STORAGE_KEYS);
  const unique = new Set(keys);
  if (unique.size !== keys.length) return { ok: false, reason: 'duplicate keys' };
  return { ok: true, keys: STORAGE_KEYS };
}

function verifyWorkspaceSovereignty() {
  for (const rel of SOVEREIGN_WORKSPACE_FILES) {
    const src = readFile(path.join(WORKSPACE_ROOT, rel));
    const forbidden = ['ExecutiveFavorites', 'ExecutiveShortcuts', 'ExecutiveSessionProvider', 'ExecutiveWorkspacePreferences'];
    for (const token of forbidden) {
      if (src.includes(token)) return { ok: false, file: rel, token };
    }
  }
  return { ok: true };
}

function verifyNavigationSovereignty() {
  for (const abs of SOVEREIGN_NAV_FILES) {
    const src = readFile(abs);
    const forbidden = ['ExecutiveFavorites', 'ExecutiveShortcuts', 'ExecutiveWorkspacePreferences', 'ExecutiveSession'];
    for (const token of forbidden) {
      if (src.includes(token)) return { ok: false, file: abs, token };
    }
  }
  return { ok: true };
}

function verifyExperienceIsolation() {
  for (const layer of EXPERIENCE_LAYERS) {
    for (const file of layer.files) {
      const src = readFile(path.join(layer.root, file));
      for (const pattern of FORBIDDEN_EXPERIENCE_IMPORTS) {
        if (pattern.test(src)) return { ok: false, layer: layer.name, file, pattern: String(pattern) };
      }
      if (layer.name !== 'session') {
        for (const token of FORBIDDEN_EXPERIENCE_MUTATIONS) {
          if (src.includes(token)) return { ok: false, layer: layer.name, file, token };
        }
      }
    }
  }
  return { ok: true };
}

function runRegressionSuite(name, cwd, file, passToken, retries = 3) {
  const { execSync } = require('child_process');
  let lastErr;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const out = execSync(`node ${file}`, {
        cwd,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: 600000
      });
      if (out.includes(passToken)) return true;
      lastErr = new Error(`missing pass token: ${passToken}`);
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr;
}

module.exports = {
  STORAGE_KEYS,
  PROVIDER_CHAIN,
  AIOI_ROOT,
  WORKSPACE_ROOT,
  verifyProviderComposition,
  verifyStorageKeyIsolation,
  verifyWorkspaceSovereignty,
  verifyNavigationSovereignty,
  verifyExperienceIsolation,
  runRegressionSuite
};
