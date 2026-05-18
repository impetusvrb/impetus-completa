import { Droplets, Factory, Wind, Recycle, MapPin, Activity, Layers, TrendingUp, Leaf, BarChart3 } from 'lucide-react';
import { resolveEnvironmentNavigationPublication } from './environmentNavigationResolver.js';
import { recordEnvironmentPublicationAudit } from './environmentPublicationAudit.js';
import {
  noteEnvironmentMenuInjected,
  noteEnvironmentPublicationFailure
} from '../../../observability/environmentOperationalTelemetry.js';
import { noteEnvironmentMenuMergeOk, noteEnvironmentMenuMergeFail } from './environmentNavigationStabilityRuntime.js';

const ICON_BY_ID = {
  environment_operational: Leaf,
  environment_water: Droplets,
  environment_effluent: Factory,
  environment_emissions: Wind,
  environment_waste: Recycle,
  environment_field: MapPin,
  environment_esg: BarChart3,
  environment_telemetry: Activity,
  environment_governance: Layers,
  environment_intelligence: BarChart3,
  environment_rollout: Layers,
  environment_maturity: TrendingUp,
  environment_widgets_only: Leaf
};

function norm(p) {
  return String(p || '').split('?')[0].replace(/\/+$/, '') || '/';
}

export function mergeEnvironmentPublicationIntoMenu(baseMenuItems, ctx) {
  if (!Array.isArray(baseMenuItems)) return baseMenuItems;
  if (!ctx || typeof ctx !== 'object') return baseMenuItems;
  if (ctx.modulesLoading) return baseMenuItems;

  const pub = resolveEnvironmentNavigationPublication({
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
    const Icon = ICON_BY_ID[m.id] || Leaf;
    insert.push({
      path: m.path,
      icon: Icon,
      label: m.label,
      _environment_publication: true,
      _environment_manifest_id: m.id
    });
  }

  if (insert.length === 0) return baseMenuItems;

  noteEnvironmentMenuInjected(insert.length);
  try {
    recordEnvironmentPublicationAudit({
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

export function safeMergeEnvironmentPublicationIntoMenu(baseMenuItems, ctx) {
  const base = Array.isArray(baseMenuItems) ? baseMenuItems : [];
  const baseLen = base.length;
  try {
    const merged = mergeEnvironmentPublicationIntoMenu(base, ctx);
    if (!Array.isArray(merged)) {
      console.warn('[ENVIRONMENT_PUBLICATION_RUNTIME] merge returned non-array; preserving base menu');
      noteEnvironmentMenuMergeFail();
      return base.slice();
    }
    if (merged.length < baseLen) {
      console.warn('[ENVIRONMENT_PUBLICATION_RUNTIME] merge shrank menu; preserving base menu');
      noteEnvironmentMenuMergeFail();
      return base.slice();
    }
    noteEnvironmentMenuMergeOk();
    return merged;
  } catch (err) {
    noteEnvironmentPublicationFailure();
    noteEnvironmentMenuMergeFail();
    console.warn('[ENVIRONMENT_PUBLICATION_RUNTIME] merge failed; preserving base menu', err?.message || err);
    return base.slice();
  }
}
