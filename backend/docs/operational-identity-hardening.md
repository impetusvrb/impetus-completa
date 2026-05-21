# Phase Z.0 — Operational Identity Hardening

## Objetivo

Identidade operacional **canónica** (tenant, área, domínio, cargo, hierarquia) — **recommendation-only**, sem enforcement.

## Módulos

`backend/src/operationalIdentity/`

- `canonicalOperationalIdentityResolver.js` — orquestra resolução
- `functionalDomainResolver.js` — eixo + domínio (domainRegistry)
- `hierarchyAuthorityResolver.js` — nível hierárquico
- `roleScopeResolver.js` — conflitos de escopo
- `contextualAuthorityRegistry.js` — registo de autoridade

Integra `domainAuthorityResolver` quando disponível.

## API

`/api/internal/operational-identity/{status,targeting,authority,hierarchy,tenants,report}`

## Flags

| Variável | Default |
|----------|---------|
| `IMPETUS_OPERATIONAL_IDENTITY_HARDENING` | off |
| `IMPETUS_HIERARCHY_AUTHORITY_VALIDATION` | off |

## Path para enforcement real

1. Validar identidade por tenant (Phase TR)
2. Corrigir targeting manualmente
3. Só depois activar hardening flags
