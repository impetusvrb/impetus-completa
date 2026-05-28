'use strict';

/**
 * Multi-region + data residency (policy metadata — storage routing futuro).
 */

const REGIONS = Object.freeze([
  {
    code: 'BR',
    label: 'Brasil',
    data_residency: 'br-south',
    gdpr_equivalent: 'lgpd',
    default_timezone: 'America/Sao_Paulo',
    default_currency: 'BRL',
    storage_zone: process.env.IMPETUS_STORAGE_ZONE_BR || 'sa-east-1'
  },
  {
    code: 'EU',
    label: 'União Europeia',
    data_residency: 'eu-central',
    gdpr_equivalent: 'gdpr',
    default_timezone: 'Europe/Lisbon',
    default_currency: 'EUR',
    storage_zone: process.env.IMPETUS_STORAGE_ZONE_EU || 'eu-west-1'
  },
  {
    code: 'US',
    label: 'Estados Unidos',
    data_residency: 'us-east',
    gdpr_equivalent: 'ccpa_reference',
    default_timezone: 'America/New_York',
    default_currency: 'USD',
    storage_zone: process.env.IMPETUS_STORAGE_ZONE_US || 'us-east-1'
  }
]);

const _byCode = new Map(REGIONS.map((r) => [r.code, r]));

function getRegion(code) {
  return _byCode.get(String(code || '').trim().toUpperCase()) || _byCode.get('BR');
}

function listRegions() {
  return REGIONS.map((r) => ({ ...r }));
}

module.exports = { REGIONS, getRegion, listRegions };
