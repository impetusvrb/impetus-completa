'use strict';

const audience = require('../publication/environmentAudienceResolver');
const { environmentOperationalDensityRuntime, environmentExecutiveDensityRuntime, environmentCognitivePressureRuntime } = require('../publication');

function environmentOperationalDensityValidation(band = 'operator') {
  return environmentOperationalDensityRuntime(band);
}

function environmentExecutiveDensityValidation(band = 'director') {
  return environmentExecutiveDensityRuntime(band);
}

function environmentCognitivePressureValidation(ctx = {}) {
  return environmentCognitivePressureRuntime(ctx);
}

function environmentSidebarDensityValidation(menuCount = 0) {
  const score = Math.min(1, menuCount / 16);
  return {
    menu_count: menuCount,
    score,
    saturation_risk: score > 0.75,
    sidebar_safe: menuCount <= 14 && score <= 0.85
  };
}

function runEnvironmentShadowDensityValidationPack() {
  const bands = ['operator', 'technician', 'coordinator', 'director'];
  const operational = bands.map((b) => environmentOperationalDensityValidation(b));
  const executive = bands.map((b) => environmentExecutiveDensityValidation(b));
  const pressure = bands.map((b) =>
    environmentCognitivePressureValidation({
      band: b,
      visible_menu_count: audience.resolveAudienceManifestIds(b).length
    })
  );
  const sidebar = environmentSidebarDensityValidation(
    Math.max(...bands.map((b) => audience.resolveAudienceManifestIds(b).length))
  );
  const ok =
    pressure.every((p) => !p.saturation_risk || p.score <= 0.85) &&
    sidebar.sidebar_safe &&
    operational.every((o) => o.cognitive_safe !== false);

  return { ok, operational, executive, pressure, sidebar };
}

module.exports = {
  environmentOperationalDensityValidation,
  environmentExecutiveDensityValidation,
  environmentCognitivePressureValidation,
  environmentSidebarDensityValidation,
  runEnvironmentShadowDensityValidationPack
};
