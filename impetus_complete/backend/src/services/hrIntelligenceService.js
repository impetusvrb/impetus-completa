/**
 * IMPETUS - Inteligência de RH
 * Análise de jornada, indicadores, alertas, distribuição por cargo/perfil
 */
const db = require('../db');
const ai = require('./ai');

const RESPONSIBILITY_KEYWORDS = {
  controle_ponto: /ponto|controle de ponto|registro de jornada|marcação/i,
  gestao_equipe: /gestão de equipe|gestao de equipe|supervisão de equipe|comportamento da equipe/i,
  gestao_folha: /folha|gestão de folha|folha de pagamento/i,
  supervisao_producao: /supervisão de produção|supervisao de producao|produção/i,
  admin_departamento: /administração de departamento|admin departamento|departamento pessoal|dp|rh/i
};

/**
 * Extrai responsabilidades do texto (IA ou regex)
 */
function parseResponsibilities(text) {
  if (!text || typeof text !== 'string') return [];
  const found = [];
  for (const [key, regex] of Object.entries(RESPONSIBILITY_KEYWORDS)) {
    if (regex.test(text)) found.push(key);
  }
  return found;
}

/**
 * Calcula indicadores de RH a partir dos registros de ponto
 */
async function calculateIndicators(companyId, days = 30) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const r = await db.query(`
    SELECT
      COUNT(*) as total_records,
      COUNT(*) FILTER (WHERE delay_minutes > 0) as delays_count,
      SUM(delay_minutes) as total_delay_min,
      COUNT(*) FILTER (WHERE absent = true) as absences_count,
      SUM(overtime_minutes) as total_overtime_min,
      COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL) + COUNT(DISTINCT external_employee_id) FILTER (WHERE external_employee_id IS NOT NULL) as employees_count
    FROM time_clock_records
    WHERE company_id = $1 AND record_date >= $2
  `, [companyId, since]);

  const row = r.rows?.[0] || {};
  const total = parseInt(row.total_records || 0, 10);
  const employees = Math.max(1, parseInt(row.employees_count || 1, 10));
  const delaysCount = parseInt(row.delays_count || 0, 10);
  const totalDelayMin = parseInt(row.total_delay_min || 0, 10);
  const absences = parseInt(row.absences_count || 0, 10);
  const overtimeMin = parseInt(row.total_overtime_min || 0, 10);
  const expectedDays = employees * Math.min(days, 22);

  const delayIndex = total > 0 ? Math.round((delaysCount / total) * 100 * 100) / 100 : 0;
  const absenceIndex = expectedDays > 0 ? Math.round((absences / expectedDays) * 100 * 100) / 100 : 0;
  const presenceCompliance = total > 0 ? Math.round((1 - absences / total) * 10000) / 100 : 100;
  const fatigueRisk = overtimeMin > employees * 60 * 10 ? Math.min(100, Math.round(overtimeMin / employees / 60)) : 0;

  const snapshot = {
    delay_index: delayIndex,
    absence_index: absenceIndex,
    overtime_load: overtimeMin,
    fatigue_risk_index: fatigueRisk,
    presence_compliance: presenceCompliance,
    by_department: {}
  };

  await db.query(`
    DELETE FROM hr_indicators_snapshot WHERE company_id = $1 AND snapshot_date = CURRENT_DATE
  `, [companyId]);
  await db.query(`
    INSERT INTO hr_indicators_snapshot (company_id, snapshot_date, delay_index, absence_index, overtime_load, fatigue_risk_index, presence_compliance, by_department)
    VALUES ($1, CURRENT_DATE, $2, $3, $4, $5, $6, $7)
  `, [companyId, delayIndex, absenceIndex, overtimeMin, fatigueRisk, presenceCompliance, JSON.stringify(snapshot.by_department)]);

  return snapshot;
}

/**
 * Obtém indicadores (calcula se necessário)
 */
async function getIndicators(companyId, days = 30) {
  const r = await db.query(`
    SELECT * FROM hr_indicators_snapshot
    WHERE company_id = $1 AND snapshot_date >= CURRENT_DATE - $2::int
    ORDER BY snapshot_date DESC LIMIT 1
  `, [companyId, days]);

  if (r.rows?.[0]) return r.rows[0];
  return calculateIndicators(companyId, days);
}

/**
 * Lista registros para relatório (filtrado por perfil)
 */
async function getRecords(companyId, opts = {}) {
  const { since, until, user_id, limit = 100 } = opts;
  const sinceDate = since || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const untilDate = until || new Date().toISOString().slice(0, 10);

  let sql = `
    SELECT r.*, u.name as user_name
    FROM time_clock_records r
    LEFT JOIN users u ON u.id = r.user_id
    WHERE r.company_id = $1 AND r.record_date >= $2 AND r.record_date <= $3
  `;
  const params = [companyId, sinceDate, untilDate];
  if (user_id) { params.push(user_id); sql += ` AND (r.user_id = $${params.length} OR r.external_employee_id = $${params.length})`; }
  params.push(limit);
  sql += ` ORDER BY r.record_date DESC, r.clock_in DESC LIMIT $${params.length}`;

  const r = await db.query(sql, params);
  return r.rows || [];
}

/**
 * Detecção de padrões e geração de alertas
 */
async function detectAndCreateAlerts(companyId) {
  const indicators = await getIndicators(companyId, 7);
  const prev = await db.query(`
    SELECT delay_index, absence_index, overtime_load FROM hr_indicators_snapshot
    WHERE company_id = $1 AND snapshot_date = CURRENT_DATE - 7
    ORDER BY snapshot_date DESC LIMIT 1
  `, [companyId]).then((r) => r.rows?.[0]);

  const alerts = [];
  if (prev && indicators.delay_index > prev.delay_index * 1.25) {
    alerts.push({ alert_type: 'aumento_atrasos', severity: 'high', title: 'Aumento de atrasos', description: `Índice de atrasos subiu de ${prev.delay_index}% para ${indicators.delay_index}%` });
  }
  if (prev && (indicators.overtime_load || 0) > (prev.overtime_load || 0) * 1.3) {
    alerts.push({ alert_type: 'excesso_horas_extras', severity: 'high', title: 'Excesso de horas extras', description: 'Carga de horas extras aumentou significativamente' });
  }
  if (indicators.absence_index > 5) {
    alerts.push({ alert_type: 'faltas_recorrentes', severity: 'medium', title: 'Faltas recorrentes', description: `Índice de faltas em ${indicators.absence_index}%` });
  }
  if (indicators.fatigue_risk_index > 50) {
    alerts.push({ alert_type: 'risco_fadiga', severity: 'high', title: 'Risco de desgaste de equipe', description: 'Alta carga de horas extras indica possível fadiga' });
  }

  for (const a of alerts) {
    await db.query(`
      INSERT INTO hr_alerts (company_id, alert_type, severity, title, description, metrics)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [companyId, a.alert_type, a.severity, a.title, a.description, JSON.stringify(indicators)]);
  }
  return alerts;
}

/**
 * Determina o que o usuário deve receber com base no perfil
 */
function getViewProfileForUser(user) {
  const role = (user.role || '').toLowerCase();
  const hierarchy = user.hierarchy_level ?? 5;
  const jobTitle = (user.job_title || '').toLowerCase();
  const funcArea = (user.functional_area || '').toLowerCase();
  const responsibilities = user.hr_responsibilities_parsed || parseResponsibilities(user.hr_responsibilities || '');

  if (role === 'ceo' || hierarchy <= 0) {
    return { level: 'ceo', receives: ['strategic_view', 'financial_impact', 'productivity_trends', 'risk_operational'] };
  }
  if (role === 'diretor' || hierarchy <= 1) {
    return { level: 'diretor', receives: ['jornada_produtividade', 'custos_horas_extras', 'eficiencia_equipe'] };
  }
  if (role === 'gerente' || hierarchy <= 2 || funcArea === 'hr') {
    return { level: 'gerente', receives: ['comportamento_equipe', 'absenteismo', 'horas_extras_setor', 'produtividade_equipe'] };
  }
  if (role === 'supervisor' || responsibilities.includes('controle_ponto') || /supervisor|rh|departamento pessoal|controle ponto/i.test(jobTitle + ' ' + (user.hr_responsibilities || ''))) {
    return { level: 'supervisor', receives: ['relatorios_ponto', 'atrasos', 'faltas', 'horas_extras', 'inconsistencias'] };
  }
  return { level: 'colaborador', receives: [] };
}

/**
 * Dashboard filtrado por perfil
 */
async function getDashboardForUser(companyId, user) {
  const profile = getViewProfileForUser(user);
  const indicators = await getIndicators(companyId, 30);
  const alerts = await db.query(`
    SELECT * FROM hr_alerts WHERE company_id = $1 AND acknowledged = false
    AND (target_user_id IS NULL OR target_user_id = $2)
    AND (target_role_level IS NULL OR target_role_level >= $3)
    ORDER BY created_at DESC LIMIT 15
  `, [companyId, user.id, user.hierarchy_level ?? 5]);

  let records = [];
  let summary = {};
  if (profile.receives.includes('relatorios_ponto') || profile.receives.includes('atrasos') || profile.receives.includes('faltas')) {
    records = await getRecords(companyId, { limit: 50 });
    const delays = records.filter((r) => (r.delay_minutes || 0) > 0);
    const absences = records.filter((r) => r.absent);
    summary = { total_records: records.length, delays_count: delays.length, absences_count: absences.length };
  }

  return {
    profile_level: profile.level,
    receives: profile.receives,
    indicators: profile.receives.length > 0 ? indicators : null,
    alerts: alerts.rows || [],
    records: records,
    summary
  };
}

/**
 * Atualiza responsabilidades do usuário (parsed pela IA)
 */
async function updateUserResponsibilities(userId, companyId, text) {
  const parsed = parseResponsibilities(text);
  try {
    const aiRes = await ai.chatCompletion(
      `Liste em uma linha, separado por vírgula, as responsabilidades de RH detectadas no texto. Use apenas: controle_ponto, gestao_equipe, gestao_folha, supervisao_producao, admin_departamento. Texto: "${(text || '').slice(0, 500)}"`,
      { max_tokens: 100 }
    );
    const extracted = (aiRes || '').toLowerCase().match(/\b(controle_ponto|gestao_equipe|gestao_folha|supervisao_producao|admin_departamento)\b/g) || [];
    const merged = [...new Set([...parsed, ...extracted])];
    await db.query(`
      UPDATE users SET hr_responsibilities = $2, hr_responsibilities_parsed = $3, updated_at = now()
      WHERE id = $1 AND company_id = $4
    `, [userId, text, JSON.stringify(merged), companyId]);
    return merged;
  } catch (_) {
    await db.query(`
      UPDATE users SET hr_responsibilities = $2, hr_responsibilities_parsed = $3, updated_at = now()
      WHERE id = $1 AND company_id = $4
    `, [userId, text, JSON.stringify(parsed), companyId]);
    return parsed;
  }
}

/**
 * Integra com previsão operacional (impacto da equipe)
 */
async function getTeamImpactForForecasting(companyId) {
  const ind = await getIndicators(companyId, 7);
  return {
    presence_compliance: ind.presence_compliance,
    fatigue_risk: ind.fatigue_risk_index,
    delay_index: ind.delay_index,
    absence_index: ind.absence_index,
    productivity_factor: (ind.presence_compliance || 100) / 100 * (1 - (ind.fatigue_risk_index || 0) / 200)
  };
}

module.exports = {
  parseResponsibilities,
  getIndicators,
  calculateIndicators,
  getRecords,
  detectAndCreateAlerts,
  getViewProfileForUser,
  getDashboardForUser,
  updateUserResponsibilities,
  getTeamImpactForForecasting
};
