# UX-001 — Architecture Conformance

| Restrição | Estado |
|-----------|:------:|
| Backend unchanged | ✅ |
| Domain runtime unchanged | ✅ |
| APIs unchanged | ✅ |
| Feature Flags unchanged | ✅ |
| RBAC unchanged | ✅ |
| Contracts unchanged | ✅ |

## Limitações registadas

- Rotas WMS usam prefixo `/workspace` existente — alias `/dashboard` não criados sem App.jsx
- Supply sidebar aponta para workspace único (sem rotas segmentadas no App.jsx)
