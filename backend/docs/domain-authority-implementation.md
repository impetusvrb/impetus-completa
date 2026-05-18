# Domain Authority Engine — Implementação (Fase C)

## Visão

O IMPETUS evolui de inferência ad-hoc para **autoridade contextual por domínio**: cada eixo funcional governa módulos, pipelines, widgets, IA e dashboards permitidos/negados.

## Arquitectura

```
Utilizador
    │
    ▼
semanticDomainResolver (prioridade 1–10)
    │
    ▼
domainRegistry.getDomain(axis)
    │
    ├── tenantOverrideLoader (flag off por defeito)
    │
    ▼
domainIsolationGuard.filterModules / filterPipelines
    │
    ▼
dashboardProfileResolver.getDashboardConfigForUser
    │  (+ domain_authority no payload)
    ▼
contextualModules.enhanceVisibleModulesWithContext
    │  (isolamento adicional em enrich/replace)
    ▼
GET /dashboard/me
```

## Estrutura de pastas

```
backend/src/domainAuthority/
├── index.js                          # façade pública
├── observability/domainAuthorityLogger.js
├── registry/
│   ├── domainRegistry.js             # definições enterprise
│   └── domainDashboardProfiles.js    # perfis coordinator_*/manager_*/supervisor_*
├── policies/semanticPriorityPolicy.js
├── resolvers/
│   ├── semanticDomainResolver.js
│   └── domainAuthorityResolver.js
├── guards/domainIsolationGuard.js
├── pipelines/pipelineRegistry.js
├── capabilities/domainCapabilities.js
└── tenantOverrides/tenantOverrideLoader.js
```

## Prioridade semântica (C.5)

| # | Step | Implementação |
|---|------|---------------|
| 1 | Área funcional explícita | `functional_area` / `company_role_dashboard_hint` |
| 2 | Departamento | `department`, `department_resolved_name` |
| 3 | Cargo estrutural | `company_role_name` |
| 4 | Hint estrutural | `company_role_dashboard_hint` (se sem functional_area) |
| 5 | Hierarquia | sinal registado; não força eixo sozinho |
| 6 | Descrição | `hr_responsibilities`, texto agregado |
| 7 | Multi-sinal | `functionalAxisResolver` + interpreter |
| 8 | Histórico | reservado |
| 9 | Tenant overrides | `IMPETUS_DOMAIN_TENANT_OVERRIDES=on` (stub) |
| 10 | Heurística | fallback sem quality por coordenador |

## Feature flags

| Variável | Default | Efeito |
|----------|---------|--------|
| `IMPETUS_DOMAIN_AUTHORITY` | `on` | Governança em dashboard + contextual modules |
| `IMPETUS_DOMAIN_TENANT_OVERRIDES` | `off` | Overrides por empresa (preparado) |

## Payload aditivo (`/dashboard/me`)

Campos novos (não removem legado):

- `functional_axis`
- `functional_area_source`
- `contextual_modules_hint`
- `domain_authority` (quando activo)
- `profile_config.visible_modules_governed`

## Perfis dominiais (C.6)

Novos códigos em `domainDashboardProfiles.js`, integrados via `getProfile()`:

- `coordinator_hr`, `manager_hr`, `supervisor_hr`, `director_hr`
- `coordinator_financial`, `manager_financial`, `supervisor_financial`, `director_financial`
- `coordinator_logistics`, `manager_logistics`, `supervisor_logistics`
- `coordinator_engineering`, `manager_engineering`, `supervisor_engineering`
- `coordinator_safety`, `manager_safety`, `supervisor_safety`
- `coordinator_compliance`, `manager_compliance`, `supervisor_compliance`
- `coordinator_legal`, `manager_legal`, `supervisor_legal`
- `coordinator_operations`, `manager_operations`, `supervisor_operations`

Perfis legados (`hr_management`, `finance_management`) **mantidos** para retrocompat.

## Testes

```bash
npm run test:domain-contextual-regression
npm run test:contextual-functional-axis
npm run test:contextual-domain-isolation
node ../frontend/src/tests/contextual-domain/domainIsolationExpectations.test.cjs
```

## Motor A/B

Sem alteração de contratos `engine_v2`. O `identityResolver` continua a alimentar o Motor B; o Domain Authority actua **depois** na camada de entrega (módulos visíveis).

## Próximos passos (não bloqueantes)

1. Tabela `tenant_domain_overrides` + migration
2. Gate em `operationalLearningService` por `domain_axis`
3. Expor `domain_authority` no frontend para debug admin (sem alterar DS)
