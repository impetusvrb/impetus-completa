# SEC-11 — Approval Engine

## Tipos

| Tipo | Quando | Aprovações |
|------|--------|------------|
| **single** | DEFENSE, ELEVATED | 1 operador |
| **dual** | PROTECTED, LOCKDOWN | 2 operadores |
| **emergency** | Incidente crítico | 1 + registo emergency |

---

## Registo

Cada aprovação regista:

- `approver` — quem aprovou
- `at` — timestamp
- `reason` — justificação
- `rollback` — plano associado

---

## Execução

`canExecutePlan()` → `true` apenas com aprovação completa.

**SEC-11 não executa** mesmo com aprovação — SEC-12 aplicará medidas.

---

## Flag

`SECURITY_PROTECTION_REQUIRE_APPROVAL=true` (default)
