# Z.18 — Cognitive Block Registry Foundation

**Fase:** Cognitive Foundation — Prompt 1  
**Modo:** aditivo, shadow-only, rollback-safe  
**Objectivo:** fundação para `cockpit = composição cognitiva governada`

## Invariantes preservados (Z.13 → Z.17)

- Domain / hierarchy / authority governance
- Terminal governance lock
- Deterministic delivery
- Anti-reinjection
- KPI / summary governance
- Operational convergence validation

**Não activa:** auto-remediation, auto-pruning global, boundary global, chat enforcement, substituição de dashboard, cockpits hardcoded.

## Pacote

```
backend/src/cognitiveRuntime/
├── config/phaseZ18FeatureFlags.js
├── phaseZ18Logger.js
├── registry/          # definições de blocos (sem widgets reais)
├── composition/       # contratos + shadow plan
├── observability/     # genericity + semantic score
├── validation/        # integridade registry + isolamento
└── facade/            # integração dashboard (observabilidade)
```

## Cognitive Block Registry

Blocos são **definições** com:

- `id` — `{domain}.{slug}` (ex.: `quality.nc_center`)
- `contract` — `composition_role`, `data_binding`, `governance_tags`
- `authority` — `min_hierarchy_tier`, `domain_owner`, `cross_domain_allowed`
- `hierarchy` — pesos operacional / gestão / estratégico (soma ≈ 1)
- `metadata` — `delivery_mode: shadow_only`, `engine_bridge`, tags semânticos

### Domínios registados (fase 1)

| Domínio | Blocos exemplo |
|---------|----------------|
| quality | nc_center, capa_engine, spc_monitor, audit_governance, supplier_quality, inspection_ops, contextual_ai |
| safety (sst) | incident_heatmap, permit_to_work, epi_compliance |
| rh | people_analytics, turnover_heatmap, pulse_climate |
| executive | boardroom, enterprise_risk |
| production | line_oee |
| maintenance | work_order_center |
| environment | emissions_monitor |

## Composição shadow

`compositionShadowResolver.resolveShadowCompositionPlan()`:

- Constrói contexto (`compositionContextBuilder`)
- Resolve elegibilidade (`compositionEligibilityResolver`)
- **Não muta** payload de delivery
- Expõe `recommended_block_ids` e `composition_gap`

## Observabilidade

Campo opcional em `GET /api/dashboard/me`:

```json
{
  "cognitive_runtime_report": {
    "phase": "Z.18",
    "shadow_only": true,
    "semantic_delivery": {
      "classification": "semantic_delivery_generic",
      "semantic_score": { "average_score": 4.2 },
      "genericity_ratio": 0.55,
      "ideal_semantic_missing": ["nc_center", "spc_monitor", "capa_engine"]
    },
    "shadow_composition": {
      "recommended_block_ids": ["quality.nc_center", "quality.spc_monitor", ...]
    }
  }
}
```

## Feature flags (`.env`)

| Flag | Default | Efeito |
|------|---------|--------|
| `IMPETUS_COGNITIVE_RUNTIME` | off | runtime completo (futuro) |
| `IMPETUS_COGNITIVE_BLOCK_REGISTRY` | off | registry activo em delivery |
| `IMPETUS_COGNITIVE_COMPOSITION_SHADOW` | off | plano shadow explícito |
| `IMPETUS_SEMANTIC_DELIVERY_OBSERVABILITY` | **on** | relatório em `/dashboard/me` |
| `IMPETUS_COGNITIVE_RUNTIME_VALIDATION` | off | validação completa no report |

## Testes

```bash
cd backend && npm run test:cognitive-runtime
```

## Próximo passo (fora Z.18)

1. Domain Cockpit Composer — bridge V2 → cognitive blocks  
2. KPI Domain Adapter — engines quality → KPIs reais  
3. Activar composição (não shadow) por piloto, com fallback genérico
