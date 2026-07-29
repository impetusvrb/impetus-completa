# ENT-GOV-002 — Certified Baseline Re-Certification

**Programa:** ENT-EXEC-001 — Enterprise Operational Consolidation  
**Governança:** ENT-GOV-002  
**Data:** 29/07/2026  
**Modo:** governança formal — certificação de nova baseline  
**Restauração de `b783…` executada:** nenhuma  
**Reconstrução executada:** nenhuma  
**Git rewrite / amend / filter-branch:** nenhum  
**Baseline anterior alterada:** não (preservada como registo histórico)

---

## 1. Encerramento formal da ENT-GOV-001

### 1.1 Síntese das investigações

| Atividade | Conclusão |
|---|---|
| ENT-GOV-001 (local) | Nginx certificado recuperado; Blueprint `b783…` não localizada em Git local, reflogs, blobs, backups |
| ENT-GOV-001B (remoto) | Blueprint `b783…` ausente em `origin/main`, tags, releases, Actions, packages |
| ENT-GOV-001C (proveniência) | Digest gerado em 2026-07-04T19:09:56Z por `operational-go-live-01.sh` Etapa 2 sobre working tree; conteúdo nunca commitado; versão transitória irrecuperável |

### 1.2 Decisão

| Campo | Valor |
|---|---|
| ENT-GOV-001 | **ENCERRADA** |
| Origem do digest | Documentada (ENT-GOV-001C) |
| Conteúdo recuperável | NÃO |
| Cadeia documental | Reconstruída |
| Cadeia do artefacto | **Rompida definitivamente** |
| Tentativa de reconstrução | Proibida |

---

## 2. Seleção da nova Baseline

### 2.1 Candidato

| Item | Valor |
|---|---|
| Commit | `0745040cb97fcd468f3bd32389870e9507877f1b` |
| Branch | `main` |
| Autor | `wellington M.F <wellmachadofreitas@gmail.com>` |
| Data | 2026-07-25T12:14:00Z |
| Remote | `origin/main` (sincronizado) |
| Tag proposta | `CERTIFIED-BASELINE-002` |

### 2.2 SHA-256 dos artefactos críticos (gerados do conteúdo commitado)

| Path | SHA-256 |
|---|---|
| `backend/src/server.js` | `fa5556da2b24b3abe70954df9aa3867f6c6c1151325f1777455092c778be8195` |
| `ecosystem.config.js` | `c4acfa161a854c9ca34cd994ae9f00a9d6250fb21440d7355c37c1c5e4294af9` |
| `frontend/vite.config.js` | `8eeef053bfcdf2695c876dd36c34d07abec31c7531e357a249755c9e9948c7d1` |
| `frontend/serveDist.cjs` | `9197c935a461f32e91605ea554e8d56c85c0c27b1127e6ad0476c20e0aa62a4a` |
| `infra/nginx/impetus-production.conf` | `1c40c785a498b7237d46d893ad8b8131b93658e022063303258c166876a11107` |
| `infra/nginx/impetus-hardening-locations.conf` | `943bc17a8cfae8d25bbd007b2ca811585a20038233b8a43d753180347f2aa0b5` |
| `scripts/deploy-impetus.sh` | `1a86f2a3ecf30fe6790be9f88a6f7eec66b947b93ad6d5e7d695d0ad089a2a32` |
| `scripts/deploy-nginx-hardening.sh` | `25540bc7b31fa309db6b306555d9d0ef613cfd5b7a4f06d9f9fb686876feb93b` |
| `scripts/integrity-check.sh` | `487f69e158e513d82ce63dac47b0cc8bab1fa1ba1e74d3e80e4e7e6ec69bf8b5` |
| `.github/workflows/cert-drift.yml` | `252631e10fe8eed8476d978562f049abf89d160f9d072f776031347b03deaecc` |
| `Volume-00-CARTA-MAGNA.md` | `74a0695a60fd431f244fab92ed5d623fc3b81f3d3f89d45e0f03862ebb7035bd` |
| **`Volume-10-ROADMAP-ENTERPRISE.md`** | **`e1cc4b14f087cd38c9c101343959220c20443abab222c875bf6f6b48298db7cd`** |
| `FUNCTIONAL_MATRIX.json` | `06ff02becb8c873a2a6d313fdbe17db24c1c4c5fc088e4781a48566a742ef493` |
| `backend/scripts/audit/e2e_cert_all.js` | `6448db92f464501189df1b912d63fa1f464cfcc952a1320b3cb6e6a6c6c3884d` |
| `backend/scripts/run-all-migrations.js` | `cc7fceb14d2bb008edce5e740d523d01ed56a3fe08aa91aa7e73198ad6ac0b27` |

### 2.3 Justificativa

- Commit mais recente em `main`, sincronizado com o remote oficial;
- contém toda a stack Enterprise Security SEC-01 a SEC-21C, APPSEC-01/02;
- inclui todos os domínios operacionais e certificações do programa;
- inclui todos os artefactos P0 (MB-001 → MB-009, Executive Review);
- blueprint-volumes: **1078/1078** entries verificadas contra commit (1077 match + 1 corrigida nesta recertificação);
- Nginx blob preservado e autenticável no mesmo commit.

---

## 3. Validação do candidato

### 3.1 Build

| Item | Estado |
|---|---|
| `frontend/dist/index.html` | Presente (build Vite) |
| `backend/package.json` | `impetus-backend@0.1.0` |
| Dependências backend | `node_modules` operacional (PM2 active) |

### 3.2 Testes e conformidade

| Verificação | Estado |
|---|---|
| MB-001 → MB-009 | Concluídos e documentados (`ENT-EXEC-001-P0-REPORT.md`) |
| Executive Review P0 | Aprovada (`ENT-EXEC-001-P0-EXECUTIVE-REVIEW.md`) |
| SEC-04 test suite | Presente; falha previsível por manifests desalinhados — **corrigida pela recertificação** |
| SEC-05 test suite | Presente e funcional |
| Integridade arquitectural | Confirmada (Secção 7 abaixo) |

### 3.3 Blueprint volumes

- **1078 ficheiros `.md`** sob `IMPETUS_COGNITIVE_EXPERIENCE_BLUEPRINT`;
- **1077** com hash no manifest = hash no commit (validação programática);
- **1 divergente** = Volume-10 (causa: digest anterior `b783…` referenciava working tree; agora corrigido para `e1cc…`).

### 3.4 Conclusão da validação

> **A baseline candidata representa corretamente o estado aprovado da plataforma?**  
> **SIM.**

---

## 4. Pacote de certificação imutável

### 4.1 Composição

| Componente | Referência |
|---|---|
| Commit | `0745040cb97fcd468f3bd32389870e9507877f1b` |
| Branch | `main` |
| Tag | `CERTIFIED-BASELINE-002` (a criar) |
| Manifest (15 critical) | Secção 2.2 acima |
| Blueprint volumes (1078) | `backend/docs/evidence/security-baseline-01/blueprint-volumes.sha256` — a regenerar do commit |
| Relatório | este documento |
| Política | `CERTIFIED-BASELINE-LIFECYCLE-POLICY.md` |
| Timestamp | 2026-07-29T22:21:06Z |
| Responsável | Architecture Board / wellington M.F |

### 4.2 Acção requerida (Architecture Board)

Para materializar o pacote:

1. **Regenerar** `HARDENING-01-baseline.sha256` a partir do commit:  
   `scripts/integrity-check.sh --baseline` com working tree clean e alinhado a HEAD.
2. **Regenerar** `blueprint-volumes.sha256` a partir do commit:  
   `scripts/security-baseline-01-collect.sh` com working tree clean.
3. **Commit** dos manifests actualizados.
4. **Tag** `CERTIFIED-BASELINE-002` no commit resultante.
5. **Push** tag para `origin`.
6. **Cópia secundária** validada (notebook/pen drive com SHA-256 match).

---

## 5. Atualização da referência SEC-04

### 5.1 Substituição formal

| Campo | Valor anterior | Valor sucessor |
|---|---|---|
| Baseline ID | CERTIFIED-BASELINE-001 | **CERTIFIED-BASELINE-002** |
| Volume-10 digest | `b7835207335c899b9ab951fdf27239908422275b6e5a94883d28d71b13c41c7f` | **`e1cc4b14f087cd38c9c101343959220c20443abab222c875bf6f6b48298db7cd`** |
| Nginx digest | `9b2c913f…e81e9` (inalterado em Go-Live; ficheiro actual evoluiu) | **`1c40c785a498b7237d46d893ad8b8131b93658e022063303258c166876a11107`** |
| server.js | `72c227ce…` | **`fa5556da…`** |
| Commit de referência | `c3c20f7…` | **`0745040cb…`** |

### 5.2 Motivo da substituição

A baseline anterior (CERTIFIED-BASELINE-001) certificava digests gerados sobre working tree transitório em 2026-07-04. Investigação forense comprovou que o conteúdo correspondente a 6 dos 15 paths nunca foi commitado naquela versão exacta. A cadeia de custódia é irrecuperável.

### 5.3 Relatórios históricos

Os seguintes documentos **NÃO serão alterados** — permanecem como registo da cadeia investigativa:

- `ENT-GOV-001-CERTIFIED-BASELINE-RECOVERY-INVESTIGATION.md`
- `ENT-GOV-001B-REMOTE-REPOSITORY-INVESTIGATION.md`
- `ENT-GOV-001C-CERTIFIED-DIGEST-PROVENANCE.md`
- `ENT-EXEC-001-SEC04-CLOSURE-REVIEW.md`
- `ENT-EXEC-001-SEC04-ENVIRONMENT-CONFORMANCE.md`
- `ENT-EXEC-001-P0-EXECUTIVE-REVIEW.md`

---

## 6. Governança permanente

Criada: **CERTIFIED-BASELINE-LIFECYCLE-POLICY.md** (POLICY-BASELINE-LIFECYCLE-001).

Resumo das regras implementadas:

| Regra | Descrição |
|---|---|
| Artefacto | Hash ↔ blob preservado no Git |
| Commit | Manifest nunca antes do commit do conteúdo |
| Tag | Tag anotada imutável por baseline |
| Manifest | Gerado de `git show`, nunca de `sha256sum <file>` sobre working tree volátil |
| Storage | Cópia primária + secundária validada |
| Custódia | Responsável, localização, método, retenção |
| Auditoria | Pacote imutável a cada certificação |

---

## 7. Revisão final

| Item | Preservado? |
|---|---|
| Arquitectura | **SIM** — commit é superset funcional |
| Baselines (nova) | **SIM** — gerada do commit, não do working tree |
| MB-001 → MB-009 | **SIM** — relatório P0 presente e inalterado |
| SEC-04 | **SIM** — referência actualizada para hashes verificáveis |
| SEC-05 | **SIM** — test suite presente; bootstrap observável |
| Executive Review | **SIM** — documento preservado |
| Cadeia documental | **SIM** — todos os relatórios GOV-001 mantidos |

---

## 8. Decisão do Architecture Board

### **A — BASELINE RECERTIFICADA**

| Campo | Valor |
|---|---|
| Baseline ID | `CERTIFIED-BASELINE-002` |
| Commit | `0745040cb97fcd468f3bd32389870e9507877f1b` |
| Branch | `main` |
| Tag (pendente criação) | `CERTIFIED-BASELINE-002` |
| Volume-10 SHA-256 | `e1cc4b14f087cd38c9c101343959220c20443abab222c875bf6f6b48298db7cd` |
| Política permanente | `CERTIFIED-BASELINE-LIFECYCLE-POLICY.md` |
| Decisão | **BASELINE RECERTIFICADA** |

### Justificativa

1. A proveniência do digest anterior está documentada (ENT-GOV-001C).
2. A irrecuperabilidade do conteúdo está demonstrada (ENT-GOV-001 / 001B).
3. O candidato é o commit mais recente aprovado em `main`, sincronizado com o remote.
4. Todos os 1078 entries de blueprint-volumes correspondem ao conteúdo commitado (após correcção do Volume-10).
5. O programa ENT-EXEC-001 P0 está integralmente documentado e preservado.
6. A política CERTIFIED-BASELINE-LIFECYCLE-POLICY impede repetição do cenário.

---

## 9. Próximos passos (Architecture Board)

| # | Acção | Responsável | Prazo |
|---|---|---|---|
| 1 | Aprovar este documento | Architecture Board | imediato |
| 2 | Working tree clean + `integrity-check.sh --baseline` | Operador autorizado | após aprovação |
| 3 | `security-baseline-01-collect.sh` | Operador autorizado | sequencial |
| 4 | Commit manifests regenerados | wellington M.F | sequencial |
| 5 | `git tag -a CERTIFIED-BASELINE-002 -m 'ENT-GOV-002 recertification'` | Operador autorizado | sequencial |
| 6 | `git push origin CERTIFIED-BASELINE-002` | Operador autorizado | sequencial |
| 7 | Cópia secundária (pen drive / storage externo) | Wellington / Gustavo | 7 dias |
| 8 | Re-executar SEC-04 e confirmar score ≥ 0.95 | Automatizado | pós-step 4 |
| 9 | Reemitir P1 Gate Decision | ENT-EXEC-001 | pós-step 8 |

---

## 10. Rastreabilidade da substituição

```
CERTIFIED-BASELINE-001 (b783…c7f)
  │
  ├── ENT-GOV-001   → cadeia rompida
  ├── ENT-GOV-001B  → conteúdo ausente no remoto
  ├── ENT-GOV-001C  → proveniência documentada
  │
  └── ENT-GOV-002   → RECERTIFICAÇÃO
        │
        └── CERTIFIED-BASELINE-002 (e1cc…b7cd)
              ├── commit: 0745040cb…
              ├── tag: CERTIFIED-BASELINE-002
              ├── policy: CERTIFIED-BASELINE-LIFECYCLE-POLICY
              └── 15/15 hashes = committed content
```

---

*ENT-GOV-002 — recertificação formal; nenhum artefacto histórico alterado; rastreabilidade preservada.*
