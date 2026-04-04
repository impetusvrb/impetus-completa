/**
 * Impetus Pulse — serviço principal (autoavaliação blind, campanhas, analytics).
 */
const db = require('../db');
const { buildOperationalSnapshot } = require('./pulseOperationalSnapshot');
const pulseAI = require('./pulseAI');

const EXCLUDED_FROM_EVALUATION = new Set(['ceo', 'diretor', 'admin', 'rh', 'internal_admin']);

function isSubjectToPulse(role) {
  const r = String(role || '').toLowerCase();
  if (!r) return false;
  if (EXCLUDED_FROM_EVALUATION.has(r)) return false;
  return true;
}

function isHrRole(role) {
  return String(role || '').toLowerCase() === 'rh';
}

function isMgmtAggregateRole(role) {
  const r = String(role || '').toLowerCase();
  return ['supervisor', 'coordenador', 'gerente', 'diretor'].includes(r);
}

async function getCompanySettings(companyId) {
  const r = await db.query(
    `SELECT * FROM pulse_company_settings WHERE company_id = $1`,
    [companyId]
  );
  if (r.rows.length) return r.rows[0];
  await db.query(
    `INSERT INTO pulse_company_settings (company_id, pulse_enabled) VALUES ($1, false)
     ON CONFLICT (company_id) DO NOTHING`,
    [companyId]
  );
  const r2 = await db.query(`SELECT * FROM pulse_company_settings WHERE company_id = $1`, [companyId]);
  return r2.rows[0] || { company_id: companyId, pulse_enabled: false };
}

async function setCompanyPulseEnabled(companyId, enabled) {
  await db.query(
    `
    INSERT INTO pulse_company_settings (company_id, pulse_enabled, updated_at)
    VALUES ($1, $2, now())
    ON CONFLICT (company_id) DO UPDATE SET pulse_enabled = EXCLUDED.pulse_enabled, updated_at = now()
  `,
    [companyId, !!enabled]
  );
  return getCompanySettings(companyId);
}

async function loadUser(companyId, userId) {
  const r = await db.query(
    `
    SELECT id, name, email, role, company_id, supervisor_id, department, department_id, job_title
    FROM users
    WHERE id = $1 AND company_id = $2 AND active = true AND deleted_at IS NULL
  `,
    [userId, companyId]
  );
  return r.rows[0] || null;
}

/**
 * Inicia avaliação: gera snapshot + 3 perguntas IA e persiste linha pending_user.
 */
async function startEvaluation(companyId, userId, billing) {
  const settings = await getCompanySettings(companyId);
  if (!settings.pulse_enabled) {
    throw new Error('Impetus Pulse está desativado para esta empresa.');
  }
  const user = await loadUser(companyId, userId);
  if (!user) throw new Error('Usuário não encontrado.');
  if (!isSubjectToPulse(user.role)) {
    throw new Error('Seu perfil não participa do ciclo Impetus Pulse.');
  }

  const open = await db.query(
    `
    SELECT id FROM pulse_evaluations
    WHERE company_id = $1 AND user_id = $2 AND status = 'pending_user'
    LIMIT 1
  `,
    [companyId, userId]
  );
  if (open.rows.length) {
    return getEvaluationForUser(companyId, userId, open.rows[0].id);
  }

  const supervisorId = user.supervisor_id || null;
  const snapshot = await buildOperationalSnapshot(companyId, userId, 30);
  const questions = await pulseAI.generateDynamicQuestions(
    companyId,
    userId,
    snapshot,
    user.name || 'Colaborador',
    billing
  );

  const aiPayload = questions.map((q) => ({
    qid: q.qid,
    text: q.text,
    focus: q.focus || null,
    answer: null,
    score: null
  }));

  const ins = await db.query(
    `
    INSERT INTO pulse_evaluations (
      company_id, user_id, supervisor_id, fixed_scores, ai_custom_questions,
      ai_operational_snapshot, status, scheduled_for, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, 'pending_user', now(), now())
    RETURNING *
  `,
    [
      companyId,
      userId,
      supervisorId,
      JSON.stringify({ efficiency: null, confidence: null, proactivity: null, synergy: null }),
      JSON.stringify(aiPayload),
      JSON.stringify(snapshot)
    ]
  );

  return sanitizeEvaluationForSubject(ins.rows[0]);
}

function parseJsonField(v) {
  if (v == null) return v;
  if (typeof v === 'object') return v;
  try {
    return JSON.parse(v);
  } catch (_) {
    return v;
  }
}

function sanitizeEvaluationForSubject(row) {
  if (!row) return null;
  return {
    id: row.id,
    status: row.status,
    fixed_scores: parseJsonField(row.fixed_scores),
    ai_custom_questions: parseJsonField(row.ai_custom_questions),
    ai_operational_snapshot: parseJsonField(row.ai_operational_snapshot),
    ai_feedback_message: row.ai_feedback_message,
    scheduled_for: row.scheduled_for,
    self_completed_at: row.self_completed_at
  };
}

/**
 * Submete autoavaliação (4 fixas + respostas às 3 dinâmicas).
 */
async function submitSelfEvaluation(companyId, userId, evaluationId, body, billing) {
  const fixed = body.fixed_scores || {};
  const scores = {
    efficiency: Math.min(5, Math.max(1, parseInt(fixed.efficiency, 10) || 0)),
    confidence: Math.min(5, Math.max(1, parseInt(fixed.confidence, 10) || 0)),
    proactivity: Math.min(5, Math.max(1, parseInt(fixed.proactivity, 10) || 0)),
    synergy: Math.min(5, Math.max(1, parseInt(fixed.synergy, 10) || 0))
  };
  if ([scores.efficiency, scores.confidence, scores.proactivity, scores.synergy].some((x) => x < 1)) {
    throw new Error('Informe todas as notas de 1 a 5 nas quatro dimensões fixas.');
  }

  const r = await db.query(
    `
    SELECT * FROM pulse_evaluations
    WHERE id = $1 AND company_id = $2 AND user_id = $3 AND status = 'pending_user'
  `,
    [evaluationId, companyId, userId]
  );
  if (!r.rows.length) throw new Error('Avaliação não encontrada ou já concluída.');

  const row = r.rows[0];
  let aiQuestions = row.ai_custom_questions;
  if (typeof aiQuestions === 'string') aiQuestions = JSON.parse(aiQuestions);
  const answers = body.ai_answers || {};
  aiQuestions = (aiQuestions || []).map((q) => ({
    ...q,
    score: Math.min(5, Math.max(1, parseInt(answers[q.qid] ?? answers[q.qid?.toLowerCase()], 10) || 0)) || q.score
  }));
  for (const q of aiQuestions) {
    if (!q.score || q.score < 1) throw new Error('Responda todas as perguntas dinâmicas (1 a 5).');
  }

  const snapshot =
    typeof row.ai_operational_snapshot === 'string'
      ? JSON.parse(row.ai_operational_snapshot)
      : row.ai_operational_snapshot;

  const feedback = await pulseAI.generateSelfFeedbackMessage(
    companyId,
    userId,
    scores,
    snapshot,
    billing
  );

  const nextStatus = row.supervisor_id ? 'pending_supervisor' : 'completed';
  const pill = await pulseAI.generateMotivationPill(
    companyId,
    userId,
    { scores, snapshot_summary: snapshot },
    billing
  );
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
  const motivationWeek = weekStart.toISOString().slice(0, 10);

  await db.query(
    `
    UPDATE pulse_evaluations SET
      fixed_scores = $1,
      ai_custom_questions = $2,
      ai_feedback_message = $3,
      status = $4,
      self_completed_at = now(),
      motivation_pill = $5,
      motivation_pill_for_week = $6::date,
      updated_at = now()
    WHERE id = $7
  `,
    [
      JSON.stringify(scores),
      JSON.stringify(aiQuestions),
      feedback,
      nextStatus,
      pill,
      motivationWeek,
      evaluationId
    ]
  );

  return { ok: true, status: nextStatus, ai_feedback_message: feedback, motivation_pill: pill };
}

async function submitSupervisorPerception(companyId, supervisorId, evaluationId, text) {
  const t = String(text || '').trim();
  if (t.length < 10) throw new Error('Descreva sua percepção com pelo menos 10 caracteres.');

  const r = await db.query(
    `
    SELECT * FROM pulse_evaluations
    WHERE id = $1 AND company_id = $2 AND supervisor_id = $3 AND status = 'pending_supervisor'
  `,
    [evaluationId, companyId, supervisorId]
  );
  if (!r.rows.length) throw new Error('Avaliação não encontrada ou não pendente para você.');

  await db.query(
    `
    UPDATE pulse_evaluations SET
      supervisor_perception = $1,
      status = 'completed',
      supervisor_completed_at = now(),
      updated_at = now()
    WHERE id = $2
  `,
    [t, evaluationId]
  );

  return { ok: true };
}

/** Lista pendências para supervisor — SEM dados da autoavaliação. */
async function listSupervisorBlindPending(companyId, supervisorId) {
  const r = await db.query(
    `
    SELECT e.id, e.user_id, e.scheduled_for, e.self_completed_at, u.name AS user_name, u.job_title
    FROM pulse_evaluations e
    JOIN users u ON u.id = e.user_id
    WHERE e.company_id = $1 AND e.supervisor_id = $2 AND e.status = 'pending_supervisor'
    ORDER BY e.self_completed_at ASC NULLS LAST
  `,
    [companyId, supervisorId]
  );
  return r.rows;
}

/** RH — lista completa */
async function listHrEvaluations(companyId, filters) {
  const { from, to, status, limit = 200 } = filters;
  const params = [companyId];
  let sql = `
    SELECT e.*, u.name AS user_name, u.job_title, u.department,
           s.name AS supervisor_name
    FROM pulse_evaluations e
    JOIN users u ON u.id = e.user_id
    LEFT JOIN users s ON s.id = e.supervisor_id
    WHERE e.company_id = $1
  `;
  let i = 2;
  if (from) {
    sql += ` AND e.created_at >= $${i}::date`;
    params.push(from);
    i++;
  }
  if (to) {
    sql += ` AND e.created_at < ($${i}::date + interval '1 day')`;
    params.push(to);
    i++;
  }
  if (status) {
    sql += ` AND e.status = $${i}`;
    params.push(status);
    i++;
  }
  sql += ` ORDER BY e.created_at DESC LIMIT $${i}`;
  params.push(Math.min(parseInt(limit, 10) || 200, 500));
  const r = await db.query(sql, params);
  return r.rows;
}

/** Agregados para gestão (sem texto individual identificável além do necessário — aqui médias globais). */
async function getMgmtAggregates(companyId, filters) {
  const { from, to, department_id } = filters;
  const params = [companyId];
  let where = `WHERE e.company_id = $1 AND e.status = 'completed'`;
  let i = 2;
  if (from) {
    where += ` AND e.self_completed_at >= $${i}::date`;
    params.push(from);
    i++;
  }
  if (to) {
    where += ` AND e.self_completed_at < ($${i}::date + interval '1 day')`;
    params.push(to);
    i++;
  }
  if (department_id) {
    where += ` AND u.department_id = $${i}`;
    params.push(department_id);
    i++;
  }

  const r = await db.query(
    `
    SELECT
      COUNT(*)::int AS n,
      AVG((e.fixed_scores->>'efficiency')::numeric) AS avg_efficiency,
      AVG((e.fixed_scores->>'confidence')::numeric) AS avg_confidence,
      AVG((e.fixed_scores->>'proactivity')::numeric) AS avg_proactivity,
      AVG((e.fixed_scores->>'synergy')::numeric) AS avg_synergy
    FROM pulse_evaluations e
    JOIN users u ON u.id = e.user_id
    ${where}
  `,
    params
  );

  const byDept = await db.query(
    `
    SELECT u.department, COUNT(*)::int AS n,
      AVG((e.fixed_scores->>'efficiency')::numeric) AS avg_efficiency,
      AVG((e.fixed_scores->>'confidence')::numeric) AS avg_confidence,
      AVG((e.fixed_scores->>'proactivity')::numeric) AS avg_proactivity,
      AVG((e.fixed_scores->>'synergy')::numeric) AS avg_synergy
    FROM pulse_evaluations e
    JOIN users u ON u.id = e.user_id
    ${where}
    GROUP BY u.department
    ORDER BY n DESC
  `,
    params
  );

  let by_period = [];
  const bucket = String(filters.bucket || '').toLowerCase();
  const trunc = { week: 'week', month: 'month', quarter: 'quarter' }[bucket];
  if (trunc) {
    const periodParams = [...params, trunc];
    const tn = periodParams.length;
    const pr = await db.query(
      `
      SELECT date_trunc($${tn}::text, e.self_completed_at AT TIME ZONE 'UTC') AS ts,
        COUNT(*)::int AS n,
        AVG((e.fixed_scores->>'efficiency')::numeric) AS avg_efficiency,
        AVG((e.fixed_scores->>'confidence')::numeric) AS avg_confidence,
        AVG((e.fixed_scores->>'proactivity')::numeric) AS avg_proactivity,
        AVG((e.fixed_scores->>'synergy')::numeric) AS avg_synergy
      FROM pulse_evaluations e
      JOIN users u ON u.id = e.user_id
      ${where}
      GROUP BY date_trunc($${tn}::text, e.self_completed_at AT TIME ZONE 'UTC')
      ORDER BY 1
    `,
      periodParams
    );
    by_period = (pr.rows || []).map((row) => ({
      ...row,
      period_start: row.ts,
      label: row.ts ? new Date(row.ts).toISOString().slice(0, 10) : ''
    }));
  }

  return {
    summary: r.rows[0] || {},
    by_department: byDept.rows || [],
    by_period
  };
}

const DATE_TRUNC_WHITELIST = { week: 'week', month: 'month', quarter: 'quarter' };

/**
 * Analytics completo RH: agregados, temporal, funil, dispersão (apenas RH).
 */
async function getHrAnalytics(companyId, filters = {}) {
  let { from, to, bucket, department_id, shift_code, team_label } = filters;
  const toD = to || new Date().toISOString().slice(0, 10);
  let fromD = from;
  if (!fromD) {
    const d = new Date(toD);
    d.setDate(d.getDate() - 90);
    fromD = d.toISOString().slice(0, 10);
  }
  const trunc = DATE_TRUNC_WHITELIST[String(bucket || 'month').toLowerCase()] || 'month';

  const params = [companyId];
  let whereCompleted = `WHERE e.company_id = $1 AND e.status = 'completed'
    AND e.self_completed_at IS NOT NULL
    AND e.self_completed_at >= $2::date
    AND e.self_completed_at < ($3::date + interval '1 day')`;
  params.push(fromD, toD);
  let i = 4;

  if (department_id) {
    whereCompleted += ` AND u.department_id = $${i}`;
    params.push(department_id);
    i++;
  }
  if (shift_code) {
    whereCompleted += ` AND COALESCE(u.pulse_shift_code, '') = $${i}`;
    params.push(String(shift_code));
    i++;
  }
  if (team_label) {
    whereCompleted += ` AND COALESCE(u.pulse_team_label, '') ILIKE $${i}`;
    params.push(`%${String(team_label).trim()}%`);
    i++;
  }

  const summary = await db.query(
    `
    SELECT
      COUNT(*)::int AS n,
      AVG((e.fixed_scores->>'efficiency')::numeric) AS avg_efficiency,
      AVG((e.fixed_scores->>'confidence')::numeric) AS avg_confidence,
      AVG((e.fixed_scores->>'proactivity')::numeric) AS avg_proactivity,
      AVG((e.fixed_scores->>'synergy')::numeric) AS avg_synergy
    FROM pulse_evaluations e
    JOIN users u ON u.id = e.user_id
    ${whereCompleted}
  `,
    params
  );

  const byDept = await db.query(
    `
    SELECT COALESCE(u.department, 'Sem setor') AS department, COUNT(*)::int AS n,
      AVG((e.fixed_scores->>'efficiency')::numeric) AS avg_efficiency,
      AVG((e.fixed_scores->>'confidence')::numeric) AS avg_confidence,
      AVG((e.fixed_scores->>'proactivity')::numeric) AS avg_proactivity,
      AVG((e.fixed_scores->>'synergy')::numeric) AS avg_synergy
    FROM pulse_evaluations e
    JOIN users u ON u.id = e.user_id
    ${whereCompleted}
    GROUP BY COALESCE(u.department, 'Sem setor')
    ORDER BY n DESC
  `,
    params
  );

  const periodParams = [...params, trunc];
  const tn = periodParams.length;
  const byPeriod = await db.query(
    `
    SELECT date_trunc($${tn}::text, e.self_completed_at AT TIME ZONE 'UTC') AS ts,
      COUNT(*)::int AS n,
      AVG((e.fixed_scores->>'efficiency')::numeric) AS avg_efficiency,
      AVG((e.fixed_scores->>'confidence')::numeric) AS avg_confidence,
      AVG((e.fixed_scores->>'proactivity')::numeric) AS avg_proactivity,
      AVG((e.fixed_scores->>'synergy')::numeric) AS avg_synergy
    FROM pulse_evaluations e
    JOIN users u ON u.id = e.user_id
    ${whereCompleted}
    GROUP BY date_trunc($${tn}::text, e.self_completed_at AT TIME ZONE 'UTC')
    ORDER BY 1
  `,
    periodParams
  );

  const statusParams = [companyId, fromD, toD];
  let whereStatus = `WHERE e.company_id = $1 AND e.created_at >= $2::date AND e.created_at < ($3::date + interval '1 day')`;
  let j = 4;
  if (department_id) {
    whereStatus += ` AND u.department_id = $${j}`;
    statusParams.push(department_id);
    j++;
  }
  if (shift_code) {
    whereStatus += ` AND COALESCE(u.pulse_shift_code, '') = $${j}`;
    statusParams.push(String(shift_code));
    j++;
  }
  if (team_label) {
    whereStatus += ` AND COALESCE(u.pulse_team_label, '') ILIKE $${j}`;
    statusParams.push(`%${String(team_label).trim()}%`);
    j++;
  }

  const byStatus = await db.query(
    `
    SELECT e.status, COUNT(*)::int AS n
    FROM pulse_evaluations e
    JOIN users u ON u.id = e.user_id
    ${whereStatus}
    GROUP BY e.status
    ORDER BY n DESC
  `,
    statusParams
  );

  const scatterParams = [...params];
  const scatter = await db.query(
    `
    SELECT e.user_id, u.name AS user_name,
      (e.fixed_scores->>'efficiency')::numeric AS efficiency,
      (e.fixed_scores->>'synergy')::numeric AS synergy,
      (e.fixed_scores->>'confidence')::numeric AS confidence,
      (e.fixed_scores->>'proactivity')::numeric AS proactivity
    FROM pulse_evaluations e
    JOIN users u ON u.id = e.user_id
    ${whereCompleted}
    ORDER BY e.self_completed_at DESC
    LIMIT 200
  `,
    scatterParams
  );

  return {
    filters: { from: fromD, to: toD, bucket: trunc, department_id: department_id || null, shift_code: shift_code || null, team_label: team_label || null },
    summary: summary.rows[0] || {},
    by_department: byDept.rows || [],
    by_period: (byPeriod.rows || []).map((row) => ({
      ...row,
      period_start: row.ts,
      label: row.ts ? new Date(row.ts).toISOString().slice(0, 10) : ''
    })),
    by_status: byStatus.rows || [],
    scatter_points: scatter.rows || []
  };
}

async function generateHrReport(companyId, userId, evaluationId, billing) {
  const r = await db.query(
    `SELECT * FROM pulse_evaluations WHERE id = $1 AND company_id = $2 AND status = 'completed'`,
    [evaluationId, companyId]
  );
  if (!r.rows.length) throw new Error('Avaliação não encontrada ou incompleta.');

  const evaluation = r.rows[0];
  const report = await pulseAI.generateHrDiagnosticReport(companyId, userId, evaluation, billing);
  await db.query(
    `UPDATE pulse_evaluations SET ai_diagnostic_report = $1, updated_at = now() WHERE id = $2`,
    [JSON.stringify(report), evaluationId]
  );
  return report;
}

async function getMotivationPillForUser(companyId, userId) {
  const r = await db.query(
    `
    SELECT motivation_pill, motivation_pill_for_week, self_completed_at
    FROM pulse_evaluations
    WHERE company_id = $1 AND user_id = $2 AND motivation_pill IS NOT NULL
    ORDER BY self_completed_at DESC NULLS LAST
    LIMIT 1
  `,
    [companyId, userId]
  );
  return r.rows[0] || null;
}

/** Verifica se deve exibir prompt (pop-up) — há avaliação pending_user agendada. */
async function getPendingPromptForUser(companyId, userId) {
  const settings = await getCompanySettings(companyId);
  if (!settings.pulse_enabled) return { show: false };

  const user = await loadUser(companyId, userId);
  if (!user || !isSubjectToPulse(user.role)) return { show: false };

  const r = await db.query(
    `
    SELECT id FROM pulse_evaluations
    WHERE company_id = $1 AND user_id = $2 AND status = 'pending_user'
      AND scheduled_for <= now()
    ORDER BY scheduled_for ASC
    LIMIT 1
  `,
    [companyId, userId]
  );
  if (!r.rows.length) return { show: false };
  const ev = await getEvaluationForUser(companyId, userId, r.rows[0].id);
  return { show: true, evaluation: ev };
}

async function getEvaluationForUser(companyId, userId, evaluationId) {
  const r = await db.query(
    `
    SELECT * FROM pulse_evaluations
    WHERE id = $1 AND company_id = $2 AND user_id = $3
  `,
    [evaluationId, companyId, userId]
  );
  if (!r.rows.length) return null;
  return sanitizeEvaluationForSubject(r.rows[0]);
}

/** RH / Admin: dispara ciclo — cria avaliações pending_user para usuários elegíveis. */
async function triggerCampaignForUsers(companyId, userIds, opts = {}) {
  const settings = await getCompanySettings(companyId);
  if (!settings.pulse_enabled) throw new Error('Ative o Pulse nas configurações da empresa.');

  const ids = Array.isArray(userIds) ? userIds : [];
  let targets = ids;
  if (opts.all_eligible) {
    const targetRoles = Array.isArray(opts.target_roles) && opts.target_roles.length
      ? opts.target_roles.map((r) => String(r).toLowerCase())
      : null;
    let sql = `
      SELECT id, role FROM users
      WHERE company_id = $1 AND active = true AND deleted_at IS NULL
    `;
    const params = [companyId];
    if (targetRoles) {
      sql += ` AND lower(coalesce(role, '')) = ANY($2::text[])`;
      params.push(targetRoles);
    }
    const r = await db.query(sql, params);
    targets = (r.rows || []).map((x) => x.id);
  }

  let created = 0;
  for (const uid of targets) {
    const u = await loadUser(companyId, uid);
    if (!u || !isSubjectToPulse(u.role)) continue;
    const ex = await db.query(
      `SELECT id FROM pulse_evaluations WHERE company_id = $1 AND user_id = $2 AND status = 'pending_user'`,
      [companyId, uid]
    );
    if (ex.rows.length) continue;

    const snapshot = await buildOperationalSnapshot(companyId, uid, 30);
    const questions = pulseAI.templateQuestions(snapshot, u.name);
    const aiPayload = questions.map((q) => ({
      qid: q.qid,
      text: q.text,
      focus: q.focus || null,
      answer: null,
      score: null
    }));

    await db.query(
      `
      INSERT INTO pulse_evaluations (
        company_id, user_id, supervisor_id, fixed_scores, ai_custom_questions,
        ai_operational_snapshot, status, scheduled_for, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, 'pending_user', now(), now())
    `,
      [
        companyId,
        uid,
        u.supervisor_id || null,
        JSON.stringify({ efficiency: null, confidence: null, proactivity: null, synergy: null }),
        JSON.stringify(aiPayload),
        JSON.stringify(snapshot)
      ]
    );
    created++;
  }
  return { created };
}

async function listCampaigns(companyId) {
  const r = await db.query(
    `SELECT * FROM pulse_campaigns WHERE company_id = $1 ORDER BY created_at DESC`,
    [companyId]
  );
  return r.rows;
}

async function createCampaign(companyId, body, createdBy) {
  const r = await db.query(
    `
    INSERT INTO pulse_campaigns (company_id, title, frequency, target_roles, is_active, next_run_at, created_by)
    VALUES ($1, $2, $3, $4, true, $5, $6)
    RETURNING *
  `,
    [
      companyId,
      body.title || 'Campanha Pulse',
      body.frequency || 'monthly',
      body.target_roles || ['operador', 'colaborador', 'supervisor', 'coordenador', 'gerente'],
      body.next_run_at || null,
      createdBy || null
    ]
  );
  return r.rows[0];
}

module.exports = {
  isSubjectToPulse,
  isHrRole,
  isMgmtAggregateRole,
  getCompanySettings,
  setCompanyPulseEnabled,
  startEvaluation,
  submitSelfEvaluation,
  submitSupervisorPerception,
  listSupervisorBlindPending,
  listHrEvaluations,
  getMgmtAggregates,
  getHrAnalytics,
  generateHrReport,
  getMotivationPillForUser,
  getPendingPromptForUser,
  getEvaluationForUser,
  triggerCampaignForUsers,
  listCampaigns,
  createCampaign,
  loadUser
};
