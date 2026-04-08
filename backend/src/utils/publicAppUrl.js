'use strict';

/**
 * URL base da aplicação IMPETUS (cliente), para links em e-mails e convites.
 * Nunca usar a porta do painel admin (ex.: 5174).
 */
function getPublicAppBaseUrl() {
  const raw = (
    process.env.IMPETUS_CLIENT_APP_URL ||
    process.env.FRONTEND_URL ||
    process.env.BASE_URL ||
    'http://localhost:3000'
  )
    .trim()
    .replace(/\/$/, '');
  if (raw.includes(':5174') || /\/\/[^/]*5174\b/.test(raw)) {
    console.warn(
      '[publicAppUrl] A URL parece ser o painel admin (:5174). Convites e reset de senha devem apontar para a app cliente (PM2/serveDist: :3000 por defeito; dev Vite: VITE_DEV_PORT ou PORT). Defina IMPETUS_CLIENT_APP_URL ou FRONTEND_URL no .env do backend.'
    );
  }
  return raw;
}

module.exports = { getPublicAppBaseUrl };
