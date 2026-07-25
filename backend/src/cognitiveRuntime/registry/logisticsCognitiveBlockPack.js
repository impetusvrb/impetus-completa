'use strict';

/**
 * INC-038 — Pacote oficial logistics_native (registry only, sem processamento).
 * Blocos definidos em INC-037 / LOGISTICS-RUNTIME-ARCHITECTURE v1.0.
 */
const { createBlockDefinition } = require('./cognitiveBlockSchemas');
const { buildBlockMetadata } = require('./cognitiveBlockMetadata');

function _contract(role, binding, tags = []) {
  return { composition_role: role, data_binding: binding, governance_tags: tags };
}
function _authority(minTier, domainOwner, crossDomain = false) {
  return { min_hierarchy_tier: minTier, domain_owner: domainOwner, cross_domain_allowed: crossDomain };
}
function _hierarchy(op, mgmt, strat) {
  return { operational_weight: op, management_weight: mgmt, strategic_weight: strat };
}

const LOGISTICS_PILOT_BLOCK_IDS = Object.freeze([
  'logistics.inventory_health',
  'logistics.stock_rotation',
  'logistics.warehouse_capacity',
  'logistics.receiving_flow',
  'logistics.picking_efficiency',
  'logistics.dock_flow',
  'logistics.shipment_otif',
  'logistics.fleet_efficiency',
  'logistics.route_performance',
  'logistics.supplier_delivery',
  'logistics.traceability_bridge',
  'logistics.contextual_logistics_ai',
  'logistics.logistics_narrative'
]);

const LOGISTICS_BLOCK_ALIASES = Object.freeze({
  'logistics.abc_curve': 'logistics.stock_rotation',
  'logistics.warehouse_ai': 'logistics.contextual_logistics_ai',
  'logistics.traceability': 'logistics.traceability_bridge'
});

const BLOCK_META = {
  'logistics.inventory_health': { cat: 'inventory_health', label: 'Saúde Inventário', layer: 'operational', binding: 'logistics.inventory_health', p: 'P0' },
  'logistics.stock_rotation': { cat: 'stock_rotation', label: 'Rotação Estoque', layer: 'operational', binding: 'logistics.stock_rotation', p: 'P0' },
  'logistics.warehouse_capacity': { cat: 'warehouse_capacity', label: 'Capacidade Armazém', layer: 'operational', binding: 'logistics.warehouse_capacity', p: 'P1' },
  'logistics.receiving_flow': { cat: 'receiving_flow', label: 'Fluxo Recebimento', layer: 'operational', binding: 'logistics.receiving_flow', p: 'P0' },
  'logistics.picking_efficiency': { cat: 'picking_efficiency', label: 'Eficiência Picking', layer: 'operational', binding: 'logistics.picking_efficiency', p: 'P1' },
  'logistics.dock_flow': { cat: 'dock_flow', label: 'Fluxo Docas', layer: 'operational', binding: 'logistics.dock_flow', p: 'P1' },
  'logistics.shipment_otif': { cat: 'shipment_otif', label: 'OTIF Expedição', layer: 'operational', binding: 'logistics.shipment_otif', p: 'P0' },
  'logistics.fleet_efficiency': { cat: 'fleet_efficiency', label: 'Eficiência Frota', layer: 'operational', binding: 'logistics.fleet_efficiency', p: 'P0' },
  'logistics.route_performance': { cat: 'route_performance', label: 'Performance Rotas', layer: 'management', binding: 'logistics.route_performance', p: 'P1' },
  'logistics.supplier_delivery': { cat: 'supplier_delivery', label: 'Entrega Fornecedor', layer: 'management', binding: 'logistics.supplier_delivery', p: 'P1' },
  'logistics.traceability_bridge': { cat: 'traceability_bridge', label: 'Rastreabilidade', layer: 'governance', binding: 'logistics.traceability', p: 'P1', cross: true },
  'logistics.contextual_logistics_ai': { cat: 'contextual_logistics_ai', label: 'IA Logística', layer: 'governance', binding: 'logistics.contextual_ai', p: 'P2' },
  'logistics.logistics_narrative': { cat: 'logistics_narrative', label: 'Narrativa Logística', layer: 'strategic', binding: 'logistics.narrative', p: 'P2' }
};

const LOGISTICS_PILOT_BLOCKS = LOGISTICS_PILOT_BLOCK_IDS.map((id) => {
  const meta = BLOCK_META[id];
  return createBlockDefinition({
    id,
    domain: 'logistics',
    semantic_category: meta.cat,
    label: meta.label,
    surface: id.includes('narrative') ? 'narrative' : id.includes('ai') ? 'assistive' : 'widget',
    semantic_layer: meta.layer,
    contract: _contract(
      meta.layer === 'governance' || meta.layer === 'strategic' ? 'governance_panel' : 'primary_operational',
      meta.binding,
      ['domain:logistics', 'pilot:logistics_cognitive_v1']
    ),
    authority: _authority(meta.layer === 'management' ? 'management' : 'coordination', 'logistics', meta.cross === true),
    hierarchy:
      meta.layer === 'strategic'
        ? _hierarchy(0.2, 0.3, 0.5)
        : meta.layer === 'management'
          ? _hierarchy(0.45, 0.45, 0.1)
          : _hierarchy(0.75, 0.2, 0.05),
    metadata: buildBlockMetadata({
      priority: meta.p,
      pilot_pack: 'logistics_cognitive_v1',
      semantic_tags: [meta.cat],
      foundation_only: true
    })
  });
});

module.exports = {
  LOGISTICS_PILOT_BLOCK_IDS,
  LOGISTICS_BLOCK_ALIASES,
  LOGISTICS_PILOT_BLOCKS,
  getLogisticsPilotBlocks: () => LOGISTICS_PILOT_BLOCKS.slice()
};
