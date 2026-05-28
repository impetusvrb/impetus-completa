/**
 * PROMPT 30 — Cliente i18n leve (fallback pt-BR).
 */

const FALLBACK = {
  'locale.engine.title': 'Internacionalização',
  'locale.timezone': 'Fuso horário',
  'locale.region': 'Região / residência de dados',
  'locale.currency': 'Moeda',
  'locale.utc_note': 'Todos os registos internos são armazenados em UTC.',
  'common.save': 'Salvar'
};

const REMOTE = { 'pt-BR': { ...FALLBACK }, 'en-US': {}, 'es-ES': {} };

let _locale = 'pt-BR';
let _remoteLoaded = false;

export function setEnterpriseLocale(code) {
  _locale = code || 'pt-BR';
}

export function getEnterpriseLocale() {
  return _locale;
}

export async function loadRemoteCatalog(apiClient) {
  if (!apiClient?.getCatalogs) return;
  try {
    const res = await apiClient.getCatalogs();
    if (res?.data?.locales) _remoteLoaded = true;
  } catch {
    /* fallback local */
  }
}

export function t(key, params = {}) {
  const bucket = REMOTE[_locale] || FALLBACK;
  let text = bucket[key] || FALLBACK[key] || key;
  Object.entries(params).forEach(([k, v]) => {
    text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
  });
  return text;
}

export function formatLocalDateTime(utcIso, { timezone, locale } = {}) {
  if (!utcIso) return '—';
  try {
    const d = new Date(utcIso);
    return new Intl.DateTimeFormat(locale || _locale, {
      timeZone: timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      dateStyle: 'short',
      timeStyle: 'short'
    }).format(d);
  } catch {
    return String(utcIso);
  }
}
