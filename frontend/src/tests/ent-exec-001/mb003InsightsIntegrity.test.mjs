import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const componentPath = path.resolve(here, '../../components/InsightsList.jsx');
const source = fs.readFileSync(componentPath, 'utf8');

test('MB-003: InsightsList não contém riscos ou recomendações fictícias', () => {
  for (const fabricatedContent of [
    'Risco de atraso em manutenção crítica',
    'Oportunidade de otimização de consumo',
    'Anomalia detectada: Pico de temperatura',
    'Ref: 259.XXX.007',
    'Ref: 153.XXX.007',
    'Ref: 139.XXX.007',
    'Sugerido: Rever alocação de equipe',
    'Sugerido: Ajustar configuração B1',
    'Inspecionar setor Ar'
  ]) {
    assert.equal(source.includes(fabricatedContent), false, fabricatedContent);
  }

  assert.doesNotMatch(source, /defaultInsights/);
  assert.doesNotMatch(source, /insights\.length\s*>\s*0\s*\?\s*insights\s*:/);
});

test('MB-003: coleção vazia é apresentada como risco não avaliado', () => {
  assert.match(source, /insights\.length === 0/);
  assert.match(source, /Dados de insights indisponíveis/);
  assert.match(source, /Risco não avaliado/);
  assert.match(source, /A ausência de dados não significa ausência de risco/);
  assert.doesNotMatch(source, /Nenhum risco detectado|Sem riscos detectados/i);
});
