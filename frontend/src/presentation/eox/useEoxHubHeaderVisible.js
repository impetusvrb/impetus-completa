import { useEoxNavigation } from '../../presentation/eox/EoxNavigationContext.jsx';

/**
 * ARC-003 — Oculta cabeçalho inline do hub quando EOX Header está activo.
 */
export function useEoxHubHeaderVisible() {
  const eox = useEoxNavigation();
  return !eox.suppressHubHeader;
}

export default useEoxHubHeaderVisible;
