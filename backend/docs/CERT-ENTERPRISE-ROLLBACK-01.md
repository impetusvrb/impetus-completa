# CERT-ENTERPRISE-ROLLBACK-01 — Validação Oficial de Rollback e DR

**Tipo:** Certificação Corretiva de Homologação  
**Origem:** CERT-ONPREM-VALIDATION-01 Partes 6 e 8  
**Pré-requisitos:** DATA-01 ✅ · LICENSE-01 ✅ · BACKUP-01 ✅ (NC-V006 encerrada)  
**Execução:** 2026-07-01  
**Status:** **REPROVADA** (neste host)  
**DR Enterprise validado:** **Não** — re-execução em ambiente com disco suficiente

---

## Decisão (Parte 9)

| Resultado | **REPROVADA** |
|-------------|---------------|
| Rollback/DR comprovado end-to-end | **Não** |
| Procedimento (manifest + dry-run + scripts) | **Válido** ✅ |

### Justificação

O **processo oficial** de restore passou nas etapas que não exigem espaço adicional (auditoria, manifest SHA-256, dry-run). A **execução física** de `pg_restore` e extract de tar.gz **falhou** por **disco 100% cheio** no host (~99 MB livres, backup 2,3 GB).

Isto é **bloqueio de infraestrutura**, não falha do script de restore pós-BACKUP-01. Formalizado em **CERT-ENTERPRISE-ENV-QUALIFICATION-01** (NC-EQ001, NC-EQ003). **Não foi alterado código** da aplicação.

---

## PARTE 1 — Auditoria ✅

| Artefacto | Conformidade DATA-01 |
|-----------|:--------------------:|
| `restore-enterprise.js` | ✅ |
| `restore-enterprise.sh` | ✅ |
| `backup-lib.js` | ✅ |
| Ordem: manifest → confirm → DB → tars → config | ✅ |

---

## PARTE 2 — Simulação de falha ✅

Baseline capturado (produção **não parada** — sem perda de dados):

| Métrica | Valor |
|---------|-------|
| Health `/health` | 200 OK |
| Companies | 3 |
| Users | 43 |
| Falha simulada | `update_interrupted_logical` (documental) |

---

## PARTE 3 — Execução restore ⚠️

| Teste | Resultado | Tempo |
|-------|-----------|-------|
| `validateManifest` strict | ✅ PASS | ~2,2 s |
| `restore-enterprise.js --dry-run` | ✅ PASS | — |
| `config.env` SHA-256 | ✅ PASS | — |
| `pg_restore` → `impetus_rollback_cert01` | ❌ FAIL | NC-R001 |
| Extract `uploads.tar.gz` → sandbox | ❌ FAIL | NC-R002 |
| Extract `cognitive_data.tar.gz` | ❌ FAIL | NC-R002 |
| Extract `licenses.tar.gz` | ❌ FAIL | NC-R002 |

**Erro:** `No space left on device` — `/dev/sda1` **100%** (97G/97G).

Backup: `backups/backup_20260701_000949` (2,3 GB, manifest OK pós BACKUP-01).

---

## PARTE 4 — Recuperação operacional ⚠️

| Check | Resultado |
|-------|-----------|
| Produção `/health` pós-teste | ✅ Inalterada |
| Deep health | ⚠️ Skip (timeout/disco) |
| Restore in-place produção | ⏭ Skip (by design) |

---

## PARTE 5 — DR (INFRA-01)

| Métrica | Target | Medido |
|---------|--------|--------|
| RPO | ≤ 24 h | ✅ Backup ~0,3 h antigo |
| RTO (pg_restore) | ≤ 4 h | ❌ Não medido (falha disco) |

---

## PARTE 6 — Regressão ✅

| Teste | Pós-validação |
|-------|---------------|
| `verify-enterprise.js` | ✅ PASS |
| `health-enterprise.js` | ✅ PASS |
| `validateManifest` | ✅ PASS |

Produção **sem regressão** após tentativa de validação.

---

## Não conformidades

| ID | Sev. | Descrição | Acção |
|----|------|-----------|-------|
| NC-R001 | Alta | pg_restore falhou — disco cheio | Re-exec em host ≥10 GB livres |
| NC-R002 | Alta | Extract tar falhou — disco cheio | Idem |
| NC-R003 | Média | Restore in-place não executado | Staging VM dedicada |

**Nenhuma NC corrigida automaticamente.**

---

## Evidências

| Ficheiro | Conteúdo |
|----------|----------|
| `docs/evidence/rollback-01/rollback-validation-2026-07-01T00-48-59-392Z.json` | Relatório completo |
| `docs/evidence/rollback-01/ROLLBACK-01-SUMMARY.json` | Sumário decisão |
| `scripts/enterprise/rollback-validation.js` | Orquestrador |

```bash
npm run enterprise:rollback-validation
npm run enterprise:rollback-validation -- --backup=backups/backup_YYYYMMDD_HHMMSS
```

---

## Ficheiros criados (validação only)

| Ficheiro | Tipo |
|----------|------|
| `scripts/enterprise/rollback-validation.js` | Orquestrador evidências |
| `docs/CERT-ENTERPRISE-ROLLBACK-01.md` | Certificação |
| `docs/evidence/rollback-01/*` | Evidências |

**Código da aplicação:** 0 alterações.

---

## Próximos passos

1. **PROVISIONING-01** — `HANDOFF-INFRASTRUCTURE.md` ao fornecedor ✅  
2. Provisionar VM → **STAGING-01** APROVADA  
3. **ROLLBACK-01** — re-execução na VM staging  
4. **VALIDATION-01** — re-execução completa  

---

## Critérios de aceite

| Critério | Estado |
|----------|:------:|
| Auditoria restore | ✅ |
| Manifest + integridade | ✅ |
| pg_restore comprovado | ❌ (disco) |
| Uploads/data restore comprovado | ❌ (disco) |
| Produção sem regressão | ✅ |
| Sem alteração arquitectura | ✅ |

**CERT-ENTERPRISE-ROLLBACK-01: REPROVADA** (re-execução obrigatória)
