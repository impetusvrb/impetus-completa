'use strict';

/**
 * BASELINE-SUPPLY-v2.0 — Configuration Freeze (READ ONLY).
 * Fonte única: WMS-006-BASELINE-CANDIDATE-MANIFEST.json certificado pela REV-002.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const REPO = path.join(__dirname, '../../..');
const EVIDENCE = path.join(REPO, 'backend/docs/evidence');
const ARCH = path.join(REPO, 'backend/docs/architecture');
const CANDIDATE_PATH = path.join(EVIDENCE, 'WMS-006-BASELINE-CANDIDATE-MANIFEST.json');
const DATE = '2026-07-18';
const BASELINE_ID = 'BASELINE-SUPPLY-v2.0';

const REQUIRED_REV002 = [
  'REV-002-BASELINE-CERTIFICATION.md',
  'REV-002-EXECUTIVE-SUMMARY.md',
  'PROGRAM-CLOSURE-REPORT.md'
];

function loadCandidate() {
  if (!fs.existsSync(CANDIDATE_PATH)) {
    throw new Error('CANDIDATE_MANIFEST_MISSING');
  }
  for (const f of REQUIRED_REV002) {
    if (!fs.existsSync(path.join(EVIDENCE, f))) {
      throw new Error(`REV002_EVIDENCE_MISSING:${f}`);
    }
  }
  return JSON.parse(fs.readFileSync(CANDIDATE_PATH, 'utf8'));
}

function buildBaselineManifest(candidate) {
  const payload = JSON.parse(JSON.stringify(candidate));
  delete payload.manifest_id;
  delete payload.generated_at;
  delete payload.phase;
  delete payload.rev002_gate;

  const core = Object.freeze({
    baseline_id: BASELINE_ID,
    manifest_id: 'BASELINE-SUPPLY-v2.0-MANIFEST',
    published_at: new Date().toISOString(),
    publication_date: DATE,
    certification_source: 'REV-002',
    certification_verdict: 'BASELINE-SUPPLY-v2.0 CERTIFIED WITH CONDITIONS',
    source_manifest_id: candidate.manifest_id,
    source_manifest_generated_at: candidate.generated_at,
    source_baseline_system: candidate.baseline_system_locked,
    configuration_freeze: true,
    ...payload
  });

  const signature = crypto
    .createHash('sha256')
    .update(JSON.stringify(core))
    .digest('hex');

  return Object.freeze({ ...core, release_signature: signature });
}

function verifyIntegrity(candidate, baseline) {
  const technicalKeys = [
    'baseline_system_locked', 'target_baseline', 'subsequent_baseline',
    'runtimes', 'contracts', 'public_apis', 'workspaces', 'command_center',
    'feature_flags_default', 'modules', 'inventories', 'wms005_baseline_ref', 'evidence_refs'
  ];
  const issues = [];
  for (const key of technicalKeys) {
    const a = JSON.stringify(candidate[key]);
    const b = JSON.stringify(baseline[key]);
    if (a !== b) issues.push(`divergence:${key}`);
  }
  return { valid: issues.length === 0, issues };
}

function writeBaselineDefinition(manifest) {
  return `# BASELINE-SUPPLY-v2.0 — Certified Baseline Definition

**Identificador:** \`${BASELINE_ID}\`  
**Categoria:** Certified Baseline · Configuration Freeze  
**Data de publicação:** ${DATE}  
**Modo:** Configuration Management (READ ONLY)

---

## Objetivo

Oficializar como referência arquitectural e operacional o conjunto certificado pela **REV-002**, congelando o estado integrado **Supply + WMS + INC-048** para evoluções futuras.

---

## Escopo

| Inclusão | Detalhe |
|----------|---------|
| Supply Runtime | \`supply_native\` — GF-021→027 homologado |
| WMS Operational | \`logistics-operational\` — WMS-001→006 certificado |
| INC-048 | Convergência arquitectural Supply ↔ WMS |
| Pilot Integration Layer | Contrato v0.3.0 |
| Promotion Runtime | GF-025 |
| Public APIs | \`/api/supply/v1\`, \`/api/logistics-operational/v1\` |
| Workspaces | Supply + Logística operacional |

**Origem certificada:** BASELINE-SYSTEM v1.4 (11 runtimes LOCKED inalterados)

---

## Estado da certificação

| Gate | Parecer |
|------|---------|
| REV-002 | **BASELINE-SUPPLY-v2.0 CERTIFIED WITH CONDITIONS** |
| WMS-006 | Homologação congelada COMPLETE |
| WMS-005 | Validação operacional integrada COMPLETE |

---

## Documentos normativos

- BASELINE-SYSTEM v1.4 (LOCKED)
- ARC-001 · ARC-002
- REV-001 · **REV-002**
- GF-021 → GF-027 · WMS-001 → WMS-006 · INC-048

---

## Manifesto utilizado

| Campo | Valor |
|-------|-------|
| Source | \`${manifest.source_manifest_id}\` |
| Published | \`${manifest.manifest_id}\` |
| Signature | \`${manifest.release_signature.slice(0, 16)}…\` |

**Ficheiro:** [BASELINE-SUPPLY-v2.0-MANIFEST.json](./BASELINE-SUPPLY-v2.0-MANIFEST.json)

---

## Condições certificadas aceites

| Condição | Estado |
|----------|--------|
| GAP-LOG-001 | **PARTIAL** — menu flags prod |
| GAP-LOG-002 | **PARTIAL** — legacy FE mocks |
| WMS activation flags | **OFF** — rollout controlado |
| Feature Flags | Ativação piloto tenant only |

Estes itens compõem o histórico oficial da baseline e **não impedem** sua utilização.

---

## Parecer

## **BASELINE-SUPPLY-v2.0 ACTIVE**

**Configuration Freeze COMPLETE** · **Program Cycle CLOSED**
`;
}

function writeReleaseNotes(manifest) {
  return `# BASELINE-SUPPLY-v2.0 — Release Notes

**Data:** ${DATE}  
**Tipo:** Certified Baseline Release (Configuration Freeze)

---

## Resumo executivo

Primeira baseline oficial que consolida **Supply (GF-021→027)** e **Logística Operacional (WMS-001→006)** como plataforma integrada, certificada pela REV-002.

---

## Evolução desde BASELINE-SYSTEM v1.4

| Trilha | Entregas | Resultado |
|--------|----------|-----------|
| REV-001 | Gap Matrix | Backlog arquitectural |
| GF-021→027 | Supply completo | HOMOLOGATION |
| WMS-001→006 | WMS operacional | CERTIFIED |
| INC-048 | Convergência | Integração canónica |
| WMS-005 | Validação E2E | Pilot readiness |
| WMS-006 | Homologação congelada | Production readiness |
| REV-002 | Certification Gate | **CERTIFIED WITH CONDITIONS** |

---

## Greenfields concluídas

- **Supply** (\`supply_native\`) — REST v1, RBAC, workspace, pilot layer, promotion

## WMS concluído

- **logistics-operational** — OCL, APIs v1, workspace FE, RBAC

## INC-048

- Operational Convergence Layer — Supply + WMS sem acoplamento directo

---

## Certificação REV-002

**Verdict:** BASELINE-SUPPLY-v2.0 CERTIFIED WITH CONDITIONS

---

## Riscos residuais aceites

- GAP-LOG-001/002 PARTIAL
- Flags prod OFF (rollout controlado)
- GAP-WMS-005 activation gate
- GAP-PLAT-001 CI BD (infra)

---

## Mudanças incompatíveis

**Nenhuma** — baseline declarativa; sem alteração funcional vs estado certificado.

---

## Componentes congelados

${manifest.modules.map((m) => `- \`${m}\``).join('\n')}
`;
}

function writeCertification(manifest, integrity) {
  return `# BASELINE-SUPPLY-v2.0 — Certification Record

**Data:** ${DATE}  
**Modo:** Configuration Management · READ ONLY

---

## Integridade manifesto

| Verificação | Resultado |
|-------------|-----------|
| Payload idêntico ao candidato REV-002 | ${integrity.valid ? '✅ PASS' : '❌ FAIL'} |
| Metadados publicação apenas | ✅ |
| release_signature | \`${manifest.release_signature.slice(0, 24)}…\` |

${integrity.issues.length ? `\n**Divergências:** ${integrity.issues.join(', ')}` : ''}

---

## Fontes oficiais utilizadas

- \`WMS-006-BASELINE-CANDIDATE-MANIFEST.json\`
- REV-002 evidências
- PROGRAM-CLOSURE-REPORT.md

---

## Parecer de encerramento

| Item | Estado |
|------|:------:|
| BASELINE-SUPPLY-v2.0 | **ACTIVE** |
| Configuration Freeze | **COMPLETE** |
| Program Cycle | **CLOSED** |
`;
}

function writeExecutiveSummary() {
  return `# BASELINE-SUPPLY-v2.0 — Executive Summary

**Entrega:** Certified Baseline Release (Configuration Freeze)  
**Data:** ${DATE}

---

## Marco

Acto formal de **Configuration Management** que congela o estado certificado pela REV-002 como referência oficial **BASELINE-SUPPLY-v2.0**.

> GF/WMS/INC implementam · REV certifica · **BASELINE congela**

---

## Artefactos

- [BASELINE-SUPPLY-v2.0.md](./BASELINE-SUPPLY-v2.0.md)
- [BASELINE-SUPPLY-v2.0-MANIFEST.json](./BASELINE-SUPPLY-v2.0-MANIFEST.json)
- [BASELINE-SUPPLY-v2.0-RELEASE-NOTES.md](./BASELINE-SUPPLY-v2.0-RELEASE-NOTES.md)
- [BASELINE-SUPPLY-v2.0-CERTIFICATION.md](./BASELINE-SUPPLY-v2.0-CERTIFICATION.md)

---

## Parecer

## **BASELINE-SUPPLY-v2.0 ACTIVE**

Próximo ciclo recomendado: **ARC-003 — Next Evolution Planning** (SYSTEM v1.5) — sem alterar esta baseline.
`;
}

function updateSystemInventory() {
  const invPath = path.join(ARCH, 'SYSTEM-RUNTIME-INVENTORY.md');
  let content = fs.readFileSync(invPath, 'utf8');

  if (!content.includes('BASELINE-SUPPLY-v2.0')) {
    const section = `

---

## Certified Baseline — BASELINE-SUPPLY-v2.0

| Campo | Valor |
|-------|-------|
| **Baseline** | **BASELINE-SUPPLY-v2.0** |
| **Status** | **CERTIFIED** |
| **Source** | REV-002 |
| **Reference Manifest** | [BASELINE-SUPPLY-v2.0-MANIFEST.json](../evidence/BASELINE-SUPPLY-v2.0-MANIFEST.json) |
| **Publication** | ${DATE} |
| **Configuration Freeze** | **COMPLETE** |

**Evidência:** [BASELINE-SUPPLY-v2.0-EXECUTIVE-SUMMARY.md](../evidence/BASELINE-SUPPLY-v2.0-EXECUTIVE-SUMMARY.md)

---
`;
    content = content.replace(
      '\n## Referências\n',
      `${section}\n## Referências\n`
    );
    fs.writeFileSync(invPath, content);
  }
}

function updateFoundationRuntimes() {
  const fp = path.join(EVIDENCE, 'FOUNDATION_RUNTIMES.md');
  let content = fs.readFileSync(fp, 'utf8');

  if (!content.includes('BASELINE-SUPPLY-v2.0')) {
    const section = `

---

## Certified Baseline — BASELINE-SUPPLY-v2.0 ✅ ACTIVE

| Campo | Valor |
|-------|-------|
| Baseline | **BASELINE-SUPPLY-v2.0** |
| Status | **CERTIFIED · ACTIVE** |
| Source | REV-002 |
| Manifest | [BASELINE-SUPPLY-v2.0-MANIFEST.json](./BASELINE-SUPPLY-v2.0-MANIFEST.json) |
| Configuration Freeze | **COMPLETE** |

---

*Atualizado por:* **BASELINE-SUPPLY-v2.0** Configuration Release
`;
    content = content.replace(
      /\*Atualizado por:.*\*\s*$/,
      section.trim()
    );
    fs.writeFileSync(fp, content);
  }
}

function main() {
  console.log(`${BASELINE_ID} — Configuration Freeze (READ ONLY)\n`);

  const candidate = loadCandidate();
  const manifest = buildBaselineManifest(candidate);
  const integrity = verifyIntegrity(candidate, manifest);

  if (!integrity.valid) {
    console.error('INTEGRITY FAILED:', integrity.issues.join(', '));
    process.exit(1);
  }

  fs.writeFileSync(path.join(EVIDENCE, 'BASELINE-SUPPLY-v2.0.md'), writeBaselineDefinition(manifest));
  fs.writeFileSync(path.join(EVIDENCE, 'BASELINE-SUPPLY-v2.0-MANIFEST.json'), JSON.stringify(manifest, null, 2));
  fs.writeFileSync(path.join(EVIDENCE, 'BASELINE-SUPPLY-v2.0-RELEASE-NOTES.md'), writeReleaseNotes(manifest));
  fs.writeFileSync(path.join(EVIDENCE, 'BASELINE-SUPPLY-v2.0-CERTIFICATION.md'), writeCertification(manifest, integrity));
  fs.writeFileSync(path.join(EVIDENCE, 'BASELINE-SUPPLY-v2.0-EXECUTIVE-SUMMARY.md'), writeExecutiveSummary());

  updateSystemInventory();
  updateFoundationRuntimes();

  console.log('Artifacts written to backend/docs/evidence/');
  console.log('SYSTEM-RUNTIME-INVENTORY.md updated');
  console.log('FOUNDATION_RUNTIMES.md updated');
  console.log('\nBASELINE-SUPPLY-v2.0 ACTIVE');
  console.log('Configuration Freeze COMPLETE');
  console.log('Program Cycle CLOSED');
}

main();
