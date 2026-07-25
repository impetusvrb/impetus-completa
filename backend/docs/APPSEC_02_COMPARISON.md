# APPSEC-02 — Comparação Antes / Depois

**Baseline:** Red Team 2026-07-04  
**Pós-mitigação:** APPSEC-01 + APPSEC-02 validation

---

## Legenda de estados

| Estado | Significado |
|--------|-------------|
| FIXED | Mitigação APPSEC-01 confirmada por cenários |
| PARTIALLY_FIXED | Mecanismo implementado; acção operacional pendente |
| NOT_FIXED | Vulnerabilidade ainda explorável |
| REGRESSION | APPSEC-01 revertido ou degradado |
| NOT_APPLICABLE | Fora de escopo APPSEC-01 |

---

## Tabela comparativa

| ID | Antes (04/07) | Depois (APPSEC-02) | Mecanismo APPSEC-01 |
|----|---------------|---------------------|---------------------|
| RT-01 | EXPLOITABLE | **FIXED** | crossTenantAccessValidator |
| RT-02 | EXPLOITABLE | **FIXED** | ssrfProtectionEngine + safeFetch |
| RT-03 | EXPLOITABLE | **FIXED** | safeAxiosRequest |
| RT-04 | EXPLOITABLE | **FIXED** | impetusUploadMiddleware + magic bytes |
| RT-05 | EXPLOITABLE | **FIXED** | publicEndpointPolicy |
| RT-06 | EXPLOITABLE | **FIXED** | uploadAclPolicy |
| RT-07 | EXPLOITABLE | **PARTIALLY_FIXED** | secretManagement (ops: remover backups) |
| RT-08 | EXPLOITABLE | **PARTIALLY_FIXED** | runtimeConfigurationValidator (ops: .env) |
| RT-09 | EXPLOITABLE | **PARTIALLY_FIXED** | dependencyGovernance |
| RT-10 | RESIDUAL | N/A | Roadmap HttpOnly |
| RT-11 | EXPLOITABLE | WARN | UUIDs piloto ainda expostos (P3) |
| RT-12 | EXPLOITABLE | PASS/WARN | health/deep reduzido |
| RT-13 | RESIDUAL | N/A | RLS expandir além piloto |
| RT-14 | EXPLOITABLE | **FIXED** | uploadPolicy octet-stream |
| RT-15 | EXPLOITABLE | **PARTIALLY_FIXED** | boot fail + fallback legacy |
| RT-16 | RESIDUAL | N/A | routeSecurityAudit |

---

## Controles que impediram exploração (re-test)

- SQL Injection login → 401 (parametrizado)
- JWT alg:none → rejeitado
- Dashboard/admin sem token → 401
- SSRF localhost/RFC1918 → SSRF_URL_DENIED / SSRF_DNS_DENIED
- Upload .exe octet-stream → rejeitado
- Account lockout → 429 após 5 tentativas

---

## Evidência automática

`backend/docs/evidence/appsec-02/validation-latest.json`
