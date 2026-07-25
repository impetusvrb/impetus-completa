/**
 * REG-002 — Operational Brain recovery (R5).
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FE = path.join(__dirname, '../../..');
const REPO = path.join(__dirname, '../../../..');

let passed = 0;
let failed = 0;
function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    failed += 1;
    console.error(`  ✗ ${name}: ${e.message}`);
  }
}

console.log('REG-002 — operational-brain.test\n');

test('OperationalIntelligencePanel and route exist', () => {
  assert.ok(fs.existsSync(path.join(FE, 'src/pages/OperationalIntelligencePanel.jsx')));
  const app = fs.readFileSync(path.join(FE, 'src/App.jsx'), 'utf8');
  assert.ok(app.includes('/app/cerebro-operacional'));
});

test('operational-brain router mounted and engine preserved', () => {
  const dash = fs.readFileSync(path.join(REPO, 'backend/src/routes/dashboard.js'), 'utf8');
  assert.ok(dash.includes("'/operational-brain'"));
  assert.ok(fs.existsSync(path.join(REPO, 'backend/src/routes/dashboardOperationalBrain.js')));
  assert.ok(fs.existsSync(path.join(REPO, 'backend/src/services/operationalBrainEngine.js')));
});

test('CenterWidget maps cerebro_operacional deep-link', () => {
  const w = fs.readFileSync(path.join(FE, 'src/features/dashboard/widgets/CenterWidget.jsx'), 'utf8');
  assert.ok(w.includes('cerebro_operacional:'));
  assert.ok(w.includes('/app/cerebro-operacional'));
});

test('WidgetDiagramaIndustrial has navigate to industrial center', () => {
  const w = fs.readFileSync(path.join(FE, 'src/features/dashboard/centroComando/WidgetDiagramaIndustrial.jsx'), 'utf8');
  assert.ok(w.includes("navigate('/app/centro-operacoes-industrial')"));
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
