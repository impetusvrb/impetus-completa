# Sidebar Leakage Hardening (Z.14)

## Causa observada em produção

Identidade correcta, mas menu lateral ainda mostrava SST/Ambiental por:

1. `visible_modules` legado não podado no passo final
2. `contextual_modules` (modo enrich) a reintroduzir módulos
3. `safeMergeSafetyPublicationIntoMenu` / Quality / Environment no frontend

## Mitigações Z.14

| Camada | Acção |
|--------|--------|
| Backend | `safeSidebarPruningRuntime` + matriz canónica |
| Backend | `preventLegacyModuleReinjection` em contextual_modules |
| Payload | `sidebar_governance_runtime`, `contextual_modules_governed` |
| Frontend | `shouldBlockPublicationMerge`, `filterMenuItemsByGovernance` |

## Rollback

- Desactivar enforcement Z.13 no tenant
- Flags Z.14 OFF (recomendação-only)
- Sem restart bruto — `pm2 reload impetus-backend --update-env`

## Sem auto-remediação

Leakage é registado em `sidebarObservability` / timeline; não altera cadastro nem DB.
