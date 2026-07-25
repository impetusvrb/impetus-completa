import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import {
  resolveLogisticsOperationalNavigation,
  resolveLogisticsHubNavigation,
  resolveQualityOperationalNavigation,
  resolveSafetyOperationalNavigation,
  resolveEnvironmentOperationalNavigation
} from './eoxRegistry.js';
import { parseOperationalDeepLink } from '../operational-navigation/operationalNavigationDeepLink.js';

function withDeepLink(config, search) {
  const deepLink = parseOperationalDeepLink(search);
  if (!deepLink) return config;
  return { ...config, deepLink };
}

export function useLogisticsOperationalNavigation(overrides = {}) {
  const { pathname, search } = useLocation();
  return useMemo(
    () => withDeepLink(resolveLogisticsOperationalNavigation(pathname, overrides), search),
    [pathname, search, overrides]
  );
}

export function useLogisticsHubNavigation() {
  const { pathname, search } = useLocation();
  return useMemo(() => resolveLogisticsHubNavigation(pathname, search), [pathname, search]);
}

export function useQualityOperationalNavigation() {
  const { pathname, search } = useLocation();
  return useMemo(() => resolveQualityOperationalNavigation(pathname, search), [pathname, search]);
}

export function useSafetyOperationalNavigation() {
  const { pathname, search } = useLocation();
  return useMemo(() => resolveSafetyOperationalNavigation(pathname, search), [pathname, search]);
}

export function useEnvironmentOperationalNavigation() {
  const { pathname, search } = useLocation();
  return useMemo(() => resolveEnvironmentOperationalNavigation(pathname, search), [pathname, search]);
}
