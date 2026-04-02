/**
 * ONBOARDING DO DASHBOARD
 * Perguntas curtas para enriquecer o perfil e preferências iniciais
 */
const db = require('../db');
const intelligentDashboard = require('./intelligentDashboardService');

/** Perguntas do onboarding de dashboard */
const QUESTIONS = [
  {
    id: 'primary_focus',
    question: 'Qual é sua prioridade principal no dia a dia?',
    options: [
      { value: 'production', label: 'Produção e operação' },
      { value: 'maintenance', label: 'Manutenção e ativos' },
      { value: 'quality', label: 'Qualidade e conformidade' },
      { value: 'management', label: 'Gestão e acompanhamento' }
    ]
  },
  {
    id: 'preferred_indicators',
    question: 'Quais indicadores você mais acompanha? (pode selecionar vários)',
    options: [
      { value: 'interactions', label: 'Interações e comunicações' },
      { value: 'proposals', label: 'Propostas e melhorias' },
      { value: 'work_orders', label: 'Ordens de serviço' },
      { value: 'efficiency', label: 'Eficiência e metas' },
      { value: 'alerts', label: 'Alertas e não conformidades' }
    ],
    multi: true
  },
  {
    id: 'view_preference',
    question: 'Como prefere visualizar o dashboard?',
    options: [
      { value: 'resumed', label: 'Resumido – apenas o essencial' },
      { value: 'balanced', label: 'Balanceado – visão geral com detalhes' },
      { value: 'detailed', label: 'Detalhado – máximo de informações' }
    ]
  },
  {
    id: 'favorite_period',
    question: 'Qual período você acompanha com mais frequência?',
    options: [
      { value: '1d', label: 'Último dia' },
      { value: '7d', label: 'Última semana' },
      { value: '15d', label: 'Últimos 15 dias' },
      { value: '30d', label: 'Último mês' }
    ]
  }
];

/**
 * Verifica se usuário precisa do onboarding de dashboard
 */
async function needsDashboardOnboarding(user) {
  if (!user?.id) return false;
  try {
    const [userRow, onboardingRow] = await Promise.all([
      db.query('SELECT onboarding_completed FROM users WHERE id = $1', [user.id]),
      db.query('SELECT 1 FROM user_dashboard_onboarding WHERE user_id = $1', [user.id])
    ]);
    const completed = userRow.rows[0]?.onboarding_completed;
    const hasOnboarding = onboardingRow.rows.length > 0;
    return !completed && !hasOnboarding;
  } catch (err) {
    if (err.message?.includes('does not exist')) return false;
    console.warn('[DASHBOARD_ONBOARDING] needs:', err.message);
    return false;
  }
}

/**
 * Retorna as perguntas do onboarding
 */
function getQuestions() {
  return QUESTIONS;
}

/**
 * Salva respostas e atualiza preferências
 */
async function saveDashboardOnboarding(userId, companyId, answers) {
  if (!userId || !companyId) throw new Error('userId e companyId obrigatórios');

  const preferred_indicators = Array.isArray(answers.preferred_indicators)
    ? answers.preferred_indicators
    : answers.preferred_indicators
      ? [answers.preferred_indicators]
      : [];
  const primary_focus = answers.primary_focus || null;
  const view_preference = answers.view_preference || 'balanced';
  const favorite_period = answers.favorite_period || '7d';
  const supervised_areas = Array.isArray(answers.supervised_areas)
    ? answers.supervised_areas
    : [];

  await db.query(`
    INSERT INTO user_dashboard_onboarding (user_id, preferred_indicators, primary_focus, view_preference, favorite_period, supervised_areas, completed_at, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, now(), now())
    ON CONFLICT (user_id) DO UPDATE SET
      preferred_indicators = EXCLUDED.preferred_indicators,
      primary_focus = EXCLUDED.primary_focus,
      view_preference = EXCLUDED.view_preference,
      favorite_period = EXCLUDED.favorite_period,
      supervised_areas = EXCLUDED.supervised_areas,
      completed_at = now()
  `, [
    userId,
    JSON.stringify(preferred_indicators),
    primary_focus,
    view_preference,
    favorite_period,
    JSON.stringify(supervised_areas)
  ]);

  await db.query(
    'UPDATE users SET onboarding_completed = true, updated_at = now() WHERE id = $1',
    [userId]
  );

  await intelligentDashboard.savePreferences(userId, {
    favorite_kpis: preferred_indicators,
    default_period: favorite_period,
    compact_mode: view_preference === 'resumed'
  });

  return { ok: true };
}

module.exports = {
  needsDashboardOnboarding,
  getQuestions,
  saveDashboardOnboarding
};
