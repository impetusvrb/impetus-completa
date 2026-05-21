# Phase Z.13 — Operational Identity Governance

Camada de normalização canónica de identidade operacional (cargo, função, departamento, domínio, hierarquia) **sem** alterar cadastro na base de dados.

## Módulos

| Módulo | Função |
|--------|--------|
| `canonicalOperationalIdentityResolver` | Resolve identidade governada sobre Z.0 |
| `organizationalRoleNormalizer` | Mapeamento canónico (ex.: Coordenador Qualidade → `quality`) |
| `hierarchyAuthorityMapper` | Nível/tier hierárquico |
| `domainResponsibilityResolver` | Eixo de domínio |
| `functionalIdentityValidator` | Valida módulos vs domínio/hierarquia |
| `operationalIdentityGovernanceFacade` | Façade |

## API interna

`/api/internal/operational-identity-governance/*` — `status`, `readiness`, `targeting`, `hierarchy`, `governance`, `report`

## Flags

- `IMPETUS_OPERATIONAL_IDENTITY_GOVERNANCE=on`

## Testes

```bash
npm run test:operational-identity-governance
```
