'use strict';

/**
 * PROMPT 30 — Enterprise locale / i18n / timezone flags.
 */

function envBool(name, defaultValue = false) {
  const raw = process.env[name];
  if (raw == null || String(raw).trim() === '') return defaultValue;
  const v = String(raw).trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'yes';
}

function envMode(name, allowed, defaultValue) {
  const v = String(process.env[name] || defaultValue).trim().toLowerCase();
  return allowed.includes(v) ? v : defaultValue;
}

function localeEngineMode() {
  return envMode('IMPETUS_ENTERPRISE_LOCALE_MODE', ['off', 'shadow', 'audit', 'on'], 'on');
}

function isLocaleEngineActive() {
  return localeEngineMode() !== 'off' || envBool('IMPETUS_ENTERPRISE_LOCALE_ENABLED', true);
}

function shouldPersistAudit() {
  const m = localeEngineMode();
  return m === 'audit' || m === 'on';
}

function defaultRegionCode() {
  return String(process.env.IMPETUS_DEFAULT_REGION_CODE || 'BR').trim().toUpperCase().slice(0, 8);
}

function defaultTimezone() {
  return String(process.env.IMPETUS_DEFAULT_TIMEZONE || 'America/Sao_Paulo').trim().slice(0, 80);
}

function defaultLocale() {
  return String(process.env.IMPETUS_DEFAULT_LOCALE || 'pt-BR').trim().slice(0, 16);
}

function defaultCurrency() {
  return String(process.env.IMPETUS_DEFAULT_CURRENCY || 'BRL').trim().toUpperCase().slice(0, 8);
}

module.exports = {
  localeEngineMode,
  isLocaleEngineActive,
  shouldPersistAudit,
  defaultRegionCode,
  defaultTimezone,
  defaultLocale,
  defaultCurrency,
  envBool
};
