# Auditoria — Governança contextual multi-domínio (Fase C)

**Data:** 2026-05-18  
**Escopo:** Inferência de eixo, módulos, IA, dashboards, Motor A/B  
**Estado pós-Fase B:** Ambiental vs Qualidade corrigido; Fase C formaliza autoridade por domínio.

---

## [CRÍTICO]

| Arquivo | Função | Risco | Eixo contaminado | Sugestão |
|---------|--------|-------|------------------|----------|
| `services/operationalLearningService.js` | `inferContextTagFromEvent` | Keyword `amostra`/`qualidade` força `quality` em eventos ambientais | quality | Gate por domínio do utilizador antes de classificar |
| `services/profileContextInterpreter.js` | `interpretProfileContext` | Keywords genéricas (`coleta`, `analise`) pontuavam qualidade | quality / laboratory | **Mitigado Fase B** — guard ambiental |
| `domains/_core/contextualModuleBridge.js` | `resolveDomainFromModuleId` | `id.includes('quality')` mapeia qualquer substring | quality | Usar registry `domainRegistry` |
| `contextualModules/moduleOrchestrator.js` | `orchestrate` | `compatible_areas` vazio = módulo universal | cross-domain | **Mitigado Fase C** — `domainIsolationGuard` no index |

## [ALTO]

| Arquivo | Função | Risco | Eixo contaminado | Sugestão |
|---------|--------|-------|------------------|----------|
| `config/dashboardProfiles.js` | `ROLE_AREA_TO_PROFILE` | `_default` gerente/coordenador → production | operations | **Mitigado Fase C** — perfis dominiais por área |
| `services/dashboardProfileResolver.js` | `inferAreaFromFreeText` | Regex qualidade sem guard ambiental | quality | Guard `hasEnvironmentalSemanticSignal` (Fase B) |
| `services/qualityIntelligenceService.js` | gate por role | `coordenador` + área quality amplia escopo | quality | Usar `functional_axis` do Domain Authority |
| `services/unifiedDecisionEngine.js` | `normalizeContext` | Normalização genérica sem domínio | operations | Injetar `domain_axis` no context norm |
| `dashboardEngineV2/identity/identityResolver.js` | `AXIS_TO_AREA` | `eixo_laboratorial` → quality | quality | **Mitigado Fase B** — laboratory dedicado |
| `enterprise-shadow-stabilization/operationalNavigationHeatmap.js` | rota → domínio | `/quality/` por path apenas | quality | Publication-driven resolver |

## [MÉDIO]

| Arquivo | Função | Risco | Eixo contaminado | Sugestão |
|---------|--------|-------|------------------|----------|
| `services/dashboardPersonalizadoService.js` | nível tático | `cargo.includes('coordenador')` | — | Não inferir eixo — só UX copy |
| `middleware/auth.js` | hierarquia | `role.includes('coordenador')` | — | RBAC apenas, não eixo funcional |
| `domains/environment/publication/environmentAudienceResolver.js` | audience | `role.includes('coordenador')` | environmental | OK — audience tier, não eixo |
| `functionalAreaCatalog.js` | `procurement` → axis operations | Compras mistura com operações | operations | Domínio `procurement` no registry |
| `gerente` `_default` | `manager_production` | Gerente sem contexto → produção | production | Fallback neutro `operations` no resolver |

## [BAIXO]

| Arquivo | Função | Risco | Eixo contaminado | Sugestão |
|---------|--------|-------|------------------|----------|
| `frontend/hooks/useVisibleModules.js` | filtro menu | Depende de payload backend | — | Consumir `domain_authority` quando exposto |
| `frontend/domains/domainRegistry.js` | UI labels | Paralelo ao backend | — | Alinhar via API `/dashboard/me` |
| `governance/domainCapabilityGovernance.js` | capabilities estáticas | Lista roles genéricos | quality | Sincronizar com `domainCapabilities.js` |

---

## Domínios validados (checklist Fase C.1)

| Domínio | Inferência | Isolamento módulos | Perfil formal |
|---------|------------|-------------------|---------------|
| RH | OK | OK | `coordinator_hr`, `manager_hr`, … |
| PCP | OK | OK | `analyst_pcp` |
| Logística | OK | OK | `coordinator_logistics`, … |
| Compras | OK (procurement) | OK | via logistics |
| Financeiro | OK | OK | `coordinator_financial`, `director_financial` |
| Segurança do Trabalho | OK | OK | `coordinator_safety`, … |
| Utilidades | OK | OK | via environmental |
| Engenharia | OK | OK | `coordinator_engineering`, … |
| Produção | OK | OK | existente |
| Diretoria | OK | OK | `director_*` |
| Compliance | OK | OK | `coordinator_compliance`, … |
| Jurídico | OK | OK | `coordinator_legal`, … |
| Qualidade | OK | OK | existente |
| Meio Ambiente | OK | OK | `coordinator_environmental`, … |
| Sustentabilidade | OK | OK | via environmental |
| Operações | OK | OK | `coordinator_operations`, … |
| Manutenção | OK | OK | existente |
| Administração | OK | OK | `admin_system` |
| TI | OK (admin) | OK | `admin_system` |

---

## Mitigações implementadas (Fase C)

- `backend/src/domainAuthority/` — registry, guards, resolvers, tenant overrides (stub)
- `domainIsolationGuard` integrado em `dashboardProfileResolver` e `contextualModules/index.js`
- Suíte `npm run test:domain-contextual-regression`
- Logs: `DOMAIN_AUTHORITY_RESOLVED`, `DOMAIN_ISOLATION_BLOCKED`, `DOMAIN_MODULE_DENIED`, etc.

---

## Rollback

```bash
IMPETUS_DOMAIN_AUTHORITY=off pm2 reload impetus-backend --update-env
```

Comportamento regressa ao resolver Fase B sem filtro de isolamento no menu.
