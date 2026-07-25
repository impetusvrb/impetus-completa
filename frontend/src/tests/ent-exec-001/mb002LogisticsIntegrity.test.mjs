import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const workspacePath = path.resolve(
  here,
  '../../domains/logistics/operational-runtime/LogisticsOperationalWorkspace.jsx'
);
const source = fs.readFileSync(workspacePath, 'utf8');

test('MB-002: workspace Logistics não apresenta KPIs sintéticos em falha da fonte', () => {
  for (const syntheticValue of [
    'otif: 0.93',
    'pending_receipts: 12',
    'open_pickings: 47',
    'pending_shipments: 8',
    'dock_occupation: 0.65'
  ]) {
    assert.doesNotMatch(source, new RegExp(syntheticValue.replace('.', '\\.')));
  }

  assert.match(source, /setData\(null\)/);
  assert.match(source, /Fonte operacional não configurada ou indisponível/);
});

test('MB-002: filas, docas e telemetria sem fonte usam estado técnico vazio', () => {
  for (const fabricatedOperationalState of [
    'Zona A – Produtos acabados',
    'Zona B – Matéria-prima',
    'Zona C – Expedição rápida',
    'Doca 1 — TIR/Truck',
    'Doca 2 — Van/Utilitário',
    'Doca 3 — Moto courier',
    'Integração GPS/TMS ativa'
  ]) {
    assert.equal(source.includes(fabricatedOperationalState), false, fabricatedOperationalState);
  }

  assert.match(source, /Sem dados disponíveis para filas de picking/);
  assert.match(source, /Sem telemetria de docas disponível/);
  assert.match(source, /Alertas ativos', value: '—'/);
  assert.match(source, /Integração GPS\/TMS não configurada ou sem dados disponíveis/);
});
