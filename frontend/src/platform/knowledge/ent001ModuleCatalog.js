/**
 * ENT-001 — Catálogo de módulos (WMS + FIN-AUD + EOX views + REG recovery).
 */
import {
  WMS_OPERATIONAL_MODULES,
  WMS_LANDING_MODULE
} from '../../domains/logistics-operational/routes/wmsModuleRegistry.js';
import { FIN_MODULE_MAP } from '../audit/finance/finAud001ModuleMap.js';
import { REG_FUNCTIONAL_RECOVERY_MATRIX } from '../audit/regression/reg001RecoveryMatrix.js';
import { REG_002_CRITICAL_NAV_ITEMS } from '../audit/regression/reg002DeadClickMatrix.js';
import { ENT_001_PHASE } from './ent001Constants.js';

const EOX_VIEW_MODULES = Object.freeze([
  Object.freeze({ moduleId: 'quality_governance', domain: 'quality', type: 'eox_view', label: 'NCR & CAPA' }),
  Object.freeze({ moduleId: 'quality_telemetry', domain: 'quality', type: 'eox_view', label: 'Telemetria Qualidade' }),
  Object.freeze({ moduleId: 'quality_cognitive', domain: 'quality', type: 'eox_view', label: 'Inteligência Qualidade' }),
  Object.freeze({ moduleId: 'safety_governance', domain: 'safety', type: 'eox_view', label: 'GHE & Matriz de Risco' }),
  Object.freeze({ moduleId: 'safety_cognitive', domain: 'safety', type: 'eox_view', label: 'Inteligência SST' }),
  Object.freeze({ moduleId: 'environment_water', domain: 'environment', type: 'eox_view', label: 'Água' }),
  Object.freeze({ moduleId: 'environment_esg', domain: 'environment', type: 'eox_view', label: 'ESG' }),
  Object.freeze({ moduleId: 'environment_cognitive', domain: 'environment', type: 'eox_view', label: 'Inteligência Ambiental' }),
  Object.freeze({ moduleId: 'ppap_cockpit', domain: 'ppap', type: 'cockpit', label: 'PPAP Native Cockpit' }),
  Object.freeze({ moduleId: 'msa_cockpit', domain: 'msa', type: 'cockpit', label: 'MSA Native Cockpit' }),
  Object.freeze({ moduleId: 'ishikawa_cockpit', domain: 'ishikawa', type: 'cockpit', label: 'Ishikawa Native Cockpit' })
]);

function _mapWmsModule(mod) {
  return Object.freeze({
    moduleId: mod.id,
    domain: 'logistics_wms',
    label: mod.label,
    type: 'wms_operational',
    paths: Object.freeze([mod.standalonePath, mod.legacyPath].filter(Boolean)),
    component: mod.component,
    api: mod.api || null,
    sidebar: mod.sidebar !== false,
    maturity: 'certified',
    source: 'wmsModuleRegistry.js'
  });
}

function _mapFinModule(mod) {
  return Object.freeze({
    moduleId: mod.moduleId,
    domain: mod.crossDomain ? 'cross_domain' : 'finance',
    label: mod.label,
    type: mod.type,
    paths: Object.freeze([...(mod.paths || [])]),
    registry: mod.registry,
    visibility: mod.visibility,
    maturity: mod.maturity,
    uiComponents: Object.freeze([...(mod.uiComponents || [])]),
    backendServices: Object.freeze([...(mod.backendServices || [])]),
    source: 'FIN-AUD-001 finAud001ModuleMap.js'
  });
}

function _mapRegFeature(item) {
  return Object.freeze({
    moduleId: item.id,
    domain: 'platform_dashboard',
    label: item.label,
    type: 'platform_page',
    paths: Object.freeze([item.routePath].filter(Boolean)),
    uiPath: item.uiPath || null,
    status: item.status,
    breakPoint: item.breakPoint,
    priority: item.priority,
    reg002Recovery: REG_002_CRITICAL_NAV_ITEMS.some((n) => n.id === item.id),
    source: 'REG-001 recovery matrix'
  });
}

export function buildModuleCatalog() {
  const entries = [
    _mapWmsModule(WMS_LANDING_MODULE),
    ...WMS_OPERATIONAL_MODULES.map(_mapWmsModule),
    ...FIN_MODULE_MAP.map(_mapFinModule),
    ...EOX_VIEW_MODULES,
    ...REG_FUNCTIONAL_RECOVERY_MATRIX.filter((r) => r.ui).map(_mapRegFeature)
  ];
  return Object.freeze(entries);
}

export const ENT_MODULE_CATALOG = buildModuleCatalog();

export function getModuleEntry(moduleId) {
  return ENT_MODULE_CATALOG.find((m) => m.moduleId === moduleId) ?? null;
}

export function listModulesByDomain(domain) {
  return ENT_MODULE_CATALOG.filter((m) => m.domain === domain);
}

export function validateModuleCatalog() {
  const issues = [];
  const wmsCount = ENT_MODULE_CATALOG.filter((m) => m.domain === 'logistics_wms').length;
  const finCount = ENT_MODULE_CATALOG.filter((m) => m.source?.includes('FIN-AUD')).length;
  if (wmsCount < 8) issues.push(`expected >= 8 WMS modules, got ${wmsCount}`);
  if (finCount < 5) issues.push(`expected >= 5 FIN-AUD modules, got ${finCount}`);
  return {
    valid: issues.length === 0,
    issues,
    phase: ENT_001_PHASE,
    count: ENT_MODULE_CATALOG.length,
    byDomain: Object.freeze(
      ENT_MODULE_CATALOG.reduce((acc, m) => {
        acc[m.domain] = (acc[m.domain] || 0) + 1;
        return acc;
      }, {})
    )
  };
}
