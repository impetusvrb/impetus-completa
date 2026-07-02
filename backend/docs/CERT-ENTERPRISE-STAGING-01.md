# CERT-ENTERPRISE-STAGING-01 — Provisionamento do Ambiente Oficial de Homologação

**Tipo:** Certificação Operacional  
**Prioridade:** Crítica  
**Execução (host actual):** 2026-07-01 — `srv1422313` (produção)  
**Status:** **REPROVADA** (esperado — host não é VM staging)  
**Staging pronto:** **Não**

---

## Declaração metodológica

Esta certificação **não evolui o produto**. Separa definitivamente:

| Camada | Certificações |
|--------|---------------|
| **Produto** | ARCHITECTURE, DATA, LICENSE, CONTAINER, BACKUP… |
| **Ambiente de homologação** | ENV-QUALIFICATION → **STAGING-01** |
| **Execuções de homologação** | ROLLBACK-01 (re-exec), VALIDATION-01 (re-exec), Go-Live |

---

## Pré-requisitos

| Certificação | Status |
|--------------|:------:|
| … BACKUP-01 | ✅ |
| PROVISIONING-01 | ✅ (spec oficial) |
| ENV-QUALIFICATION-01 | ⚠️ re-exec após VM |

**Nota:** executar após VM provisionada conforme `HANDOFF-INFRASTRUCTURE.md`.

---

## PARTE 1 — Especificação oficial da VM

| Recurso | Mínimo | Recomendado |
|---------|--------|-------------|
| SO | Ubuntu Server 22.04 LTS+ | 22.04 LTS |
| CPU | 2 vCPUs | 4 vCPUs |
| RAM | 8 GB | 16 GB |
| Disco | 40 GB | 80 GB SSD |
| **Espaço livre antes homologação** | **≥ 20 GB** | ≥ 40 GB |

**IMPETUS_HOME canónico:** `/opt/impetus`  
**Utilizador dedicado:** `impetus` (nunca root)

---

## Execução neste host (2026-07-01)

| Parte | Resultado | Nota |
|-------|-----------|------|
| 1 — Spec VM | ⚠️ | RAM/CPU OK; disco livre **0,09 GB** |
| 2 — Runtime | ⚠️ | PM2/PG/Node OK; **Docker ausente** |
| 3 — `/opt/impetus` | ❌ | Não existe (host legacy produção) |
| 4 — User `impetus` | ❌ | Não existe; execução como **root** |
| 5 — Docker | ❌ bloqueada | — |
| 6 — PostgreSQL limpo | ❌ | 3 companies, 43 users (produção) |
| 7 — PM2 | ✅ | Instalado |
| 8 — Rede | ✅ | Portas/firewall OK |
| 9 — Capacidade DR | ❌ | Espaço insuficiente |
| 10 — Evidências | ✅ | Geradas |
| 11 — Aprovação | **REPROVADA** | 19 NCs Alta |

**Conclusão:** O host `srv1422313` é **produção**, não staging. A reprovação é **correcta e esperada**.

---

## NCs abertas (resumo)

| Categoria | NCs | Causa |
|-----------|-----|-------|
| Disco | NC-ST001, NC-ST019 | < 20 GB livres |
| Docker | NC-ST002, NC-ST003 | Engine/Compose ausentes |
| IMPETUS_HOME | NC-ST004–NC-ST016 | `/opt/impetus` e subdirs ausentes |
| User dedicado | NC-ST017, NC-ST018 | `impetus` ausente; root |
| BD produção | NC-ST019 | Dados reais no PostgreSQL |

Ver relatório completo para lista detalhada.

**Nenhuma correção automática aplicada.**

---

## Evidências

| Ficheiro | Conteúdo |
|----------|----------|
| `docs/evidence/staging-01/staging-provisioning-2026-07-01T01-15-01-134Z.json` | Relatório completo |
| `docs/evidence/staging-01/STAGING-01-SUMMARY.json` | Sumário |

```bash
# Na VM staging (após provisionamento manual):
export IMPETUS_HOME=/opt/impetus
cd /opt/impetus/app/backend   # ou path do clone
npm run enterprise:staging-provisioning
npm run enterprise:staging-provisioning -- --json
```

---

## Ficheiros criados

| Ficheiro | Tipo |
|----------|------|
| `scripts/enterprise/staging-provisioning.js` | Orquestrador validação |
| `docs/CERT-ENTERPRISE-STAGING-01.md` | Certificação |
| `docs/enterprise/MANUAL-STAGING.md` | Procedimento provisionamento |
| `docs/evidence/staging-01/*` | Evidências |

**Código da aplicação:** 0 alterações.

---

## Sequência validada

```
… → BACKUP ✅ → ROLLBACK ⚠️ → ENV-QUALIFICATION ⚠️
→ STAGING ❌ (este host)
→ STAGING ✅ (VM dedicada) → ROLLBACK (re-exec) → VALIDATION (re-exec) → GO-LIVE
```

---

## Próximos passos

1. Provisionar **VM dedicada** conforme `MANUAL-STAGING.md`
2. Executar `npm run enterprise:staging-provisioning` até **APROVADA**
3. Executar `npm run enterprise:env-qualification` (confirmação)
4. Re-executar `npm run enterprise:rollback-validation`
5. Re-executar `npm run enterprise:homologation`

---

## Critérios de aceite (Parte 11)

| Critério | Host actual |
|----------|:-----------:|
| Docker operacional | ❌ |
| PM2 operacional | ✅ |
| PostgreSQL operacional | ✅ |
| User dedicado `impetus` | ❌ |
| IMPETUS_HOME `/opt/impetus` | ❌ |
| ≥ 20 GB livres | ❌ |
| BD limpa (sem produção) | ❌ |
| Zero NC Alta | ❌ |

**CERT-ENTERPRISE-STAGING-01: REPROVADA** (re-executar na VM staging)
