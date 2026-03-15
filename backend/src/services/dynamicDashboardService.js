/**
 * DASHBOARD DINÂMICO INTELIGENTE
 * Gera layout de widgets baseado em perfil do usuário (cargo, departamento, permissões, hierarquia).
 * Centros existentes viram widgets condicionais por perfil.
 */
const dashboardProfileResolver = require('./dashboardProfileResolver');
const { getProfile } = require('../config/dashboardProfiles');

/**
 * REGISTRO DE WIDGETS - Centros Inteligentes e blocos analíticos
 * id: identificador do widget
 * type: analytics | map | alerts | kpi | prediction
 * permissionsRequired: permissões necessárias (qualquer uma)
 * departments: departamentos relevantes (production, maintenance, quality, etc)
 * hierarchyMax: nível hierárquico máximo (1=CEO, 5=operador) - menor = mais estratégico
 * profileCodes: perfis que podem ver (opcional - se vazio, usa departments+hierarchy)
 */
const WIDGET_REGISTRY = [
  {
    id: 'center_predictions',
    type: 'prediction',
    label: 'Centro de Previsão',
    permissionsRequired: ['forecast_data', 'operational'],
    departments: ['production', 'maintenance', 'quality', 'operations'],
    hierarchyMax: 3,
    profileCodes: ['ceo_executive', 'director_operations', 'director_industrial', 'manager_production', 'manager_maintenance', 'manager_quality']
  },
  {
    id: 'operational_brain',
    type: 'analytics',
    label: 'Cérebro Operacional',
    permissionsRequired: ['operational'],
    departments: ['production', 'maintenance', 'quality', 'operations'],
    hierarchyMax: 4,
    profileCodes: ['ceo_executive', 'director_operations', 'director_industrial', 'manager_production', 'manager_maintenance', 'coordinator_production', 'coordinator_maintenance']
  },
  {
    id: 'industrial_map',
    type: 'map',
    label: 'Mapa Inteligente da Indústria',
    permissionsRequired: [],
    departments: [],
    hierarchyMax: 2,
    profileCodes: ['ceo_executive', 'director_operations', 'director_industrial']
  },
  {
    id: 'cost_center',
    type: 'analytics',
    label: 'Centro de Custos',
    permissionsRequired: ['cost_data', 'financial'],
    departments: ['operations', 'finance'],
    hierarchyMax: 2,
    profileCodes: ['ceo_executive', 'director_operations', 'director_industrial', 'finance_management']
  },
  {
    id: 'leak_map',
    type: 'analytics',
    label: 'Mapa de Vazamentos',
    permissionsRequired: ['financial', 'cost_data'],
    departments: ['finance', 'operations'],
    hierarchyMax: 3,
    profileCodes: ['ceo_executive', 'director_operations', 'director_industrial', 'finance_management']
  },
  {
    id: 'alerts_panel',
    type: 'alerts',
    label: 'Painel de Alertas',
    permissionsRequired: [],
    departments: ['production', 'maintenance', 'quality'],
    hierarchyMax: 5,
    profileCodes: []
  },
  {
    id: 'plc_alerts',
    type: 'alerts',
    label: 'Alertas PLC',
    permissionsRequired: ['industrial', 'monitored_points'],
    departments: ['production', 'maintenance'],
    hierarchyMax: 5,
    profileCodes: []
  },
  {
    id: 'smart_summary',
    type: 'kpi',
    label: 'Resumo Inteligente',
    permissionsRequired: [],
    departments: [],
    hierarchyMax: 5,
    profileCodes: []
  },
  {
    id: 'indicators',
    type: 'kpi',
    label: 'Indicadores',
    permissionsRequired: [],
    departments: [],
    hierarchyMax: 5,
    profileCodes: []
  },
  {
    id: 'trend_chart',
    type: 'analytics',
    label: 'Tendências',
    permissionsRequired: [],
    departments: [],
    hierarchyMax: 5,
    profileCodes: []
  },
  {
    id: 'recent_interactions',
    type: 'kpi',
    label: 'Interações Recentes',
    permissionsRequired: [],
    departments: [],
    hierarchyMax: 5,
    profileCodes: []
  },
  {
    id: 'insights_list',
    type: 'analytics',
    label: 'Insights IA',
    permissionsRequired: [],
    departments: [],
    hierarchyMax: 5,
    profileCodes: []
  },
  {
    id: 'maintenance_cards',
    type: 'kpi',
    label: 'Indicadores Técnicos',
    permissionsRequired: [],
    departments: ['maintenance'],
    hierarchyMax: 5,
    profileCodes: ['technician_maintenance', 'supervisor_maintenance', 'coordinator_maintenance', 'manager_maintenance']
  },
  {
    id: 'central_ai',
    type: 'analytics',
    label: 'IA Central',
    permissionsRequired: [],
    departments: [],
    hierarchyMax: 4,
    profileCodes: []
  }
];

/**
 * Verifica se usuário tem permissão para ver o widget
 */
function canShowWidget(widget, userProfile) {
  const { profile_code, functional_area, hierarchy_level } = userProfile;
  const role = (userProfile.role || '').toLowerCase();

  // hierarchy_level: 1=CEO, 2=Diretor, 3=Gerente, 4=Coord/Supervisor, 5=Operador
  const level = userProfile.hierarchy_level ?? 5;

  if (widget.hierarchyMax < level) return false;

  if (widget.profileCodes && widget.profileCodes.length > 0) {
    if (widget.profileCodes.includes(profile_code)) return true;
    if (role === 'ceo' && widget.hierarchyMax <= 1) return true;
    if (role === 'admin' && widget.id === 'industrial_map') return true;
    return false;
  }

  if (widget.departments && widget.departments.length > 0) {
    const area = (functional_area || '').toLowerCase();
    if (!area || !widget.departments.includes(area)) return false;
  }

  if (widget.permissionsRequired && widget.permissionsRequired.length > 0) {
    const perms = (userProfile.permissions || []).map((p) => p.toLowerCase());
    const hasAny = widget.permissionsRequired.some((p) => perms.includes(p.toLowerCase()));
    if (!hasAny && role !== 'ceo' && role !== 'admin') return false;
  }

  return true;
}

/**
 * Retorna layout dinâmico do dashboard para o usuário
 * @param {Object} user - usuário com id, role, functional_area, hierarchy_level, job_title
 * @returns {Object} { widgets, layout, alerts, userProfile }
 */
function getDynamicLayout(user) {
  const config = dashboardProfileResolver.getDashboardConfigForUser(user);
  const profile = config.profile_config || {};
  const hierarchyLevel = user.hierarchy_level ?? 5;

  const userProfile = {
    id: user.id,
    role: user.role,
    department: config.functional_area,
    permissions: profile.visible_modules || [],
    hierarchyLevel,
    profile_code: config.profile_code
  };

  const profileWidgets = profile.widgets || [];
  const baseWidgetIds = ['smart_summary', 'indicators', 'alerts_panel', 'trend_chart', 'recent_interactions', 'insights_list'];
  const mergedBase = [...new Set([...baseWidgetIds, ...profileWidgets])];

  const allowed = [];
  for (const wId of mergedBase) {
    const widget = WIDGET_REGISTRY.find((w) => w.id === wId);
    if (!widget) {
      if (['ai_insights', 'plc_alerts'].includes(wId)) {
        const mapped = wId === 'ai_insights' ? 'insights_list' : 'plc_alerts';
        const w = WIDGET_REGISTRY.find((x) => x.id === mapped);
        if (w && canShowWidget(w, { ...userProfile, functional_area: config.functional_area })) {
          allowed.push({ id: mapped, type: w.type, label: w.label });
        }
      }
      continue;
    }
    if (canShowWidget(widget, { ...userProfile, functional_area: config.functional_area })) {
      allowed.push({ id: widget.id, type: widget.type, label: widget.label });
    }
  }

  for (const w of WIDGET_REGISTRY) {
    if (['center_predictions', 'operational_brain', 'industrial_map', 'cost_center', 'leak_map', 'plc_alerts', 'maintenance_cards', 'central_ai'].includes(w.id)) {
      if (!allowed.some((a) => a.id === w.id) && canShowWidget(w, { ...userProfile, functional_area: config.functional_area })) {
        allowed.push({ id: w.id, type: w.type, label: w.label });
      }
    }
  }

  const layout = {
    grid: 'responsive',
    columns: 12,
    defaultSize: { w: 6, h: 3 }
  };

  return {
    widgets: allowed,
    layout,
    alerts: [],
    userProfile: {
      id: userProfile.id,
      role: userProfile.role,
      department: userProfile.department,
      permissions: userProfile.permissions,
      hierarchyLevel: userProfile.hierarchyLevel
    }
  };
}

module.exports = {
  getDynamicLayout,
  WIDGET_REGISTRY,
  canShowWidget
};
