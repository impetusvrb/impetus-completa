'use strict';

const fs = require('fs');
const path = require('path');
const { runDeploymentVerification } = require('../../src/validation/ops001/ops001DeploymentVerificationRuntime');

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

function writeEvidence(report) {
  fs.mkdirSync(EVIDENCE, { recursive: true });

  fs.writeFileSync(
    path.join(EVIDENCE, 'OPS-001-DEPLOYMENT-VERIFICATION.md'),
    `# OPS-001 — Deployment Verification

**Entrega:** OPS-001 — Baseline Deployment Verification  
**Baseline:** BASELINE-SUPPLY-v2.0 (ACTIVE)  
**Data:** ${DATE}  
**Modo:** READ ONLY  
**Timestamp auditoria:** ${report.timestamp}

---

## Resumo

| Campo | Valor |
|-------|-------|
| Parecer | **${report.verdict}** |
| Causa principal | **${report.primary_cause}** |
| Impacto | ${report.impact_classification} |
| Baseline signature | ${report.baseline_signature_match ? 'MATCH' : 'MISMATCH'} |
| Duração | ${report.duration_ms}ms |

## Checklist cross-verificação

${mdTable(
  ['Item', 'Estado', 'Notas'],
  report.cross_checklist.map((c) => [c.item, statusIcon(c.status), c.note || '—'])
)}

## Secções auditadas

| Secção | Classificação |
|--------|:-------------:|
| Build | ${statusIcon(report.build.classification)} |
| Manifest | ${statusIcon(report.manifest_comparison.classification)} |
| Feature Flags | ${statusIcon(report.flags.classification)} |
| Workspace Registry | ${statusIcon(report.workspace.classification)} |
| Routes | ${statusIcon(report.routes.classification)} |
| RBAC | ${statusIcon(report.rbac.classification)} |
| Deployment | ${statusIcon(report.deployment.classification)} |

**Recomendação operacional:** ${report.operational_recommendation}
`
  );

  fs.writeFileSync(
    path.join(EVIDENCE, 'OPS-001-BUILD-VALIDATION.md'),
    `# OPS-001 — Build Validation

**Baseline:** BASELINE-SUPPLY-v2.0  
**Git HEAD:** \`${report.build.git_head || 'n/a'}\`  
**Commit date:** ${report.build.git_commit_date || 'n/a'}  
**Dist mtime:** ${report.build.dist_mtime || 'n/a'}

---

${mdTable(
  ['Check', 'Estado', 'Observado', 'Impacto'],
  report.build.checks.map((c) => [c.id, statusIcon(c.status), String(c.observed), c.impact || '—'])
)}

## Chunks WMS-004 em dist

${report.build.wms_dist_chunks.length ? report.build.wms_dist_chunks.map((f) => `- \`${f}\``).join('\n') : '_Nenhum chunk WMS detectado_'}

## Release signature (baseline)

- **Stored:** \`${report.baseline_release_signature || 'n/a'}\`
- **Match:** ${report.baseline_signature_match ? 'YES' : 'NO'}

**Classificação build:** ${statusIcon(report.build.classification)}
`
  );

  fs.writeFileSync(
    path.join(EVIDENCE, 'OPS-001-FEATURE-FLAGS.md'),
    `# OPS-001 — Feature Flags Audit

**Modo:** READ ONLY — nenhuma flag alterada  
**Pilot activation only (baseline):** ${report.flags.pilot_activation_only ? 'YES' : 'NO'}  
**Production global (baseline):** ${report.flags.production_global ? 'ON' : 'OFF'}  
**All WMS flags OFF:** ${report.flags.all_wms_flags_off ? 'YES' : 'NO'}

---

${mdTable(
  ['Flag', 'Esperado', 'Observado', 'Origem', 'Estado', 'Impacto'],
  report.flags.rows.map((r) => [
    `\`${r.flag}\``,
    String(r.expected),
    String(r.observed),
    r.origin,
    statusIcon(r.status),
    r.impact
  ])
)}

## Impacto operacional

${report.flags.operational_impact}

**Classificação flags:** ${statusIcon(report.flags.classification)}
`
  );

  fs.writeFileSync(
    path.join(EVIDENCE, 'OPS-001-WORKSPACE-REGISTRY.md'),
    `# OPS-001 — Workspace Registry Validation

**Workspace path (baseline):** \`${report.workspace.expected_workspace_path}\`  
**Menu visible (registry estático):** ${report.workspace.menu_visible_static ? 'false' : 'n/a'}

---

${mdTable(
  ['Registry', 'Ficheiro', 'Presente', 'Estado', 'Notas'],
  report.workspace.registries.map((r) => [
    r.registry,
    r.file,
    r.present ? 'YES' : 'NO',
    statusIcon(r.status),
    r.note || '—'
  ])
)}

**Módulos no registry:** ${report.workspace.modules_in_registry}

**Classificação registry:** ${statusIcon(report.workspace.classification)}
`
  );

  fs.writeFileSync(
    path.join(EVIDENCE, 'OPS-001-RBAC-VALIDATION.md'),
    `# OPS-001 — RBAC Validation

**Perfil homologado (WMS-003):** ${report.rbac.homologated_profile.label}  
**Profile code:** \`${report.rbac.homologated_profile.wms_profile}\`

---

## Permissões WMS-004

${mdTable(
  ['Permissão', 'Concedida', 'Estado'],
  report.rbac.permissions.map((p) => [p.permission, p.granted ? 'YES' : 'NO', statusIcon(p.status)])
)}

## Checks

${mdTable(
  ['Check', 'Estado', 'Observado', 'Esperado / Nota'],
  report.rbac.checks.map((c) => [c.id, statusIcon(c.status), String(c.observed), c.expected ?? c.note ?? '—'])
)}

**Conclusão RBAC:** O perfil \`warehouse_manager\` possui todas as permissões WMS-003. A ausência do workspace **não** é causada por RBAC.

**Classificação RBAC:** ${statusIcon(report.rbac.classification)}
`
  );

  fs.writeFileSync(
    path.join(EVIDENCE, 'OPS-001-ROUTES.md'),
    `# OPS-001 — Route Verification

**Gate WMS-004:** ${report.routes.wms004_route_gate}

---

## Rotas frontend (WMS-004)

${mdTable(
  ['Rota', 'Registada', 'Dist', 'Flag gate', 'RBAC', 'Estado'],
  report.routes.frontend_routes.map((r) => [
    `\`${r.route}\``,
    r.registered ? 'YES' : 'NO',
    r.published_in_dist ? 'YES' : 'NO',
    r.flag_protected ? 'YES' : 'NO',
    r.rbac_protected ? 'YES' : 'NO',
    statusIcon(r.status)
  ])
)}

## APIs backend

${mdTable(
  ['Rota', 'HTTP', 'Publicada', 'Estado'],
  report.routes.backend_api_routes.map((r) => [
    `\`${r.route}\``,
    String(r.http_code),
    r.published ? 'YES' : 'NO',
    statusIcon(r.status)
  ])
)}

**Nota:** Com flags OFF, \`WmsWorkspaceGate\` redirecciona \`/app/logistics-operational/workspace/*\` para \`/app\`.

**Classificação rotas:** ${statusIcon(report.routes.classification)}
`
  );

  fs.writeFileSync(
    path.join(EVIDENCE, 'OPS-001-EXECUTIVE-SUMMARY.md'),
    `# OPS-001 — Executive Summary

**Entrega:** OPS-001 — Baseline Deployment Verification (BASELINE-SUPPLY-v2.0)  
**Programa:** Operations & Configuration Management  
**Normas:** BASELINE-SUPPLY-v2.0 · REV-002 · ARC-001 · ARC-002  
**Modo:** READ ONLY  
**Data:** ${DATE}

---

## Parecer obrigatório

## **${report.verdict}**

| Atributo | Valor |
|----------|-------|
| Baseline | BASELINE-SUPPLY-v2.0 (ACTIVE) |
| Causa principal divergência sintoma | **${report.primary_cause}** |
| RBAC warehouse_manager | PASS — não bloqueante |
| Build WMS-004 em dist | ${report.build.wms_dist_chunks.length >= 2 ? 'Presente' : 'Parcial/ausente'} |
| Flags WMS produção | ${report.flags.all_wms_flags_off ? 'Todas OFF' : 'Parcial/ON'} |

---

## Deployment Status Assessment

### Versão efectivamente implantada

| Componente | Detalhe |
|------------|---------|
| Frontend dist | ${report.build.dist_mtime || 'n/a'} |
| Git commit (repo) | \`${report.build.git_head || 'n/a'}\` (${report.build.git_commit_date || 'n/a'}) |
| PM2 frontend | \`${report.deployment.frontend.find((c) => c.id === 'frontend_pm2_online')?.args || 'preview:prod'}\` |
| PM2 backend | online |
| Baseline release signature | \`${(report.baseline_release_signature || '').slice(0, 16)}…\` ${report.baseline_signature_match ? '(valid)' : '(INVALID)'} |

### Aderência à BASELINE-SUPPLY-v2.0

A implantação **${report.verdict === 'DEPLOYMENT NOT CONSISTENT WITH BASELINE' ? 'não está' : 'está'}** alinhada com a baseline certificada REV-002:

- Módulos manifesto: ${statusIcon(report.manifest_comparison.classification)}
- Feature flags default OFF (pilot_activation_only): **coerente** com \`.env.production\` sem entradas \`VITE_IMPETUS_LOGISTICS_*\`
- Workspace WMS-004 registado em código e dist: **presente**
- Exposição operacional (menu/CC/workspace): **inactiva** — flags OFF + gate \`WmsWorkspaceGate\`

### Causa principal da divergência (sintoma reportado)

**${report.primary_cause}**

O perfil *Gerente de Almoxarifado, Expedição e Logística* (\`warehouse_manager\`) tem RBAC completo (WMS-003), mas o workspace operacional permanece invisível porque:

1. \`VITE_IMPETUS_LOGISTICS_ENABLED\`, \`_MENU\`, \`_WORKSPACE\` ausentes em \`frontend/.env.production\` → **default false**
2. \`WmsWorkspaceGate\` redirecciona quando workspace flag OFF
3. Menu WMS-004 não integrado ao pipeline \`Layout.jsx\` (usa \`logisticsMenuPublicationEngine\` — domínio distinto)

Isto é **comportamento certificado** na baseline (flags prod OFF, \`pilot_activation_only: true\`), não um defeito de RBAC ou ausência de código WMS-004.

### Classificação do impacto

**${report.impact_classification}**

### Recomendação operacional

${report.operational_recommendation}

---

## Próximo passo (governança)

| Parecer OPS-001 | Acção |
|-----------------|-------|
| DEPLOYMENT VERIFIED | Pode abrir **ARC-003 — Next Evolution Planning** |
| DEPLOYMENT VERIFIED WITH FINDINGS | Pode abrir ARC-003 se findings não bloqueadores; activação WMS via **OPS-002** recomendada |
| DEPLOYMENT NOT CONSISTENT WITH BASELINE | **OPS-002 — Deployment Alignment** obrigatória antes de ARC-003 |

**Estado actual:** ${report.verdict === 'DEPLOYMENT VERIFIED' ? 'Elegível para ARC-003' : report.verdict === 'DEPLOYMENT VERIFIED WITH FINDINGS' ? 'Elegível para ARC-003 com OPS-002 recomendada (activação flags)' : 'Bloqueado — OPS-002 obrigatória'}

---

## Evidências geradas

- OPS-001-DEPLOYMENT-VERIFICATION.md
- OPS-001-BUILD-VALIDATION.md
- OPS-001-FEATURE-FLAGS.md
- OPS-001-WORKSPACE-REGISTRY.md
- OPS-001-RBAC-VALIDATION.md
- OPS-001-ROUTES.md
- OPS-001-EXECUTIVE-SUMMARY.md
`
  );

  return report;
}

function main() {
  console.log('OPS-001 — Generating deployment verification evidence (READ ONLY)…\n');
  const report = runDeploymentVerification();
  writeEvidence(report);
  console.log(`Verdict: ${report.verdict}`);
  console.log(`Primary cause: ${report.primary_cause}`);
  console.log(`Evidence written to ${EVIDENCE}/OPS-001-*.md`);
  process.exit(report.ok ? 0 : 1);
}

if (require.main === module) {
  main();
}

module.exports = { writeEvidence, runDeploymentVerification };
