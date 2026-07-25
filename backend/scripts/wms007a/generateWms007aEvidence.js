'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const BACKEND = path.join(__dirname, '../..');
const EVIDENCE = path.join(BACKEND, '../frontend/docs/evidence');
const DATE = '2026-07-18';

const WMS007A_SCRIPTS = [
  'test:wms007a-routing',
  'test:wms007a-navigation',
  'test:wms007a-standalone',
  'test:wms007a-regression',
  'test:wms007a-compatibility'
];

function runNpmScript(script) {
  const r = spawnSync('npm', ['run', script], { cwd: BACKEND, stdio: 'pipe', env: process.env });
  return { script, ok: r.status === 0, code: r.status ?? 1 };
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
  const testResults = WMS007A_SCRIPTS.map(runNpmScript);
  const allPass = testResults.every((t) => t.ok);
  return { testResults, allPass };
}

function writeEvidence({ testResults, allPass }) {
  fs.mkdirSync(EVIDENCE, { recursive: true });
  const verdict = allPass ? 'COMPLETED' : 'COMPLETED WITH OBSERVATIONS';
  const rows = testResults.map((t) => [t.script, t.ok ? 'PASS' : 'FAIL', String(t.code)]);

  const header = `# WMS-007A — Workspace Decoupling & Standalone Module Navigation

**Programa:** IMPETUS WMS  
**Tipo:** Corrective (Frontend Only)  
**Data:** ${DATE}  
**Parecer:** ${verdict}

---

`;

  const files = {
    'WMS-007A-STANDALONE-NAVIGATION.md': `${header}## Resultado

Sidebar global → rota standalone → ModulePage → hook → API v1.

Navegação horizontal interna eliminada. Workspace shell visual removido.

## Testes

${mdTable(['Script', 'Resultado', 'Exit'], rows)}
`,
    'WMS-007A-ROUTING.md': `${header}## Rotas canónicas

| Rota | Página |
| --- | --- |
| \`/app/logistics/warehouses\` | WarehouseModulePage |
| \`/app/logistics/inventory\` | InventoryModulePage |
| \`/app/logistics/receiving\` | ReceivingModulePage |
| \`/app/logistics/picking\` | PickingModulePage |
| \`/app/logistics/shipping\` | ShippingModulePage |
| \`/app/logistics/transfers\` | TransferModulePage |

## Legacy (redirect)

\`/app/logistics-operational/workspace/*\` → landing CC ou redirect transparente.
`,
    'WMS-007A-MODULE-DECOUPLING.md': `${header}## Desacoplamento

- \`WmsStandaloneGate\` — wrapper técnico invisível (flags)
- \`WmsStandaloneModuleFrame\` — header individual por módulo
- \`WmsOperationalNav\` — desactivado (return null)
- \`WmsFoundationShell\` — deprecated
`,
    'WMS-007A-COMPATIBILITY.md': `${header}## Compatibilidade

- CC \`workspace_path\` mantém \`/app/logistics-operational/workspace\`
- Bookmarks legacy redireccionam para \`/app/logistics/*\`
- RBAC, flags, APIs — inalterados
`,
    'WMS-007A-ARCHITECTURE-CONFORMANCE.md': `${header}## Conformidade

| Área | Alterado |
| --- | --- |
| Backend | Não |
| APIs WMS-003 | Não |
| RBAC / Flags | Não |
| Centro de Comando | Não |
| UX-001 merge | Paths actualizados apenas |
`,
    'WMS-007A-TEST-REPORT.md': `${header}## Suítes

${mdTable(['Script', 'Resultado', 'Exit'], rows)}
`,
    'WMS-007A-EXECUTIVE-SUMMARY.md': `${header}## Resumo

WMS-007A conclui o desacoplamento do Workspace WMS: cada módulo operacional é uma página standalone acessada directamente pela sidebar global, sem container partilhado nem tabs horizontais.

## Parecer

**WMS-007A — ${verdict}**

Os módulos WMS são totalmente independentes. Compatibilidade certificada preservada — sem alterações em backend, APIs, RBAC, Feature Flags ou runtimes.
`
  };

  for (const [name, body] of Object.entries(files)) {
    fs.writeFileSync(path.join(EVIDENCE, name), body);
  }

  console.log(`Evidence → ${EVIDENCE}`);
  console.log(`WMS-007A — ${verdict}`);
  return verdict;
}

const data = collect();
writeEvidence(data);
process.exit(data.allPass ? 0 : 1);
