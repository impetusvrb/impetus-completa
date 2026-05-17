import { resolveSafetyAudienceBand, resolveSafetyUxDensity } from '../navigation/safetyAudienceNavigation.js';

export function analyzeSafetyUxDensity(userLike) {
  let u = userLike;
  if (!u) {
    try {
      u = JSON.parse(localStorage.getItem('impetus_user') || '{}');
    } catch {
      u = {};
    }
  }
  const band = resolveSafetyAudienceBand(u);
  return { band, density: resolveSafetyUxDensity(band) };
}

export function validateContextualUxClient(input) {
  const limits = { operator: 6, sst_technician: 10, coordinator: 12, director: 8, production: 2 };
  const max = limits[input.band] || 6;
  const menu = Number(input.menu_item_count) || 0;
  const issues = menu > max ? ['menu_overflow'] : [];
  const score = Math.max(0, 100 - issues.length * 22);
  return { band: input.band, ux_score: score, acceptable: score >= 65, issues };
}
