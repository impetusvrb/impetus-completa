# CERT-ONPREM-DATA-01 — Camada de Persistência Enterprise

**Tipo:** Certificação de Implementação  
**Prioridade:** Crítica  
**Pré-requisitos:** FORENSICS-01 ✅ · ARCHITECTURE-01 ✅ · INFRA-01 ✅  
**Data:** 2026-06-30  
**Status:** CERTIFICADO  

---

## Sumário executivo

Implementada a camada de persistência Enterprise conforme contratos ARCHITECTURE-01 e INFRA-01:

- Módulo central **`impetusHome.js`** com compatibilidade retroativa
- Unificação de uploads e estado cognitivo via paths configuráveis
- Bootstrap automático para BD vazia
- Scripts oficiais backup / restore / verify / health / install
- Manifesto + SHA-256 nos backups

**Não alterado:** regras de negócio, APIs públicas, Event Backbone, Pulse, Controller, ANAM, Gêmeo Digital, licenciamento, Docker.

---

## PARTE 1 — IMPETUS_HOME

| Ficheiro | Função |
|----------|--------|
| `backend/src/config/impetusHome.js` | Resolução canónica de paths |
| `backend/src/config/loadEnv.js` | `.env` em `config/` ou legado `backend/.env` |
| `backend/src/config/uploadPaths.js` | Destinos multer unificados |
| `backend/src/paths.js` | Candidatos upload (primary + legado) |

**Comportamento:** sem `IMPETUS_HOME` → paths legados (`backend/uploads`, `backend/data`, `backend/.env`).

---

## PARTE 2 — Bootstrap

| Ficheiro | Uso |
|----------|-----|
| `scripts/enterprise/bootstrap-enterprise.js` | BD vazia → empresa + admin + base estrutural mínima |
| `scripts/seed-initial.js` | Alias `npm run seed` |

**Env obrigatórias (bootstrap):**
```env
ENTERPRISE_BOOTSTRAP_ADMIN_EMAIL=admin@fabrica.local
ENTERPRISE_BOOTSTRAP_ADMIN_PASSWORD=SenhaForte1
ENTERPRISE_BOOTSTRAP_COMPANY_NAME=Nome da Fábrica
```

**Segurança:** aborta se `companies` ou `users` já existirem.

---

## PARTE 3–4 — Backup / Restore

| Script | Descrição |
|--------|-----------|
| `backup-enterprise.sh` / `.js` | pg_dump + tar uploads/data/licenses/certificates + config |
| `restore-enterprise.sh` / `.js` | Valida manifest; `--dry-run`; confirmação `--yes` |
| `backup-lib.js` | Manifesto JSON + SHA-256 |

---

## PARTE 5 — Estado cognitivo

Stores actualizados (apenas path, lógica intacta):

- `operationalContextStore.js`
- `confidenceEvolutionStore.js`
- `inferenceValidationStore.js`
- `runtimeStabilityStore.js`
- `supervisedLearningPersistence.js`
- `tenantContextBoundaryValidator.js`
- `tenantActivationPersistence.js`
- `zOperationalMemoryRuntime.js`
- `cognitiveGovernanceAuditFeed.js`

---

## PARTE 6 — Uploads

Rotas/serviços migrados para `uploadPaths.js` (escrita na raiz canónica; leitura via candidatos legado).

---

## PARTE 8 — Scripts operacionais

| Script | Idempotente |
|--------|:-----------:|
| `install-enterprise.sh` | ✅ |
| `backup-enterprise.sh` | ✅ |
| `restore-enterprise.sh` | ✅ (com confirmação) |
| `verify-enterprise.sh` | ✅ |
| `health-enterprise.sh` | ✅ |
| `update-precheck.sh` | ✅ |

---

## PARTE 9 — DR

- RPO/RTO conforme INFRA-01 (backup diário + restore documentado)
- `restore-enterprise.js --dry-run` para validação
- Checklist pós-restore: `verify-enterprise.sh` + `health-enterprise.sh`

---

## PARTE 11 — Evidências de testes

| Teste | Resultado |
|-------|-----------|
| `verify-enterprise.js` (legacy) | ✅ PASS |
| `verify-enterprise.js` (IMPETUS_HOME=/tmp/...) | ✅ PASS |
| `bootstrap-enterprise.js --dry-run` | ✅ SKIP (3 empresas existentes) |
| `update-precheck.js` | Executado |
| `health-enterprise.js` | Depende backend online |

---

## Roadmap actualizado

```
FORENSICS ✅ → ARCHITECTURE ✅ → INFRA ✅ → DATA ✅ → LICENSE ✅ → CONTAINER ✅
  → VALIDATION ⏳ (Homologação Oficial Enterprise)
```

---

## Manuais

- [Manual de Backup](./enterprise/MANUAL-BACKUP.md)
- [Manual de Restore](./enterprise/MANUAL-RESTORE.md)
- [Manual de Bootstrap](./enterprise/MANUAL-BOOTSTRAP.md)
- [Manual de Disaster Recovery](./enterprise/MANUAL-DR.md)

---

*CERT-ONPREM-DATA-01 v1.0 · 2026-06-30*
