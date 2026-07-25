# APPSEC-02A — Dependency Upgrade Plan

**Componente:** `dependencyUpgradePlanner.js`

---

## Objetivo

Inventariar dependências vulneráveis (npm audit), calcular risco/compatibility/breaking changes e gerar **plano oficial de atualização** — **sem executar upgrade automaticamente**.

---

## Pacotes prioritários

| Pacote | Prioridade | Breaking risk |
|--------|------------|---------------|
| axios | P0 | low |
| ws | P0 | medium |
| xlsx | P1 | high |
| form-data | P1 | low |
| nodemailer | P2 | medium |
| protobufjs | P2 | medium |
| fast-uri | P2 | low |
| @grpc/grpc-js | P2 | medium |

---

## Por pacote

- **risco** — score derivado de severidade npm audit
- **compatibilidade** — `test required` se fix disponível
- **breaking_changes** — estimativa documentada
- **rollback** — `package-lock.json + npm ci`
- **prioridade** — P0→P2
- **action** — comando sugerido pós-staging

---

## Regressão obrigatória

Após qualquer upgrade:

```bash
node backend/src/tests/securityApplication/APPSEC_01.test.js
node backend/src/tests/securityApplicationValidation/APPSEC_02.test.js
node backend/src/tests/securityOperationalReadiness/APPSEC_02A.test.js
```

---

## Relatório JSON

`docs/evidence/appsec-02a/dependency-plan.json`

Campos: `backend.plans`, `frontend.plans`, `vulnerable_count`, `upgrade_priority_order`, `plan_complete: true`

---

## RT-09

Finding RT-09 (npm audit High) permanece **PARTIALLY_FIXED** até execução do plano em staging/produção. O plano documentado satisfaz o critério de aceitação APPSEC-02A.
