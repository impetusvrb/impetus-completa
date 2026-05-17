import {
  ClipboardList,
  Shield,
  Activity,
  Brain,
  TrendingUp,
  Layers
} from 'lucide-react';
import { resolveQualityNavigationPublication } from './qualityNavigationResolver.js';
import { recordQualityPublicationAudit } from './qualityPublicationAudit.js';
import { noteQualityMenuInjected, noteQualityPublicationShadowEvent } from '../../../observability/qualityOperationalTelemetry.js';
import { isQualityAudiencePreviewMode } from './qualityPublicationFeatureFlags.js';

const ICON_BY_ID = {
  quality_operational: ClipboardList,
  quality_inspections: ClipboardList,
  quality_ncr_workspace: Shield,
  quality_spc_governance: Shield,
  quality_supplier: Shield,
  quality_telemetry: Activity,
  quality_cognitive: Brain,
  quality_rollout: Layers,
  quality_executive: TrendingUp,
  quality_widgets_only: ClipboardList
};

function norm(p) {
  return String(p || '').split('?')[0].replace(/\/+$/, '') || '/';
}

/**
 * @param {Array<object>} baseMenuItems
 * @param {object} ctx
 * @param {object|null} ctx.user
 * @param {string[]} ctx.visibleModules
 * @param {boolean} ctx.modulesLoading
 * @param {object|null} [ctx.serverPublication]
 */
export function mergeQualityPublicationIntoMenu(baseMenuItems, ctx) {
  if (!Array.isArray(baseMenuItems)) return baseMenuItems;
  if (!ctx || typeof ctx !== 'object') return baseMenuItems;
  if (ctx.modulesLoading) return baseMenuItems;

  const pub = resolveQualityNavigationPublication({
    user: ctx.user,
    visibleModules: ctx.visibleModules,
    serverPublication: ctx.serverPublication || null,
    timing: true
  });

  if (!pub.shouldPublishMenu || pub.menuItems.length === 0) return baseMenuItems;

  const occupied = new Set(
    baseMenuItems.map((it) => {
      const raw = String(it.path || '').split('?')[0];
      return norm(raw);
    })
  );

  const insert = [];
  for (const m of pub.menuItems) {
    const rawPath = String(m.path || '');
    const basePath = norm(rawPath.split('?')[0]);
    const hasQuery = rawPath.includes('?');
    if (!hasQuery && occupied.has(basePath)) continue;
    const Icon = ICON_BY_ID[m.id] || Shield;
    insert.push({
      path: m.path,
      icon: Icon,
      label: m.label,
      _quality_publication: true,
      _quality_manifest_id: m.id
    });
  }

  if (insert.length === 0) return baseMenuItems;

  noteQualityMenuInjected(insert.length);
  if (isQualityAudiencePreviewMode() || ctx.serverPublication?.rollout_shadow) {
    noteQualityPublicationShadowEvent();
  }
  try {
    recordQualityPublicationAudit({
      actor: ctx.user?.id || null,
      audience: pub.band,
      visibility_reason: 'menu_merge',
      routes: insert.map((i) => i.path),
      rollout_state: ctx.serverPublication?.rollout_shadow ? 'shadow' : 'live'
    });
  } catch {
    /* ignore */
  }

  const out = baseMenuItems.slice();
  let insertAt = out.findIndex((it) => norm(it.path) === '/app');
  if (insertAt >= 0) insertAt += 1;
  else insertAt = 0;
  out.splice(insertAt, 0, ...insert);
  return out;
}

/**
 * Merge aditivo com barreira segura — nunca encolhe o menu legacy em caso de excepção ou regressão.
 * @param {Array<object>} baseMenuItems
 * @param {object} ctx — mesmo contrato de {@link mergeQualityPublicationIntoMenu}
 */
export function safeMergeQualityPublicationIntoMenu(baseMenuItems, ctx) {
  const base = Array.isArray(baseMenuItems) ? baseMenuItems : [];
  const baseLen = base.length;
  try {
    const merged = mergeQualityPublicationIntoMenu(base, ctx);
    if (!Array.isArray(merged)) {
      // eslint-disable-next-line no-console
      console.warn('[QUALITY_PUBLICATION_RUNTIME] merge returned non-array; preserving base menu');
      return base.slice();
    }
    if (merged.length < baseLen) {
      // eslint-disable-next-line no-console
      console.warn('[QUALITY_PUBLICATION_RUNTIME] merge shrank menu; preserving base menu');
      return base.slice();
    }
    return merged;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[QUALITY_PUBLICATION_RUNTIME] merge failed; preserving base menu', err?.message || err);
    return base.slice();
  }
}
