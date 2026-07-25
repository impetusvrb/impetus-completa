/**
 * INC-042 — Promoção logistics_native no Centro de Comando.
 */
import {
  LOGISTICS_CENTER_REGISTRY,
  LOGISTICS_HUB_REGISTRY,
  LOGISTICS_PLACEHOLDER_WIDGET_IDS,
  resolveAllLogisticsHubsForPromotion,
  resolvePromotedLogisticsHubs,
  shouldSuppressLogisticsPlaceholderWidgets
} from '../../cognitiveRuntime/cockpit/logisticsNativeCockpitRegistry.js';
import { resolveLogisticsCockpitRuntime } from '../../cognitiveRuntime/cockpit/specializedCockpitResolver.js';
import {
  isLogisticsNativeCockpitActive,
  resolveLogisticsHubView
} from '../../domains/logistics/cockpit/logisticsRuntimeHubAdapter.js';

let passed = 0;
let failed = 0;

function ok(label, cond) {
  if (cond) {
    console.log(`  OK ${label}`);
    passed++;
  } else {
    console.error(`  FAIL ${label}`);
    failed++;
  }
}

console.log('\nINC-042 logistics-native-cockpit-promotion\n');

const centers = Object.keys(LOGISTICS_CENTER_REGISTRY).map((center_id) => ({
  center_id,
  blocks: []
}));

ok('seven registered hubs', Object.keys(LOGISTICS_HUB_REGISTRY).length === 7);
ok('all hubs for promotion', resolveAllLogisticsHubsForPromotion(centers).length === 7);

const hubsFromCenters = resolvePromotedLogisticsHubs(centers);
ok('dedupe supplier centers', hubsFromCenters.find((h) => h.hubKey === 'supplier')?.centerIds?.length === 2);

const runtime = { consolidation_applied: true, cockpit_mode: 'logistics_native' };
ok('suppress placeholders when native', shouldSuppressLogisticsPlaceholderWidgets(runtime) === true);
ok('no suppress when off', shouldSuppressLogisticsPlaceholderWidgets({ consolidation_applied: false }) === false);
ok('logistica in placeholder set', LOGISTICS_PLACEHOLDER_WIDGET_IDS.includes('logistica'));
ok('estoque in placeholder set', LOGISTICS_PLACEHOLDER_WIDGET_IDS.includes('estoque'));

const me = {
  logistics_cognitive_runtime: runtime,
  logistics_cognitive_centers: centers,
  logistics_signal_loader: {
    binding_ratio: 0.385,
    bound_blocks: ['logistics.inventory_health', 'logistics.receiving_flow', 'logistics.traceability_bridge'],
    block_details: [
      { block_id: 'logistics.inventory_health', binding_ok: true, reason: 'BOUND', summary: 'Lotes MP: 1', signal_count: 1 },
      { block_id: 'logistics.picking_efficiency', binding_ok: false, reason: 'NOT_IMPLEMENTED', signal_count: 0 },
      { block_id: 'logistics.fleet_efficiency', binding_ok: false, reason: 'NO_RECORDS', signal_count: 0 }
    ]
  }
};

const resolved = resolveLogisticsCockpitRuntime(me);
ok('resolver finds runtime', resolved?.runtime?.cockpit_mode === 'logistics_native');
ok('active helper', isLogisticsNativeCockpitActive(me) === true);

const gov = resolveLogisticsHubView('warehouse_governance', {
  signalLoader: me.logistics_signal_loader,
  runtime: runtime
});
ok('real data hub when bound', gov.state === 'REAL_DATA');

const dist = resolveLogisticsHubView('distribution', {
  signalLoader: me.logistics_signal_loader,
  runtime: runtime
});
ok('picking not implemented state', dist.state === 'NOT_IMPLEMENTED');

const fleet = resolveLogisticsHubView('fleet', {
  signalLoader: me.logistics_signal_loader,
  runtime: runtime
});
ok('insufficient when no records', fleet.state === 'INSUFFICIENT_DATA');

console.log(`\n  ${passed} passed, ${failed} failed\n`);
if (failed) process.exit(1);
