# ECO-08 — NC Matrix

**Data:** 2026-07-03 · Revisão final programa ECO

---

## NCs encerradas (produto / arquitectura)

| NC | Descrição | Fase fecho | Categoria |
|----|-----------|------------|-----------|
| NC-INT-004 | Bypass chat operacional | ECO-03 | **Produto** — adapter; flag pendente |
| NC-ECO-P0-002 | Chat coordinator bypass | ECO-03 | **Arquitectura** |
| NC-ECO-P0-003 | Org AI escalation bypass | ECO-03 | **Arquitectura** |
| NC-INT-005 | Políticas órfãs CHAT/NC | ECO-03 | **Arquitectura** |
| NC-INT-001 | Controller sem EG | ECO-04 | **Produto** — adapter; flag pendente |
| NC-INT-006 | Pulse governança paralela | ECO-05 | **Produto** — adapter; flag pendente |
| NC-INT-003 | Frontend sem audit EG UI | ECO-07 | **Produto** — backend adapter |

---

## NCs abertas — activação staging

| NC | Descrição | Categoria | Acção |
|----|-----------|-----------|-------|
| NC-ECO-03-001 | Activar flags ECO-03 em staging | **Staging** | Sequência OAE → Chat → OrgAI |
| NC-ECO-04-001 | Activar `ECO_CONTROLLER_VIA_EG` | **Staging** | Após ECO-03 ≥85% |
| NC-ECO-05-001 | Activar `ECO_PULSE_VIA_EG` | **Staging** | Após ECO-04 ≥85% |
| NC-ECO-06-001 | Activar `ECO_CONTEXT_VIA_EG` | **Staging** | Após critérios shadow |
| NC-ECO-07-001 | Activar `ECO_EXECUTIVE_VIA_EG` | **Staging** | Após critérios shadow |

---

## NCs abertas — operação / produção

| NC | Descrição | Categoria | Severidade |
|----|-----------|-----------|------------|
| NC-INT-002 | Event Backbone sem subscriber EG | **Arquitectura** | P3 — ECO-08 aceite |
| NC-INT-007 | Shadow domínios PROMOTION | **Operação** | Parcial — Grupo A ON |
| NC-ECO-P1-002 | Legacy catch fallbacks domínios | **Operação** | Aceite com flags OFF |
| NC-ECO-P3-003 | Schedulers/admin bypass | **Operação** | Backlog pós-ECO |

---

## NCs aceites (baseline ECO-08)

| NC | Racional |
|----|----------|
| Flags OFF em produção | Shadow observacional deliberado |
| AIOI cockpit paralelo | Domínio read-model separado |
| Cognitive Pulse métricas locais | Operacional, não institucional EG |
| ECO-01 audit drift | Bypass tests superseded por ECO-03 |

---

## Matriz por categoria

| Categoria | Encerradas | Abertas | Aceites |
|-----------|------------|---------|---------|
| Produto | 4 | 0 | 1 |
| Arquitectura | 3 | 1 | 2 |
| Staging | 0 | 5 | 0 |
| Produção | 0 | 0 | 1 |
| Operação | 0 | 2 | 1 |

---

## Critério fecho global

Programa ECO considerado **certificado com ressalvas** enquanto NCs de staging (activação flags) permanecem abertas. Não bloqueiam baseline arquitectural ECO-08.
