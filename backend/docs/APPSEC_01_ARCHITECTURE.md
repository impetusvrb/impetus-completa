# APPSEC-01 — Arquitetura

## Camada no stack IMPETUS

```
┌─────────────────────────────────────────────────────────┐
│  Frontend (React)                                       │
└───────────────────────────┬─────────────────────────────┘
                            │ HTTPS / Bearer
┌───────────────────────────▼─────────────────────────────┐
│  Express API                                            │
│  ┌──────────────── SEC-01→SEC-21C (inalterado) ────────┐│
│  │ Observatory · Correlation · SOC · Go-Live …        ││
│  └────────────────────────────────────────────────────┘│
│  ┌──────────────── APPSEC-01 (novo) ──────────────────┐│
│  │ crossTenant · SSRF · publicEndpoint · secrets      ││
│  │ uploadSecurity · uploadAcl · runtimeConfig         ││
│  └────────────────────────────────────────────────────┘│
│  tenantIsolationGuard · requireAuth · RBAC (existente) │
└───────────────────────────┬─────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────┐
│  PostgreSQL (+ RLS pilot)                               │
└─────────────────────────────────────────────────────────┘
```

## Fluxo Cross-Tenant

1. Handler recebe `user_id` / `participantIds` do cliente  
2. **Obrigatório:** `crossTenantAccessValidator.assertUserBelongsToTenant`  
3. Só então INSERT/UPDATE  

## Fluxo SSRF

1. Integração grava URL (admin)  
2. Antes de `fetch`/`axios`: `ssrfProtectionEngine.assertSafeOutboundUrl`  
3. DNS resolve → bloqueia RFC1918/link-local  
4. Apenas HTTPS, sem redirects  

## Fluxo Upload

1. `impetusUploadMiddleware` — MIME + ext whitelist  
2. `postUploadMagicValidator` — magic bytes  
3. Servir ficheiro: `uploadAclPolicy` deny-by-default  

## Boot sequence

```
loadEnv → configValidator → validateAppsecBootOrThrow → server listen
```

## Desacoplamento

- Módulo único: `backend/src/securityApplication/`
- Sem imports de Event Governance / Cognitive Core / ECO
- Consumido por serviços de aplicação (chat, timeClock, plc, uploads)
