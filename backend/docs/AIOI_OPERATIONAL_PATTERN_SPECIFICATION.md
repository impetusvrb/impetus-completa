# AIOI — Operational Pattern Specification

**Camada:** P7.3 — Operational Pattern Analytics  
**Serviço:** `backend/src/services/aioi/aioiOperationalPatternService.js`  

---

## 1. Propósito

Identificar padrões operacionais por **agregação estatística** — sem inferência, sem previsão.

---

## 2. Padrões

| Padrão | Método |
|--------|--------|
| `event_recurrence` | COUNT por category/source_type |
| `outcome_recurrence` | COUNT por outcome_type |
| `risk_recurrence` | Snapshot risk register |
| `sla_recurrence` | COUNT por priority_band/breach_state |
| `capacity_recurrence` | Saturação por tenant |

---

## 3. Proibições

- Sem inferência
- Sem previsão
- Sem LLM
- Sem auto-learning

---

## 4. Token

**PATTERN_ANALYTICS_CERTIFIED**
