'use strict';

const localeCatalog = require('../catalog/localeCatalog');

/** Catálogo inicial — expandível; fallback sempre pt-BR. */
const MESSAGES = Object.freeze({
  'pt-BR': Object.freeze({
    'locale.engine.title': 'Internacionalização',
    'locale.timezone': 'Fuso horário',
    'locale.region': 'Região / residência de dados',
    'locale.currency': 'Moeda',
    'locale.utc_note': 'Todos os registos internos são armazenados em UTC.',
    'rollout.center': 'Rollout Center',
    'common.save': 'Salvar',
    'common.cancel': 'Cancelar'
  }),
  'en-US': Object.freeze({
    'locale.engine.title': 'Internationalization',
    'locale.timezone': 'Time zone',
    'locale.region': 'Region / data residency',
    'locale.currency': 'Currency',
    'locale.utc_note': 'All internal records are stored in UTC.',
    'rollout.center': 'Rollout Center',
    'common.save': 'Save',
    'common.cancel': 'Cancel'
  }),
  'es-ES': Object.freeze({
    'locale.engine.title': 'Internacionalización',
    'locale.timezone': 'Zona horaria',
    'locale.region': 'Región / residencia de datos',
    'locale.currency': 'Moneda',
    'locale.utc_note': 'Todos los registros internos se almacenan en UTC.',
    'rollout.center': 'Centro de Rollout',
    'common.save': 'Guardar',
    'common.cancel': 'Cancelar'
  })
});

function translate(key, locale, params = {}) {
  const loc = localeCatalog.normalizeLocale(locale);
  const bucket = MESSAGES[loc] || MESSAGES['pt-BR'];
  let text = bucket[key] || MESSAGES['pt-BR'][key] || String(key);
  for (const [k, v] of Object.entries(params)) {
    text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
  }
  return text;
}

function listKeys(locale) {
  const loc = localeCatalog.normalizeLocale(locale);
  return Object.keys(MESSAGES[loc] || MESSAGES['pt-BR']);
}

module.exports = { translate, listKeys, MESSAGES };
