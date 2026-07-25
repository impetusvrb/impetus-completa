/**
 * UX-001 / WMS-007A — Sidebar global → páginas standalone /app/logistics/*
 */
import {
  Warehouse,
  Package,
  Truck,
  ClipboardList,
  ArrowLeftRight
} from 'lucide-react';
import {
  getWmsNavigationSnapshot
} from '../../../domains/logistics-operational/routes/wmsOperationalRegistry.js';
import { isPresentationDomainAllowed } from '../domainNavigationResolver.js';

const ICON_BY_MODULE = {
  warehouses: Warehouse,
  inventory: Package,
  receiving: Truck,
  picking: ClipboardList,
  shipping: Truck,
  transfers: ArrowLeftRight
};

/**
 * @param {object} _ctx
 * @returns {import('../presentationNavigationRegistry.js').PresentationSection|null}
 */
export function buildLogisticsWmsPresentationSection(ctx) {
  if (!isPresentationDomainAllowed('logistics_wms', ctx)) return null;
  const snap = getWmsNavigationSnapshot();
  if (!snap.menu_visible || !snap.modules?.length) return null;

  const items = snap.modules
    .filter((m) => m.id !== 'dashboard' && m.sidebar !== false)
    .map((m) => ({
      id: `wms_${m.id}`,
      label: m.label,
      path: m.standalonePath,
      icon: ICON_BY_MODULE[m.id] || Package
    }));

  return {
    domainId: 'logistics_wms',
    title: 'LOGÍSTICA',
    items
  };
}

export function listLogisticsWmsPresentationPaths() {
  const snap = getWmsNavigationSnapshot();
  if (!snap.menu_visible) return [];
  return snap.modules
    .filter((m) => m.id !== 'dashboard')
    .map((m) => m.standalonePath);
}
