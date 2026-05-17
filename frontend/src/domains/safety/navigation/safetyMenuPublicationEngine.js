import {
  ClipboardList,
  Shield,
  Activity,
  Brain,
  TrendingUp,
  Layers,
  HardHat,
  AlertTriangle
} from 'lucide-react';
import { resolveSafetyNavigationPublication } from './safetyNavigationResolver.js';
import { recordSafetyPublicationAudit } from './safetyPublicationAudit.js';
import {
  noteSafetyMenuInjected,
  noteSafetyPublicationFailure
} from '../../../observability/safetyOperationalTelemetry.js';
import { isSafetyAudiencePreviewMode } from './safetyPublicationFeatureFlags.js';

const ICON_BY_ID = {
  safety_operational: HardHat,
  safety_field_inspection: ClipboardList,
  safety_incident: AlertTriangle,
  safety_ptw_loto: Shield,
  safety_epi_epc: Shield,
  safety_risk_ghe: Shield,
  safety_telemetry: Activity,
  safety_cognitive: Brain,
  safety_rollout: Layers,
  safety_executive: TrendingUp,
  safety_widgets_only: HardHat
};

function norm(p) {
  return String(p || '').split('?')[0].replace(/\/+$/, '') || '/';
}

export function mergeSafetyPublicationIntoMenu(baseMenuItems, ctx) {
  if (!Array.isArray(baseMenuItems)) return baseMenuItems;
  if (!ctx || typeof ctx !== 'object') return baseMenuItems;
  if (ctx.modulesLoading) return baseMenuItems;

  const pub = resolveSafetyNavigationPublication({
    user: ctx.user,
    visibleModules: ctx.visibleModules,
    serverPublication: ctx.serverPublication || null,
    timing: true
  });

  if (!pub.shouldPublishMenu || pub.menuItems.length === 0) return baseMenuItems;

  const occupied = new Set(
    baseMenuItems.map((it) => norm(String(it.path || '').split('?')[0]))
  );

  const insert = [];
  for (const m of pub.menuItems) {
    const rawPath = String(m.path || '');
    const basePath = norm(rawPath.split('?')[0]);
    const hasQuery = rawPath.includes('?');
    if (!hasQuery && occupied.has(basePath)) continue;
    const Icon = ICON_BY_ID[m.id] || HardHat;
    insert.push({
      path: m.path,
      icon: Icon,
      label: m.label,
      _safety_publication: true,
      _safety_manifest_id: m.id
    });
  }

  if (insert.length === 0) return baseMenuItems;

  noteSafetyMenuInjected(insert.length);
  try {
    recordSafetyPublicationAudit({
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

export function safeMergeSafetyPublicationIntoMenu(baseMenuItems, ctx) {
  const base = Array.isArray(baseMenuItems) ? baseMenuItems : [];
  const baseLen = base.length;
  try {
    const merged = mergeSafetyPublicationIntoMenu(base, ctx);
    if (!Array.isArray(merged)) {
      console.warn('[SAFETY_PUBLICATION_RUNTIME] merge returned non-array; preserving base menu');
      return base.slice();
    }
    if (merged.length < baseLen) {
      console.warn('[SAFETY_PUBLICATION_RUNTIME] merge shrank menu; preserving base menu');
      return base.slice();
    }
    return merged;
  } catch (err) {
    noteSafetyPublicationFailure();
    console.warn('[SAFETY_PUBLICATION_RUNTIME] merge failed; preserving base menu', err?.message || err);
    return base.slice();
  }
}
