# Enterprise Federation — Relatório PROMPT 16

**Data:** 2026-05-27  
**Escopo:** SSO OIDC · SAML 2.0 · SCIM 2.0 · governança · piloto  
**Estado inicial:** `IMPETUS_FEDERATION_MODE=audit` (login password preservado; federação traça sem emitir sessão até `on`)

---

## 1. Objetivo

Habilitar adoção enterprise (RFP >500 utilizadores) com federação de identidade **additive-only**, sem remover login por senha, preservando RBAC, hierarquia e isolamento por tenant.

---

## 2. Componentes implementados

| Camada | Path |
|--------|------|
| Flags | `src/federation/config/federationFlags.js` |
| Governança | `src/federation/governance/federationGovernanceService.js` |
| OIDC | `src/federation/services/oidcFederationService.js` (`openid-client`) |
| SAML | `src/federation/services/samlFederationService.js` (`@node-saml/node-saml`) |
| SCIM | `src/federation/services/scimProvisioningService.js` |
| Sessão (compat login) | `src/federation/services/federationSessionBridge.js` |
| Config tenant | `src/federation/services/federationConfigService.js` |
| Tracing | `src/federation/observability/federationLoginTracing.js` |
| Schema | `src/models/enterprise_federation_migration.sql` |
| Rotas públicas | `src/routes/federation.js` |
| Rotas SCIM | `src/routes/federationScim.js` |

**Dependências adicionadas:** `openid-client@5`, `@node-saml/node-saml@5`

---

## 3. Modos de governança

| Modo global | OIDC/SAML callback | SCIM mutações | Sessão JWT |
|-------------|-------------------|---------------|------------|
| `off` | Desligado | Desligado | — |
| `shadow` | Valida + trace; redirect shadow_ok | Audit only (202) | Não |
| `audit` | Valida + trace + audit_logs | Audit trail | Não |
| `on` | Sessão igual `/api/auth/login` | Persiste users | Sim |

Modo efectivo = `min(global, provider.mode)`.

---

## 4. Flags

```env
IMPETUS_FEDERATION_ENABLED=true
IMPETUS_FEDERATION_MODE=audit
IMPETUS_FEDERATION_OIDC_ENABLED=true
IMPETUS_FEDERATION_SAML_ENABLED=true
IMPETUS_FEDERATION_SCIM_ENABLED=true
IMPETUS_FEDERATION_PILOT_ONLY=true
IMPETUS_FEDERATION_PILOT_TENANTS=21dd3cee-2efa-4936-908f-9ff1ba04e2a3
IMPETUS_FEDERATION_BASE_URL=<URL pública da API>
```

**Rollback instantâneo:**

```bash
IMPETUS_FEDERATION_ENABLED=false
IMPETUS_FEDERATION_MODE=off
pm2 restart impetus-backend --update-env
```

---

## 5. Rotas

| Método | Rota | Auth |
|--------|------|------|
| GET | `/api/federation/status` | Público |
| GET | `/api/federation/oidc/:companyId/login` | Público |
| GET | `/api/federation/oidc/callback` | Público |
| GET | `/api/federation/saml/:companyId/login` | Público |
| POST | `/api/federation/saml/acs` | Público |
| GET | `/api/federation/saml/metadata/:companyId` | Público |
| * | `/api/federation/scim/v2/*` | Bearer SCIM |
| GET | `/api/admin/runtime/federation` | Admin JWT |
| GET/POST | `/api/admin/runtime/federation/providers` | Admin JWT |
| POST | `/api/admin/runtime/federation/scim-token` | Admin JWT |
| GET | `/api/admin/runtime/federation/login-traces` | Admin JWT |

---

## 6. Segurança e compliance

- **Tenant isolation:** `company_id` em todas as tabelas; SCIM token scoped; `assertTenantAccess` no admin.
- **RBAC/hierarchy:** `federationSessionBridge` reutiliza `resolveHierarchyLevel`, `dashboardProfileResolver`, `tenantAdminService`.
- **Secrets:** `client_secret` apenas via `client_secret_env_key` → variável de ambiente (nunca em BD).
- **LGPD:** traces sem PII (hash de `sub`); SCIM audit sem conteúdo de mensagens.
- **Password login:** inalterado em `routes/auth.js`.

---

## 7. Riscos

| Risco | Mitigação |
|-------|-----------|
| IdP misconfiguration | Modo `audit` antes de `on` |
| User not linked | Match por email + `federation_identity_links` |
| SCIM over-provisioning | Shadow/audit; token por tenant |
| SAML cert expiry | Monitorização IdP + metadata refresh |
| Open redirect | Redirects fixos para `getPublicAppBaseUrl()` |

---

## 8. Verificação

```bash
cd /var/www/impetus-completa/backend
node tests/federation/runFederationTests.js
node scripts/verify-federation-evidence.js
node scripts/apply-federation-pilot.js
```

Log: `[FEDERATION_BOOT]` com `schema_ok: true`.

---

## 9. Promoção para `on`

1. Configurar provider OIDC/SAML no admin para tenant piloto.  
2. Validar 7 dias de traces (`federation_login_traces`) sem erro.  
3. DPO/Ops sign-off.  
4. `IMPETUS_FEDERATION_MODE=on` + `provider.mode=on`.  
5. PM2 `--update-env`.

---

*Ver também:* `ENTERPRISE_ONBOARDING_GUIDE_FEDERATION.md`
