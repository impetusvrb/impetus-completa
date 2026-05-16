'use strict';

/**
 * Quality enterprise runtime integration — smoke (fan-out bridge, flag gate).
 */
const assert = require('assert');
const path = require('path');

process.env.IMPETUS_QUALITY_REALTIME_COLLECTION_ENABLED = 'false';
delete require.cache[path.join(__dirname, '../../domains/quality/runtime/qualityOperationalRuntimeFlags.js')];
delete require.cache[path.join(__dirname, '../../domains/quality/realtime/qualityOperationalSocketFanout.js')];

const { fanoutQualityOperationalEvent } = require('../../domains/quality/realtime/qualityOperationalSocketFanout');

function test(name, fn) {
  try {
    fn();
    console.log('  ✅', name);
  } catch (e) {
    console.error('  ❌', name, e.message);
    process.exitCode = 1;
  }
}

test('fanout não emite com IMPETUS_QUALITY_REALTIME_COLLECTION_ENABLED=false', () => {
  const emitted = [];
  const req = {
    app: {
      get: () => ({
        to() {
          return {
            emit(n, d) {
              emitted.push([n, d]);
            }
          };
        }
      })
    }
  };
  fanoutQualityOperationalEvent(req, {
    companyId: '00000000-0000-4000-8000-000000000099',
    user: { id: 'u1' },
    eventName: 'quality.inspection.saved',
    correlationId: 'c1',
    payload: { n: 1 }
  });
  assert.strictEqual(emitted.length, 0);
});

process.env.IMPETUS_QUALITY_REALTIME_COLLECTION_ENABLED = 'true';
delete require.cache[path.join(__dirname, '../../domains/quality/runtime/qualityOperationalRuntimeFlags.js')];
delete require.cache[path.join(__dirname, '../../domains/quality/realtime/qualityOperationalSocketFanout.js')];
const { fanoutQualityOperationalEvent: fanoutOn } = require('../../domains/quality/realtime/qualityOperationalSocketFanout');

test('fanout emite quality_operational_update + quality_inspection_delta para inspection.*', () => {
  const emitted = [];
  const req = {
    app: {
      get: () => ({
        to() {
          return {
            emit(n, d) {
              emitted.push([n, d]);
            }
          };
        }
      })
    }
  };
  fanoutOn(req, {
    companyId: '00000000-0000-4000-8000-000000000099',
    user: { id: 'u1' },
    eventName: 'quality.inspection.saved',
    correlationId: 'c2',
    traceId: 't2',
    payload: { line: 'A1' }
  });
  const names = emitted.map((x) => x[0]);
  assert.ok(names.includes('quality_operational_update'));
  assert.ok(names.includes('quality_inspection_delta'));
});

console.log('\n══ Resultado quality-enterprise-runtime (backend) ══');
if (process.exitCode) console.log('Falhou.');
else console.log('OK.');
