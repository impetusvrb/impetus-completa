'use strict';

/**
 * Preview de matriz de audiência SST por amostra de utilizadores.
 * @param {Array<object>} sampleUsers
 */
function previewAudienceMatrix(sampleUsers) {
  if (!Array.isArray(sampleUsers)) return [];
  return sampleUsers.map((u, i) => ({
    index: i,
    user_id: u.id || null,
    role: u.role || 'unknown',
    band: u._preview_band || 'production',
    publication_eligible: u._preview_eligible !== false
  }));
}

module.exports = { previewAudienceMatrix };
