/**
 * IMPETUS - Integração de Sistema de Ponto
 * Admin cadastra; sistema sincroniza registros (API externa)
 */
const db = require('../db');
const crypto = require('crypto');

const ENC_KEY = process.env.TIME_CLOCK_ENC_KEY || process.env.ENCRYPTION_KEY || 'impetus-default-key-32b';
const ALG = 'aes-256-cbc';

function encrypt(text) {
  if (!text) return null;
  try {
    const key = Buffer.from(ENC_KEY.slice(0, 32).padEnd(32, '0'));
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALG, key, iv);
    let enc = cipher.update(String(text), 'utf8', 'base64');
    enc += cipher.final('base64');
    return `${iv.toString('base64')}:${enc}`;
  } catch (_) { return null; }
}

function decrypt(encrypted) {
  if (!encrypted) return null;
  try {
    const [ivB64, enc] = encrypted.split(':');
    if (!ivB64 || !enc) return null;
    const key = Buffer.from(ENC_KEY.slice(0, 32).padEnd(32, '0'));
    const iv = Buffer.from(ivB64, 'base64');
    const decipher = crypto.createDecipheriv(ALG, key, iv);
    return decipher.update(enc, 'base64', 'utf8') + decipher.final('utf8');
  } catch (_) { return null; }
}

/**
 * Lista sistemas de ponto disponíveis
 */
async function listSystems() {
  const r = await db.query('SELECT code, name, provider, auth_type FROM time_clock_systems WHERE active = true ORDER BY name');
  return r.rows || [];
}

/**
 * Obtém integração da empresa (Admin)
 */
async function getIntegration(companyId) {
  const r = await db.query(`
    SELECT ti.*, ts.name as system_name
    FROM time_clock_integrations ti
    LEFT JOIN time_clock_systems ts ON ts.code = ti.system_code
    WHERE ti.company_id = $1
  `, [companyId]);
  const row = r.rows?.[0];
  if (!row) return null;
  return {
    ...row,
    api_key_encrypted: undefined,
    credentials_encrypted: undefined,
    has_credentials: !!(row.api_key_encrypted || (row.credentials_encrypted && Object.keys(row.credentials_encrypted || {}).length > 0))
  };
}

/**
 * Cria/atualiza integração (Admin)
 */
async function upsertIntegration(companyId, data) {
  const {
    system_code, api_url, api_key, credentials,
    sync_interval_minutes, sync_cron, enabled
  } = data;

  const apiKeyEnc = api_key ? encrypt(api_key) : null;
  const credsEnc = credentials ? encrypt(JSON.stringify(credentials)) : null;

  await db.query(`
    INSERT INTO time_clock_integrations
      (company_id, system_code, api_url, api_key_encrypted, credentials_encrypted, sync_interval_minutes, sync_cron, enabled)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    ON CONFLICT (company_id, system_code) DO UPDATE SET
      api_url = EXCLUDED.api_url,
      api_key_encrypted = COALESCE(EXCLUDED.api_key_encrypted, time_clock_integrations.api_key_encrypted),
      credentials_encrypted = COALESCE(EXCLUDED.credentials_encrypted, time_clock_integrations.credentials_encrypted),
      sync_interval_minutes = COALESCE(EXCLUDED.sync_interval_minutes, time_clock_integrations.sync_interval_minutes),
      sync_cron = COALESCE(EXCLUDED.sync_cron, time_clock_integrations.sync_cron),
      enabled = COALESCE(EXCLUDED.enabled, time_clock_integrations.enabled),
      updated_at = now()
  `, [
    companyId, system_code || 'custom_api', api_url || null, apiKeyEnc, credsEnc,
    sync_interval_minutes ?? 60, sync_cron || '0 */1 * * *', enabled !== false
  ]);

  return getIntegration(companyId);
}

/**
 * Valida comunicação com sistema externo
 */
async function validateConnection(companyId) {
  const int = await getIntegration(companyId);
  if (!int) return { ok: false, error: 'Nenhuma integração configurada' };
  if (!int.api_url && !int.has_credentials) return { ok: false, error: 'API URL ou credenciais não configuradas' };

  try {
    const apiKey = int.api_key_encrypted ? decrypt(int.api_key_encrypted) : null;
    const res = await fetch(int.api_url || 'https://httpbin.org/get', {
      method: 'GET',
      headers: apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {}
    });
    return { ok: res.ok, status: res.status };
  } catch (e) {
    return { ok: false, error: e?.message || 'Falha na conexão' };
  }
}

/**
 * Importa registros de ponto (manual ou webhook)
 * Estrutura esperada: { records: [{ user_id?, external_employee_id?, employee_name, record_date, clock_in, clock_out, ... }] }
 */
async function importRecords(companyId, records) {
  const inserted = [];
  for (const rec of records) {
    const delay = rec.delay_minutes ?? (rec.clock_in && rec.expected_in ? Math.max(0, diffMinutes(rec.expected_in, rec.clock_in)) : 0);
    const overtime = rec.overtime_minutes ?? (rec.worked_minutes > 480 ? rec.worked_minutes - 480 : 0);
    const r = await db.query(`
      INSERT INTO time_clock_records
        (company_id, user_id, external_employee_id, employee_name, record_date, clock_in, clock_out,
         break_start, break_end, interval_minutes, worked_minutes, overtime_minutes, delay_minutes,
         early_leave_minutes, absent, bank_hours_balance, notes, inconsistency, raw_data, source)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
      RETURNING id
    `, [
      companyId, rec.user_id || null, rec.external_employee_id || null, rec.employee_name || null,
      rec.record_date, rec.clock_in || null, rec.clock_out || null, rec.break_start || null, rec.break_end || null,
      rec.interval_minutes ?? 0, rec.worked_minutes ?? 0, overtime, delay, rec.early_leave_minutes ?? 0,
      rec.absent ?? false, rec.bank_hours_balance ?? 0, rec.notes || null, rec.inconsistency || null,
      JSON.stringify(rec.raw_data || {}), rec.source || 'import'
    ]);
    if (r.rows?.[0]) inserted.push(r.rows[0].id);
  }
  return { imported: inserted.length, ids: inserted };
}

function diffMinutes(a, b) {
  const d = new Date(b) - new Date(a);
  return Math.round(d / 60000);
}

/**
 * Executa sincronização (chamado por job ou webhook)
 * @param {string} companyId
 * @param {string} [systemCode] - Se omitido, usa a primeira integração da empresa
 */
async function runSync(companyId, systemCode) {
  const params = [companyId];
  if (systemCode) params.push(systemCode);
  const r = await db.query(`
    SELECT ti.*, ts.name as system_name
    FROM time_clock_integrations ti
    LEFT JOIN time_clock_systems ts ON ts.code = ti.system_code
    WHERE ti.company_id = $1 AND ti.enabled = true
    ${systemCode ? 'AND ti.system_code = $2' : ''}
    ORDER BY ti.updated_at DESC LIMIT 1
  `, params);
  const int = r.rows?.[0];
  if (!int) return { ok: false, synced: 0 };

  try {
    const apiKey = int.api_key_encrypted ? decrypt(int.api_key_encrypted) : null;
    const url = (int.api_url || '').replace(/\/$/, '') + '/records?since=' + new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const res = await fetch(url, { headers: apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {} });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    const records = Array.isArray(data) ? data : (data.records || data.data || []);
    const result = await importRecords(companyId, records);

    await db.query(`
      UPDATE time_clock_integrations SET last_sync_at = now(), last_sync_status = 'success', last_sync_error = null
      WHERE company_id = $1 AND system_code = $2
    `, [companyId, int.system_code]);

    return { ok: true, synced: result.imported };
  } catch (e) {
    await db.query(`
      UPDATE time_clock_integrations SET last_sync_at = now(), last_sync_status = 'error', last_sync_error = $3
      WHERE company_id = $1 AND system_code = $2
    `, [companyId, int.system_code, (e?.message || 'Erro').slice(0, 500)]);
    return { ok: false, error: e?.message };
  }
}

module.exports = {
  listSystems,
  getIntegration,
  upsertIntegration,
  validateConnection,
  importRecords,
  runSync
};
