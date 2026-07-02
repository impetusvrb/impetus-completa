'use strict';

/**
 * Capabilities de produto — camada única (CERT-LICENSE-01).
 * A licença habilita capabilities; RBAC permanece independente.
 */

/** @typedef {string} LicenseCapability */

/** Catálogo canónico de capabilities licenciáveis */
const CAPABILITY_CATALOG = Object.freeze({
  core: { label: 'Núcleo operacional', default: true },
  anam: { label: 'ANAM avatar/voz' },
  controller_advanced: { label: 'Controller Cognitivo avançado' },
  executive: { label: 'Executive cockpit' },
  executive_boardroom: { label: 'Executive Boardroom' },
  digital_twin: { label: 'Gêmeo Digital' },
  voice_realtime: { label: 'Voice Realtime OpenAI' },
  multi_site: { label: 'Multi-site (futuro)' },
  pulse_advanced: { label: 'Pulse analytics avançado' },
  workflow_advanced: { label: 'Workflow engine avançado' },
});

/** Aliases legados → capability canónica */
const ALIASES = Object.freeze({
  boardroom: 'executive_boardroom',
  gemini: 'core',
  gemeo: 'digital_twin',
  'digital-twin': 'digital_twin',
  voice: 'voice_realtime',
  realtime: 'voice_realtime',
});

const ALL_KEYS = Object.freeze(Object.keys(CAPABILITY_CATALOG));

/**
 * @param {string[] | undefined} fromLicense
 * @returns {Set<string>}
 */
function normalizeCapabilities(fromLicense) {
  const set = new Set(['core']);
  if (!Array.isArray(fromLicense)) return set;
  for (const raw of fromLicense) {
    const k = String(raw || '').trim().toLowerCase();
    if (!k) continue;
    const mapped = ALIASES[k] || k;
    if (CAPABILITY_CATALOG[mapped]) set.add(mapped);
  }
  return set;
}

/**
 * @param {object | null | undefined} licenseResult
 * @param {string} capability
 */
function hasCapability(licenseResult, capability) {
  if (!licenseResult || licenseResult.valid === false) {
    if (licenseResult?.operational) {
      return normalizeCapabilities(licenseResult.capabilities).has(capability);
    }
    return capability === 'core' && licenseResult?.reason === 'validation_disabled';
  }
  if (licenseResult.reason === 'validation_disabled') return true;
  const caps = licenseResult.capabilitiesSet || normalizeCapabilities(licenseResult.capabilities);
  return caps.has(capability);
}

/**
 * @param {object | null | undefined} licenseResult
 */
function getCapabilitiesPayload(licenseResult) {
  const enabled = licenseResult?.reason === 'validation_disabled'
    ? new Set(ALL_KEYS)
    : licenseResult?.capabilitiesSet || normalizeCapabilities(licenseResult?.capabilities);

  return ALL_KEYS.map((key) => ({
    key,
    label: CAPABILITY_CATALOG[key].label,
    enabled: enabled.has(key),
    default: CAPABILITY_CATALOG[key].default === true,
  }));
}

module.exports = {
  CAPABILITY_CATALOG,
  ALL_KEYS,
  normalizeCapabilities,
  hasCapability,
  getCapabilitiesPayload,
};
