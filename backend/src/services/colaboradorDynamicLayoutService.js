/**
 * IMPETUS - Dashboard Inteligente Dinâmico do Colaborador
 * Gera layout de widgets com base no perfil do usuário: cargo, função, departamento,
 * permissões, áreas de atuação, módulos utilizados e nível hierárquico.
 * Substitui o modelo fixo por widgets gerados dinamicamente.
 */

const db = require('../db');

/** IDs dos widgets disponíveis para o colaborador */
const COLABORADOR_WIDGET_IDS = [
  'tarefas_dia',
  'proacao',
  'meta_turno',
  'proximas_atividades',
  'cadastrar_com_ia',
  'instrucoes',
  'registro',
  'alertas',
  'checklist_seguranca',
  'impetus_ia_chat'
];

/** Widgets sempre presentes para todos os colaboradores */
const BASE_WIDGETS = ['tarefas_dia', 'proacao', 'meta_turno', 'proximas_atividades', 'cadastrar_com_ia', 'instrucoes', 'registro', 'alertas', 'checklist_seguranca', 'impetus_ia_chat'];

/**
 * Coleta módulos/dados utilizados anteriormente (últimas interações do usuário)
 */
async function getModulosUtilizados(userId, companyId, limit = 10) {
  try {
    const r = await db.query(
      `SELECT DISTINCT entity_type, entity_id 
       FROM user_activity_logs 
       WHERE user_id = $1 AND company_id = $2 AND entity_type IS NOT NULL
       ORDER BY created_at DESC 
       LIMIT $3`,
      [userId, companyId, limit]
    );
    return (r.rows || []).map((x) => x.entity_type || '').filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Constrói perfil do usuário para personalização
 */
function buildUserProfile(user) {
  const role = (user.role || '').toString();
  const department = (user.department || user.departamento || '').toString();
  const area = (user.area || user.functional_area || '').toString();
  const jobTitle = (user.job_title || user.cargo || role).toString();
  const permissions = Array.isArray(user.permissions) ? user.permissions : [];
  const hierarchyLevel = user.hierarchy_level ?? 5;

  return {
    id: user.id,
    cargo: jobTitle || role,
    função: role,
    departamento: department || area || '—',
    permissions,
    áreas_de_atuacao: area ? [area] : [],
    nível_hierárquico: hierarchyLevel,
    role,
    job_title: jobTitle,
    department,
    area,
    functional_area: user.functional_area || null
  };
}

/**
 * Decide quais widgets incluir com base no perfil
 * Regras: departamento (manutenção → pode adicionar widget manutenção futuro),
 * permissões, áreas de atuação.
 */
function resolveWidgetsForProfile(userProfile) {
  const dept = (userProfile.department || userProfile.area || '').toLowerCase();
  const widgets = [...BASE_WIDGETS];

  // Exemplo: colaborador de manutenção poderia ter widget extra (futuro)
  // if (dept.includes('manuten') || dept.includes('mecan')) {
  //   widgets.push('manutencao_tarefas');
  // }

  return widgets;
}

/**
 * Define posição/ordem dos widgets no grid
 */
function buildWidgetLayout(widgetIds) {
  return widgetIds.map((id, index) => {
    const meta = {
      tarefas_dia: { type: 'kpi', label: 'Minhas Tarefas do Dia', position: { width: 2 } },
      proacao: { type: 'action', label: 'Pró-Ação', position: { width: 1 } },
      meta_turno: { type: 'kpi', label: 'Atividades do Turno', position: { width: 1 } },
      proximas_atividades: { type: 'list', label: 'Próximas Atividades', position: { width: 2 } },
      cadastrar_com_ia: { type: 'action', label: 'Cadastrar com IA', position: { width: 2 } },
      instrucoes: { type: 'action', label: 'Instruções', position: { width: 1 } },
      registro: { type: 'action', label: 'Registro', position: { width: 1 } },
      alertas: { type: 'alerts', label: 'Alertas', position: { width: 1 } },
      checklist_seguranca: { type: 'action', label: 'Checklist Segurança', position: { width: 1 } },
      impetus_ia_chat: { type: 'action', label: 'Impetus IA e Chat', position: { width: 2 } }
    }[id] || { type: 'generic', label: id, position: { width: 1 } };

    return {
      id,
      ...meta,
      position: meta.position || { width: 1 }
    };
  });
}

/**
 * Gera layout dinâmico completo para o colaborador
 */
async function getDynamicLayout(user) {
  const userProfile = buildUserProfile(user);
  const modulosUtilizados = await getModulosUtilizados(user.id, user.company_id);

  const widgetIds = resolveWidgetsForProfile(userProfile);
  const widgets = buildWidgetLayout(widgetIds);

  return {
    ok: true,
    widgets,
    layout: { grid: 'responsive', columns: 4 },
    userProfile: {
      ...userProfile,
      módulos_utilizados_anteriormente: modulosUtilizados
    },
    alerts: [],
    version: 1,
    generatedAt: new Date().toISOString(),
    ttl: 300
  };
}

module.exports = {
  getDynamicLayout,
  buildUserProfile,
  COLABORADOR_WIDGET_IDS
};
