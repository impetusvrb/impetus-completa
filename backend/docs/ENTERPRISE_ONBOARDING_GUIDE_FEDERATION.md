# Guia de Onboarding Enterprise — Federation (OIDC · SAML · SCIM)

Este guia descreve como integrar um tenant piloto do IMPETUS com IdP corporativo (Azure AD, Okta, Google Workspace, Keycloak, etc.).

---

## Pré-requisitos

- Tenant IMPETUS activo com utilizadores já criados (email = chave de ligação).
- `IMPETUS_FEDERATION_ENABLED=true` e tenant UUID em `IMPETUS_FEDERATION_PILOT_TENANTS`.
- URL pública da API em `IMPETUS_FEDERATION_BASE_URL` (sem barra final).
- Modo recomendado para 1ª integração: **`audit`** (valida fluxo sem emitir JWT).

---

## Passo 1 — Registar provider (Admin API)

```http
POST /api/admin/runtime/federation/providers
Authorization: Bearer <admin-jwt>
Content-Type: application/json

{
  "company_id": "21dd3cee-2efa-4936-908f-9ff1ba04e2a3",
  "provider_type": "oidc",
  "display_name": "Azure AD — Piloto",
  "enabled": true,
  "mode": "audit",
  "issuer_url": "https://login.microsoftonline.com/<tenant-id>/v2.0",
  "client_id": "<application-id>",
  "client_secret_env_key": "FEDERATION_OIDC_SECRET_PILOT",
  "scopes": "openid profile email"
}
```

No `.env` do backend:

```env
FEDERATION_OIDC_SECRET_PILOT=<client-secret-do-idp>
```

Reiniciar: `pm2 restart impetus-backend --update-env`

---

## Passo 2 — Redirect URIs no IdP (OIDC)

| Campo IdP | Valor |
|-----------|--------|
| Redirect URI | `{IMPETUS_FEDERATION_BASE_URL}/api/federation/oidc/callback` |
| Logout URL (opcional) | `{IMPETUS_CLIENT_APP_URL}/login` |

**Teste de login:**

```
GET {BASE_URL}/api/federation/oidc/{companyId}/login
```

Em modo `audit`, após sucesso o browser é redireccionado para `/login?federation=audit_ok`.

---

## Passo 3 — SAML 2.0 (opcional)

```http
POST /api/admin/runtime/federation/providers
{
  "company_id": "<uuid>",
  "provider_type": "saml",
  "enabled": true,
  "mode": "audit",
  "idp_entity_id": "https://sts.windows.net/.../",
  "idp_sso_url": "https://login.microsoftonline.com/.../saml2",
  "idp_certificate_pem": "-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----",
  "sp_entity_id": "{BASE_URL}/api/federation/saml/metadata/{companyId}",
  "attribute_mapping": { "email": "email", "subject": "nameID" }
}
```

| Campo IdP | Valor |
|-----------|--------|
| ACS URL | `{BASE_URL}/api/federation/saml/acs` |
| SP Metadata | `{BASE_URL}/api/federation/saml/metadata/{companyId}` |

**Login:** `GET {BASE_URL}/api/federation/saml/{companyId}/login`

---

## Passo 4 — SCIM Provisioning

Gerar token (uma vez):

```http
POST /api/admin/runtime/federation/scim-token
{ "company_id": "<uuid>", "label": "Okta SCIM Piloto" }
```

Resposta inclui `token` — guardar em cofre; não é reexibido.

**Base URL SCIM:** `{BASE_URL}/api/federation/scim/v2`

| Operação | Método | Path |
|----------|--------|------|
| List users | GET | `/Users` |
| Get user | GET | `/Users/{id}` |
| Create | POST | `/Users` |
| Patch active | PATCH | `/Users/{id}` |
| Deactivate | DELETE | `/Users/{id}` |

Header: `Authorization: Bearer <scim-token>`

Em modo `audit`, POST `/Users` regista auditoria sem INSERT na BD.

---

## Passo 5 — Ligar identidades

Automático quando o email IdP = email IMPETUS (`users.company_id` scoped).

Manual (opcional): inserir em `federation_identity_links` via processo interno.

Utilizadores sem match recebem `?federation=unlinked` — provisionar via SCIM ou criar user antes do SSO.

---

## Passo 6 — Observabilidade

| Recurso | Uso |
|---------|-----|
| `GET /api/admin/runtime/federation` | Diagnostics + schema |
| `GET /api/admin/runtime/federation/login-traces?company_id=` | Traces OIDC/SAML |
| `audit_logs` action `federation_*` | Eventos de boot e login audit |
| `scim_provisioning_audit` | Operações SCIM |

---

## Passo 7 — Promoção para produção (`on`)

Checklist:

- [ ] ≥7 dias em `audit` sem `oidc_callback_exception` / `saml_acs_exception`
- [ ] Match rate email ≥95% no piloto
- [ ] SCIM create testado em staging
- [ ] DPO revisou flows (Art. 7 base legal — execução contrato B2B)
- [ ] Runbook rollback testado (`FEDERATION_ENABLED=false`)

```env
IMPETUS_FEDERATION_MODE=on
```

Provider: `"mode": "on"`  
`pm2 restart impetus-backend --update-env`

Login federado passa a emitir o mesmo JWT que `POST /api/auth/login`.

---

## Suporte

- Relatório técnico: `FEDERATION_ENTERPRISE_REPORT.md`
- Verificação: `node backend/scripts/verify-federation-evidence.js`
