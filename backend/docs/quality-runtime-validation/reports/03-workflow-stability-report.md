# Workflow Stability Report

**Timestamp:** 2026-05-17T02:30:36.416Z

- Definição **ncr_universal**: OK
- Definição **capa_universal**: OK
- Definição **pdca_universal**: OK
- Definição **approval_universal**: OK
- Definição **escalation_universal**: OK
- Transações: transição usa `SELECT … FOR UPDATE` (anti corrida).
- Shadow: payloads de evento incluem `shadow_mode` via publisher.