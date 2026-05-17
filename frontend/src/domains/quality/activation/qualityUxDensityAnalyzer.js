/**
 * Análise de densidade UX (QUALITY) — sinais para runtime; sem alterar design system.
 */

import { resolveQualityAudienceBand, resolveQualityUxDensity } from '../navigation/qualityAudienceNavigation.js';

export function analyzeQualityUxDensity(userLike) {
  const u =
    userLike ||
    (() => {
      try {
        return JSON.parse(localStorage.getItem('impetus_user') || '{}');
      } catch {
        return {};
      }
    })();
  const band = resolveQualityAudienceBand(u);
  const density = resolveQualityUxDensity(band);
  return {
    band,
    density,
    operational_focus: density === 'compact',
    governance_focus: density === 'tactical' || density === 'audit',
    executive_focus: density === 'executive'
  };
}
