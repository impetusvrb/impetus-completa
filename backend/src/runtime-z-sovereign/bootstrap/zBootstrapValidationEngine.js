'use strict';

/**
 * Valida que o payload soberano cumpre o contrato mínimo esperado pelo
 * frontend. NÃO altera o payload — apenas reporta.
 */
const REQUIRED_KEYS = ['profile_code', 'visible_modules', 'sections', 'kpis'];

function validateBootstrap(payload = {}) {
  const missing = REQUIRED_KEYS.filter((k) => payload[k] === undefined);
  const empty_modules = !Array.isArray(payload.visible_modules) || payload.visible_modules.length === 0;
  const empty_sections = !Array.isArray(payload.sections) || payload.sections.length === 0;
  const empty_kpis = !Array.isArray(payload.kpis) || payload.kpis.length === 0;

  const issues = [];
  if (missing.length) issues.push({ severity: 'high', code: 'missing_required_keys', missing });
  if (empty_modules) issues.push({ severity: 'medium', code: 'empty_visible_modules' });
  if (empty_sections) issues.push({ severity: 'medium', code: 'empty_sections' });
  if (empty_kpis) issues.push({ severity: 'low', code: 'empty_kpis' });

  const ok = !missing.length;
  const safety_score = Number(
    Math.max(
      0,
      Math.min(
        1,
        (ok ? 0.4 : 0.1) +
          (!empty_modules ? 0.25 : 0) +
          (!empty_sections ? 0.25 : 0) +
          (!empty_kpis ? 0.1 : 0)
      )
    ).toFixed(3)
  );

  return {
    ok,
    safety_score,
    issues,
    bootstrap_safe: ok && safety_score >= 0.6
  };
}

module.exports = { validateBootstrap, REQUIRED_KEYS };
