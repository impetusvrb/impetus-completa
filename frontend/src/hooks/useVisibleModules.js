/**
 * Hook para módulos visíveis do dashboard (visible_modules do payload)
 * Filtra menu e rotas conforme permissões do perfil
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { dashboard } from '../services/api';
import {
  isMaintenanceProfile,
  userHasSystemAdministrationCapability,
  isAdministrativePortalOnlyUser,
  shouldOfferPulseRhMenu,
  isExecutiveLeadershipRole,
  isStrictAdminRole
} from '../utils/roleUtils';
import { logContextualDebugSummary } from '../utils/contextualSidebarBuilder';
import { readCanonicalVisibleModules } from '../runtimeGovernance/canonicalVisibleModules.js';
import { getContextualModulesMode } from '../runtimeTerminalGovernance/terminalGovernanceGuard.js';
import { filterVisibleModulesByStructuralProfile } from '../utils/structuralModuleFilter.js';
import { applyReconciliationToVisibleModules } from '../runtimeGovernance/visibilitySovereigntyGuard.js';

/**
 * Paths de acesso universal seguro — explicitamente liberados para TODOS os usuários.
 * SOMENTE estes 3 paths têm bypass garantido. Não abre qualquer outra rota,
 * não ativa orchestration/telemetry/dashboard operacional.
 * Sub-paths de PróAção (/app/proacao/:id) também são cobertos via isUniversalSafeAccessPath().
 */
const UNIVERSAL_SAFE_ACCESS_PATHS = Object.freeze(new Set([
  '/app/proacao',
  '/app/cadastrar-com-ia',
  '/app/registro-inteligente'
]));

/**
 * Paths negados para o perfil CEO (executive experience refinement).
 * O CEO consome síntese estratégica — Pró-Ação é operacional/tático.
 * Deny-only: não afeta nenhum outro perfil.
 */
const CEO_DENIED_PATHS = Object.freeze(new Set(['/app/proacao']));

function _isCeoUser() {
  try {
    const u = JSON.parse(localStorage.getItem('impetus_user') || '{}');
    const role = String(u.role || '').toLowerCase();
    const profile = String(u.dashboard_profile || '').toLowerCase();
    return role === 'ceo' || profile === 'ceo_executive';
  } catch {
    return false;
  }
}

/** Retorna true para os 3 paths universais e para sub-paths de PróAção (exceto CEO). */
function isUniversalSafeAccessPath(p) {
  if (CEO_DENIED_PATHS.has(p) && _isCeoUser()) return false;
  if (p.startsWith('/app/proacao/') && _isCeoUser()) return false;
  if (UNIVERSAL_SAFE_ACCESS_PATHS.has(p)) return true;
  if (p.startsWith('/app/proacao/')) return true;
  return false;
}

/** Mapeamento path -> module_key (visible_modules) */
const PATH_TO_MODULE = {
  '/app': 'dashboard',
  '/app/dashboard-vivo': 'dashboard',
  '/app/proacao': 'proaction',
  '/app/operacional': 'operational',
  '/app/registro-inteligente': 'registro_inteligente',
  '/app/cadastrar-com-ia': 'cadastrar_com_ia',
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
  '/app/quality/operational': 'quality_intelligence',
  '/app/quality/operational/inspection': 'quality_intelligence',
  '/app/quality/operational/kiosk': 'quality_intelligence',
  '/app/quality/operational/workspace': 'quality_intelligence',
  '/app/safety/operational': 'safety_intelligence',
  '/app/safety/operational/inspection': 'safety_intelligence',
  '/app/safety/operational/workspace': 'safety_intelligence',
  '/app/logistics/operational': 'logistics_intelligence',
  '/app/logistics/operational/workspace': 'logistics_intelligence',
  '/app/environment/operational': 'environment_intelligence',
  '/app/environment/operational/workspace': 'environment_intelligence',
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

/** Rotas mapeadas a module_key `operational` mas permitidas no portal administrativo (cadastro / registro). */
const OPERATIONAL_MODULE_ADMIN_EXEMPT_PATHS = new Set(['/app/registro-inteligente']);

function logAdminPortal(tag, payload) {
  try {
    console.log(tag, typeof payload === 'string' ? payload : JSON.stringify(payload));
  } catch {
    /* ignore */
  }
}

function readStoredUser() {
  try {
    return JSON.parse(localStorage.getItem('impetus_user') || '{}');
  } catch {
    return {};
  }
}

function getModuleForPath(path) {
  const base = String(path || '').split('?')[0];
  const n = base.replace(/\/+$/, '') || '/';
  if (PATH_TO_MODULE[n]) return PATH_TO_MODULE[n];
  if (n.startsWith('/app/quality/')) return 'quality_intelligence';
  if (n.startsWith('/app/safety/')) return 'safety_intelligence';
  if (n.startsWith('/app/logistics/')) return 'logistics_intelligence';
  if (n.startsWith('/app/environment/')) return 'environment_intelligence';
  if (n.startsWith('/app/admin')) return 'admin';
  if (n.startsWith('/diagnostic')) return 'operational';
  return null;
}

/** Contas que historicamente podiam ver menu completo sem lista do servidor (fallback legado removido por defeito). */
function userMayBypassEmptyModules(user) {
  if (!user) return false;
  const r = String(user.role || '').toLowerCase();
  if (r === 'admin' || r === 'internal_admin') return true;
  if (user.is_tenant_admin === true) return true;
  if (isExecutiveLeadershipRole(user)) return true;
  return userHasSystemAdministrationCapability(user);
}

function standaloneOperationalPathAllowed(path, user, visibleSet) {
  const p = (path || '').replace(/\/+$/, '') || '/';
  if (visibleSet.has('operational')) return true;
  if (p === '/app/pulse-rh' && shouldOfferPulseRhMenu(user)) return true;
  if (p === '/app/pulse-gestao' && isExecutiveLeadershipRole(user)) return true;
  return false;
}

/**
 * Filtra itens de menu por visible_modules
 */
export function filterMenuByModules(menuItems, visibleModules, opts = {}) {
  let isMaint = false;
  try {
    const user = JSON.parse(localStorage.getItem('impetus_user') || '{}');
    isMaint = isMaintenanceProfile(user);
  } catch {
    isMaint = false;
  }

  const terminalSet = opts._terminalVisibleModules;
  const effectiveModules = Array.isArray(terminalSet) && terminalSet.length > 0 ? terminalSet : visibleModules;

  if (!effectiveModules || effectiveModules.length === 0) {
    const uEmpty = readStoredUser();
    if (userMayBypassEmptyModules(uEmpty)) return menuItems;
    if (opts.loading) return menuItems;
    return [];
  }
  const set = new Set(effectiveModules);
  const u = readStoredUser();
  const adminPortal = isAdministrativePortalOnlyUser(u);
  const sysAdmin =
    userHasSystemAdministrationCapability(u) ||
    u.is_tenant_admin === true;
  return menuItems.filter((item) => {
    const p = (item.path || '').replace(/\/+$/, '') || '';

    // Acesso universal seguro: os 3 módulos explícitos sempre visíveis no menu.
    // Não altera o deny-by-default do restante do sistema.
    if (isUniversalSafeAccessPath(p)) return true;

    if (adminPortal) {
      if (STANDALONE_OPERATIONAL_PATHS.has(p)) {
        logAdminPortal('[ADMIN_MODULE_FILTER]', { path: p, reason: 'standalone_operational' });
        return false;
      }
      if (isMaint && STANDALONE_MANUIA_PATHS.has(p)) {
        logAdminPortal('[ADMIN_MODULE_FILTER]', { path: p, reason: 'manuia_suppressed' });
        return false;
      }
    }

    if (item && item._quality_publication === true) {
      if (set.has('quality_intelligence')) return true;
      return false;
    }

    if (item && item._safety_publication === true) {
      if (set.has('safety_intelligence')) return true;
      return false;
    }

    if (item && item._logistics_publication === true) {
      if (set.has('logistics_intelligence')) return true;
      return false;
    }

    if (item && item._environment_publication === true) {
      if (set.has('environment_intelligence')) return true;
      return false;
    }

    if (item && item._contextual === true) {
      if (adminPortal) {
        const mod = getModuleForPath(item.path);
        if (mod === 'operational' && !OPERATIONAL_MODULE_ADMIN_EXEMPT_PATHS.has(p)) {
          logAdminPortal('[OPERATIONAL_MODULE_SUPPRESSED]', { path: p, layer: 'menu_contextual' });
          return false;
        }
        if (mod === 'manuia') {
          logAdminPortal('[OPERATIONAL_MODULE_SUPPRESSED]', { path: p, layer: 'menu_manuia' });
          return false;
        }
      }
      const modCtx = getModuleForPath(item.path);
      if (modCtx && set.has(modCtx)) return true;
      if (STANDALONE_OPERATIONAL_PATHS.has(p) && standaloneOperationalPathAllowed(p, u, set)) return true;
      return false;
    }

    if (item.path === '/app' || item.path === '/app/dashboard-vivo') return true;
    // Chat Impetus + Impetus IA: canal de plataforma — visível se `ai` ou `chat` estiver liberado.
    if ((p === '/chat' || p === '/app/chatbot') && (set.has('chat') || set.has('ai'))) return true;
    if (!adminPortal && STANDALONE_OPERATIONAL_PATHS.has(p) && standaloneOperationalPathAllowed(p, u, set)) return true;
    if (isMaint && STANDALONE_MANUIA_PATHS.has(p)) return true;
    const mod = getModuleForPath(item.path);
    if (adminPortal && mod === 'operational' && OPERATIONAL_MODULE_ADMIN_EXEMPT_PATHS.has(p)) return true;
    if (!mod) return isStrictAdminRole(u);
    if (mod === 'admin' && sysAdmin) return true;
    if (adminPortal && mod === 'operational') {
      logAdminPortal('[OPERATIONAL_MODULE_SUPPRESSED]', { path: p, layer: 'menu_module_map' });
      return false;
    }
    return set.has(mod);
  });
}

/**
 * Verifica se path é permitido.
 * Dashboard (/app): sempre permitido para quem tem no menu (CEO, diretor, gerente, coordenador, supervisor).
 * Só admin e colaborador não têm /app no menu; admin é bloqueado na rota.
 *
 * @param {string}   path
 * @param {string[]} visibleModules
 * @param {Set<string>} [contextualPathSet] paths entregues pelo motor contextual
 */
export function canAccessPath(path, visibleModules, contextualPathSet, opts = {}) {
  let isMaint = false;
  try {
    const user = JSON.parse(localStorage.getItem('impetus_user') || '{}');
    isMaint = isMaintenanceProfile(user);
  } catch {
    isMaint = false;
  }
  const norm = path.replace(/\/+$/, '').split('?')[0] || '/';
  const u = readStoredUser();

  // Acesso universal seguro: os 3 módulos sempre acessíveis independentemente de visible_modules.
  // Não afeta orchestration, telemetry nem dashboards operacionais.
  if (isUniversalSafeAccessPath(norm)) return true;

  if (!visibleModules?.length) {
    if (opts.loading) return false;
    if (isUniversalSafeAccessPath(norm)) return true;
    if (userMayBypassEmptyModules(u)) return true;
    return norm === '/app' || norm === '/app/dashboard-vivo';
  }
  const visSet = new Set(visibleModules);
  const adminPortal = isAdministrativePortalOnlyUser(u);

  if (adminPortal) {
    if (STANDALONE_OPERATIONAL_PATHS.has(norm)) return false;
    if (isMaint && STANDALONE_MANUIA_PATHS.has(norm)) return false;
  }

  if (norm === '/app' || norm === '/app/dashboard-vivo') return true;
  if ((norm === '/chat' || norm === '/app/chatbot') && (visSet.has('chat') || visSet.has('ai'))) return true;
  if (!adminPortal && STANDALONE_OPERATIONAL_PATHS.has(norm) && standaloneOperationalPathAllowed(norm, u, visSet)) return true;
  if (isMaint && STANDALONE_MANUIA_PATHS.has(norm)) return true;
  // Enterprise Hardening Bloco 8 (A14): o backend continua a ser a autoridade
  // canónica. Esta verificação por prefixo serve para UX (mostrar/esconder no
  // menu); a permissão efetiva é validada novamente em cada chamada API.
  if (norm.startsWith('/app/admin') && isAdministrativePortalOnlyUser(readStoredUser())) return true;
  if (contextualPathSet && contextualPathSet.has(norm)) {
    if (adminPortal) {
      const mod = getModuleForPath(path);
      if (mod === 'manuia') return false;
      if (mod === 'operational' && !OPERATIONAL_MODULE_ADMIN_EXEMPT_PATHS.has(norm)) return false;
    }
    const modCtx = getModuleForPath(path);
    if (modCtx && visibleModules.includes(modCtx)) return true;
    if (STANDALONE_OPERATIONAL_PATHS.has(norm)) return standaloneOperationalPathAllowed(norm, u, visSet);
    return false;
  }
  const mod = getModuleForPath(path);
  if (adminPortal && mod === 'operational' && OPERATIONAL_MODULE_ADMIN_EXEMPT_PATHS.has(norm)) return true;
  if (!mod) {
    if (isStrictAdminRole(u)) return true;
    return false;
  }
  if (adminPortal && mod === 'operational') return false;
  return visibleModules.includes(mod);
}

export function useVisibleModules() {
  const [visibleModules, setVisibleModules] = useState([]);
  const [maintenanceFromProfile, setMaintenanceFromProfile] = useState(false);
  const [loading, setLoading] = useState(true);
  // Phase 8 — contextual modules entregues pelo backend (mode != 'off').
  // Em produção (mode = 'off') este array fica vazio → fallback total ao legacy.
  const [contextualModules, setContextualModules] = useState([]);
  const [contextualMeta, setContextualMeta] = useState(null);
  const [dashboardMePayload, setDashboardMePayload] = useState(null);

  // Enterprise Hardening Bloco 8 (M10): cancela fetch obsoleto quando o
  // componente desmonta antes da resposta chegar — evita setState órfão.
  const fetchAbortRef = useRef(null);
  const fetchModules = useCallback(async () => {
    try {
      try {
        if (fetchAbortRef.current && typeof fetchAbortRef.current.abort === 'function') {
          fetchAbortRef.current.abort();
        }
      } catch (_) { /* ignore */ }
      try {
        fetchAbortRef.current = new AbortController();
      } catch (_) {
        fetchAbortRef.current = null;
      }
      const signal = fetchAbortRef.current ? fetchAbortRef.current.signal : undefined;
      const r = await dashboard.getMe({ signal });
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
          if (Array.isArray(r.data.contextual_capabilities)) {
            u.contextual_capabilities = r.data.contextual_capabilities;
          }
          if (typeof r.data.is_tenant_admin === 'boolean') {
            u.is_tenant_admin = r.data.is_tenant_admin;
          }
          if (r.data.tenant_admin_type !== undefined) {
            u.tenant_admin_type = r.data.tenant_admin_type;
          }
          if (typeof r.data.tenant_admin_can_manage === 'boolean') {
            u.tenant_admin_can_manage = r.data.tenant_admin_can_manage;
          }
          if (r.data.structural_profile) {
            u.structural_profile = r.data.structural_profile;
            if (r.data.structural_profile.departamento_oficial) {
              u.department = r.data.structural_profile.departamento_oficial;
            }
            if (r.data.structural_profile.setor_oficial) {
              u.setor = r.data.structural_profile.setor_oficial;
            }
          }
          if (r.data.module_access_context?.functional_area) {
            u.functional_area = r.data.module_access_context.functional_area;
          }
          if (r.data.module_access_context?.cargo && !u.job_title) {
            u.job_title = r.data.module_access_context.cargo;
          }
          localStorage.setItem('impetus_user', JSON.stringify(u));
        }
      } catch {
        /* ignore */
      }
      setDashboardMePayload(r?.data || null);
      const governed = readCanonicalVisibleModules(r?.data);
      let mods =
        governed.length > 0
          ? governed
          : r?.data?.visible_modules ?? r?.data?.profile_config?.visible_modules;
      mods = Array.isArray(mods) ? mods : [];
      if (mods.includes('ai') && !mods.includes('chat')) {
        mods = [...mods, 'chat'];
      }
      const gov = r?.data?.module_access_governance;
      if (
        gov?.structural_complete === false &&
        Array.isArray(gov?.universal_modules) &&
        !gov?.executive_structural_bypass &&
        !isExecutiveLeadershipRole(readStoredUser())
      ) {
        mods = [...new Set(gov.universal_modules)];
      } else if (gov && Array.isArray(mods) && gov.denied_count > 0) {
        mods = mods.filter((k) => !gov.denied?.some((d) => d.menu_key === k));
      } else if (r?.data?.structural_module_filter?.skipped !== true && r?.data?.structural_profile) {
        mods = filterVisibleModulesByStructuralProfile(mods, r.data.structural_profile, {
          cadastroFiel: gov?.cadastro_fiel === true
        });
      }
      if (mods.includes('ai') && !mods.includes('chat')) {
        mods = [...mods, 'chat'];
      }
      // Enterprise Hardening — aplica reconciliação de visibilidade do backend
      mods = applyReconciliationToVisibleModules(mods, r?.data);
      setVisibleModules(mods);
      const profileCode = String(r?.data?.profile_code || '').toLowerCase();
      const functionalArea = String(r?.data?.user_context?.functional_area || '').toLowerCase();
      const isMaint =
        profileCode.includes('maintenance') ||
        functionalArea === 'maintenance' ||
        functionalArea.includes('manutenc');
      setMaintenanceFromProfile(isMaint);
      // Phase 8 — extrair contextual_modules sem alterar contrato existente.
      const cmRaw = r?.data?.contextual_modules_governed ?? r?.data?.contextual_modules;
      let cmMeta = r?.data?.contextual_modules_meta || null;
      const strictMode = getContextualModulesMode(r?.data);
      if (strictMode === 'STRICT') {
        cmMeta = { ...(cmMeta || {}), mode: 'STRICT', terminal_locked: true };
      }
      setContextualModules(Array.isArray(cmRaw) ? cmRaw : []);
      setContextualMeta(cmMeta);
      try {
        const uDbg = readStoredUser();
        if (isAdministrativePortalOnlyUser(uDbg)) {
          logAdminPortal('[TENANT_ADMIN_CONTEXT]', {
            profile: uDbg.dashboard_profile,
            is_tenant_admin: uDbg.is_tenant_admin,
            contextual_modules_ignored: Array.isArray(cmRaw) ? cmRaw.length : 0
          });
        }
        logContextualDebugSummary({
          mode: cmMeta && cmMeta.mode ? cmMeta.mode : 'off',
          visible_modules: Array.isArray(mods) ? mods : [],
          contextual_modules: Array.isArray(cmRaw) ? cmRaw : [],
          meta: cmMeta
        });
      } catch { /* never throw */ }
    } catch (err) {
      // Ignora abort intencional (componente desmontou ou refetch disparou).
      if (err && (err.name === 'AbortError' || err.code === 'ERR_CANCELED')) {
        return;
      }
      setVisibleModules([]);
      setMaintenanceFromProfile(false);
      setContextualModules([]);
      setContextualMeta(null);
      setDashboardMePayload(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchModules();
    return () => {
      try {
        if (fetchAbortRef.current && typeof fetchAbortRef.current.abort === 'function') {
          fetchAbortRef.current.abort();
        }
      } catch (_) { /* ignore */ }
    };
  }, [fetchModules]);

  // Set memoizável de paths entregues pelo motor contextual (para canAccessPath).
  const contextualPathSet = (() => {
    if (isAdministrativePortalOnlyUser(readStoredUser())) {
      return new Set();
    }
    const s = new Set();
    if (Array.isArray(contextualModules)) {
      for (const m of contextualModules) {
        if (!m) continue;
        if (Array.isArray(m.paths)) {
          for (const p of m.paths) {
            const np = String(p || '').replace(/\/+$/, '') || '/';
            if (np && np !== '/') s.add(np);
          }
        }
      }
    }
    return s;
  })();

  return {
    visibleModules,
    maintenanceFromProfile,
    loading,
    filterMenu: (items, _unused, opts) => filterMenuByModules(items, visibleModules, { loading, ...opts }),
    canAccessPath: (path) => canAccessPath(path, visibleModules, contextualPathSet, { loading }),
    refetch: fetchModules,
    // Phase 8 — campos aditivos: consumidores antigos continuam a ignorá-los.
    contextualModules,
    contextualMeta,
    dashboardMePayload,
    moduleAccessGovernance: dashboardMePayload?.module_access_governance ?? null,
    moduleAccessContext: dashboardMePayload?.module_access_context ?? null
  };
}
