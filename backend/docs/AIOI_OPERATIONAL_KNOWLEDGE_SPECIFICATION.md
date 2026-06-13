# AIOI — Operational Knowledge Specification

**Camada:** P7.1 — Operational Knowledge Service  
**Serviço:** `backend/src/services/aioi/aioiOperationalKnowledgeService.js`  

---

## 1. Propósito

Consolidar conhecimento operacional corporativo a partir de dados reais — eventos, outcomes, padrões SLA e riscos recorrentes. **READ ONLY.**

---

## 2. Entregáveis

| Output | Descrição |
|--------|-----------|
| `operational_knowledge` | Contexto pipeline e throughput |
| `recurring_events` | Eventos agrupados por category/source_type |
| `outcome_catalog` | Outcomes por tipo |
| `sla_patterns` | Padrões por priority_band/breach_state |
| `recurring_risks` | Riscos recorrentes do risk register |

---

## 3. Token

**OPERATIONAL_KNOWLEDGE_CERTIFIED**
