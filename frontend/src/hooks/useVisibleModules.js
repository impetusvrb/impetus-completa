/**
 * Hook para módulos visíveis do dashboard (visible_modules do payload)
 * Filtra menu e rotas conforme permissões do perfil
 */
import { useState, useEffect, useCallback } from 'react';
import { dashboard } from '../services/api';
import { isMaintenanceProfile } from '../utils/roleUtils';

/** Mapeamento path -> module_key (visible_modules) */
const PATH_TO_MODULE = {
  '/app': 'dashboard',
  '/app/dashboard-vivo': 'dashboard',
  '/app/proacao': 'proaction',
  '/app/operacional': 'operational',
  '/app/registro-inteligente': 'operational',
  '/app/biblioteca': 'biblioteca',
  '/app/chatbot': 'ai',
  '/app/settings': 'settings',
  '/app/insights': 'operational',
  '/app/cerebro-operacional': 'operational',
  '/app/centro-operacoes-industrial': 'operational',
  '/app/centro-previsao-operacional': 'operational',
  '/app/centro-custos-industriais': 'operational',
  '/app/mapa-vazamento-financeiro': 'operational',
  '/app/pulse-rh': 'operational',
  '/app/pulse-gestao': 'operational',
  '/app/manutencao/manuia': 'manuia',
  '/app/manutencao/manuia-app': 'manuia',
  '/chat': 'chat'
};

/**
 * Rotas que não devem depender de `operational` em visible_modules (evita esconder Pulse quando o perfil RH
 * tem lista de módulos personalizada sem essa chave).
 */
const STANDALONE_OPERATIONAL_PATHS = new Set([
  '/app/insights',
  '/app/cerebro-operacional',
  '/app/centro-operacoes-industrial',
  '/app/pulse-rh',
  '/app/pulse-gestao'
]);
const STANDALONE_MANUIA_PATHS = new Set([
  '/app/manutencao/manuia',
  '/app/manutencao/manuia-app'
]);

function getModuleForPath(path) {
  if (PATH_TO_MODULE[path]) return PATH_TO_MODULE[path];
  if (path.startsWith('/app/admin')) return 'admin';
  if (path.startsWith('/diagnostic')) return 'operational';
  return null;
}

/**
 * Filtra itens de menu por visible_modules
 */
export function filterMenuByModules(menuItems, visibleModules) {
  let isMaint = false;
  try {
    const user = JSON.parse(localStorage.getItem('impetus_user') || '{}');
    isMaint = isMaintenanceProfile(user);
  } catch {
    isMaint = false;
  }
  if (!visibleModules || visibleModules.length === 0) return menuItems;
  const set = new Set(visibleModules);
  return menuItems.filter((item) => {
    const p = item.path?.replace(/\/+$/, '') || '';
    // Dashboard e Dashboard Vivo: sempre visíveis no menu do cargo
    if (item.path === '/app' || item.path === '/app/dashboard-vivo') return true;
    if (STANDALONE_OPERATIONAL_PATHS.has(p)) return true;
    if (isMaint && STANDALONE_MANUIA_PATHS.has(p)) return true;
    const mod = getModuleForPath(item.path);
    if (!mod) return true;
    return set.has(mod);
  });
}

/**
 * Verifica se path é permitido.
 * Dashboard (/app): sempre permitido para quem tem no menu (CEO, diretor, gerente, coordenador, supervisor).
 * Só admin e colaborador não têm /app no menu; admin é bloqueado na rota.
 */
export function canAccessPath(path, visibleModules) {
  let isMaint = false;
  try {
    const user = JSON.parse(localStorage.getItem('impetus_user') || '{}');
    isMaint = isMaintenanceProfile(user);
  } catch {
    isMaint = false;
  }
  if (!visibleModules?.length) return true;
  const norm = path.replace(/\/+$/, '') || '/';
  if (norm === '/app' || norm === '/app/dashboard-vivo') return true;
  if (STANDALONE_OPERATIONAL_PATHS.has(norm)) return true;
  if (isMaint && STANDALONE_MANUIA_PATHS.has(norm)) return true;
  const mod = getModuleForPath(path);
  if (!mod) return true;
  return visibleModules.includes(mod);
}

export function useVisibleModules() {
  const [visibleModules, setVisibleModules] = useState([]);
  const [maintenanceFromProfile, setMaintenanceFromProfile] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchModules = useCallback(async () => {
    try {
      const r = await dashboard.getMe();
      // Alinhar localStorage ao perfil resolvido no servidor (evita menu sem Pulse RH após mudança de cargo/área).
      try {
        const raw = localStorage.getItem('impetus_user');
        if (raw && r?.data) {
          const u = JSON.parse(raw);
          const pc = r.data.profile_code;
          const fa = r.data.functional_area;
          const uc = r.data.user_context;
          if (pc) u.dashboard_profile = pc;
          if (fa) u.functional_area = fa;
          if (uc?.job_title && !u.job_title) u.job_title = uc.job_title;
          if (uc?.department && !u.department) u.department = uc.department;
          localStorage.setItem('impetus_user', JSON.stringify(u));
        }
      } catch {
        /* ignore */
      }
      const mods = r?.data?.visible_modules ?? r?.data?.profile_config?.visible_modules;
      setVisibleModules(Array.isArray(mods) ? mods : []);
      const profileCode = String(r?.data?.profile_code || '').toLowerCase();
      const functionalArea = String(r?.data?.user_context?.functional_area || '').toLowerCase();
      const isMaint =
        profileCode.includes('maintenance') ||
        functionalArea === 'maintenance' ||
        functionalArea.includes('manutenc');
      setMaintenanceFromProfile(isMaint);
    } catch {
      setVisibleModules([]);
      setMaintenanceFromProfile(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchModules();
  }, [fetchModules]);

  return {
    visibleModules,
    maintenanceFromProfile,
    loading,
    filterMenu: (items) => filterMenuByModules(items, visibleModules),
    canAccessPath: (path) => canAccessPath(path, visibleModules),
    refetch: fetchModules
  };
}
