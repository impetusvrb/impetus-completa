# SEC-13 — Enterprise Controlled Protection Execution

**Módulo:** `backend/src/securityControlledExecution/`  
**Flags:** `SECURITY_CONTROLLED_EXECUTION=false` · `SECURITY_AUTO_EXECUTION_LEVEL=LOW` · `SECURITY_MANUAL_APPROVAL_REQUIRED=true`

---

## Objectivo

Primeira execução controlada — **apenas acções AUTO_EXECUTABLE de baixo risco**, consumindo planos SEC-11 validados SEC-12.

```
SEC-11 → SEC-12 → SEC-13 (LOW auto) → SEC-14+ (futuro)
```

---

## AUTO_EXECUTABLE (esta fase)

- Aumentar log security · snapshot SEC · evidências ampliadas
- Refresh SEC-02 · verificação SEC-04 · relatório consolidado
- Incidente interno SEC-13 (journal only)

## MANUAL_ONLY (bloqueado)

nginx · PM2 · firewall · SSH · IP block · rate limit · lockdown · EG · ECO · Cognitive Core

---

## Endpoint

```
GET /api/audit/security-controlled-execution
```

---

## Teste

```bash
node backend/src/tests/securityControlledExecution/SEC_13_CONTROLLED_EXECUTION.test.js
```
