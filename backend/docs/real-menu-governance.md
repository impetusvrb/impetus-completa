# Phase Z.13 — Real Menu Governance

Menu lateral governado por domínio e hierarquia após activação piloto.

## Comportamento esperado

| Perfil | Remove | Preserva |
|--------|--------|----------|
| RH | SST, Qualidade, Ambiental | dashboard, settings, hr |
| Qualidade | SST, Ambiental, ESG executivo | dashboard, quality, IA contextual |
| Operador | ESG, audit, executivo | operacional + universais |
| Executivo | cockpit operacional bruto | estratégico + universais |

## Módulos

`governedMenuVisibilityRuntime`, `contextualMenuIsolation`, `hierarchyMenuFiltering`, `legacyMenuReductionAdvisor`, `menuGovernanceStability`, `realMenuGovernanceFacade`

## API

`/api/internal/real-menu-governance/*`

## Testes

```bash
npm run test:real-menu-governance
```
