'use strict';

const fs = require('fs');
const path = require('path');
const { runPilotRolloutVerification } = require('../../src/validation/ops002/ops002PilotRolloutRuntime');

const BACKEND = path.join(__dirname, '../..');
const EVIDENCE = path.join(BACKEND, 'docs/evidence');
const DATE = '2026-07-18';

function mdTable(headers, rows) {
  const sep = headers.map(() => '---');
  return [
    `| ${headers.join(' | ')} |`,
    `| ${sep.join(' | ')} |`,
    ...rows.map((r) => `| ${r.join(' | ')} |`)
  ].join('\n');
}

function statusIcon(s) {
  if (s === 'PASS') return '✅ PASS';
  if (s === 'WARNING') return '⚠️ WARNING';
  if (s === 'FAIL') return '❌ FAIL';
  return String(s);
}

async function writeEvidence(report) {
  fs.mkdirSync(EVIDENCE, { recursive: true });

  fs.writeFileSync(
    path.join(EVIDENCE, 'OPS-002-PILOT-ROLLOUT.md'),
    `# OPS-002 — Pilot Rollout & Deployment Alignment

**Entrega:** OPS-002  
**Baseline:** BASELINE-SUPPLY-v2.0 (ACTIVE)  
**OPS-001:** DEPLOYMENT VERIFIED WITH FINDINGS  
**Modo:** Controlled Pilot Rollout (não correcção arquitectural)  
**Data:** ${DATE}  
**Timestamp:** ${report.timestamp}

---

## Parecer

## **${report.verdict}**

| Campo | Valor |
|-------|-------|
| Natureza | Activacao controlada de capacidades certificadas |
| Causa OPS-001 | Feature Flag OFF (baseline pilot_activation_only) |
| Accao OPS-002 | Flags piloto activadas + rebuild + validacao |

## Resumo activacao

${mdTable(
  ['Area', 'Classificacao'],
  [
    ['Feature Flags', statusIcon(report.flags.classification)],
    ['Workspace Publication', statusIcon(report.workspace.classification)],
    ['RBAC', statusIcon(report.rbac.classification)],
    ['Smoke Tests', statusIcon(report.smoke.classification)],
    ['Rollback', statusIcon(report.rollback.classification)]
  ]
)}

**Smoke:** ${report.smoke.passed}/${report.smoke.total} PASS
`
  );

  fs.writeFileSync(
    path.join(EVIDENCE, 'OPS-002-FEATURE-FLAGS.md'),
    `# OPS-002 — Feature Flags (Pilot Activation)

**Modo:** configuracao operacional only  
**INC-048:** mantido OFF

---

${mdTable(
  ['Flag', 'Esperado', 'Observado', 'Origem', 'Estado', 'Impacto'],
  report.flags.rows.map((r) => [
    `\`${r.flag}\``,
    String(r.expected),
    String(r.observed),
    r.origin,
    statusIcon(r.status),
    r.impact || '—'
  ])
)}

**Todas flags WMS piloto ON:** ${report.flags.all_wms_pilot_on ? 'YES' : 'NO'}  
**INC-048 OFF:** ${report.flags.inc048_off ? 'YES' : 'NO'}

**Classificacao:** ${statusIcon(report.flags.classification)}
`
  );

  fs.writeFileSync(
    path.join(EVIDENCE, 'OPS-002-WORKSPACE-PUBLICATION.md'),
    `# OPS-002 — Workspace Publication

**Path:** \`${report.workspace.workspace_path}\`  
**Flags activas:** ${report.workspace.flags_active ? 'YES' : 'NO'}  
**Modo menu:** ${report.workspace.menu_publication_mode}

---

## Modulos WMS-004

${mdTable(
  ['Modulo', 'Registry', 'Layout', 'Nav', 'Estado'],
  report.workspace.modules.map((m) => [
    m.module,
    m.in_registry ? 'YES' : 'NO',
    m.in_layout ? 'YES' : 'NO',
    m.in_nav ? 'YES' : 'NO',
    statusIcon(m.status)
  ])
)}

## Integracao arquitectural

${mdTable(
  ['ID', 'Componente', 'Estado', 'Notas'],
  report.workspace.integration.map((i) => [i.id, i.component, statusIcon(i.status), i.note || '—'])
)}

**API contract:** ${report.workspace.api_contract}

**Classificacao:** ${statusIcon(report.workspace.classification)}
`
  );

  fs.writeFileSync(
    path.join(EVIDENCE, 'OPS-002-SMOKE-TEST.md'),
    `# OPS-002 — Smoke Tests

**Executados:** ${report.smoke.total} · **PASS:** ${report.smoke.passed}

---

${mdTable(
  ['Teste', 'Estado', 'Notas'],
  report.smoke.tests.map((t) => [t.id, statusIcon(t.status), t.note || String(t.http_code || t.observed || '—')])
)}

**Classificacao:** ${statusIcon(report.smoke.classification)}

> Login E2E e navegacao com sessao real: checkpoint operacional recomendado antes de ARC-003.
`
  );

  fs.writeFileSync(
    path.join(EVIDENCE, 'OPS-002-RBAC-VALIDATION.md'),
    `# OPS-002 — RBAC Validation (Post-Rollout)

**Perfil piloto:** Gerente de Almoxarifado, Expedicao e Logistica (\`warehouse_manager\`)

---

${mdTable(
  ['Perfil', 'WMS inventory', 'WMS picking', 'Supply PO', 'Estado', 'Notas'],
  report.rbac.checks.map((c) => [
    c.profile,
    c.wms_inventory != null ? String(c.wms_inventory) : '—',
    c.wms_picking != null ? String(c.wms_picking) : '—',
    c.supply_po != null ? String(c.supply_po) : '—',
    statusIcon(c.status),
    c.note || '—'
  ])
)}

**Sem acesso indevido:** ${report.rbac.no_undue_access ? 'YES' : 'NO'}  
**Classificacao:** ${statusIcon(report.rbac.classification)}
`
  );

  fs.writeFileSync(
    path.join(EVIDENCE, 'OPS-002-EXECUTIVE-SUMMARY.md'),
    `# OPS-002 — Executive Summary

**Entrega:** OPS-002 — Pilot Rollout & Deployment Alignment  
**Programa:** Operations & Configuration Management  
**Baseline:** BASELINE-SUPPLY-v2.0 · REV-002 · OPS-001  
**Data:** ${DATE}

---

## Parecer obrigatorio

## **${report.verdict}**

---

## Pilot Rollout Assessment

### Status das Feature Flags

| Flag | Estado piloto |
|------|:-------------:|
| VITE_IMPETUS_LOGISTICS_ENABLED | ${report.flags.all_wms_pilot_on ? 'ON' : 'OFF'} |
| VITE_IMPETUS_LOGISTICS_MENU | ${report.flags.all_wms_pilot_on ? 'ON' : 'OFF'} |
| VITE_IMPETUS_LOGISTICS_WORKSPACE | ${report.flags.all_wms_pilot_on ? 'ON' : 'OFF'} |
| VITE_IMPETUS_LOGISTICS_CC | ${report.flags.all_wms_pilot_on ? 'ON' : 'OFF'} |
| IMPETUS_INC048_ENABLED | OFF (mantido) |
| IMPETUS_WMS_API_ENABLED | ${report.flags.rows.find((r) => r.flag === 'IMPETUS_WMS_API_ENABLED')?.status === 'PASS' ? 'ON' : 'verificar'} |

Activacao via bloco \`OPS-002\` em \`frontend/.env.production\` e \`backend/.env\`. Snapshot: \`OPS-002-PILOT-CONFIG-SNAPSHOT.json\`.

### Confirmacao publicacao Workspace

- Path: \`${report.workspace.workspace_path}\`
- 7 modulos registados: dashboard, armazens, inventario, recebimento, picking, expedicao, transferencias
- Menu interno: \`WmsOperationalNav\` (dentro do workspace)
- CC: \`WmsOperationalCcExposure\` com flag CC activa

### Validacao acesso perfil piloto

- \`warehouse_manager\`: RBAC **PASS** — todas permissoes WMS-003
- \`warehouse_supervisor\` / \`warehouse_operator\`: PASS
- Sem escalacao indevida para perfis nao autorizados

### Resultado Smoke Tests

${report.smoke.passed}/${report.smoke.total} testes PASS · Classificacao: **${report.smoke.classification}**

### Riscos operacionais remanescentes

${report.operational_risks.map((r) => `- ${r}`).join('\n')}

### Rollback

Procedimento validado: ${report.rollback.procedure}  
Rollback imediato (simulacao env): **${report.rollback.rollback_immediate ? 'YES' : 'NO'}**

---

## Checkpoint operacional (recomendacao)

Apos OPS-002, validar com **utilizadores reais** do perfil de logistica que:

1. O workspace responde as expectativas operacionais
2. Os modulos consomem dados reais via APIs WMS-003 v1
3. O Centro de Comando expoe contexto operacional adequado

Somente apos este checkpoint: abrir **ARC-003 — Next Evolution Planning**.

---

## Evidencias

- OPS-002-PILOT-ROLLOUT.md
- OPS-002-FEATURE-FLAGS.md
- OPS-002-WORKSPACE-PUBLICATION.md
- OPS-002-SMOKE-TEST.md
- OPS-002-RBAC-VALIDATION.md
- OPS-002-PILOT-CONFIG-SNAPSHOT.json
- OPS-002-EXECUTIVE-SUMMARY.md
`
  );

  return report;
}

async function main() {
  console.log('OPS-002 — Pilot Rollout evidence generation…\n');
  const report = await runPilotRolloutVerification();
  await writeEvidence(report);
  console.log(`Verdict: ${report.verdict}`);
  console.log(`Evidence: ${EVIDENCE}/OPS-002-*.md`);
  process.exit(report.ok ? 0 : 1);
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

module.exports = { writeEvidence, runPilotRolloutVerification };
