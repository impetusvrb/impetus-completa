# Safety Cognitive Health (Z.25)

Métrica exposta em `sst_cognitive_runtime.safety_cognitive_health`:

| Campo | Significado |
|-------|-------------|
| `specialization` | Ratio de widgets/centros safety-native |
| `operational_focus` | Peso operacional dos centros |
| `semantic_fidelity` | Ausência de termos industriais/executivos |
| `genericity_reduction` | Supressão de widgets genéricos |
| `cognitive_density` | Score do density governor |
| `healthy` | Limiar composto (specialization ≥ 0.45, fidelity ≥ 0.7) |

Implementação: `domains/sst/observability/safetyCognitiveHealth.js`.
