'use strict';

/**
 * Descriptor engine — camada operacional (mobile/touch, baixa densidade).
 * Sem JSX no backend: retorna manifesto para o frontend enterprise modular.
 */

function baseManifest() {
  return {
    engine_id: 'quality_operations_ui_engine',
    version: 1,
    layer: 'operations',
    origin_layer: 'operational',
    principles: [
      'mobile_first',
      'touch_first',
      'low_cognitive_load',
      'low_visual_density',
      'offline_queue_capable',
      'event_backbone_aligned'
    ],
    components: [
      { id: 'quick_inspection', kind: 'dynamic_form', load_hint: 'domains/quality/shells/QuickInspection' },
      { id: 'checklist_runner', kind: 'checklist', load_hint: 'domains/quality/shells/ChecklistRunner' },
      { id: 'dimensional_capture', kind: 'numeric_capture', load_hint: 'domains/quality/shells/DimensionalCapture' },
      { id: 'micro_capture', kind: 'lab_capture', load_hint: 'domains/quality/shells/MicroCapture' },
      { id: 'scanner_panel', kind: 'scan', load_hint: 'domains/quality/shells/ScannerPanel' },
      { id: 'attachment_strip', kind: 'media', load_hint: 'domains/quality/shells/AttachmentStrip' },
      { id: 'offline_sync_status', kind: 'sync', load_hint: 'domains/quality/shells/OfflineSyncStatus' }
    ],
    ai_assistant_profile: 'operational_assistant',
    forbidden: ['executive_kpi_wall', 'spc_exec_board', 'heavy_analytics_grid']
  };
}

function descriptor(ctx = {}) {
  const m = baseManifest();
  m.deployment = {
    company_id: ctx.companyId || null,
    operational_density: ctx.operationalDensity || 'low',
    governance_density: ctx.governanceDensity || 'minimal',
    cognitive_budget: ctx.cognitiveBudget || {},
    intended_audience: ctx.intendedAudience || 'operator',
    origin_layer: ctx.originLayer || 'operational'
  };
  if (ctx.tenantRow?.industry_profile?.pack) {
    m.industry_pack = ctx.tenantRow.industry_profile.pack;
  }
  return m;
}

module.exports = {
  qualityOperationsUiEngine: { baseManifest, descriptor }
};
