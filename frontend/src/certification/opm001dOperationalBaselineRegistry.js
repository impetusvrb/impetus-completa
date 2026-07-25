/**
 * OPM-001D — Operational Baseline Certification Registry.
 * Certifica fundação operacional partilhada (EOX + composição de domínio) antes de OPM-002A.
 */
export const OPM001D_PHASE = 'OPM-001D';

export const EOX_BASELINE_SCOPE = Object.freeze([
  'corporate_header',
  'breadcrumb',
  'domain_returns',
  'action_bar_slot',
  'outlet_context_forward'
]);

/** Itens UX não bloqueadores — backlog UX-002 */
export const UX002_POLISH_BACKLOG = Object.freeze([
  { id: 'UX-002-01', area: 'EOX Header', item: 'Espaçamento vertical entre breadcrumb e título' },
  { id: 'UX-002-02', area: 'EOX Header', item: 'Alinhamento action bar vs título em viewports médios' },
  { id: 'UX-002-03', area: 'Nomenclatura', item: 'Consistência Segurança vs SST no breadcrumb e retornos' },
  { id: 'UX-002-04', area: 'Tipografia', item: 'Harmonizar meta versão/fase entre domínios' },
  { id: 'UX-002-05', area: 'Hub cards', item: 'Padding uniforme nos atalhos pós-supressão h1' },
  { id: 'UX-002-06', area: 'Mobile', item: 'Retornos ← em breakpoint 768px — ordem e wrap' }
]);

export const LOGISTICS_WMS_BASELINE = Object.freeze({
  domainId: 'logistics_wms',
  modules: Object.freeze([
    {
      id: 'warehouses',
      phase: 'OPM-001C',
      page: 'domains/logistics-operational/pages/standalone/WarehouseModulePage.jsx',
      presentation: 'domains/logistics-operational/modules/warehouse/WarehouseOperationalModule.jsx',
      stack: ['IndustrialModuleLayout', 'IndustrialDataGrid', 'WarehouseDetailsPanel'],
      certified: true
    },
    {
      id: 'inventory',
      phase: 'OPM-002A',
      page: 'domains/logistics-operational/pages/standalone/InventoryModulePage.jsx',
      presentation: 'domains/logistics-operational/modules/inventory/InventoryOperationalModule.jsx',
      stack: ['IndustrialModuleLayout', 'IndustrialDataGrid', 'InventoryOperationalIntelligencePanel'],
      certified: true
    },
    {
      id: 'receiving',
      phase: 'OPM-003',
      page: 'domains/logistics-operational/pages/standalone/ReceivingModulePage.jsx',
      presentation: 'domains/logistics-operational/modules/receiving/ReceivingOperationalModule.jsx',
      stack: ['IndustrialModuleLayout', 'WMS-REF-001 Reference Components'],
      certified: true
    },
    {
      id: 'picking',
      phase: 'OPM-004',
      page: 'domains/logistics-operational/pages/standalone/PickingModulePage.jsx',
      presentation: 'domains/logistics-operational/modules/picking/PickingOperationalModule.jsx',
      stack: ['IndustrialModuleLayout', 'WMS-REF-001 Reference Components'],
      certified: true
    },
    {
      id: 'shipping',
      phase: 'OPM-005',
      page: 'domains/logistics-operational/pages/standalone/ShippingModulePage.jsx',
      presentation: 'domains/logistics-operational/modules/shipping/ShippingOperationalModule.jsx',
      stack: ['IndustrialModuleLayout', 'WMS-REF-001 Reference Components'],
      certified: true
    },
    {
      id: 'transfers',
      phase: 'OPM-006',
      page: 'domains/logistics-operational/pages/standalone/TransferModulePage.jsx',
      presentation: 'domains/logistics-operational/modules/transfers/TransferOperationalModule.jsx',
      stack: ['IndustrialModuleLayout', 'WMS-REF-001 Reference Components'],
      certified: true
    },
    {
      id: 'warehouse_intelligence',
      phase: 'OPM-007',
      page: 'domains/logistics-operational/pages/standalone/WarehouseIntelligenceModulePage.jsx',
      presentation: 'domains/logistics-operational/modules/warehouse-intelligence/WarehouseIntelligenceModule.jsx',
      stack: ['IndustrialModuleLayout', 'WMS-REF-001 Reference Components', 'Analytical Panels'],
      certified: true
    },
    {
      id: 'cognitive_logistics',
      phase: 'OPM-008',
      page: 'domains/logistics-operational/pages/standalone/CognitiveLogisticsModulePage.jsx',
      presentation: 'domains/logistics-operational/modules/cognitive-logistics/CognitiveLogisticsModule.jsx',
      stack: ['IndustrialModuleLayout', 'WMS-REF-001 Reference Components', 'Cognitive Panels'],
      certified: true
    }
  ])
});

export const QUALITY_BASELINE = Object.freeze({
  domainId: 'quality',
  modules: Object.freeze([
    {
      id: 'operational_hub',
      view: null,
      component: 'domains/quality/operational-runtime/QualityOperationalHub.jsx',
      markers: ['impetus-card', 'Link to='],
      certified: true
    },
    {
      id: 'inspections',
      route: 'inspection',
      component: 'domains/quality/operational-runtime/QualityInspectionRuntime.jsx',
      markers: ['QualityInspectionRuntime'],
      certified: true
    },
    {
      id: 'spc_ncr_capa',
      view: 'governance',
      component: 'domains/quality/governance/QualityGovernanceHub.jsx',
      markers: ['SpcPanel', 'NCR', 'CAPA', 'Fornecedores'],
      certified: true
    },
    {
      id: 'supplier_quality',
      view: 'governance',
      component: 'domains/quality/governance/QualityGovernanceHub.jsx',
      markers: ['Fornecedores', 'NCR', 'CAPA'],
      certified: true
    },
    {
      id: 'telemetry',
      view: 'telemetry',
      component: 'domains/quality/telemetry/QualityTelemetryHub.jsx',
      markers: ['QualityTelemetryHub'],
      certified: true
    }
  ])
});

export const ENVIRONMENT_BASELINE = Object.freeze({
  domainId: 'environment',
  modules: Object.freeze([
    {
      id: 'waste',
      view: 'waste',
      component: 'domains/environment/operational-runtime/waste/WasteOperationalHub.jsx',
      markers: ['Resíduos', 'EnvironmentOperationalHubBase', 'MTR'],
      certified: true
    },
    {
      id: 'water',
      view: 'water',
      component: 'domains/environment/operational-runtime/water/WaterOperationalHub.jsx',
      markers: ['WaterOperationalHub', 'EnvironmentOperationalHubBase'],
      certified: true
    },
    {
      id: 'emissions',
      view: 'emissions',
      component: 'domains/environment/operational-runtime/emissions/EmissionsOperationalHub.jsx',
      markers: ['EmissionsOperationalHub'],
      certified: true
    },
    {
      id: 'compliance',
      view: 'compliance',
      component: 'domains/environment/governance/compliance/EnvironmentComplianceHub.jsx',
      markers: ['Compliance', 'EnvironmentComplianceHub'],
      certified: true
    }
  ])
});

export const SAFETY_BASELINE = Object.freeze({
  domainId: 'safety',
  modules: Object.freeze([
    {
      id: 'incidents',
      view: 'incident',
      component: 'domains/safety/operational-runtime/SafetyIncidentPanel.jsx',
      markers: ['KpiCard', 'near_miss', 'training_expired', 'Quase-acidente'],
      certified: true
    },
    {
      id: 'near_miss',
      view: 'incident',
      component: 'domains/safety/operational-runtime/SafetyIncidentPanel.jsx',
      markers: ['near_miss'],
      note: 'Integrado no painel de incidentes (kind near_miss)',
      certified: true
    },
    {
      id: 'training',
      view: 'incident',
      component: 'domains/safety/operational-runtime/SafetyIncidentPanel.jsx',
      markers: ['training_expired', 'Treinamento'],
      note: 'Alertas de treinamento no painel de incidentes',
      certified: true
    },
    {
      id: 'ptw',
      view: 'ptw',
      component: 'domains/safety/governance/SafetyGovernanceHub.jsx',
      markers: ['PT', 'LOTO', 'APR'],
      certified: true
    },
    {
      id: 'epi',
      view: 'epi',
      component: 'domains/safety/governance/SafetyGovernanceHub.jsx',
      markers: ['EPI', 'EPC'],
      certified: true
    }
  ])
});

export const EOX_ADAPTERS_BASELINE = Object.freeze([
  {
    id: 'EoxDomainNavLayout',
    path: 'presentation/eox/EoxDomainNavLayout.jsx',
    certified: true
  },
  {
    id: 'QualityOperationalNavLayout',
    path: 'domains/quality/layout/QualityOperationalNavLayout.jsx',
    certified: true
  },
  {
    id: 'SafetyOperationalNavLayout',
    path: 'domains/safety/layout/SafetyOperationalNavLayout.jsx',
    certified: true
  },
  {
    id: 'EnvironmentOperationalNavLayout',
    path: 'domains/environment/layout/EnvironmentOperationalNavLayout.jsx',
    certified: true
  },
  {
    id: 'LogisticsOperationalNavLayout',
    path: 'domains/logistics/layout/LogisticsOperationalNavLayout.jsx',
    certified: true
  },
  {
    id: 'WmsOperationalNavLayout',
    path: 'domains/logistics-operational/layout/WmsOperationalNavLayout.jsx',
    certified: true
  }
]);

export const ALL_DOMAIN_BASELINES = Object.freeze([
  LOGISTICS_WMS_BASELINE,
  QUALITY_BASELINE,
  ENVIRONMENT_BASELINE,
  SAFETY_BASELINE
]);

export function isOperationalBaselineFullyCertified() {
  const domainsOk = ALL_DOMAIN_BASELINES.every((d) => d.modules.every((m) => m.certified));
  const adaptersOk = EOX_ADAPTERS_BASELINE.every((a) => a.certified);
  return domainsOk && adaptersOk;
}
