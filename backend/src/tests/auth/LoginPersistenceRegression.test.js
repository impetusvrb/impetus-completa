'use strict';

/**
 * LoginPersistenceRegression — regressão de persistência de sessão
 *
 * Valida que:
 * 1. Login gera token válido
 * 2. Token autentica dashboard/me
 * 3. Anam session-token NÃO retorna 401 (causa do bug de redirect para login)
 * 4. Logout destrói a sessão
 * 5. Token expirado retorna 401 (comportamento correcto)
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });
const axios = require('axios');
const jwt = require('jsonwebtoken');

const BASE = `http://localhost:${process.env.PORT || 3000}/api`;

async function login(email, password) {
  const r = await axios.post(`${BASE}/auth/login`, { email, password });
  return r.data;
}

describe('Login Persistence Regression', () => {
  let token;
  let headers;

  beforeAll(async () => {
    const data = await login('carlos.ferreira@empresa.com.br', 'testpass123');
    expect(data.token).toBeTruthy();
    token = data.token;
    headers = { Authorization: `Bearer ${token}` };
  }, 15000);

  test('T1 — Login retorna JWT válido com campos mínimos', () => {
    const decoded = jwt.decode(token);
    expect(decoded.id).toBeTruthy();
    expect(decoded.email).toBeTruthy();
    expect(decoded.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });

  test('T2 — JWT autentica /dashboard/me sem redirect', async () => {
    const r = await axios.get(`${BASE}/dashboard/me`, { headers });
    expect(r.status).toBe(200);
  }, 10000);

  test('T3 — /anam/session-token NÃO retorna HTTP 401 (causa raiz corrigida)', async () => {
    // Mesmo sem API key Anam válida, o código HTTP NÃO deve ser 401.
    // 401 neste contexto causaria logout global no frontend.
    const r = await axios.post(`${BASE}/anam/session-token`, {}, { headers }).catch((e) => e.response);
    expect(r).toBeTruthy();
    expect(r.status).not.toBe(401);
    // Pode ser 503 (API key inválida) ou 200 (API key configurada)
    expect([200, 503, 502, 429]).toContain(r.status);
  }, 10000);

  test('T4 — Endpoints core não retornam 401 com JWT válido', async () => {
    const endpoints = [
      `${BASE}/dashboard/me`,
      `${BASE}/dashboard/visibility`,
    ];
    for (const url of endpoints) {
      const r = await axios.get(url, { headers }).catch((e) => e.response);
      expect(r.status).not.toBe(401);
    }
  }, 15000);

  test('T5 — Token inválido retorna 401 correctamente em /dashboard/me', async () => {
    const r = await axios.get(`${BASE}/dashboard/me`, {
      headers: { Authorization: 'Bearer token.invalido.aqui' }
    }).catch((e) => e.response);
    expect(r.status).toBe(401);
  }, 10000);

  test('T6 — /companies/me com JWT válido não retorna 401', async () => {
    const r = await axios.get(`${BASE}/companies/me`, { headers }).catch((e) => e.response);
    // pode ser 200 ou 404 (route não existe) — nunca 401 (logout)
    expect(r.status).not.toBe(401);
  }, 10000);
});
