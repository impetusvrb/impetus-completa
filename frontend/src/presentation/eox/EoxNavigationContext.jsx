import { createContext, useContext } from 'react';

/**
 * ARC-003 — Contexto EOX: suprime cabeçalhos duplicados (industrial + hub).
 */
export const EoxNavigationContext = createContext({
  active: false,
  suppressModuleHeader: false,
  suppressHubHeader: false,
  phase: null
});

export function useEoxNavigation() {
  return useContext(EoxNavigationContext);
}

/** Compat NAV-002A */
export const OnxNavigationContext = EoxNavigationContext;
export const useOnxNavigation = useEoxNavigation;
