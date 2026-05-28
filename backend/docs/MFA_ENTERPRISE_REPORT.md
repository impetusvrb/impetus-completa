# MFA Universal — Relatório Enterprise (PROMPT 17)

**Data:** 2026-05-27  
**Roadmap:** T2.2 — MFA obrigatório (TOTP + WebAuthn)  
**Estado:** `IMPETUS_MFA_MODE=audit` — traça desafios sem bloquear login

---

## 1. Capacidades

| Recurso | Implementação |
|---------|----------------|
| TOTP | `otplib` — enroll + verify |
| WebAuthn | `@simplewebauthn/server` — registro e autenticação |
| Backup codes | 10 códigos one-time (bcrypt hash) |
| Device trust | Fingerprint UA/IP — skip MFA por N dias |
| Políticas tenant | `tenant_mfa_policies` — optional → required_all |
| Governança | shadow / audit / on (global + policy) |
| Pilot | `IMPETUS_MFA_PILOT_TENANTS` |

---

## 2. Fluxo de login (additive)

```
POST /api/auth/login (senha OK)
    → evaluateAfterPassword()
        ├── trusted device → JWT normal (inalterado)
        ├── shadow/audit/off → JWT normal
        └── on + enrolled → { mfa_required, mfa_challenge_token, methods }

POST /api/auth/mfa/verify
    → totp | backup | webauthn
    → JWT + sessions (via federationSessionBridge)
```

Login por senha **não removido**. Rollback: `IMPETUS_MFA_ENABLED=false`.

---

## 3. Flags

```env
IMPETUS_MFA_ENABLED=true
IMPETUS_MFA_MODE=audit
IMPETUS_MFA_PILOT_TENANTS=21dd3cee-2efa-4936-908f-9ff1ba04e2a3
IMPETUS_MFA_WEBAUTHN_RP_ID=api.impetuscompleta.com.br
IMPETUS_MFA_WEBAUTHN_ORIGIN=https://app.impetuscompleta.com.br
```

**Promoção `on`:** após enroll massivo + 7d audit sem incidentes.

---

## 4. Rotas

| Rota | Auth |
|------|------|
| `GET /api/auth/mfa/status` | Público |
| `POST /api/auth/mfa/verify` | Challenge token |
| `POST /api/auth/mfa/webauthn/authentication-options` | Challenge |
| `GET /api/auth/mfa/policy` | JWT |
| `POST /api/auth/mfa/enroll/totp/*` | JWT |
| `POST /api/auth/mfa/enroll/webauthn/*` | JWT |
| `POST /api/auth/mfa/backup/regenerate` | JWT |
| `GET /api/admin/runtime/mfa` | Admin |

---

## 5. Segurança

- TOTP secret: AES-256-GCM (`IMPETUS_MFA_ENCRYPTION_KEY` ou `JWT_SECRET`)
- Challenge token: SHA-256 hash em BD, TTL 10 min
- Tenant isolation: `company_id` em todas as tabelas
- RBAC/hierarchy: sessão via `issueSessionForUser` (inalterado)

---

## 6. Riscos

| Risco | Mitigação |
|-------|-----------|
| Lockout utilizadores | Modo audit primeiro; grace_period_days |
| WebAuthn RP mismatch | RP_ID/ORIGIN explícitos no .env |
| Perda backup codes | Regeneração autenticada |

---

## 7. Verificação

```bash
node tests/mfa/runMfaTests.js
node scripts/verify-mfa-evidence.js
node scripts/apply-mfa-pilot.js
```

---

*Próximo na trilha: PROMPT 18 — RLS + Multi-tenant Hardening*
