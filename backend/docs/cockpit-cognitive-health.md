# Cockpit cognitive health (Z.23)

Métricas em `specialized_cockpit_runtime.cognitive_health`:

- `specialization` — ratio de widgets/centros especializados
- `usefulness` — binding + centros com dados
- `genericity` — peso de slots industriais colapsados
- `operational_focus` — % centros layer operational
- `cognitive_density` — carga após density governor

`healthy: true` quando specialization ≥ 0.55, genericity ≤ 0.45, sem overload.
