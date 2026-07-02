# CERT-ONPREM-VALIDATION-01 — Homologação Oficial Enterprise

**Tipo:** Certificação de Validação e Homologação  
**Prioridade:** Crítica  
**Pré-requisitos:** FORENSICS ✅ · ARCHITECTURE ✅ · INFRA ✅ · DATA ✅ · LICENSE ✅ · CONTAINER ✅  
**Execução:** 2026-07-01  
**Status:** **NÃO HOMOLOGADA**  
**Go-Live:** **PROIBIDO**

---

## Decisão formal (Parte 13)

| Resultado | **NÃO HOMOLOGADA** |
|-----------|-------------------|
| Go-Live autorizado | **Não** |
| Homologada com ressalvas | Não aplicável |

### Justificação técnica

Existem **8 NCs de severidade Alta** que comprometem a distribuição Enterprise:

1. **Docker não homologado** (NC-V002/V004) — engine indisponível; Parte 3 bloqueada  
2. **Instalação PM2 limpa não executada** (NC-V003) — host operacional pré-populado, não VM dedicada  
3. **Equivalência PM2×Docker não verificada** (NC-V005)  
4. ~~**Backup/restore comprometido** (NC-V006)~~ — **ENCERRADA** (CERT-ENTERPRISE-BACKUP-01, 2026-07-01)  
5. **Update A→B não simulado** (NC-V010)  
6. **Rollback não executado** (NC-V011) — depende restore  
7. **Regressão cognitiva E2E incompleta** (NC-V012)  
8. **509 restarts PM2 backend** (NC-V007) — estabilidade operacional  

**Evidência completa:** [`evidence/validation-01/homologation-full-2026-07-01.json`](./evidence/validation-01/homologation-full-2026-07-01.json)

---

## Regra fundamental (aplicada)

Durante execução: **nenhum código, arquitectura, Docker, PM2, BD, licenciamento ou módulos cognitivos foram alterados.**

Todas as falhas → NC registada → certificação corretiva proposta.

---

## Sumário de execução por parte

| Parte | Título | Status | Evidência |
|-------|--------|--------|-----------|
| 1 | Auditoria arquitectural | ✅ PASS | 19 ADRs, certs presentes |
| 2 | Instalação PM2 limpa | ⚠️ PARCIAL | Scripts OK; VM limpa não executada |
| 3 | Instalação Docker limpa | ❌ BLOCKED | Docker ausente |
| 4 | Equivalência PM2×Docker | ❌ BLOCKED | Depende Parte 3 |
| 5 | Persistência | ⚠️ PARCIAL | Marker uploads sobrevive restart PM2 |
| 6 | Backup + restore | ⚠️ | Manifest OK pós BACKUP-01; restore real pendente |
| 7 | Update A→B | ⚠️ PARCIAL | migrate dry-run; mesma versão |
| 8 | Rollback | ❌ | ROLLBACK-01 REPROVADA (disco cheio — NC-R001/R002) |
| 9 | Regressão cognitiva | ⚠️ PARCIAL | 401 pulse; deep health OK |
| 10 | Segurança | ⚠️ PARCIAL | Helmet, JWT 401, CORS |
| 11 | Performance | ✅ PASS | Métricas registadas |
| 12 | NCs | ✅ | 12 NCs registadas |
| 13 | Decisão | ✅ | NÃO HOMOLOGADA |
| 14 | Relatório | ✅ | Este documento |

---

## PARTE 1 — Auditoria ✅

- `ecosystem.config.js` presente (PM2 host inalterado)  
- CERT-ARCHITECTURE, INFRA, DATA, LICENSE, CONTAINER documentados  
- 19 ADRs em `docs/adrs/`  
- Matriz container presente  

**Divergências documentais:** nenhuma.

---

## PARTE 2 — PM2 ⚠️ PARCIAL

### Executado (host operacional existente)

| Teste | Resultado |
|-------|-----------|
| `verify-enterprise.js` | ✅ |
| `test:license-enterprise` | ✅ 10/10 |
| `GET /health` | ✅ 200 |
| `GET /api/system/health/deep` | ✅ `ready:true` |
| Frontend `:3000` | ✅ 200 |
| `health-enterprise.js` | ✅ |
| Migrations status | ✅ 119 applied |
| Licença | ✅ `disabled`, operational |
| Persistência marker pós-restart | ✅ |

### Não executado

- VM/host **totalmente limpo**  
- Bootstrap BD vazia  
- ANAM (AKOOL ausente — NC-V009 Baixa)  
- Gêmeo Digital E2E browser  

**NC-V003** (Alta): instalação limpa PM2 pendente.

---

## PARTE 3 — Docker ❌ BLOCKED

- `which docker` → **não encontrado**  
- `docker-compose.yml` syntax ✅  
- `container-smoke.sh` **não executado**  

**NC-V002/V004** (Alta).

---

## PARTE 6 — Backup ❌ FAIL

```
backup_20260701_000949/
├── database.dump     2.404 GB  ✅ criado
├── uploads.tar.gz    ✅
├── cognitive_data.tar.gz ✅
├── config.env        ✅
├── licenses.tar.gz   ✅
└── manifest.json     ❌ AUSENTE
```

Erro: `File size (2404426188) is greater than 2 GiB`  
Restore dry-run: `Manifesto não encontrado`

**NC-V006** — **ENCERRADA** via CERT-ENTERPRISE-BACKUP-01 (2026-07-01)

---

## PARTE 11 — Performance ✅

| Métrica | Valor |
|---------|-------|
| GET /health p95 | ~1,86 s |
| pg_dump duração | ~494 s |
| database.dump | 2,4 GB |
| PM2 backend restarts | 509 |

---

## Matriz de Não Conformidades (Parte 12)

| ID | Sev. | Descrição | Cert. corretiva |
|----|------|-----------|-----------------|
| NC-V001 | Média | IMPETUS_ADMIN_JWT_SECRET ausente | CERT-ENTERPRISE-CONFIG-01 |
| NC-V002 | Alta | Docker engine indisponível | Re-exec Parte 3 |
| NC-V003 | Alta | PM2 limpo VM dedicada não executado | Re-exec Parte 2 |
| NC-V004 | Alta | Docker limpo não executado | Re-exec Parte 3 |
| NC-V005 | Alta | Equivalência PM2×Docker | Re-exec Parte 4 |
| NC-V006 | Alta | ~~Backup manifest >2GB~~ | **ENCERRADA** — CERT-ENTERPRISE-BACKUP-01 ✅ |
| NC-V007 | Alta | 509 restarts PM2 backend | Investigação ops |
| NC-V008 | Média | Layout legacy vs IMPETUS_HOME | Re-exec Parte 2 |
| NC-V009 | Baixa | ANAM não configurado | Opcional |
| NC-V010 | Alta | Update A→B não simulado | Re-exec Parte 7 |
| NC-V011 | Alta | Rollback não comprovado | ROLLBACK-01 **REPROVADA** (NC-R001/R002 — disco cheio); re-exec |
| NC-V012 | Alta | Regressão cognitiva E2E incompleta | Re-exec Parte 9 |

**Total:** 8 Alta · 2 Média · 1 Baixa · **0 corrigidas automaticamente**

---

## Critérios de aprovação (Parte 13)

| Critério | Atendido |
|----------|:--------:|
| Arquitectura íntegra (doc) | ✅ |
| PM2 ≡ Docker | ❌ |
| Backup + restore | ⚠️ (manifest OK; restore físico bloqueado por ROLLBACK-01) |
| Update A→B | ❌ |
| Rollback | ❌ |
| Zero NC Alta aberta | ❌ (8 abertas) |

---

## Próximos passos

1. **PROVISIONING-01** — spec entregue ✅  
2. **STAGING-01** — provisionar VM → `enterprise:staging-provisioning` APROVADA  
3. **ROLLBACK-01** — re-execução na VM staging  
4. **VALIDATION-01** — re-execução completa  
5. **GOLIVE-01** — decisão formal (`GO-LIVE-DECISION-RECORD.md`)  

```bash
cd backend && npm run enterprise:homologation -- --json
```

---

## Declaração final

> **A versão Enterprise IMPETUS On-Premise NÃO está autorizada para distribuição a clientes** até conclusão das partes bloqueadas e resolução ou aceite formal das NCs Alta.

Status permanece **EM HOMOLOGAÇÃO** até nova execução com evidências completas.

---

## Documentação

| Documento | Path |
|-----------|------|
| Matriz conformidade | `MATRIZ-CONFORMIDADE-VALIDATION.md` |
| Manual homologação | `enterprise/MANUAL-HOMOLOGACAO.md` |
| Go-Live | `enterprise/MANUAL-GOLIVE-ENTERPRISE.md` · `CHECKLIST-GOLIVE.md` · `GO-LIVE-DECISION-RECORD.md` |
| Rollback | `enterprise/MANUAL-ROLLBACK.md` |
| Evidência JSON | `evidence/validation-01/homologation-full-2026-07-01.json` |
