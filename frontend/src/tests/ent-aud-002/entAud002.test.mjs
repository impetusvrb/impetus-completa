import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const frontend = path.resolve(here, '../../..');
const evidenceRoot = path.join(frontend, 'docs/evidence/ENT-AUD-002');

const requiredDocuments = Object.freeze([
  'ENT-AUD-002-EXECUTIVE-SUMMARY.md',
  'ENT-AUD-002-MASTER-BACKLOG.md',
  'enterprise-audit/ENT-AUD-002-PROGRAM-INVENTORY.md',
  'enterprise-audit/ENT-AUD-002-DOCUMENT-AUDIT.md',
  'enterprise-audit/ENT-AUD-002-MODULE-INVENTORY.md',
  'roadmaps/ENT-AUD-002-ROADMAP-AUDIT.md',
  'capabilities/ENT-AUD-002-CAPABILITY-INVENTORY.md',
  'domains/ENT-AUD-002-DOMAIN-MATURITY.md',
  'technical-debt/ENT-AUD-002-TECHNICAL-DEBT.md',
  'technical-debt/ENT-AUD-002-GAP-ANALYSIS.md',
  'reports/ENT-AUD-002-TEST-COVERAGE-AUDIT.md',
  'reports/ENT-AUD-002-DEPENDENCY-GRAPH.md',
  'reports/ENT-AUD-002-DEVELOPMENT-MATRIX.md',
  'reports/ENT-AUD-002-RECOMMENDATIONS.md'
]);

const readEvidence = () =>
  requiredDocuments.map((relativePath) => ({
    relativePath,
    content: fs.readFileSync(path.join(evidenceRoot, relativePath), 'utf8')
  }));

test('os catorze documentos da auditoria existem e não estão vazios', () => {
  for (const relativePath of requiredDocuments) {
    const absolutePath = path.join(evidenceRoot, relativePath);
    assert.equal(fs.existsSync(absolutePath), true, relativePath);
    assert.ok(fs.statSync(absolutePath).size > 100, relativePath);
  }
});

test('a auditoria preserva o princípio e a decisão de não expandir', () => {
  const combined = readEvidence().map(({ content }) => content).join('\n');
  assert.match(combined, /AUDIT BEFORE BUILD/);
  assert.match(combined, /Nenhum novo domínio|novo domínio somente/i);
  assert.match(combined, /READ ONLY/);
});

test('inventário utiliza exclusivamente as categorias obrigatórias', () => {
  const inventory = fs.readFileSync(
    path.join(evidenceRoot, 'enterprise-audit/ENT-AUD-002-PROGRAM-INVENTORY.md'),
    'utf8'
  );
  for (const category of [
    'CERTIFIED',
    'COMPLETED',
    'IN_PROGRESS',
    'PARTIALLY_COMPLETED',
    'PLANNED',
    'NOT_STARTED',
    'TECHNICAL_DEBT',
    'DEPRECATED'
  ]) {
    assert.match(inventory, new RegExp(`\\b${category}\\b`));
  }
});

test('master backlog é priorizado, acionável e possui gate', () => {
  const backlog = fs.readFileSync(path.join(evidenceRoot, 'ENT-AUD-002-MASTER-BACKLOG.md'), 'utf8');
  for (const priority of ['P0', 'P1', 'P2', 'P3']) {
    assert.match(backlog, new RegExp(`## ${priority}`));
  }
  assert.match(backlog, /MB-001/);
  assert.match(backlog, /MB-042/);
  assert.match(backlog, /Gate de desbloqueio/);
});

test('findings críticos e limitações de prova permanecem explícitos', () => {
  const combined = readEvidence().map(({ content }) => content).join('\n');
  assert.match(combined, /\/api\/voz/);
  assert.match(combined, /KPIs fixos|dados fictícios|dados falsos/i);
  assert.match(combined, /PostgreSQL/);
  assert.match(combined, /runner global/);
  assert.match(combined, /OpenAPI/);
  assert.match(combined, /browser|HTTP real/);
});

test('âncoras críticas citadas pela auditoria existem no repositório canônico', () => {
  for (const relativePath of [
    '../backend/src/routes/voz.js',
    'src/domains/logistics/operational-runtime/LogisticsOperationalWorkspace.jsx',
    'src/components/InsightsList.jsx',
    'src/App.jsx',
    '../backend/src/server.js',
    '../ecosystem.config.js'
  ]) {
    assert.equal(fs.existsSync(path.resolve(frontend, relativePath)), true, relativePath);
  }
});

test('diretório de evidência contém apenas documentação Markdown', () => {
  const walk = (directory) => fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(absolutePath) : [absolutePath];
  });
  assert.equal(walk(evidenceRoot).every((file) => file.endsWith('.md')), true);
});

