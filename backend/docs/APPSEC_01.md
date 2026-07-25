# APPSEC-01 — Enterprise Application Security Hardening

**Programa:** APPSEC-01  
**Data:** 2026-07-04  
**Relacionado:** Red Team 04/07/2026 · SEC-01→SEC-21C (inalterado)

---

## Objetivo

Criar uma **camada permanente de segurança da aplicação** (OWASP Top 10 / lógica de negócio) **desacoplada** da cadeia Enterprise Security (SEC-01→SEC-21C).

Não substitui SEC — complementa com controlos de aplicação reutilizáveis.

---

## Componentes

| # | Componente | Ficheiro |
|---|------------|----------|
| 1 | Cross-Tenant Access Validator | `src/securityApplication/crossTenantAccessValidator.js` |
| 2 | SSRF Protection Engine | `src/securityApplication/ssrfProtectionEngine.js` |
| 3 | Public Endpoint Policy | `src/securityApplication/publicEndpointPolicy.js` |
| 4 | Secret Management | `src/securityApplication/secretManagement.js` |
| 5 | Runtime Configuration Validator | `src/securityApplication/runtimeConfigurationValidator.js` |
| 6 | Upload Security (magic bytes) | `src/securityApplication/uploadSecurity.js` |
| 7 | Upload ACL (deny-by-default) | `src/securityApplication/uploadAclPolicy.js` |
| 8 | Dependency Governance | `src/securityApplication/dependencyGovernance.js` |
| 9 | Route Security Audit | `src/securityApplication/routeSecurityAudit.js` |
| 10 | OWASP Compliance | `src/securityApplication/owaspCompliance.js` |

**Boot:** `server.js` invoca `validateAppsecBootOrThrow()` após `configValidator`.

**Auditoria:** `GET /api/audit/appsec-01` (admin tenant, read-only).

**Testes:** `node backend/src/tests/securityApplication/APPSEC_01.test.js`

---

## Remediação Red Team (P0/P1)

| ID | Finding | Mitigação |
|----|---------|-----------|
| RT-01 | IDOR Chat cross-tenant | `crossTenantAccessValidator` em `chatService.js` |
| RT-02/03 | SSRF Time Clock / PLC | `ssrfProtectionEngine` |
| RT-04 | Uploads legados | `impetusUploadMiddleware` + magic bytes |
| RT-05 | boot-metrics / aioi públicos | `publicEndpointPolicy` |
| RT-06 | ACL uploads | `uploadAclPolicy` deny-by-default |
| RT-07 | Segredos / backups .env | `secretManagement` (boot fail prod) |
| RT-08 | Config insegura | `runtimeConfigurationValidator` |

---

## Flags de ambiente

| Variável | Default | Descrição |
|----------|---------|-----------|
| `IMPETUS_APPSEC_ENABLED` | `true` | Master switch |
| `IMPETUS_APPSEC_CROSS_TENANT` | `true` | Validador cross-tenant |
| `IMPETUS_APPSEC_SSRF` | `true` | Motor SSRF |
| `IMPETUS_APPSEC_PUBLIC_ENDPOINTS` | `true` | Política endpoints públicos |
| `IMPETUS_APPSEC_SECRET_MGMT` | `true` | Gestão de segredos |
| `IMPETUS_APPSEC_RUNTIME_CONFIG` | `true` | Validador runtime |
| `IMPETUS_APPSEC_UPLOAD_STRICT` | `true` | Magic bytes + MIME strict |

---

## Restrições respeitadas

- SEC-01→SEC-21C: **não alterado**
- Event Governance, Cognitive Core, ECO: **não alterados**
- Implementação **aditiva**, auditável, reversível (flags)

---

## Pré-requisitos antes de reiniciar PM2 em produção

1. Remover backups `.env.*` do filesystem (ou mover para vault)
2. Definir `TIME_CLOCK_ENC_KEY` / `ENCRYPTION_KEY` seguros
3. `LICENSE_VALIDATION_ENABLED=true`
4. `ADMIN_PORTAL_DEBUG_INVITE_LINK=false`
5. `IMPETUS_ADMIN_JWT_SECRET` presente

Ver `APPSEC_01_SECRET_MANAGEMENT.md`.

---

## Próximo passo

Re-executar o **mesmo roteiro Red Team** após deploy. P0/P1 devem desaparecer.
