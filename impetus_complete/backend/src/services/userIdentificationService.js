/**
 * SERVIÇO DE IDENTIFICAÇÃO E ATIVAÇÃO DE USUÁRIO
 * Gerencia: primeiro login (ativação), validação de nome, PIN e verificação diária
 * Segurança: PIN sempre hasheado, auditoria de falhas, bloqueio após tentativas
 */
const db = require('../db');
const bcrypt = require('bcrypt');

const MAX_PIN_ATTEMPTS = 3;
const LOCK_MINUTES = 15;
const SALT_ROUNDS = 10;

/**
 * Normaliza nome para comparação (case-insensitive, trim)
 */
function normalizeName(name) {
  if (!name || typeof name !== 'string') return '';
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Verifica se nome existe no registro pré-existente OU na tabela users
 * Fallback: se não houver registered_names, popula a partir de users e valida
 */
async function validateNameAgainstRegistry(fullName, companyId, userEmail = null) {
  const norm = normalizeName(fullName);
  if (!norm) return { valid: false, reason: 'Nome vazio ou inválido' };

  // 0. Se registered_names vazio para a empresa, popular a partir de users (simulação)
  const count = await db.query('SELECT COUNT(*) as n FROM registered_names WHERE company_id = $1', [companyId]);
  if (parseInt(count.rows[0]?.n || 0, 10) === 0) {
    await seedRegisteredNamesFromUsers(companyId);
  }

  // 1. Tentar registered_names (registro HR)
  const rn = await db.query(
    `SELECT id FROM registered_names 
     WHERE company_id = $1 AND status = 'active' 
     AND lower(trim(full_name)) = $2`,
    [companyId, norm]
  );
  if (rn.rows.length > 0) return { valid: true };

  // 2. Fallback: users da empresa (simulação quando sem registered_names)
  const u = await db.query(
    `SELECT id FROM users 
     WHERE company_id = $1 AND deleted_at IS NULL AND active = true
     AND (lower(trim(name)) = $2 OR ($3::text IS NOT NULL AND lower(email) = lower($3)))`,
    [companyId, norm, userEmail]
  );
  if (u.rows.length > 0) return { valid: true };

  return { valid: false, reason: 'Nome não encontrado no registro da empresa' };
}

/**
 * Status de identificação do usuário
 * @returns { status: 'needs_activation' | 'needs_daily_verify' | 'verified', profile?, pinLockedUntil? }
 */
async function getIdentificationStatus(user) {
  const userId = user?.id;
  const companyId = user?.company_id;
  if (!userId || !companyId) {
    return { status: 'needs_activation', reason: 'Usuário sem empresa' };
  }

  const [profile, pinRow, todayVerify] = await Promise.all([
    db.query('SELECT * FROM user_activation_profiles WHERE user_id = $1', [userId]),
    db.query('SELECT * FROM user_activation_pins WHERE user_id = $1', [userId]),
    db.query(
      'SELECT id FROM user_daily_verification WHERE user_id = $1 AND verification_date = CURRENT_DATE',
      [userId]
    )
  ]);

  // Não tem perfil = primeiro acesso (ativação)
  if (profile.rows.length === 0) {
    return { status: 'needs_activation', reason: 'Primeiro acesso' };
  }

  const pin = pinRow.rows[0];
  const lockedUntil = pin?.locked_until ? new Date(pin.locked_until) : null;
  if (lockedUntil && lockedUntil > new Date()) {
    return {
      status: 'needs_daily_verify',
      profile: profile.rows[0],
      pinLockedUntil: lockedUntil,
      reason: 'PIN bloqueado temporariamente'
    };
  }

  // Já verificou hoje = ok
  if (todayVerify.rows.length > 0) {
    return {
      status: 'verified',
      profile: profile.rows[0],
      verifiedAt: todayVerify.rows[0].verified_at
    };
  }

  return { status: 'needs_daily_verify', profile: profile.rows[0], reason: 'Verificação diária pendente' };
}

/**
 * Processa primeiro acesso: valida nome, salva perfil e cria PIN
 */
async function completeFirstAccess(user, data, auditContext = {}) {
  const { fullName, department, jobTitle, dailyActivities, pin } = data;
  const userId = user.id;
  const companyId = user.company_id;

  if (!fullName?.trim() || !department?.trim() || !jobTitle?.trim()) {
    throw new Error('Nome completo, setor e cargo são obrigatórios');
  }

  const pinStr = String(pin || '').trim();
  if (pinStr.length !== 4 || !/^\d{4}$/.test(pinStr)) {
    throw new Error('PIN deve ser exatamente 4 dígitos numéricos');
  }

  const validation = await validateNameAgainstRegistry(fullName, companyId, user.email);
  if (!validation.valid) {
    await logAudit(userId, companyId, 'invalid_name', { fullName, reason: validation.reason }, auditContext);
    throw new Error(validation.reason || 'Nome não encontrado no registro');
  }

  const pinHash = await bcrypt.hash(pinStr, SALT_ROUNDS);

  await db.query(`
    INSERT INTO user_activation_profiles (user_id, company_id, full_name, department, job_title, daily_activities_description)
    VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (user_id) DO UPDATE SET
      full_name = EXCLUDED.full_name,
      department = EXCLUDED.department,
      job_title = EXCLUDED.job_title,
      daily_activities_description = EXCLUDED.daily_activities_description,
      updated_at = now()
  `, [userId, companyId, fullName.trim(), department.trim(), jobTitle.trim(), (dailyActivities || '').trim()]);

  await db.query(`
    INSERT INTO user_activation_pins (user_id, pin_hash, failed_attempts, locked_until, updated_at)
    VALUES ($1, $2, 0, NULL, now())
    ON CONFLICT (user_id) DO UPDATE SET
      pin_hash = EXCLUDED.pin_hash,
      failed_attempts = 0,
      locked_until = NULL,
      updated_at = now()
  `, [userId, pinHash]);

  // Registrar verificação de hoje (já está ativo)
  await recordDailyVerification(userId, auditContext);

  await logAudit(userId, companyId, 'first_access_success', { fullName, department, jobTitle }, auditContext);

  return { ok: true, status: 'verified' };
}

/**
 * Verificação diária: nome + PIN
 * Em falha: incrementa tentativas, bloqueia após 3, encerra sessão, audita
 */
async function verifyDailyAccess(user, fullName, pin, auditContext = {}) {
  const userId = user.id;
  const companyId = user.company_id;

  const [profile, pinRow] = await Promise.all([
    db.query('SELECT * FROM user_activation_profiles WHERE user_id = $1', [userId]),
    db.query('SELECT * FROM user_activation_pins WHERE user_id = $1', [userId])
  ]);

  if (profile.rows.length === 0) {
    await logAudit(userId, companyId, 'daily_verify_failure', { reason: 'Perfil não ativado' }, auditContext);
    throw new Error('Complete o primeiro acesso antes de verificar.');
  }

  const p = pinRow.rows[0];
  if (!p) {
    await logAudit(userId, companyId, 'daily_verify_failure', { reason: 'PIN não configurado' }, auditContext);
    throw new Error('PIN não configurado. Entre em contato com o administrador.');
  }

  const lockedUntil = p.locked_until ? new Date(p.locked_until) : null;
  if (lockedUntil && lockedUntil > new Date()) {
    await logAudit(userId, companyId, 'pin_lockout', { lockedUntil: lockedUntil.toISOString() }, auditContext);
    throw new Error(`Acesso bloqueado por ${LOCK_MINUTES} minutos devido a tentativas incorretas. Tente mais tarde.`);
  }

  const profileFullName = profile.rows[0].full_name;
  const nameMatch = normalizeName(fullName) === normalizeName(profileFullName);
  if (!nameMatch) {
    await logAudit(userId, companyId, 'daily_verify_failure', { reason: 'Nome não confere' }, auditContext);
    throw new Error('Nome não confere com o cadastro. Verifique e tente novamente.');
  }

  const pinValid = await bcrypt.compare(String(pin || '').trim(), p.pin_hash);
  if (!pinValid) {
    const newAttempts = (p.failed_attempts || 0) + 1;
    const lockUntil = newAttempts >= MAX_PIN_ATTEMPTS
      ? new Date(Date.now() + LOCK_MINUTES * 60 * 1000)
      : null;

    await db.query(`
      UPDATE user_activation_pins 
      SET failed_attempts = $1, locked_until = $2, updated_at = now()
      WHERE user_id = $3
    `, [newAttempts, lockUntil, userId]);

    await logAudit(userId, companyId, 'pin_failure', {
      attempts: newAttempts,
      lockout: !!lockUntil
    }, auditContext);

    if (lockUntil) {
      await logAudit(userId, companyId, 'pin_lockout', { lockedUntil: lockUntil.toISOString() }, auditContext);
      throw new Error(`PIN incorreto. Você excedeu ${MAX_PIN_ATTEMPTS} tentativas. Acesso bloqueado por ${LOCK_MINUTES} minutos. Uma alerta de segurança foi registrado.`);
    }
    throw new Error('PIN incorreto. Tente novamente.');
  }

  await db.query(`
    UPDATE user_activation_pins SET failed_attempts = 0, locked_until = NULL, updated_at = now() WHERE user_id = $1
  `, [userId]);

  await recordDailyVerification(userId, auditContext);
  await logAudit(userId, companyId, 'daily_verify_success', {}, auditContext);

  return { ok: true, status: 'verified', profile: profile.rows[0] };
}

async function recordDailyVerification(userId, auditContext = {}) {
  const ip = auditContext.ipAddress || null;
  const ua = auditContext.userAgent || null;

  await db.query(`
    INSERT INTO user_daily_verification (user_id, verification_date, ip_address, user_agent)
    VALUES ($1, CURRENT_DATE, $2::inet, $3)
    ON CONFLICT (user_id, verification_date) DO UPDATE SET
      verified_at = now(),
      ip_address = COALESCE(EXCLUDED.ip_address, user_daily_verification.ip_address),
      user_agent = COALESCE(EXCLUDED.user_agent, user_daily_verification.user_agent)
  `, [userId, ip, ua]);
}

async function logAudit(userId, companyId, eventType, details, auditContext = {}) {
  try {
    await db.query(`
      INSERT INTO user_identification_audit (user_id, company_id, event_type, details, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5::inet, $6)
    `, [
      userId,
      companyId,
      eventType,
      JSON.stringify(details || {}),
      auditContext.ipAddress || null,
      auditContext.userAgent || null
    ]);
  } catch (err) {
    console.error('[IDENTIFICATION_AUDIT_ERROR]', err.message);
  }
}

/**
 * Retorna contexto do usuário para a IA (nome, cargo, setor, atividades)
 */
async function getContextForAI(user) {
  const r = await db.query(
    'SELECT full_name, department, job_title, daily_activities_description FROM user_activation_profiles WHERE user_id = $1',
    [user?.id]
  );
  const p = r.rows[0];
  if (!p) return null;
  return {
    fullName: p.full_name,
    department: p.department,
    jobTitle: p.job_title,
    dailyActivities: p.daily_activities_description
  };
}

/**
 * Popula registered_names a partir de users (para simulação quando vazio)
 */
async function seedRegisteredNamesFromUsers(companyId) {
  const users = await db.query(`
    SELECT company_id, name, email FROM users 
    WHERE company_id = $1 AND deleted_at IS NULL AND active = true AND name IS NOT NULL AND trim(name) != ''
  `, [companyId]);
  let count = 0;
  for (const row of users.rows) {
    try {
      await db.query(`
        INSERT INTO registered_names (company_id, full_name, email, status)
        VALUES ($1, $2, $3, 'active')
      `, [row.company_id, row.name, row.email]);
      count++;
    } catch (_) { /* ignora duplicatas */ }
  }
  return count;
}

module.exports = {
  getIdentificationStatus,
  completeFirstAccess,
  verifyDailyAccess,
  validateNameAgainstRegistry,
  getContextForAI,
  seedRegisteredNamesFromUsers,
  normalizeName,
  logAudit,
  MAX_PIN_ATTEMPTS,
  LOCK_MINUTES
};
