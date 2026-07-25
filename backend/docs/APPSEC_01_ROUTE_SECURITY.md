# APPSEC-01 — Route Security

## Auditoria automática

```javascript
const { generateRouteSecurityReport } = require('./securityApplication');
const report = generateRouteSecurityReport();
```

## Padrão canónico

```javascript
useRoute('/api/example', './routes/example', requireAuth);
// → tenantIsolationGuard + tenantRls injectados automaticamente
```

## Rotas públicas (whitelist)

- `/api/auth/*`, `/api/companies` (POST onboarding)
- `/api/webhooks/*`, `/api/federation/*` (SSO)
- Health mínimo via `publicEndpointPolicy`

## Auth alternativa (não requireAuth)

- Webhooks: HMAC / segredo
- SCIM: Bearer SCIM
- MES/ERP push: X-Integration-Token
- Edge ingest: token_hash

## Endpoint de evidência

`GET /api/audit/appsec-01` — inclui `routes.potentially_exposed_mounts`

## Regra para novos módulos

1. `requireAuth` no mount **ou** `router.use(requireAuth)`  
2. Cross-tenant: `crossTenantAccessValidator` para IDs de utilizador  
3. Uploads: `impetusUploadMiddleware` exclusivamente  
4. HTTP externo: `ssrfProtectionEngine`  
