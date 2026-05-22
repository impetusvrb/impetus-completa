# Semantic Domain Delivery — Modelo IMPETUS

**Fases:** Z.18 (registry) → Z.19 (composition shadow) → Z.20 (engine bridge)

## Princípio

O dashboard legacy entrega **conteúdo genérico industrial** dentro de um envelope de governança correcto (Z.13–Z.17).

A **semantic domain delivery** é a camada que passa a entregar **significado de domínio** (NC, SPC, CAPA, auditoria…) sem substituir o render actual.

## Camadas

| Camada | Fase | Output | Muta delivery? |
|--------|------|--------|----------------|
| Governance envelope | Z.13–Z.17 | `final_visible_modules`, KPI lock | Filtra legacy |
| Cognitive block registry | Z.18 | Definições de blocos | Não |
| Composition engine | Z.19 | `shadow_cognitive_cockpit` | Não |
| Engine bridge | Z.20 | `shadow_signals.bridge_status: bound_z20` | Não |
| Render modular | Futuro | Widgets React | Sim (flagged) |

## Z.20 — Data binding

- **Loader:** `qualityTenantSignalLoader` — proposals (proxy NC), séries semanais, heatmap por setor
- **Invoker:** engines quality invocados directamente (shadow), sem activar `IMPETUS_QUALITY_COGNITIVE_RUNTIME_ENABLED`
- **Estados:** `bound_z20` | `bound_empty` | `bridge_error`

## Métricas de validação

- `binding_ratio` — blocos com engine real / total
- `delta_vs_generic` — score especializado vs baseline
- `specialized_delivery_ready` — ≥ 6 blocos bound

## Referências

- [Auditoria cockpit cognitivo](./cognitive-cockpit-domain-specialization-audit.md)
- [Z.19 Composition](./runtime-cognitive-composition-z19.md)
- [Z.20 Engine bridge](./quality-engine-bridge-z20.md)
