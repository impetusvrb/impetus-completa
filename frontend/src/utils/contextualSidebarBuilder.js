/**
 * Contextual Sidebar Builder — Phase 8 (Frontend Wiring)
 *
 * Junta o núcleo puro (`contextualSidebarBuilder.core.cjs`) com o mapa de
 * decoração visual (ícones do `lucide-react` já importados em `Layout.jsx`).
 *
 * Camada que une:
 *   1) menu legacy (MENUS[role]) — fonte hardcoded actual
 *   2) array `contextual_modules` que vem do `/dashboard/me`
 *      (emitido pelo orchestrator/façade Phase 6 quando o modo é diferente
 *      de `off`)
 *
 * Devolve um menu híbrido pronto para o `Layout.jsx` consumir.
 *
 * GARANTIAS:
 *   - sem hooks, sem efeitos. 100% testável (núcleo puro em CJS).
 *   - aditivo: nunca remove items legacy. Só insere, e sempre depois do
 *     item /app (Dashboard) — preservando ordem visual.
 *   - sem duplicação: dedupe por path normalizado.
 *   - tolerante: se `contextualModules` for null/undefined/vazio, devolve
 *     o legacy intacto.
 *   - sem alteração de design: usa apenas ícones já importados em
 *     `Layout.jsx` e labels canónicas.
 *   - silencioso: emite logs apenas quando
 *     `window.IMPETUS_CONTEXTUAL_DEBUG === true`.
 */

import {
  DollarSign,
  TrendingDown,
  TrendingUp,
  Building2,
  Brain,
  Target,
  ScrollText,
  Activity,
  Wrench,
  Shield
} from 'lucide-react';
import core from './contextualSidebarBuilder.core.cjs';

const { buildHybridMenu: _buildHybridMenu, logContextualDebugSummary: _logSummary } = core;

/**
 * Mapa de `module_id` (canónico, vindo do `moduleRegistry` do backend) para
 * a entrada de menu correspondente. Usar APENAS ícones já importados em
 * `Layout.jsx` para não introduzir dependências novas.
 */
/** Módulos injectados pelo Motor B que não podem aparecer no menu do portal administrativo do tenant. */
export const ADMIN_PORTAL_DENIED_CONTEXTUAL_MODULE_IDS = Object.freeze([
  'cost_center',
  'losses_map',
  'centro_previsao_operacional',
  'financial_intelligence',
  'centro_operacoes_industrial',
  'cerebro_operacional',
  'insights',
  'pulse_rh',
  'pulse_gestao',
  'manuia',
  'hr_intelligence',
  'quality_intelligence',
  'proaction'
]);

export const CONTEXTUAL_MODULE_TO_MENU_ITEM = Object.freeze({
  cost_center: {
    icon: DollarSign,
    label: 'Centro de Custos',
    path: '/app/centro-custos-industriais'
  },
  losses_map: {
    icon: TrendingDown,
    label: 'Mapa de Vazamento',
    path: '/app/mapa-vazamento-financeiro'
  },
  centro_previsao_operacional: {
    icon: TrendingUp,
    label: 'Centro de Previsão',
    path: '/app/centro-previsao-operacional'
  },
  financial_intelligence: {
    icon: DollarSign,
    label: 'Inteligência Financeira',
    path: '/app/centro-custos-industriais'
  },
  centro_operacoes_industrial: {
    icon: Building2,
    label: 'Centro de Operações',
    path: '/app/centro-operacoes-industrial'
  },
  cerebro_operacional: {
    icon: Brain,
    label: 'Cérebro operacional',
    path: '/app/cerebro-operacional'
  },
  insights: {
    icon: TrendingUp,
    label: 'Insights operacionais',
    path: '/app/insights'
  },
  pulse_rh: {
    icon: Activity,
    label: 'Impetus Pulse (RH)',
    path: '/app/pulse-rh'
  },
  pulse_gestao: {
    icon: Activity,
    label: 'Impetus Pulse (visão coletiva)',
    path: '/app/pulse-gestao'
  },
  manuia: {
    icon: Wrench,
    label: 'ManuIA',
    path: '/app/manutencao/manuia'
  },
  audit: {
    icon: ScrollText,
    label: 'Logs de Auditoria',
    path: '/app/admin/audit-logs'
  },
  proaction: {
    icon: Target,
    label: 'Pró-Ação',
    path: '/app/proacao'
  },
  hr_intelligence: {
    icon: Activity,
    label: 'Impetus Pulse (RH)',
    path: '/app/pulse-rh'
  },
  quality_intelligence: {
    icon: Shield,
    label: 'Qualidade & Conformidade',
    path: '/app/insights'
  }
});

/**
 * Constrói o menu híbrido decorando com os ícones do lucide-react.
 *
 * @param {Array<object>} legacyMenu       MENUS[role] do Layout.jsx
 * @param {Array<object>} contextualModules array `contextual_modules` do `/dashboard/me`
 * @param {Object}        [opts]
 * @param {number}        [opts.minScore=0.5]
 * @param {string[]}      [opts.allowCategories]  whitelist de categorias
 * @param {string[]}      [opts.denyModuleIds]    blacklist de module_id
 * @returns {Array<object>}                 nova lista (não muta inputs)
 */
export function buildHybridMenu(legacyMenu, contextualModules, opts) {
  return _buildHybridMenu(legacyMenu, contextualModules, CONTEXTUAL_MODULE_TO_MENU_ITEM, opts);
}

export function logContextualDebugSummary(payload) {
  return _logSummary(payload);
}
