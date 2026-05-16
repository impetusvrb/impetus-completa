/**
 * Manifesto UI operacional — espelha o backend; use com lazy + DS Industrial 4.0.
 */

export function qualityOperationsUiEngineManifest(ctx = {}) {
  return {
    engine_id: 'quality_operations_ui_engine',
    version: 1,
    layer: 'operations',
    deployment: ctx.deployment || {},
    components: [
      { id: 'quick_inspection', kind: 'dynamic_form' },
      { id: 'checklist_runner', kind: 'checklist' },
      { id: 'dimensional_capture', kind: 'numeric_capture' },
      { id: 'micro_capture', kind: 'lab_capture' },
      { id: 'scanner_panel', kind: 'scan' },
      { id: 'attachment_strip', kind: 'media' },
      { id: 'offline_sync_status', kind: 'sync' }
    ],
    ai_assistant_profile: 'operational_assistant'
  };
}

export default { qualityOperationsUiEngineManifest };
