/**
 * Hook para módulos visíveis do dashboard (visible_modules do payload)
 * Filtra menu e rotas conforme permissões do perfil
 */
import { useState, useEffect, useCallback } from 'react';
import { dashboard } from '../services/api';

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

/** Módulos dedicados (não são o dashboard /app); não bloquear por visible_modules quando o menu do cargo os lista */
const STANDALONE_OPERATIONAL_PATHS = new Set([
  '/app/insights',
  '/app/cerebro-operacional',
  '/app/centro-operacoes-industrial'
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
  if (!visibleModules || visibleModules.length === 0) return menuItems;
  const set = new Set(visibleModules);
  return menuItems.filter((item) => {
    const p = item.path?.replace(/\/+$/, '') || '';
    // Dashboard e Dashboard Vivo: sempre visíveis no menu do cargo
    if (item.path === '/app' || item.path === '/app/dashboard-vivo') return true;
    if (STANDALONE_OPERATIONAL_PATHS.has(p)) return true;
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
  if (!visibleModules?.length) return true;
  const norm = path.replace(/\/+$/, '') || '/';
  if (norm === '/app' || norm === '/app/dashboard-vivo') return true;
  if (STANDALONE_OPERATIONAL_PATHS.has(norm)) return true;
  const mod = getModuleForPath(path);
  if (!mod) return true;
  return visibleModules.includes(mod);
}

export function useVisibleModules() {
  const [visibleModules, setVisibleModules] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchModules = useCallback(async () => {
    try {
      const r = await dashboard.getMe();
      const mods = r?.data?.visible_modules ?? r?.data?.profile_config?.visible_modules;
      setVisibleModules(Array.isArray(mods) ? mods : []);
    } catch {
      setVisibleModules([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchModules();
  }, [fetchModules]);

  return {
    visibleModules,
    loading,
    filterMenu: (items) => filterMenuByModules(items, visibleModules),
    canAccessPath: (path) => canAccessPath(path, visibleModules),
    refetch: fetchModules
  };
}
