'use strict';

/**
 * Flags do módulo universal de qualidade (dual runtime).
 * Defaults seguros: desligado; shadow-first quando ligado.
 */

function envBool(name, defaultValue = false) {
  const raw = process.env[name];
  if (raw == null || String(raw).trim() === '') return defaultValue;
  const v = String(raw).trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'yes';
}

function isQualityUniversalRuntimeEnabled() {
  return envBool('IMPETUS_QUALITY_UNIVERSAL_RUNTIME_ENABLED', false);
}

/** Quando true, transições de workflow não disparam efeitos externos além de auditoria + métricas locais. */
function isQualityUniversalShadowMode() {
  if (!isQualityUniversalRuntimeEnabled()) return true;
  return envBool('IMPETUS_QUALITY_UNIVERSAL_SHADOW_MODE', true);
}

module.exports = {
  isQualityUniversalRuntimeEnabled,
  isQualityUniversalShadowMode
};
