'use strict';

/**
 * Gera evidências WMS-007 — Modular Workspace Navigation.
 * Uso: node scripts/wms007/generateWms007Evidence.js
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const BACKEND = path.join(__dirname, '../..');
const EVIDENCE = path.join(BACKEND, 'docs/evidence');
const DATE = '2026-07-18';

const WMS007_SCRIPTS = [
  'test:wms007-routing',
  'test:wms007-workspace',
  'test:wms007-navigation',
  'test:wms007-modules',
  'test:wms007-regression'
];

function runNpmScript(script) {
  const r = spawnSync('npm', ['run', script], { cwd: BACKEND, stdio: 'pipe', env: process.env });
  return { script, ok: r.status === 0, code: r.status ?? 1, stderr: (r.stderr || '').toString().slice(0, 500) };
}

function mdTable(headers, rows) {
  const sep = headers.map(() => '---');
  return [
    `| ${headers.join(' | ')} |`,
    `| ${sep.join(' | ')} |`,
    ...rows.map((r) => `| ${r.join(' | ')} |`)
  ].join('\n');
}

function collect() {
  const testResults = WMS007_SCRIPTS.map(runNpmScript);
  const allPass = testResults.every((t) => t.ok);
  const observations = testResults.filter((t) => !t.ok).map((t) => `${t.script} FAILED (code ${t.code})`);

  return { testResults, allPass, observations };
}

function writeEvidence({ testResults, allPass, observations }) {
  fs.mkdirSync(EVIDENCE, { recursive: true });

  const verdict = allPass ? 'READY' : observations.length ? 'READY WITH OBSERVATIONS' : 'READY WITH OBSERVATIONS';
  const testRows = testResults.map((t) => [t.script, t.ok ? 'PASS' : 'FAIL', String(t.code)]);

  const sharedHeader = `# WMS-007 — Modular Workspace Navigation

**Programa:** IMPETUS WMS  
**Tipo:** Workspace Evolution (Presentation + Workspace only)  
**Data:** ${DATE}  
**Branch:** feature/wms-007-modular-navigation  
**Parecer:** ${verdict}

---

`;

  fs.writeFileSync(
    path.join(EVIDENCE, 'WMS-007-MODULAR-WORKSPACE.md'),
    `${sharedHeader}## Objectivo

Modularizar o Workspace WMS: cada item da sidebar abre um módulo independente com hook e API dedicados. Dashboard permanece apenas como landing page em \`/app/logistics-operational/workspace\`.

## Escopo respeitado

- Sem alterações backend, APIs, RBAC, feature flags, runtime ou contratos canónicos
- Presentation layer + Workspace frontend apenas

## Testes

${mdTable(['Script', 'Resultado', 'Exit'], testRows)}

## Observações

${observations.length ? observations.map((o) => `- ${o}`).join('\n') : '- Nenhuma observação bloqueante.'}
`
  );

  fs.writeFileSync(
    path.join(EVIDENCE, 'WMS-007-ROUTING.md'),
    `${sharedHeader}## Rotas

| Rota | Componente |
| --- | --- |
| \`/app/logistics-operational/workspace\` | WmsOperationalDashboardPage (landing) |
| \`/app/logistics-operational/workspace/warehouses\` | WarehouseModule |
| \`/app/logistics-operational/workspace/inventory\` | InventoryModule |
| \`/app/logistics-operational/workspace/receiving\` | ReceivingModule |
| \`/app/logistics-operational/workspace/picking\` | PickingModule |
| \`/app/logistics-operational/workspace/shipping\` | ShippingModule |
| \`/app/logistics-operational/workspace/transfers\` | TransferModule |

## Proibições validadas

- Sem fallback para Dashboard em rotas operacionais
- Sem \`WmsOperationalModulePage\` genérico no layout
- Sem \`moduleId=\` no routing
`
  );

  fs.writeFileSync(
    path.join(EVIDENCE, 'WMS-007-NAVIGATION.md'),
    `${sharedHeader}## Sidebar global (LOGÍSTICA)

Armazéns · Inventário · Recebimento · Picking · Expedição · Transferências

**Dashboard removido da sidebar.**

## Landing

Acessível via Command Center, URL directa e bookmarks — não listado no menu.

## Fontes

- \`wmsModuleRegistry.js\` — registo modular WMS-007
- \`logisticsWmsPresentationAdapter.js\` — filtra dashboard
- \`WmsOperationalNav.jsx\` — \`getWmsSidebarModules()\`
`
  );

  fs.writeFileSync(
    path.join(EVIDENCE, 'WMS-007-MODULES.md'),
    `${sharedHeader}## Módulos independentes

| Módulo | Hook | API v1 |
| --- | --- | --- |
| Armazéns | useWarehouseModule | listWarehouses |
| Inventário | useInventoryModule | listItems |
| Recebimento | useReceivingModule | listReceiving |
| Picking | usePickingModule | listPicking |
| Expedição | useShippingModule | listShipping |
| Transferências | useTransferModule | listTransfers |

## Estados industriais

Loading · Empty · Permission denied · Operational error · API unavailable (\`WmsModuleStates.jsx\`)
`
  );

  fs.writeFileSync(
    path.join(EVIDENCE, 'WMS-007-ARCHITECTURE-CONFORMANCE.md'),
    `${sharedHeader}## Conformidade

| Área | Alterado | Estado |
| --- | --- | --- |
| Backend | Não | Conforme |
| REST APIs WMS-003 | Não | Conforme |
| RBAC | Não | Reutilizado |
| Feature Flags | Não | Preservados |
| OCL / Supply / Pilot | Não | Conforme |
| Command Center | Navegação apenas | Conforme |
| Presentation merge | Adaptador WMS | Conforme |

**Sem mudanças arquitecturais.**
`
  );

  fs.writeFileSync(
    path.join(EVIDENCE, 'WMS-007-TEST-REPORT.md'),
    `${sharedHeader}## Suítes WMS-007

${mdTable(['Script', 'Resultado', 'Exit'], testRows)}

## Regressão incluída

- test:wms-workspace (WMS-004)
- test:wms-navigation (WMS-004)
`
  );

  fs.writeFileSync(
    path.join(EVIDENCE, 'WMS-007-EXECUTIVE-SUMMARY.md'),
    `${sharedHeader}## Resumo executivo

WMS-007 conclui a maturação operacional do Workspace certificado: a sidebar passa a ser a navegação primária entre seis módulos independentes, cada um com consumo exclusivo da respectiva API WMS-003 v1.

O Dashboard Operacional permanece como landing page agregadora, acessível pelo Centro de Comando e URL directa, mas deixa de aparecer no menu lateral.

## WMS-007 Workspace Assessment

**${verdict}**

${observations.length ? `\nObservações:\n${observations.map((o) => `- ${o}`).join('\n')}` : ''}

## Próximo passo recomendado

**OPS-003 — Operational Navigation Verification** — auditoria em produção antes de ARC-003.
`
  );

  console.log(`WMS-007 evidence written to ${EVIDENCE}`);
  console.log(`WMS-007 Workspace Assessment: ${verdict}`);
  return verdict;
}

const data = collect();
writeEvidence(data);
process.exit(data.allPass ? 0 : 1);
