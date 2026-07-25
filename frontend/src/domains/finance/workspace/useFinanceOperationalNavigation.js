import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { resolveFinanceOperationalNavigation } from '../navigation/financeEoxNavigation.js';

export function useFinanceOperationalNavigation() {
  const { pathname, search } = useLocation();
  return useMemo(
    () => resolveFinanceOperationalNavigation(pathname, search),
    [pathname, search]
  );
}
