import { Package, Truck, Warehouse, Activity, Layers, TrendingUp, ClipboardList, Box } from 'lucide-react';
import { resolveLogisticsNavigationPublication } from './logisticsNavigationResolver.js';
import { recordLogisticsPublicationAudit } from './logisticsPublicationAudit.js';
import {
  noteLogisticsMenuInjected,
  noteLogisticsPublicationFailure
} from '../../../observability/logisticsOperationalTelemetry.js';
import { noteLogisticsMenuMergeOk, noteLogisticsMenuMergeFail } from './logisticsNavigationStabilityRuntime.js';

const ICON_BY_ID = {
  logistics_operational: Package,
  logistics_receiving: Truck,
  logistics_storage: Warehouse,
  logistics_picking: ClipboardList,
  logistics_shipping: Truck,
  logistics_dock: Box,
  logistics_telemetry: Activity,
  logistics_governance: Layers,
  logistics_rollout: Layers,
  logistics_maturity: TrendingUp,
  logistics_widgets_only: Package
};

function norm(p) {
  return String(p || '').split('?')[0].replace(/\/+$/, '') || '/';
}

export function mergeLogisticsPublicationIntoMenu(baseMenuItems, ctx) {
  if (!Array.isArray(baseMenuItems)) return baseMenuItems;
  if (!ctx || typeof ctx !== 'object') return baseMenuItems;
  if (ctx.modulesLoading) return baseMenuItems;

  const pub = resolveLogisticsNavigationPublication({
    user: ctx.user,
    visibleModules: ctx.visibleModules,
    serverPublication: ctx.serverPublication || null,
    timing: true
  });

  if (!pub.shouldPublishMenu || pub.menuItems.length === 0) return baseMenuItems;

  const occupied = new Set(baseMenuItems.map((it) => norm(String(it.path || '').split('?')[0])));
  const insert = [];
  for (const m of pub.menuItems) {
    const rawPath = String(m.path || '');
    const basePath = norm(rawPath.split('?')[0]);
    const hasQuery = rawPath.includes('?');
    if (!hasQuery && occupied.has(basePath)) continue;
    const Icon = ICON_BY_ID[m.id] || Package;
    insert.push({
      path: m.path,
      icon: Icon,
      label: m.label,
      _logistics_publication: true,
      _logistics_manifest_id: m.id
    });
  }

  if (insert.length === 0) return baseMenuItems;

  noteLogisticsMenuInjected(insert.length);
  try {
    recordLogisticsPublicationAudit({
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

export function safeMergeLogisticsPublicationIntoMenu(baseMenuItems, ctx) {
  const base = Array.isArray(baseMenuItems) ? baseMenuItems : [];
  const baseLen = base.length;
  try {
    const merged = mergeLogisticsPublicationIntoMenu(base, ctx);
    if (!Array.isArray(merged)) {
      console.warn('[LOGISTICS_PUBLICATION_RUNTIME] merge returned non-array; preserving base menu');
      noteLogisticsMenuMergeFail();
      return base.slice();
    }
    if (merged.length < baseLen) {
      console.warn('[LOGISTICS_PUBLICATION_RUNTIME] merge shrank menu; preserving base menu');
      noteLogisticsMenuMergeFail();
      return base.slice();
    }
    noteLogisticsMenuMergeOk();
    return merged;
  } catch (err) {
    noteLogisticsPublicationFailure();
    noteLogisticsMenuMergeFail();
    console.warn('[LOGISTICS_PUBLICATION_RUNTIME] merge failed; preserving base menu', err?.message || err);
    return base.slice();
  }
}
