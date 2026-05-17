/**
 * Valida estabilidade do pipeline de publicação (quality → safety → logistics).
 * Sem side-effects persistentes; uso em testes e diagnóstico assistivo.
 */
import { safeMergeQualityPublicationIntoMenu } from '../domains/quality/navigation/qualityMenuPublicationEngine.js';
import { safeMergeSafetyPublicationIntoMenu } from '../domains/safety/navigation/safetyMenuPublicationEngine.js';
import { safeMergeLogisticsPublicationIntoMenu } from '../domains/logistics/navigation/logisticsMenuPublicationEngine.js';

const CORE_PATHS = ['/app', '/app/chatbot', '/chat'];

export function runEnterprisePublicationPipelineStability(ctx = {}) {
  const base = [
    { path: '/app', label: 'Dashboard' },
    { path: '/app/chatbot', label: 'IA', aiIcon: true },
    { path: '/chat', label: 'Chat', chatIcon: true }
  ];
  const mergeCtx = {
    modulesLoading: false,
    user: ctx.user || { role: 'coordenador' },
    visibleModules: ctx.visibleModules || [],
    serverPublication: ctx.serverPublication || null
  };

  let menu = base;
  let recursiveRisk = false;
  try {
    const q = safeMergeQualityPublicationIntoMenu(menu, mergeCtx);
    const s = safeMergeSafetyPublicationIntoMenu(q, mergeCtx);
    const l = safeMergeLogisticsPublicationIntoMenu(s, mergeCtx);
    const again = safeMergeLogisticsPublicationIntoMenu(l, mergeCtx);
    recursiveRisk = again.length > l.length + 3;
    menu = l;
  } catch (e) {
    return {
      ok: false,
      stable: false,
      error: e?.message || 'merge_failed',
      core_preserved: false
    };
  }

  const paths = new Set(menu.map((i) => String(i.path || '').split('?')[0]));
  const corePreserved = CORE_PATHS.every((p) => paths.has(p) || menu.some((i) => String(i.path || '').startsWith(p)));
  const neverShrunk = menu.length >= base.length;

  return {
    ok: true,
    stable: neverShrunk && corePreserved && !recursiveRisk,
    menu_length: menu.length,
    base_length: base.length,
    core_preserved: corePreserved,
    never_shrunk: neverShrunk,
    recursive_publication_risk: recursiveRisk
  };
}
