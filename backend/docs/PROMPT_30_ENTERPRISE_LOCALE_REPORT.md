# PROMPT 30 — I18N + Timezone Engine

**Data:** 2026-05-28  
**Fase:** T3.5–T3.8 — Internacionalização enterprise  
**Estado:** `on` — motor activo, backward compatible (default pt-BR)

## Objetivo

Internacionalização **enterprise-grade** com UTC canónico, display por preferência do utilizador, multi-region/residency, alinhamento GDPR/LGPD e multi-currency advisory.

## Princípios

| Princípio | Implementação |
|-----------|---------------|
| Backward compatibility | Default `pt-BR` / `America/Sao_Paulo` / `BRL` / `BR` |
| Additive-only | `enterpriseLocale/` + API; UI prefs JSONB extendidos |
| UTC consistency | `timezoneEngine.toStorageUtc()` / `formatForUser()` |
| Tenant isolation | Contexto por `user` + `company_id` |
| Auditabilidade | `enterprise_locale_audit` |
| GDPR | `gdprAlignmentPolicy` liga DSR/retention/anonymization flags |

## Flags

| Variável | Default | Função |
|----------|---------|--------|
| `IMPETUS_ENTERPRISE_LOCALE_MODE` | `on` | `off` \| `shadow` \| `audit` \| `on` |
| `IMPETUS_ENTERPRISE_LOCALE_ENABLED` | `true` | Activa motor |
| `IMPETUS_DEFAULT_LOCALE` | `pt-BR` | Fallback global |
| `IMPETUS_DEFAULT_TIMEZONE` | `America/Sao_Paulo` | Fallback TZ |
| `IMPETUS_DEFAULT_REGION_CODE` | `BR` | Residência default |
| `IMPETUS_DEFAULT_CURRENCY` | `BRL` | Moeda default |
| `IMPETUS_FX_RATES_JSON` | rates estáticos | Conversão advisory |
| `IMPETUS_DATA_RESIDENCY_STRICT` | `off` | Cross-border deny quando `on` |

**Rollback:** `IMPETUS_ENTERPRISE_LOCALE_MODE=off` + `pm2 reload --update-env`.

## Rotas API

| Método | Rota |
|--------|------|
| GET | `/api/enterprise-locale/health` |
| GET | `/api/enterprise-locale/context` |
| GET | `/api/enterprise-locale/catalogs` |
| GET | `/api/enterprise-locale/translate/:key` |
| POST | `/api/enterprise-locale/format/datetime` |
| POST | `/api/enterprise-locale/format/currency` |
| POST | `/api/enterprise-locale/currency/convert` |
| GET | `/api/enterprise-locale/residency/evaluate` |
| GET | `/api/enterprise-locale/gdpr/alignment` |

## Frontend

- `EnterpriseLocaleProvider` em `App.jsx`
- `useEnterpriseLocale()` — `t()`, `formatDateTime()`
- `UserSettings` — idioma, fuso, região, moeda
- `getAccountBundle` devolve `locale_context` enriquecido

## Migração

`backend/migrations/enterprise_locale_engine_migration.sql`

## Testes

```bash
cd backend && node src/tests/waveEnterpriseLocaleScenarios.js
```

## Riscos

| Risco | Mitigação |
|-------|-----------|
| Catálogo i18n parcial | Fallback pt-BR; chaves ausentes devolvem key |
| FX estático incorrecto | Marcado `rates_source: env_static_advisory` |
| Migração massiva timestamps | Não altera colunas; só display layer |

## Dependências

- `userAccountService` ui_prefs JSONB
- DSR/LGPD flags existentes
- Intl API (Node 18+ / browsers modernos)

## Rollback

1. `IMPETUS_ENTERPRISE_LOCALE_MODE=off`
2. UI continua com defaults em `DEFAULT_UI_PREFS`
3. `pm2 reload impetus-backend --update-env`
