'use strict';

/**
 * UTC consistency — persistência/canónico em UTC; display por timezone do utilizador.
 */

const flags = require('../config/enterpriseLocaleFlags');

function nowUtcIso() {
  return new Date().toISOString();
}

function toUtcDate(input) {
  if (input == null || input === '') return null;
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function toStorageUtc(input) {
  const d = toUtcDate(input);
  return d ? d.toISOString() : null;
}

function isValidTimezone(tz) {
  const id = String(tz || '').trim();
  if (!id) return false;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: id });
    return true;
  } catch (_e) {
    return false;
  }
}

function normalizeTimezone(tz) {
  const id = String(tz || flags.defaultTimezone()).trim().slice(0, 80);
  return isValidTimezone(id) ? id : flags.defaultTimezone();
}

/**
 * Formata instante UTC para apresentação no fuso do utilizador.
 */
function formatForUser(utcInput, { timezone, locale, dateStyle = 'short', timeStyle = 'short' } = {}) {
  const d = toUtcDate(utcInput);
  if (!d) return '';
  const tz = normalizeTimezone(timezone);
  const loc = locale || flags.defaultLocale();
  try {
    return new Intl.DateTimeFormat(loc, {
      timeZone: tz,
      dateStyle,
      timeStyle
    }).format(d);
  } catch (_e) {
    return d.toISOString();
  }
}

function getOffsetLabel(timezone, at = new Date()) {
  const tz = normalizeTimezone(timezone);
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      timeZoneName: 'shortOffset'
    }).formatToParts(at);
    const p = parts.find((x) => x.type === 'timeZoneName');
    return p?.value || tz;
  } catch (_e) {
    return tz;
  }
}

module.exports = {
  nowUtcIso,
  toUtcDate,
  toStorageUtc,
  isValidTimezone,
  normalizeTimezone,
  formatForUser,
  getOffsetLabel
};
