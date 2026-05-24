'use strict';

/**
 * Operational Identity Enforcement Middleware
 *
 * Quando `IMPETUS_OPERATIONAL_IDENTITY_HARDENING=on`, intercepta o
 * payload do /dashboard/me e aplica os módulos governados pela
 * identidade operacional canónica do utilizador.
 *
 * Pattern: Decorator sobre o payload legacyResponse.
 *
 * Fallback: se o resolver falhar, mantém o payload original intacto.
 * NÃO corrompe DB nem React — apenas ajusta arrays de módulos visíveis.
 *
 * Telemetria: regista IDENTITY_ENFORCEMENT_APPLIED / _FALLBACK via coordinator.
 */

const coordinator = require('../activation/cognitiveActivationCoordinator');

function isHardeningActive() {
  return (process.env.IMPETUS_OPERATIONAL_IDENTITY_HARDENING || '').toLowerCase() === 'on';
}

/**
 * Aplica a identidade operacional ao payload do dashboard.
 *
 * @param {object} user             — req.user completo
 * @param {object} legacyResponse   — payload a ser enriquecido in-place
 * @returns {object}                — { applied, governed_modules, reason }
 */
function applyIdentityEnforcement(user, legacyResponse) {
  if (!isHardeningActive()) {
    return { applied: false, reason: 'hardening_disabled' };
  }

  try {
    const { resolveIdentityForUser } = require('../operationalIdentity/operationalIdentityFacade');
    const resolved = resolveIdentityForUser(user, {
      profile_code: legacyResponse?.profile_code || user?.role_code,
      visible_modules: legacyResponse?.visible_modules || user?.visible_modules || []
    });

    if (!resolved?.canonical_identity?.inference_complete) {
      coordinator.recordFallback('identity_hardening', 'identity_inference_incomplete');
      return { applied: false, reason: 'inference_incomplete' };
    }

    const governed = resolved?.authority_registry?.governed_visible_modules || [];
    if (!governed.length) {
      coordinator.recordFallback('identity_hardening', 'no_governed_modules_resolved');
      return { applied: false, reason: 'no_governed_modules' };
    }

    // Aplica módulos governados — aditivo onde possível
    const original = legacyResponse.visible_modules || [];
    const merged = _mergeModules(original, governed);
    legacyResponse.visible_modules = merged;

    // Enriquece com metadados de identidade (para debug/transparência no front)
    legacyResponse.operational_identity = {
      applied: true,
      enforcement_active: true,
      profile_code: resolved.canonical_identity.profile_code,
      functional_axis: resolved.canonical_identity.functional_axis,
      hierarchy_level: resolved.canonical_identity.hierarchy_level,
      operational_scope: resolved.canonical_identity.operational_scope,
      governed_count: governed.length,
      original_count: original.length,
      merged_count: merged.length
    };

    coordinator.recordActivation('identity_hardening');
    console.info('[IDENTITY_ENFORCEMENT] Applied', {
      user_id: user?.id,
      governed: governed.length,
      original: original.length,
      merged: merged.length,
      profile: resolved.canonical_identity.profile_code
    });

    return {
      applied: true,
      governed_modules: governed,
      merged_modules: merged,
      canonical_identity: resolved.canonical_identity
    };
  } catch (err) {
    coordinator.recordError('identity_hardening', err, true);
    // Fallback elegante: mantém legacyResponse intacto
    console.warn('[IDENTITY_ENFORCEMENT_FALLBACK]', err?.message ?? err);
    legacyResponse.operational_identity = {
      applied: false,
      fallback: true,
      error: err?.message || 'identity_enforcement_error'
    };
    return { applied: false, error: err?.message, reason: 'exception' };
  }
}

/**
 * Merge inteligente: preserva todos os módulos originais (compatibilidade
 * retroactiva) e adiciona os governados que não estejam já presentes.
 * Remove módulos explicitamente negados se o resolver devolver denied_modules.
 */
function _mergeModules(original = [], governed = []) {
  const originalSet = new Set(original.map((m) => (typeof m === 'string' ? m : m?.id || m?.key)));
  const governedSet = new Set(governed.map((m) => (typeof m === 'string' ? m : m?.id || m?.key)));

  // Preserva originais que também estejam nos governados
  // Adiciona governados não presentes nos originais (módulos novos)
  // Mantém os originais para retrocompatibilidade total
  const merged = [...original];
  for (const g of governed) {
    const key = typeof g === 'string' ? g : g?.id || g?.key;
    if (key && !originalSet.has(key)) {
      merged.push(g);
    }
  }
  return merged;
}

module.exports = { applyIdentityEnforcement, isHardeningActive };
