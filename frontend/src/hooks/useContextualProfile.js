/**
 * useContextualProfile — CERT-01 FIX
 *
 * Hook leve para telas de domínio (Quality, SST, ESG, ManuIA, etc.)
 * consumirem o contexto resolvido pelo Motor de Inteligência Contextual
 * sem depender do `useDashboardContext` completo.
 *
 * Estratégia:
 *   1. Lê `impetus_user` do localStorage (já populado no login).
 *   2. Se `/dashboard/me` já foi chamado anteriormente, reutiliza o
 *      payload em cache (sessionStorage, TTL 5 min) — sem nova request.
 *   3. Expõe os campos essenciais para personalização de domínio:
 *      profile_code, functional_area, hierarchy_level, scope, language.
 *
 * USO (não invasivo — basta importar e desestruturar):
 *   const { profile, ready } = useContextualProfile();
 *   const defaultFilter = profile.functional_area === 'maintenance'
 *     ? { setor: 'manutenção' }
 *     : {};
 */
import { useState, useEffect } from 'react';
import { dashboard } from '../services/api';

const CACHE_KEY = 'impetus_ctx_profile_cache';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

function readCache() {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { ts, data } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL) return null;
    return data;
  } catch {
    return null;
  }
}

function writeCache(data) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data }));
  } catch { /* swallow quota errors */ }
}

function readUserFromStorage() {
  try {
    return JSON.parse(localStorage.getItem('impetus_user') || '{}');
  } catch {
    return {};
  }
}

/**
 * @returns {{
 *   profile: {
 *     profile_code: string|null,
 *     functional_area: string|null,
 *     functional_axis: string|null,
 *     hierarchy_level: number,
 *     scope: string,
 *     language: string,
 *     role: string,
 *     contextual_modules: string[],
 *   },
 *   ready: boolean
 * }}
 */
export function useContextualProfile() {
  const [profile, setProfile] = useState(() => {
    // Inicializa imediatamente com dados do localStorage (sincrono, sem loading)
    const cached = readCache();
    if (cached) return cached;
    const u = readUserFromStorage();
    return buildProfileFromUser(u);
  });
  const [ready, setReady] = useState(() => !!readCache());

  useEffect(() => {
    // Se já tem cache válido, não dispara nova request
    if (readCache()) {
      setReady(true);
      return;
    }

    let cancelled = false;
    dashboard.getMe().then((r) => {
      if (cancelled) return;
      const me = r?.data;
      if (!me) return;
      const built = buildProfileFromMe(me);
      writeCache(built);
      setProfile(built);
      setReady(true);
    }).catch(() => {
      // Não-fatal: perfil do localStorage já inicializado no useState
      setReady(true);
    });

    return () => { cancelled = true; };
  }, []);

  return { profile, ready };
}

function buildProfileFromMe(me) {
  const ctx = me.user_context || {};
  return {
    profile_code: me.profile_code || null,
    functional_area: me.profile_config?.functional_area || ctx.functional_area || null,
    functional_axis: ctx.functional_axis || null,
    hierarchy_level: ctx.hierarchy_level ?? 5,
    scope: ctx.scope || 'individual',
    language: ctx.language || 'objective',
    role: ctx.role || null,
    contextual_modules: me.contextual_modules_hint || [],
  };
}

function buildProfileFromUser(u) {
  const hierarchyLevel = u.hierarchy_level ?? 5;
  const scopeMap = { 0: 'global', 1: 'global', 2: 'sector', 3: 'sector', 4: 'team', 5: 'individual' };
  const langMap  = { 0: 'strategic', 1: 'strategic', 2: 'analytical', 3: 'operational', 4: 'practical', 5: 'objective' };
  return {
    profile_code: u.dashboard_profile || null,
    functional_area: u.functional_area || null,
    functional_axis: null,
    hierarchy_level: hierarchyLevel,
    scope: scopeMap[hierarchyLevel] || 'individual',
    language: langMap[hierarchyLevel] || 'objective',
    role: u.role || null,
    contextual_modules: [],
  };
}

export default useContextualProfile;
