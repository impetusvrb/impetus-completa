'use strict';

/** Gradual release waves by audience band. */
const DEFAULT_WAVES = Object.freeze([
  { wave: 1, bands: ['operator'], domains: ['quality'] },
  { wave: 2, bands: ['operator', 'technician'], domains: ['quality', 'safety'] },
  { wave: 3, bands: ['operator', 'technician', 'supervisor'], domains: ['quality', 'safety', 'logistics'] },
  { wave: 4, bands: ['coordinator', 'manager'], domains: ['quality', 'safety', 'logistics'] },
  { wave: 5, bands: ['director', 'auditor'], domains: ['quality', 'safety', 'logistics'] }
]);

const _tenantWaves = new Map();

function setTenantPilotWave(tenantId, waveIndex) {
  _tenantWaves.set(String(tenantId), Math.max(1, Math.min(5, Number(waveIndex) || 1)));
}

function getAudiencePilotMatrix(tenantId, currentWave) {
  const wave = currentWave ?? _tenantWaves.get(String(tenantId)) ?? 1;
  const allowed = DEFAULT_WAVES.filter((w) => w.wave <= wave);
  const bands = new Set();
  const domains = new Set();
  for (const w of allowed) {
    w.bands.forEach((b) => bands.add(b));
    w.domains.forEach((d) => domains.add(d));
  }
  return {
    ok: true,
    tenant_id: tenantId,
    current_wave: wave,
    max_wave: 5,
    allowed_bands: [...bands],
    allowed_domains: [...domains],
    waves: DEFAULT_WAVES,
    gradual: true
  };
}

module.exports = {
  DEFAULT_WAVES,
  setTenantPilotWave,
  getAudiencePilotMatrix
};
