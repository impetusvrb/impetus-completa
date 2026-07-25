# FIN-PLAN-001 — Backlog Estratégico

Capacidades **greenfield** fora do caminho crítico dos releases 2.0–2.3.

| ID CONCEPT | Nome | Motivo do adiamento |
|------------|------|---------------------|
| `capex_opex_investment` | Gestão de investimentos (CAPEX/OPEX) | Ausente na plataforma; risco ERP; ARCH-PLAN Fase C |
| `managerial_consolidation` | Consolidação gerencial | Ausente; ERP-class; multi-planta |

## Gate para reabertura

Só após:

1. Validação em produção dos releases **2.0 → 2.3**  
2. Evidência de gap real (não desejo de feature)  
3. Decisão explícita alinhada a `finance_native` scoped (ARCH-PLAN)  

## Reutilização vestigial (não suficiente)

- Supply `ApprovalPolicyService` (limite CAPEX)  
- `BudgetReference` (procurement)  

## Princípio

> Backlog estratégico ≠ próximo sprint. É memória de decisão para não reinventar o roadmap corporativo (ARCH-PLAN-001).
