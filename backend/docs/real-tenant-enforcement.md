# Phase Z.13 — Real Tenant Enforcement

Activa enforcement **real** (não shadow-only) em tenants **piloto**, com `execute=true` e `approved_by` obrigatórios.

## Pré-requisitos

1. Flags Z.13 no `.env` (ver `contextual-enforcement-activation.md`, `pilot-tenant-enforcement.md`)
2. Tenant registado como piloto
3. Activação supervisionada via API

## Activação (workflow)

```http
POST /api/internal/contextual-activation/activate/:tenant
{ "execute": true, "approved_by": "ops@empresa", "channel": "menu" }

POST /api/internal/pilot-tenants/activate/:tenant
{ "execute": true, "approved_by": "ops@empresa" }

POST /api/internal/real-tenant-enforcement/activate/:tenant
{ "execute": true, "approved_by": "ops@empresa", "channel": "menu" }
```

## Rollback

```http
POST /api/internal/real-tenant-enforcement/rollback/:tenant
{ "execute": true, "approved_by": "ops@empresa" }
```

## Proibido

- Chat enforcement global
- Boundary governance global
- Auto-remediação
- Auto-pruning global

## PM2

Apenas: `pm2 reload impetus-backend --update-env`

## Testes

```bash
npm run test:real-tenant-enforcement
```
