# WAVE 5 — Plano: Bounded Contexts Industriais

> Estruturação segura para múltiplos domínios sem microsserviços nem quebra de imports.

## 1. Topologia final

```
backend/src/
├── shared/                    ← shared kernel (re-exports + primitivas)
├── domains/
│   ├── _core/                 ← registry, isolation, dependency rules
│   ├── quality/
│   ├── safety/
│   ├── environment/
│   ├── logistics/
│   └── operational/           ← ponte para runtime operacional actual
├── contextualModules/         ← legado (intocado)
├── services/                  ← legado (intocado; compat aponta aqui)
└── eventPipeline/             ← backbone partilhado
```

## 2. Dependency rules

| Origem | Pode importar | Não pode |
|--------|---------------|----------|
| `domains/<X>` | `shared/*`, `domains/_core`, `domains/<X>/*` | `domains/<Y>/*` (Y≠X) |
| `domains/<X>/acl` | serviços legados **só** via adapter | domain de outro contexto |
| `services/*` (legado) | tudo (transição) | — |
| `shared/*` | Node/stdlib, observability, eventPipeline readers | `domains/*` |

**Regra CI futura:** `no-cross-domain-import` — falha se `domains/quality` importa `domains/logistics` fora de `acl/`.

## 3. Anti-corruption layers (ACL)

- Cada domínio: `acl/<source>_adapter.js`
- Adapters traduzem DTOs legados → contratos de domínio
- Ex.: `quality/acl/logisticsInboundAdapter.js` — só leitura de eventos `logistics.*`

## 4. Shared kernel strategy

| Módulo | Responsabilidade | Implementação W5 |
|--------|------------------|------------------|
| tenant | `company_id` obrigatório | `shared/tenant` |
| correlation | trace/workflow | re-export WAVE 2 |
| time | ISO 8601 | `shared/time` |
| units | SI / formatação | stub policy |
| identity | capabilities | primitivas |
| policy | allow/deny/abstain | primitivas |
| events-core | publicar industrial | client fino |

**Sem mover** `operationalMemoryBindingService` — `domains/operational` documenta fronteira.

## 5. Migration strategy (fases)

1. **W5 (actual):** scaffolding + compat shims + contratos JSON
2. **W5b:** novas features só em `domains/*`
3. **W6+:** mover serviços por domínio com wrapper `@impetus/quality` → `api/compat`
4. **Nunca:** big-bang move de `qualityIntelligenceService.js`

## 6. Coexistence strategy

- Rotas HTTP actuais (`routes/qualityIntelligence.js`) **inalteradas**
- `domains/quality/api/compat/qualityIntelligenceCompat.js` delega ao serviço legado
- `moduleRegistry` contextual continua fonte de verdade UI
- Eventos: catálogo WAVE 1 + contratos JSON por domínio

## 7. Gate W5→W6

- Registry com 5 contextos registados
- Zero violações `domainIsolationGuard` em CI
- Compat shims testados
- Documentação CODEOWNERS por domínio (manual)
