# SEC-11 — Enterprise Adaptive Protection (Fase 2)

**Módulo:** `backend/src/securityAdaptiveProtection/`  
**Flags:** `SECURITY_ADAPTIVE_PROTECTION=false` · `SECURITY_PROTECTION_MODE=observe` · `SECURITY_PROTECTION_REQUIRE_APPROVAL=true`

---

## Missão

Transformar inteligência SEC-01→10 em **planos de autoproteção controlada** — reduzir superfície de ataque durante incidentes **sem interromper operação**.

**Nenhuma acção automática.** Tudo como `recommended_plan`.

---

## Cadeia

```
SEC-01→10 (consume) → SEC-11 Protection Plan → Aprovação humana → SEC-12 (futuro execução)
```

---

## Endpoint

```
GET /api/audit/security-adaptive-protection
```

---

## Teste

```bash
node backend/src/tests/securityAdaptiveProtection/SEC_11_ADAPTIVE_PROTECTION.test.js
```

---

*Preserva baseline SEC-08 e módulos SEC-01→10 intactos.*
