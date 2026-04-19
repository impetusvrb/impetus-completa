/**
 * Identificação e ativação de usuário (primeiro acesso + PIN + registro de nomes).
 * Tabelas: user_activation_profiles, user_activation_pins, registered_names, user_identification_audit
 */
'use strict';

const bcrypt = require('bcryptjs');
const db = require('../db');

async function tableExists(name) {
  try {
    const r = await db.query(
      `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1`,
      [name]
    );
    return (r.rows || []).length > 0;
  } catch {
    return false;
  }
}

/**
 * Contexto para prompts de IA (nome preferencial da ativação)
 */
async function getContextForAI(user) {
  const userId = user?.id;
  if (!userId) return null;
  if (!(await tableExists('user_activation_profiles'))) return null;
  try {
    const r = await db.query(
      `SELECT full_name, department, job_title, daily_activities_description
       FROM user_activation_profiles WHERE user_id = $1`,
      [userId]
    );
    const row = r.rows?.[0];
    if (!row) return null;
    return {
      fullName: row.full_name,
      department: row.department,
      jobTitle: row.job_title,
      dailyActivities: row.daily_activities_description || ''
    };
  } catch (e) {
    console.warn('[userIdentification] getContextForAI:', e.message);
    return null;
  }
}

/**
 * Estado da identificação (middleware requireUserVerified)
 */
async function getIdentificationStatus(user) {
  if (!user?.id) {
    return { status: 'pending', reason: 'no_user' };
  }

  if (user.onboarding_completed === true || user.is_first_access === false) {
    return { status: 'verified', source: 'user_flags' };
  }

  if (!(await tableExists('user_activation_profiles'))) {
    return { status: 'verified', source: 'tables_missing' };
  }

  try {
    const pr = await db.query(
      `SELECT 1 FROM user_activation_profiles WHERE user_id = $1`,
      [user.id]
    );
    const hasProfile = (pr.rows || []).length > 0;
    let hasPin = false;
    if (await tableExists('user_activation_pins')) {
      const pinR = await db.query(`SELECT 1 FROM user_activation_pins WHERE user_id = $1`, [user.id]);
      hasPin = (pinR.rows || []).length > 0;
    }

    if (hasProfile && hasPin) {
      return { status: 'verified', source: 'activation' };
    }
    if (!user.is_first_access && !hasProfile) {
      return { status: 'verified', source: 'legacy' };
    }
    return { status: 'pending', hasProfile, hasPin };
  } catch (e) {
    console.warn('[userIdentification] getIdentificationStatus:', e.message);
    return { status: 'verified', source: 'error_fallback' };
  }
}

/**
 * Finaliza primeiro acesso: perfil + PIN
 */
async function completeFirstAccess(user, payload, auditContext = {}) {
  const userId = user?.id;
  const companyId = user?.company_id;
  if (!userId || !companyId) throw new Error('Usuário inválido');

  const {
    fullName,
    department,
    jobTitle,
    dailyActivities = '',
    pin
  } = payload || {};

  if (!fullName || !department || !jobTitle || !/^\d{4}$/.test(String(pin || ''))) {
    throw new Error('Dados de ativação incompletos');
  }

  const pinHash = bcrypt.hashSync(String(pin), 10);

  if (await tableExists('user_activation_profiles')) {
    await db.query(
      `INSERT INTO user_activation_profiles (user_id, company_id, full_name, department, job_title, daily_activities_description)
    VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (user_id) DO UPDATE SET
      full_name = EXCLUDED.full_name,
      department = EXCLUDED.department,
      job_title = EXCLUDED.job_title,
      daily_activities_description = EXCLUDED.daily_activities_description,
         updated_at = now()`,
      [userId, companyId, fullName, department, jobTitle, dailyActivities]
    );
  }

  if (await tableExists('user_activation_pins')) {
    await db.query(
      `INSERT INTO user_activation_pins (user_id, pin_hash)
       VALUES ($1, $2)
       ON CONFLICT (user_id) DO UPDATE SET pin_hash = EXCLUDED.pin_hash, updated_at = now(), failed_attempts = 0, locked_until = NULL`,
      [userId, pinHash]
    );
  }

  try {
    await db.query(
      `UPDATE users SET is_first_access = false, onboarding_completed = true, updated_at = now() WHERE id = $1`,
      [userId]
    );
  } catch (e) {
    console.warn('[userIdentification] update users flags:', e.message);
  }

  await logAudit(userId, companyId, 'first_access_success', { fullName: fullName.slice(0, 80) }, auditContext);
}

/**
 * Valida nome contra registered_names (se a tabela existir)
 */
async function validateNameAgainstRegistry(fullName, companyId, email) {
  if (!fullName || !companyId) {
    return { valid: false, reason: 'Parâmetros inválidos' };
  }
  if (!(await tableExists('registered_names'))) {
    return { valid: true, reason: 'registro_desabilitado' };
  }
  try {
    const cnt = await db.query(
      `SELECT COUNT(*)::int AS c FROM registered_names WHERE company_id = $1 AND status = 'active'`,
      [companyId]
    );
    if ((cnt.rows?.[0]?.c || 0) === 0) {
      return { valid: true, reason: 'lista_vazia' };
    }
    const r = await db.query(
      `SELECT id FROM registered_names
       WHERE company_id = $1 AND status = 'active'
         AND (
           lower(trim(full_name)) = lower(trim($2))
           OR ($3::text IS NOT NULL AND lower(trim(email)) = lower(trim($3)))
         )
       LIMIT 1`,
      [companyId, fullName, email || null]
    );
    if (r.rows?.length) return { valid: true };
    return { valid: false, reason: 'Nome não consta no cadastro prévio da empresa.' };
  } catch (e) {
    console.warn('[userIdentification] validateNameAgainstRegistry:', e.message);
    return { valid: true, reason: 'erro_consulta' };
  }
}

async function logAudit(userId, companyId, eventType, details, auditContext = {}) {
  if (!(await tableExists('user_identification_audit'))) return;
  try {
    await db.query(
      `INSERT INTO user_identification_audit (user_id, company_id, event_type, details, ip_address, user_agent)
       VALUES ($1, $2, $3, $4::jsonb, $5::inet, $6)`,
      [
      userId,
      companyId,
      eventType,
      JSON.stringify(details || {}),
        auditContext.ip || null,
      auditContext.userAgent || null
      ]
    );
  } catch (e) {
    console.warn('[userIdentification] logAudit:', e.message);
  }
}

module.exports = {
  getContextForAI,
  getIdentificationStatus,
  completeFirstAccess,
  validateNameAgainstRegistry,
  logAudit
};
