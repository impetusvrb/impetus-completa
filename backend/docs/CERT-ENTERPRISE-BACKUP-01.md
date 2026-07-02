# CERT-ENTERPRISE-BACKUP-01 — Correção Backup Grandes Bases (>2 GiB)

**Tipo:** Certificação Corretiva  
**Origem:** NC-V006 (CERT-ONPREM-VALIDATION-01)  
**Prioridade:** Crítica  
**Data:** 2026-07-01  
**Status:** **CERTIFICADO** — NC-V006 **ENCERRADA**

---

## Sumário

Corrigida exclusivamente a falha de geração/validação de `manifest.json` quando `database.dump` excede **2 GiB**, preservando formato de backup, restore e arquitectura certificada.

**Não alterado:** Event Backbone, cognitivo, licenciamento, Docker, PM2, APIs, regras de negócio.

---

## PARTE 1 — Auditoria

| Componente | Função |
|------------|--------|
| `backup-enterprise.js` | pg_dump + tar + `writeManifest` |
| `backup-lib.js` | `sha256File`, `writeManifest`, `validateManifest` |
| `restore-enterprise.js` | Valida manifest → restore |

**Fluxo manifest:** para cada artefacto → `stat.size` + `sha256File(path)` → JSON → checksum do próprio `manifest.json` (item interno, skip na validação).

---

## PARTE 2 — Causa raiz

| Item | Detalhe |
|------|---------|
| **Causa técnica** | `sha256File()` usava `fs.readFileSync(filePath)` |
| **Limitação Node.js** | Buffers/ficheiros > **2 GiB** rejeitados: `File size (N) is greater than 2 GiB` |
| **Componente** | `backup-lib.js` linha 15–18 (pré-correcção) |
| **Momento falha** | Após `pg_dump` bem-sucedido (~2,4 GB), durante `writeManifest` |
| **Impacto homologação** | Parte 6 FAIL, Parte 8 bloqueada, restore impossível |
| **Impacto DR** | Backups grandes sem integridade verificável — risco Go-Live |

**Evidência pré-correcção:** `backups/backup_20260701_000949/` — dump presente, `manifest.json` ausente.

---

## PARTE 3 — Correção (mínima)

### `sha256File` — hashing em streaming

- Leitura por chunks de **64 MiB** via `fs.openSync` + `fs.readSync`
- **Sem** carregar dump inteiro em memória
- Formato backup **inalterado** (`database.dump`, tar.gz, `manifest.json` v1)

### `rebuildManifestFromDir` + `--repair-manifest=DIR`

- Repara backups incompletos (dump já existente, manifest ausente)
- Caso de uso: backup interrompido na NC-V006

---

## PARTE 4 — Compatibilidade

| Cenário | Resultado |
|---------|-----------|
| Backups pequenos | ✅ Teste unitário |
| Backups >2 GiB | ✅ Sparse 2 GiB + 64 KiB |
| Backup produção 2,4 GB | ✅ Manifest reparado + validate |
| Layout legado | ✅ Inalterado |
| IMPETUS_HOME | ✅ Inalterado |
| PM2 / Docker | ✅ Sem alteração |

Manifestos **antigos** (gerados antes da correção, se existirem) permanecem válidos — mesmo algoritmo SHA-256, apenas método de leitura mudou.

---

## PARTE 5 — Integridade

| Teste | Evidência |
|-------|-----------|
| `test:backup-enterprise` | 3 OK, 0 FAIL |
| Repair `backup_20260701_000949` | manifest 6 artefactos, DB 2404426188 bytes |
| `validateManifest` strict | ✅ |
| `restore-enterprise.js --dry-run` | ✅ Manifesto OK |

---

## PARTE 6 — Regressão

```bash
npm run test:backup-enterprise          # 3 OK
npm run test:license-enterprise         # 10 OK (sem regressão)
node scripts/enterprise/verify-enterprise.js  # PASS
```

---

## Ficheiros modificados

| Ficheiro | Alteração |
|----------|-----------|
| `scripts/enterprise/backup-lib.js` | `sha256File` streaming; `rebuildManifestFromDir` |
| `scripts/enterprise/backup-enterprise.js` | Flag `--repair-manifest=DIR` |
| `src/tests/backupEnterpriseLargeHashTest.js` | Testes >2 GiB |
| `package.json` | `test:backup-enterprise` |
| `docs/CERT-ENTERPRISE-BACKUP-01.md` | Esta certificação |
| `docs/enterprise/MANUAL-BACKUP.md` | Repair + limite |
| `docs/CERT-ONPREM-VALIDATION-01.md` | NC-V006 encerrada |
| `docs/evidence/validation-01/NC-V006-closure.json` | Evidência encerramento |

**Ficheiros de aplicação (server, cognitivo, APIs):** **0 alterações**

---

## NC-V006 — Encerramento

| Campo | Valor |
|-------|-------|
| ID | NC-V006 |
| Estado | **ENCERRADA** |
| Data | 2026-07-01 |
| Verificação | manifest + validate + restore dry-run em dump 2,4 GB |

---

## Próximos passos (VALIDATION-01)

1. ~~NC-V006~~ ✅  
2. Re-executar **Parte 8** (Rollback) com backup funcional  
3. Homologação Docker (NC-V002/V004/V005)  
4. VM limpa PM2 + IMPETUS_HOME (NC-V003)  
5. Re-decisão homologação global  

---

## Critérios de aceite

| Critério | Estado |
|----------|:------:|
| Causa raiz documentada | ✅ |
| Correção mínima | ✅ |
| >2 GiB suportado | ✅ |
| Compatibilidade backups antigos | ✅ |
| Sem alteração arquitectura | ✅ |
| NC-V006 encerrada | ✅ |

**CERT-ENTERPRISE-BACKUP-01: CERTIFICADO**
