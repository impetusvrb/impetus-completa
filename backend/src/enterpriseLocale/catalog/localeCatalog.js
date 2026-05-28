'use strict';

const SUPPORTED_LOCALES = Object.freeze([
  { code: 'pt-BR', label: 'Português (Brasil)', default: true, rtl: false },
  { code: 'en-US', label: 'English (US)', default: false, rtl: false },
  { code: 'es-ES', label: 'Español', default: false, rtl: false }
]);

const _codes = new Set(SUPPORTED_LOCALES.map((l) => l.code));

function isSupported(locale) {
  return _codes.has(String(locale || '').trim());
}

function normalizeLocale(locale) {
  const raw = String(locale || '').trim();
  if (isSupported(raw)) return raw;
  const short = raw.split('-')[0];
  if (short === 'pt') return 'pt-BR';
  if (short === 'en') return 'en-US';
  if (short === 'es') return 'es-ES';
  return 'pt-BR';
}

function listLocales() {
  return SUPPORTED_LOCALES.map((l) => ({ ...l }));
}

module.exports = { SUPPORTED_LOCALES, isSupported, normalizeLocale, listLocales };
