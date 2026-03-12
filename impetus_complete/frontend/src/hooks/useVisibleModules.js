/**
 * Hook para módulos visíveis do dashboard (visible_modules do payload)
 * Filtra menu e rotas conforme permissões do perfil
 */
import { useState, useEffect, useCallback } from 'react';
import { dashboard } from '../services/api';

/** Mapeamento path -> module_key (visible_modules) */
const PATH_TO_MODULE = {
  '/app': 'dashboard',
  '/app/proacao': 'proaction',
  '/app/operacional': 'operational',
  '/app/registro-inteligente': 'operational',
  '/app/biblioteca': 'biblioteca',
  '/app/chatbot': 'ai',
  '/app/monitored-points': 'monitored_points',
  '/app/settings': 'settings',
  '/app/insights': 'operational',
  '/app/cerebro-operacional': 'operational',
  '/app/centro-operacoes-industrial': 'operational',
  '/app/centro-previsao-operacional': 'operational',
  '/app/mapa-vazamento-financeiro': 'operational',
  '/app/almoxarifado-inteligente': 'warehouse_intelligence',
  '/app/logistica-inteligente': 'logistics_intelligence',
  '/chat': 'chat'
};

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
    const mod = getModuleForPath(item.path);
    if (!mod) return true;
    return set.has(mod);
  });
}

/**
 * Verifica se path é permitido
 */
export function canAccessPath(path, visibleModules) {
  if (!visibleModules?.length) return true;
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
      const mods = r?.data?.visible_modules;
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
