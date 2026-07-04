# ECO-06 — Conversation Context & Knowledge Base Consumer

**Programa:** Cognitive Ecosystem Convergence  
**Fase:** 6 — Conversation Context KB Consumer  
**Data:** 2026-07-02  
**Base:** ADR-ECO-004  
**Tipo:** Certificação de implementação controlada

---

## Decisão global

**CERTIFICADO COM RESSALVAS**

| Componente | Decisão |
|------------|---------|
| Conversation Context Engine (institucional) | **CONSUMER READY COM RESSALVAS** |
| Perfil conversacional efémero | **Permanece próprio** |

**Ressalva:** `ECO_CONTEXT_VIA_EG=false` — shadow mode. CCE continua classificando perfil; KB consultada em paralelo sem alterar prompt ao utilizador.

---

## Objectivo

Convergir o CCE para consumir a Knowledge Base do Event Governance como fonte oficial de contexto institucional.

```text
Antes:  CCE → classifica → prompt (sem KB institucional)
Depois: CCE → classifica → KB Consumer → prompt enriquecido (flag ON)
```

O CCE **não duplica** registos KB; utiliza apenas referências certificadas (`refId`).

---

## Pré-requisitos

| Marco | Estado |
|-------|--------|
| EG-20 | ✅ |
| ECO-03 | ✅ |
| ECO-04 | ✅ |
| ECO-05 | ✅ |

---

## Implementação

| Artefacto | Path |
|-----------|------|
| Knowledge Consumer Adapter | `governanceAdapters/conversationKnowledgeConsumerAdapter.js` |
| Feature flags | `ecoContextFlags.js` |
| Integração | `conversationContext/conversationContextEngine.js` → `resolveConversationContext` |
| Inventário | [`ECO_06_CONTEXT_INVENTORY.md`](./ECO_06_CONTEXT_INVENTORY.md) |

---

## Modos

| Flag | Comportamento |
|------|---------------|
| `ECO_CONTEXT_VIA_EG=false` | Shadow — CCE actual + KB query + compare divergências |
| `ECO_CONTEXT_VIA_EG=true` | Consumer — refs KB em `institutional_knowledge`; prompt enriquecido |

Contexto conversacional efémero (perfil, tom, apresentação) **sempre** no CCE.

---

## Infraestrutura preservada

Event Governance, Learning, Memory, Explainability, Intelligence, Executive Insights, Controller, Pulse, Event Backbone — **sem alterações**.

APIs públicas e DTOs — **sem alterações**.

---

## NCs

| NC | Estado |
|----|--------|
| NC-ECO-06-001 | Aberta — activação consumer em staging |

---

## Certificação

```bash
cd backend
node src/tests/audit/ECO_06_CONTEXT_CONSUMER.test.js
```

---

## Próximo passo

**ECO-07** — Executive dashboards consumer (ADR-ECO-003).

**Não activar flags** até critérios shadow staging (≥85% match onde aplicável, 7d estável).
