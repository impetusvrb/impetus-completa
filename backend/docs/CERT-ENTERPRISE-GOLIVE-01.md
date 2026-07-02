# CERT-ENTERPRISE-GOLIVE-01 — Preparação da Certificação Final de Liberação

**Tipo:** Certificação Operacional (exclusivamente documental)  
**Prioridade:** Máxima  
**Data:** 2026-07-01  
**Status:** **PREPARADA** (estrutura pronta)  
**Go-Live autorizado:** **NÃO**  
**Código alterado:** **Nenhum**

---

## Declaração

Esta certificação **não autoriza Go-Live**. Cria a **estrutura documental e operacional** para a decisão final de liberação da versão Enterprise IMPETUS On-Premise, a ser utilizada **somente após**:

| Pré-requisito execução | Estado actual |
|-------------------------|---------------|
| STAGING-01 APROVADA | ⏳ Pendente |
| ROLLBACK-01 APROVADA (re-exec) | ⏳ Pendente |
| VALIDATION-01 HOMOLOGADA (re-exec) | ⏳ Pendente |
| ENV-QUALIFICATION APROVADA (staging) | ⏳ Pendente |

---

## Pré-requisitos documentais (produto)

| Certificação | Status |
|--------------|:------:|
| FORENSICS-01 | ✅ |
| ARCHITECTURE-01 | ✅ |
| INFRA-01 | ✅ |
| DATA-01 | ✅ |
| LICENSE-01 | ✅ |
| CONTAINER-01 | ✅ |
| BACKUP-01 | ✅ |
| PROVISIONING-01 | ✅ |
| ENV-QUALIFICATION-01 | ⚠️ spec + exec parcial |
| STAGING-01 | ⏳ |
| ROLLBACK-01 | ⚠️ re-exec pendente |
| VALIDATION-01 | ⏳ re-exec pendente |

---

## Ciclo Enterprise — 4 fases finais

| Fase | Tipo | Objetivo | Estado |
|------|------|----------|--------|
| **1. STAGING-01** (execução) | Operacional | VM homologação conforme PROVISIONING-01 | ⏳ |
| **2. ROLLBACK-01** (re-exec) | Homologação | Backup → restore → sistema operacional | ⏳ |
| **3. VALIDATION-01** (re-exec) | Homologação | Homologação completa; fechar NCs | ⏳ |
| **4. GOLIVE-01** (liberação) | Liberação | Autorização formal de distribuição | ⏳ **estrutura pronta** |

> **Regra:** novas certificações técnicas só se a homologação encontrar **defeito real no produto**.

---

## Sequência completa (visão final)

```
FORENSICS ✅ → ARCHITECTURE ✅ → INFRA ✅ → DATA ✅ → LICENSE ✅
→ CONTAINER ✅ → BACKUP ✅ → ENV-QUALIFICATION → PROVISIONING ✅
→ STAGING (exec) → ROLLBACK (re-exec) → VALIDATION (re-exec)
→ GOLIVE (autorização) ← estrutura preparada, decisão pendente
```

Após GOLIVE autorizado, evoluções = **nova versão** (Enterprise v2 ou nova rodada de certificações).

---

## PARTE 1 — Critérios oficiais de Go-Live

### 1.1 Certificações de homologação (obrigatórias)

| Critério | Evidência |
|----------|-----------|
| STAGING-01 **APROVADA** | `evidence/staging-01/STAGING-01-SUMMARY.json` |
| ENV-QUALIFICATION **APROVADA** | `evidence/environment-qualification-01/` |
| ROLLBACK-01 **APROVADA** | `evidence/rollback-01/ROLLBACK-01-SUMMARY.json` |
| VALIDATION-01 **HOMOLOGADA** | `evidence/validation-01/homologation-full-*.json` |

### 1.2 Infraestrutura e persistência

| Critério | Referência |
|----------|------------|
| `IMPETUS_HOME=/opt/impetus` íntegro | INFRA-01 · STAGING-01 |
| User dedicado `impetus` (não root) | INFRA-01 |
| ≥ 20 GB disco livre | ENV-QUALIFICATION |
| Backup testado (manifest SHA-256) | BACKUP-01 |
| Restore testado end-to-end | ROLLBACK-01 |
| Docker validado (sem alterar compose) | CONTAINER-01 · VALIDATION Parte 3–4 |
| PM2 validado | VALIDATION Parte 2 |

### 1.3 Produto e cognitivo

| Critério | Referência |
|----------|------------|
| Licença offline validada | LICENSE-01 |
| Event Backbone operacional | VALIDATION Parte 9 |
| Controller Cognitivo sem regressão | VALIDATION Parte 9 |
| Pulse operacional | VALIDATION Parte 9 |
| Conversation Context Engine íntegro | VALIDATION Parte 9 |
| RBAC / JWT / CompanyId íntegros | VALIDATION Parte 10 |

### 1.4 Não conformidades

| Critério | Regra |
|----------|-------|
| Zero NC **Crítica** aberta | Bloqueante |
| Zero NC **Alta** aberta | Bloqueante (ou aceite formal documentado) |
| NC Média/Baixa | Aceite formal por área responsável |

---

## PARTE 2 — Checklist executivo

Ver `CHECKLIST-GOLIVE.md` — campos: requisito, responsável, data, evidência, aprovado/reprovado.

---

## PARTE 3 — Matriz consolidada de NCs

Ver `GO-LIVE-DECISION-RECORD.md` § Matriz NC + snapshot inicial em `evidence/golive-01/NC-MATRIX-SNAPSHOT.json`.

**NCs abertas conhecidas (2026-07-01):** 8 Alta · 2 Média · 1 Baixa (VALIDATION-01) + NCs infra (ROLLBACK/ENV/STAGING em host produção — não bloqueiam após VM staging).

---

## PARTE 4 — Aprovação formal multi-área

Ver `GO-LIVE-DECISION-RECORD.md` — campos para:

| Área | Pode |
|------|------|
| Arquitetura | Aprovar / Reprovar |
| Infraestrutura | Aprovar / Reprovar |
| Desenvolvimento | Aprovar / Reprovar |
| Operações | Aprovar / Reprovar |
| Segurança | Aprovar / Reprovar |
| Produto | Aprovar / Reprovar |

**Go-Live só autorizado com 6/6 aprovações + VALIDATION HOMOLOGADA.**

---

## PARTE 5 — Evidências

Estrutura: `backend/docs/evidence/golive-01/`

| Subpasta / ficheiro | Conteúdo |
|---------------------|----------|
| `decision-record-{date}.json` | Registro decisão assinado |
| `checklist-golive-{date}.json` | Checklist preenchido |
| `nc-matrix-{date}.json` | NCs consolidadas |
| `attachments/` | Screenshots, logs exportados |
| Referências cruzadas | `staging-01/`, `rollback-01/`, `validation-01/` |

---

## PARTE 6 — Artefactos entregues

| Documento | Path |
|-----------|------|
| Certificação | `CERT-ENTERPRISE-GOLIVE-01.md` |
| Manual | `enterprise/MANUAL-GOLIVE-ENTERPRISE.md` |
| Checklist | `enterprise/CHECKLIST-GOLIVE.md` |
| Decision Record | `enterprise/GO-LIVE-DECISION-RECORD.md` |
| Manual legado | `enterprise/MANUAL-GO-LIVE.md` (redireciona) |

---

## Critérios de aceite desta preparação

| Critério | Atendido |
|----------|:--------:|
| Nenhum código alterado | ✅ |
| Nenhum script alterado | ✅ |
| Nenhuma configuração alterada | ✅ |
| Critérios Go-Live definidos | ✅ |
| Checklist executivo | ✅ |
| Matriz NC consolidada | ✅ |
| Aprovação multi-área | ✅ |
| Compatível com certificações anteriores | ✅ |
| Go-Live autorizado | ❌ (prematuro) |

**CERT-ENTERPRISE-GOLIVE-01: PREPARADA** — aguarda STAGING + ROLLBACK + VALIDATION

---

## Pendências remanescentes

1. Provisionar e aprovar VM staging  
2. Re-executar ROLLBACK-01  
3. Re-executar VALIDATION-01 completa  
4. Preencher `GO-LIVE-DECISION-RECORD.md`  
5. Obter 6 aprovações formais  
6. Emitir decisão **AUTORIZADO** ou **PROIBIDO**

---

## Referências

- `CERT-ONPREM-VALIDATION-01.md`
- `CERT-ENTERPRISE-PROVISIONING-01.md`
- `MANUAL-HOMOLOGACAO.md`
