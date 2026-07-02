# GO-LIVE DECISION RECORD — IMPETUS Enterprise On-Premise

**Certificação:** CERT-ENTERPRISE-GOLIVE-01  
**Versão:** 1.0  
**Estado:** **RASCUNHO** — decisão pendente

---

## 1. Identificação

| Campo | Valor |
|-------|-------|
| **Versão Enterprise** | [___] (tag/git) |
| **Data decisão** | [___] |
| **Ambiente homologação** | [___] (hostname staging) |
| **Cliente / piloto** | [___] |
| **Modo distribuição** | [ ] PM2 Enterprise  [ ] Docker Enterprise  [ ] Ambos |

---

## 2. Decisão final

| Resultado | Marcar |
|-----------|--------|
| **AUTORIZADO** — distribuição Enterprise permitida | [ ] |
| **PROIBIDO** — distribuição bloqueada | [x] *(estado actual 2026-07-01)* |
| **AUTORIZADO COM RESSALVAS** — ver §5 | [ ] |

### Declaração (preencher se AUTORIZADO)

> A versão Enterprise IMPETUS On-Premise **[VERSÃO]** está **autorizada para distribuição a clientes** a partir de **[DATA]**, conforme homologação **CERT-ONPREM-VALIDATION-01** e estrutura **CERT-ENTERPRISE-GOLIVE-01**.

### Declaração (estado actual)

> **Go-Live PROIBIDO** até conclusão de STAGING-01, ROLLBACK-01 (re-exec) e VALIDATION-01 (re-exec) em ambiente conforme.

---

## 3. Aprovação formal multi-área (Parte 4)

| Área | Responsável | Data | Decisão | Assinatura / ID |
|------|-------------|------|---------|-----------------|
| **Arquitetura** | [___] | [___] | [ ] Aprova  [ ] Reprova | [___] |
| **Infraestrutura** | [___] | [___] | [ ] Aprova  [ ] Reprova | [___] |
| **Desenvolvimento** | [___] | [___] | [ ] Aprova  [ ] Reprova | [___] |
| **Operações** | [___] | [___] | [ ] Aprova  [ ] Reprova | [___] |
| **Segurança** | [___] | [___] | [ ] Aprova  [ ] Reprova | [___] |
| **Produto** | [___] | [___] | [ ] Aprova  [ ] Reprova | [___] |

**Regra:** 6/6 **Aprova** + VALIDATION HOMOLOGADA → elegível para AUTORIZADO.

---

## 4. Matriz consolidada de NCs (Parte 3)

Atualizar antes da decisão final. Snapshot inicial: `evidence/golive-01/NC-MATRIX-SNAPSHOT.json`.

| ID | Sev. | Certificação origem | Descrição | Status | Responsável | Decisão |
|----|------|---------------------|-----------|--------|-------------|---------|
| NC-V001 | Média | VALIDATION-01 | IMPETUS_ADMIN_JWT_SECRET ausente | Aberta | [___] | [___] |
| NC-V002 | Alta | VALIDATION-01 | Docker engine indisponível (host antigo) | Aberta* | [___] | Re-exec staging |
| NC-V003 | Alta | VALIDATION-01 | PM2 limpo VM não executado | Aberta* | [___] | Re-exec staging |
| NC-V004 | Alta | VALIDATION-01 | Docker limpo não executado | Aberta* | [___] | Re-exec staging |
| NC-V005 | Alta | VALIDATION-01 | Equivalência PM2×Docker | Aberta* | [___] | Re-exec staging |
| NC-V006 | Alta | BACKUP-01 | Backup manifest >2GB | **Encerrada** | — | BACKUP-01 ✅ |
| NC-V007 | Alta | VALIDATION-01 | 509 restarts PM2 (host prod) | Aberta* | [___] | N/A em staging |
| NC-V008 | Média | VALIDATION-01 | Layout legacy vs IMPETUS_HOME | Aberta* | [___] | STAGING resolve |
| NC-V009 | Baixa | VALIDATION-01 | ANAM não configurado | Aberta | [___] | Opcional |
| NC-V010 | Alta | VALIDATION-01 | Update A→B não simulado | Aberta* | [___] | Re-exec |
| NC-V011 | Alta | ROLLBACK-01 | Rollback não comprovado | Aberta* | [___] | Re-exec staging |
| NC-V012 | Alta | VALIDATION-01 | Regressão cognitiva E2E | Aberta* | [___] | Re-exec |
| NC-R001 | Alta | ROLLBACK-01 | pg_restore disco cheio | Infra host prod | — | VM staging |
| NC-R002 | Alta | ROLLBACK-01 | Extract tar disco cheio | Infra host prod | — | VM staging |
| NC-EQ001–003 | Alta | ENV-QUALIFICATION | Disco/Docker/DR host prod | Infra host prod | — | VM staging |
| NC-ST* | Alta | STAGING-01 | Host produção ≠ staging | Infra host prod | — | VM staging |

\* *Esperado encerrar na re-execução VALIDATION em VM staging conforme.*

### Resumo NCs (preencher na decisão)

| Severidade | Abertas | Encerradas | Aceites formais |
|------------|---------|------------|-----------------|
| Crítica | [___] | [___] | [___] |
| Alta | [___] | [___] | [___] |
| Média | [___] | [___] | [___] |
| Baixa | [___] | [___] | [___] |

---

## 5. Ressalvas (se AUTORIZADO COM RESSALVAS)

| ID NC | Ressalva | Prazo mitigação | Aceite cliente |
|-------|----------|-----------------|----------------|
| [___] | [___] | [___] | [ ] Sim |

---

## 6. Evidências anexadas (Parte 5)

| Evidência | Path | Hash / ref |
|-----------|------|------------|
| Homologação completa | `evidence/validation-01/homologation-full-*.json` | [___] |
| Rollback DR | `evidence/rollback-01/` | [___] |
| Staging | `evidence/staging-01/` | [___] |
| Env qualification | `evidence/environment-qualification-01/` | [___] |
| Checklist Go-Live | `evidence/golive-01/checklist-golive-*.json` | [___] |
| Screenshots / logs | `evidence/golive-01/attachments/` | [___] |

---

## 7. Critérios Go-Live — resumo

Ver `CERT-ENTERPRISE-GOLIVE-01.md` Parte 1 e `CHECKLIST-GOLIVE.md`.

| Bloco | Todos aprovados? |
|-------|:----------------:|
| A. Homologação | [ ] |
| B. Infraestrutura | [ ] |
| C. Persistência / DR | [ ] |
| D. Licenciamento / segurança | [ ] |
| E. Cognitivo | [ ] |
| F. Entrega cliente | [ ] |

---

## 8. Registo de alterações

| Data | Versão doc | Alteração | Autor |
|------|------------|-----------|-------|
| 2026-07-01 | 1.0 | Estrutura GOLIVE-01 criada; Go-Live PROIBIDO | IMPETUS |

---

**Arquivar cópia assinada em:** `backend/docs/evidence/golive-01/decision-record-{YYYY-MM-DD}.json`
