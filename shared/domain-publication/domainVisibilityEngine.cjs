'use strict';

/**
 * @param {Array<{ bands?: string[] }>} manifestItems
 * @param {string} band
 */
function filterManifestByAudience(manifestItems, band) {
  if (!Array.isArray(manifestItems)) return [];
  const b = String(band || '');
  return manifestItems.filter((m) => !m.bands || m.bands.includes(b));
}

module.exports = { filterManifestByAudience };
