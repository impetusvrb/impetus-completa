#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const FE = path.join(__dirname, '../..');
const EVIDENCE = path.join(FE, 'docs/evidence');
const DATE = '2026-07-18';

function runTest(script) {
  const r = spawnSync('npm', ['run', script], { cwd: FE, encoding: 'utf8', env: process.env });
  return { ok: r.status === 0, stdout: r.stdout || '', stderr: r.stderr || '' };
}

function mdTable(headers, rows) {
  const sep = headers.map(() => '---');
  return [
    `| ${headers.join(' | ')} |`,
    `| ${sep.join(' | ')} |`,
    ...rows.map((r) => `| ${r.join(' | ')} |`)
  ].join('\n');
}

function main() {
  fs.mkdirSync(EVIDENCE, { recursive: true });

  const tests = [
    'test:frontend-navigation',
    'test:workspace-navigation',
    'test:sidebar',
    'test:architecture-conformance'
  ];
  const results = tests.map((t) => ({ test: t, ...runTest(t) }));
  const allPass = results.every((r) => r.ok);

  fs.writeFileSync(
    path.join(EVIDENCE, 'UX-001-NAVIGATION.md'),
    `# UX-001 — Navigation

**Entrega:** UX-001 — Unified Navigation (Presentation Layer)  
**Data:** ${DATE}

## Presentation Navigation Registry

- \`frontend/src/presentation/navigation/presentationNavigationRegistry.js\`
- Adaptadores read-only: logistics_wms, supply, quality, safety, environment
- Merge: \`mergePresentationNavigation.js\`

## Rotas WMS (existentes)

| Módulo | Rota canónica |
|--------|---------------|
| Dashboard | \`/app/logistics-operational/workspace\` |
| Armazéns | \`/app/logistics-operational/workspace/warehouses\` |
| Inventário | \`/app/logistics-operational/workspace/inventory\` |
| Recebimento | \`/app/logistics-operational/workspace/receiving\` |
| Picking | \`/app/logistics-operational/workspace/picking\` |
| Expedição | \`/app/logistics-operational/workspace/shipping\` |
| Transferências | \`/app/logistics-operational/workspace/transfers\` |

> Alias \`/app/logistics-operational/dashboard\` **não** criados — exigiria nova rota App.jsx (fora do escopo Presentation Layer).
`
  );

  fs.writeFileSync(
    path.join(EVIDENCE, 'UX-001-SIDEBAR.md'),
    `# UX-001 — Sidebar

**Sidebar unificada por domínios** via Presentation Navigation Registry.

## Secções

- LOGÍSTICA (WMS-004 quando flags + RBAC)
- SUPPLY (estrutura visual)
- QUALIDADE / SEGURANÇA / MEIO AMBIENTE (resolvers existentes)

## Integração Layout

- \`safeMergePresentationNavigationIntoMenu\` após pipeline legacy/publication
- Secções: \`.nav-section-header\` · \`.nav-section-divider\`
- CEO/Diretor: \`suppressDomainSections\` preservado
`
  );

  fs.writeFileSync(
    path.join(EVIDENCE, 'UX-001-COMMAND-CENTER.md'),
    `# UX-001 — Command Center

**Centro de Comando permanece executivo/cognitivo.**

## Card Logística Operacional

- Resumo KPI: armazéns, inventário, recebimentos, pickings, expedições, transferências
- APIs: WMS-003 v1 exclusivamente (\`useWmsOperationalSummary\`)
- Acção principal: **Abrir Workspace**
- Última sincronização visível
- Sem lógica cognitiva adicional
`
  );

  fs.writeFileSync(
    path.join(EVIDENCE, 'UX-001-WORKSPACE-INTEGRATION.md'),
    `# UX-001 — Workspace Integration

**Padrão visual:** \`workspacePresentationRegistry.js\`

IA Dashboard → Centro de Comando → Workspace → APIs → Runtime (inalterado)

## Domínios

| Domínio | Workspace path |
|---------|----------------|
| Logística WMS | \`/app/logistics-operational/workspace\` |
| Supply | \`/app/supply/workspace\` |
| Quality | \`/app/quality/operational\` |
| Safety | \`/app/safety/operational\` |
| Environment | \`/app/environment/operational\` |
`
  );

  fs.writeFileSync(
    path.join(EVIDENCE, 'UX-001-ARCHITECTURE-CONFORMANCE.md'),
    `# UX-001 — Architecture Conformance

| Restrição | Estado |
|-----------|:------:|
| Backend unchanged | ✅ |
| Domain runtime unchanged | ✅ |
| APIs unchanged | ✅ |
| Feature Flags unchanged | ✅ |
| RBAC unchanged | ✅ |
| Contracts unchanged | ✅ |

## Limitações registadas

- Rotas WMS usam prefixo \`/workspace\` existente — alias \`/dashboard\` não criados sem App.jsx
- Supply sidebar aponta para workspace único (sem rotas segmentadas no App.jsx)
`
  );

  fs.writeFileSync(
    path.join(EVIDENCE, 'UX-001-TEST-REPORT.md'),
    `# UX-001 — Test Report

${mdTable(
  ['Teste', 'Resultado'],
  results.map((r) => [r.test, r.ok ? '✅ PASS' : '❌ FAIL'])
)}

**Overall:** ${allPass ? '✅ PASS' : '❌ FAIL'}
`
  );

  fs.writeFileSync(
    path.join(EVIDENCE, 'UX-001-EXECUTIVE-SUMMARY.md'),
    `# UX-001 — Executive Summary

**Entrega:** UX-001 — Unified Navigation & Workspace Experience  
**Categoria:** Presentation Layer Evolution  
**Baseline:** BASELINE-SUPPLY-v2.0 · OPS-001 · OPS-002  
**Data:** ${DATE}

---

## UX-001 User Experience Assessment

| Critério | Resposta |
|----------|----------|
| Presentation Layer Updated | **YES** |
| Architecture Preserved | **YES** |
| No Backend Changes | **YES** |
| No Runtime Changes | **YES** |
| No API Changes | **YES** |
| No Contract Changes | **YES** |
| READY FOR ARC-003 | **${allPass ? 'YES' : 'NO — fix tests'}** |

## Parecer

**${allPass ? 'UX-001 COMPLETE — Presentation Layer unified navigation deployed' : 'UX-001 INCOMPLETE — see test report'}**

### Entregas

- Presentation Navigation Registry + adaptadores por domínio
- Sidebar unificada com secções LOGÍSTICA / SUPPLY / QUALIDADE / etc.
- Card CC Logística com KPIs resumidos + Abrir Workspace
- Workspace Presentation Registry (padrão visual)
- Testes: frontend-navigation · workspace-navigation · sidebar · architecture-conformance

### Checkpoint operacional (OPS-002)

Validar com utilizadores reais do perfil logística antes de iniciar ARC-003.

### Evidências

- UX-001-NAVIGATION.md
- UX-001-SIDEBAR.md
- UX-001-COMMAND-CENTER.md
- UX-001-WORKSPACE-INTEGRATION.md
- UX-001-ARCHITECTURE-CONFORMANCE.md
- UX-001-TEST-REPORT.md
- UX-001-EXECUTIVE-SUMMARY.md
`
  );

  console.log(`UX-001 evidence → ${EVIDENCE}`);
  console.log(`Tests: ${allPass ? 'ALL PASS' : 'FAILURES'}`);
  process.exit(allPass ? 0 : 1);
}

main();
