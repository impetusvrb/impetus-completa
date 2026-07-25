/**
 * INC-024 — Promoção quality_native Z.23 para Centro de Comando.
 */
import {
  CENTER_ID_TO_HUB,
  resolvePromotedQualityHubs,
  shouldSuppressPlaceholderWidgets,
  QUALITY_PLACEHOLDER_WIDGET_IDS
} from '../../cognitiveRuntime/cockpit/qualityNativeCockpitRegistry.js';
import { resolveSpecializedCockpitRuntime } from '../../cognitiveRuntime/cockpit/specializedCockpitResolver.js';

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

console.log('\nINC-024 quality-native-cockpit-promotion\n');

ok('center map includes operational nc → governance', CENTER_ID_TO_HUB.quality_operational_nc === 'governance');
ok('center map includes telemetry', CENTER_ID_TO_HUB.quality_telemetry_spc === 'telemetry');
ok('center map includes narrative → cognitive', CENTER_ID_TO_HUB.quality_narrative === 'cognitive');

const centers = [
  { center_id: 'quality_operational_nc', label: 'NC' },
  { center_id: 'quality_governance', label: 'Gov' },
  { center_id: 'quality_telemetry_spc', label: 'SPC' },
  { center_id: 'quality_narrative', label: 'Narrativa' }
];
const hubs = resolvePromotedQualityHubs(centers);
ok('dedupe governance hubs', hubs.filter((h) => h.hubKey === 'governance').length === 1);
ok('three unique hub keys', hubs.length === 3);

const runtime = { consolidation_applied: true, cockpit_mode: 'quality_native' };
ok('suppress placeholders when native', shouldSuppressPlaceholderWidgets(runtime) === true);
ok('no suppress when off', shouldSuppressPlaceholderWidgets({ consolidation_applied: false }) === false);
ok('qualidade in placeholder set', QUALITY_PLACEHOLDER_WIDGET_IDS.includes('qualidade'));

const me = {
  specialized_cockpit_runtime: runtime,
  quality_cognitive_centers: centers,
  widgets_promoted: [{ id: 'qualidade', render_promoted: true }]
};
const resolved = resolveSpecializedCockpitRuntime(me);
ok('resolver finds runtime', resolved?.runtime?.cockpit_mode === 'quality_native');
ok('resolver passes centers', resolved?.centers?.length === 4);

console.log(`\n  ${passed} passed, ${failed} failed\n`);
if (failed) process.exit(1);
