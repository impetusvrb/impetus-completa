#!/usr/bin/env node
'use strict';

/**
 * Gera INVENTORY.md para o IMPETUS Cognitive Experience Blueprint.
 * Uso: node backend/scripts/audit/buildBlueprintInventory.js
 */
const fs = require('fs');
const path = require('path');

const BACKEND = path.resolve(__dirname, '../..');
const SRC = path.join(BACKEND, 'src');
const OUT = path.join(
  BACKEND,
  'docs/IMPETUS_COGNITIVE_EXPERIENCE_BLUEPRINT/INVENTORY.md'
);

function walk(dir, acc = [], test) {
  if (!fs.existsSync(dir)) return acc;
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p, acc, test);
    else if (test(f)) acc.push(p.replace(BACKEND + path.sep, '').replace(/\\/g, '/'));
  }
  return acc;
}

const engines = walk(SRC, [], (f) =>
  /Engine\.js$|Facade\.js$|Orchestrator\.js$/.test(f)
);
const routes = walk(path.join(SRC, 'routes'), [], (f) => f.endsWith('.js'));
const migrations = walk(path.join(BACKEND, 'src/models'), [], (f) =>
  f.endsWith('_migration.sql')
).concat(walk(path.join(BACKEND, 'migrations'), [], (f) => f.endsWith('.sql')));

let moduleCount = 0;
try {
  const reg = require(path.join(BACKEND, 'src/contextualModules/moduleRegistry.js'));
  moduleCount = (reg.getAllModules && reg.getAllModules())?.length || 0;
} catch (_) {
  moduleCount = 0;
}

let profileCount = 0;
try {
  const profiles = require(path.join(BACKEND, 'src/config/dashboardProfiles.js'));
  profileCount = Object.keys(profiles.getAllProfiles?.() || profiles.DASHBOARD_PROFILES || {}).length;
} catch (_) {
  profileCount = 0;
}

const matrixPath = path.join(BACKEND, 'docs/FUNCTIONAL_MATRIX.md');
let matrixSummary = 'FUNCTIONAL_MATRIX.md não encontrado';
if (fs.existsSync(matrixPath)) {
  const m = fs.readFileSync(matrixPath, 'utf8');
  const screens = m.match(/Telas\/rotas mapeadas \(frontend\): \*\*(\d+)\*\*/);
  const endpoints = m.match(/Endpoints mapeados \(backend\): \*\*(\d+)\*\*/);
  matrixSummary = `Telas: **${screens?.[1] || '?'}** · Endpoints: **${endpoints?.[1] || '?'}**`;
}

const now = new Date().toISOString();

const md = `# INVENTORY — ICEB (geração automática)

> Gerado em \`${now}\` por \`buildBlueprintInventory.js\`

## Resumo

| Artefacto | Quantidade |
|-----------|------------|
| Engines / Facades / Orchestrators | **${engines.length}** |
| Ficheiros em \`routes/\` | **${routes.length}** |
| Migrações SQL (models + migrations) | **${migrations.length}** |
| Módulos contextual (\`moduleRegistry\`) | **${moduleCount}** |
| Perfis dashboard (\`dashboardProfiles\`) | **${profileCount}** |
| ${matrixSummary} |

## Engines / Facades (amostra 80)

${engines
  .sort()
  .slice(0, 80)
  .map((e) => `- \`${e}\``)
  .join('\n')}

${engines.length > 80 ? `\n*… e mais ${engines.length - 80} ficheiros. Ver Volume IV.*\n` : ''}

## Rotas backend (ficheiros)

${routes
  .sort()
  .map((r) => `- \`${r}\``)
  .join('\n')}

## Módulos registry (menu_key)

${(() => {
  try {
    const reg = require(path.join(BACKEND, 'src/contextualModules/moduleRegistry.js'));
    return (reg.getAllModules?.() || [])
      .map((m) => `- \`${m.module_id}\` → menu \`${m.menu_key}\` · ${m.label || ''}`)
      .join('\n');
  } catch (e) {
    return `_Erro ao carregar registry: ${e.message}_`;
  }
})()}

---

*Regenerar: \`node backend/scripts/audit/buildBlueprintInventory.js\`*
`;

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, md, 'utf8');
console.log('Wrote', OUT);
console.log('Engines:', engines.length, 'Modules:', moduleCount, 'Profiles:', profileCount);
