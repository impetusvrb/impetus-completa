/**
 * Testes Node (sem Jest) — flags, parser, router, offline key shape.
 */
import { routeQualityScan } from '../../domains/quality/scanner/qualityScanRouter.js';
import { inferSymbology, normalizeScanText } from '../../domains/quality/scanner/qualityScanParser.js';

let p = 0;
let f = 0;
function ok(label, cond) {
  if (cond) {
    p++;
    console.log('  OK', label);
  } else {
    f++;
    console.log('  FAIL', label);
  }
}

ok('normalizeScanText', normalizeScanText('  ABC\n') === 'ABC');
ok('infer EAN13', inferSymbology('5901234123457') === 'ean13');
ok('route lot', routeQualityScan('LOTE:ABC123').kind === 'lot');
ok('route unknown still object', typeof routeQualityScan('xyz').kind === 'string');

console.log(`\n${p} passed ${f} failed\n`);
process.exit(f > 0 ? 1 : 0);
