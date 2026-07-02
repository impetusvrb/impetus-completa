# CERT-ENTERPRISE-ENV-QUALIFICATION-01 — Qualificação do Ambiente de Homologação

**Tipo:** Certificação Operacional  
**Prioridade:** Crítica  
**Execução:** 2026-07-01  
**Host auditado:** `srv1422313`  
**Status:** **REPROVADA**  
**Qualificado para VALIDATION-01:** **Não**

---

## Pré-requisitos

| Certificação | Status |
|--------------|:------:|
| FORENSICS-01 | ✅ |
| ARCHITECTURE-01 | ✅ |
| INFRA-01 | ✅ |
| DATA-01 | ✅ |
| LICENSE-01 | ✅ |
| CONTAINER-01 | ✅ |
| BACKUP-01 | ✅ |
| ROLLBACK-01 | ⚠️ executada (reprovada por infra) |

---

## Decisão (Parte 10)

| Resultado | **REPROVADA** |
|-----------|---------------|
| Ambiente apto para VALIDATION-01 | **Não** |
| Código IMPETUS alterado | **Não** |

### Justificação

A reprovação do **ROLLBACK-01** foi causada por **limitação de infraestrutura**, não por defeito de software. Esta certificação formaliza essa distinção: o host actual **não possui recursos mínimos** para homologação Enterprise sem gerar falsas reprovações.

**Bloqueadores Alta (3):** disco esgotado, Docker ausente, capacidade DR insuficiente.

---

## PARTE 1 — Auditoria do Host

| Componente | Valor |
|------------|-------|
| SO | Ubuntu 22.04.5 LTS |
| Kernel | 5.15.0-174-generic |
| CPU | 2 cores (AMD EPYC 9354P) |
| RAM total | 7937 MB |
| RAM livre | 5388 MB |
| Disco `/` | 96,73 GB total · **0,09 GB livres (100%)** |
| Node.js | v20.20.0 |
| PM2 | 6.0.14 |
| PostgreSQL | 14.23 |
| psql / pg_restore | ✅ |
| Docker | ❌ ausente |
| Nginx | instalado |
| Layout | **legacy** (sem `IMPETUS_HOME`) |
| Utilizador | root (uid 0) |

---

## PARTE 2 — Requisitos mínimos

| Requisito | Mínimo | Medido | Status |
|-----------|--------|--------|:------:|
| Disco livre | ≥ 10 GB | 0,09 GB | ❌ |
| Disco preferencial | ≥ 20 GB | 0,09 GB | ❌ |
| RAM | ≥ 4096 MB | 7937 MB | ✅ |
| Docker funcional | sim | ausente | ❌ |
| PM2 funcional | sim | ping OK | ✅ |
| PostgreSQL | operacional | 127.0.0.1:5432/impetus_db | ✅ |
| Escrita `config/` … `licenses/` | sim | todos write=true | ✅ |

---

## PARTE 3 — Persistência ✅

CRUD controlado (create/read/delete) passou em:

- sandbox de evidências
- `backups/`
- `temp/`

---

## PARTE 4 — Capacidade DR ❌

| Métrica | Valor |
|---------|-------|
| Maior backup | 2,24 GB |
| Espaço requerido (backup + restore + temp + WAL + logs) | **~6,23 GB** |
| Espaço disponível | **0,09 GB** |
| Suficiente | **Não** |

Esta métrica explica directamente **NC-R001/NC-R002** do ROLLBACK-01.

---

## PARTE 5 — Docker ❌ (bloqueada)

Engine indisponível — qualificação Docker não executada.

`docker-compose.yml` presente no repositório (syntax não testada nesta execução).

---

## PARTE 6 — PM2 ✅

| Check | Status |
|-------|:------:|
| pm2 ping | ✅ |
| impetus-backend | online |
| impetus-frontend | online |
| ecosystem.config.js | ✅ |

---

## PARTE 7 — Segurança ⚠️

| Check | Status |
|-------|:------:|
| Execução como root | ⚠️ NC-EQ004 |
| DATABASE_URL / DB_* | ✅ |
| JWT_SECRET | ✅ |
| IMPETUS_ADMIN_JWT_SECRET | ❌ ausente |
| UFW | active |
| Portas 80/443/3000/4000 | em escuta |
| Certificados TLS | ✅ |

---

## Não conformidades (Parte 9)

| ID | Sev. | Descrição | Cert. relacionada |
|----|------|-----------|-------------------|
| **NC-EQ001** | Alta | Disco < 10 GB livres | ROLLBACK-01 |
| **NC-EQ002** | Alta | Docker Engine ausente | VALIDATION-01 |
| **NC-EQ003** | Alta | Capacidade DR insuficiente | ROLLBACK-01 |
| NC-EQ004 | Média | Homologação como root | INFRA-01 |

**Nenhuma correção automática aplicada.**

---

## NCs encerradas por esta certificação

Nenhuma — esta certificação **classifica** bloqueios infraestruturais; não encerra NCs de produto.

**NCs de produto/validação permanecem abertas** até re-execução em ambiente qualificado.

---

## Evidências (Parte 8)

| Ficheiro | Conteúdo |
|----------|----------|
| `docs/evidence/environment-qualification-01/env-qualification-2026-07-01T01-04-02-843Z.json` | Relatório completo |
| `docs/evidence/environment-qualification-01/ENV-QUALIFICATION-01-SUMMARY.json` | Sumário decisão |

```bash
npm run enterprise:env-qualification
npm run enterprise:env-qualification -- --json
```

---

## Ficheiros criados

| Ficheiro | Tipo |
|----------|------|
| `scripts/enterprise/environment-qualification.js` | Orquestrador |
| `docs/CERT-ENTERPRISE-ENV-QUALIFICATION-01.md` | Certificação |
| `docs/enterprise/MANUAL-QUALIFICACAO-AMBIENTE.md` | Manual |
| `docs/evidence/environment-qualification-01/*` | Evidências |

**Código da aplicação:** 0 alterações.

---

## Sequência validada

```
… → BACKUP ✅ → ROLLBACK ⚠️ → ENV-QUALIFICATION ⚠️
→ PROVISIONING ✅ → STAGING (VM) → ROLLBACK → VALIDATION → GO-LIVE
```

---

## Próximos passos

1. Provisionar VM conforme **PROVISIONING-01** (`HANDOFF-INFRASTRUCTURE.md`, `VM-SPECIFICATION.md`)  
2. **STAGING-01** APROVADA na VM  
3. Re-executar `npm run enterprise:env-qualification` até **APROVADA**  
4. Re-executar `npm run enterprise:rollback-validation` e `enterprise:homologation`  

---

## Critérios de aceite

| Critério | Estado |
|----------|:------:|
| Disco ≥ 10 GB | ❌ |
| Docker operacional | ❌ |
| PM2 operacional | ✅ |
| PostgreSQL operacional | ✅ |
| Capacidade DR | ❌ |
| IMPETUS_HOME íntegro | ⚠️ legacy |
| Zero bloqueadores Alta | ❌ |

**CERT-ENTERPRISE-ENV-QUALIFICATION-01: REPROVADA**
