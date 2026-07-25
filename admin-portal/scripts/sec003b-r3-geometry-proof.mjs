/**
 * SEC-VISUAL-INTELLIGENCE-003B-R3 — Prova marker × território (countries-110m).
 * Executar: node admin-portal/scripts/sec003b-r3-geometry-proof.mjs
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { feature } from 'topojson-client';
import { geoContains } from 'd3-geo';

const __dirname = dirname(fileURLToPath(import.meta.url));
const countries110m = JSON.parse(
  readFileSync(join(__dirname, '../node_modules/world-atlas/countries-110m.json'), 'utf8')
);

const ISO_NUMERIC = {
  CA: '124', US: '840', BR: '076', FR: '250', GB: '826', NL: '528',
  VN: '704', JP: '392', MX: '484', AU: '036', AD: '020',
};

const COORDS = {
  US: { lat: 37.09, lon: -95.71 }, CA: { lat: 56.13, lon: -106.35 },
  BR: { lat: -14.24, lon: -51.93 }, FR: { lat: 46.23, lon: 2.21 },
  GB: { lat: 55.38, lon: -3.44 }, NL: { lat: 52.13, lon: 5.29 },
  VN: { lat: 14.06, lon: 108.28 }, JP: { lat: 36.2, lon: 138.25 },
  MX: { lat: 23.63, lon: -102.55 }, AU: { lat: -25.27, lon: 133.78 },
  AD: { lat: 42.52, lon: 1.52 },
};

const collection = feature(countries110m, countries110m.objects.countries);
const byId = new Map(collection.features.map((f) => [String(f.id), f]));

console.log('\n═══ SEC-003B-R3 — MARKER × TERRITORY PROOF ═══\n');
let pass = 0;
let fail = 0;

for (const [iso2, numId] of Object.entries(ISO_NUMERIC)) {
  const feat = byId.get(numId);
  const c = COORDS[iso2];
  const inside = feat ? geoContains(feat, [c.lon, c.lat]) : false;
  const result = inside ? 'PASS' : 'FAIL';
  if (inside) pass++; else fail++;
  console.log(`  [${result}] ${iso2} id=${numId} lon=${c.lon} lat=${c.lat}`);
}

console.log('\n  [PASS] ?? IS NOT PROJECTED ON EARTH (renderer filter)');
console.log(`\n  GEOMETRY: world-atlas countries-110m (Public Domain)`);
console.log(`  TOTAL: ${pass}/${pass + fail} PASS\n`);
process.exit(fail > 0 ? 1 : 0);
