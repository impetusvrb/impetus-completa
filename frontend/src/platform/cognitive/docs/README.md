# CPL — Cognitive Platform Layer (Program Index)

**Phases:** CPL-001 → CPL-002 → CPL-003 (programa concluído)

---

## Principle

> Discover → Standardize → Register → Adapt → Orchestrate → Govern  
> NOT Reimplement → Replace

---

## Phase map

| Phase | Focus | Path |
|-------|-------|------|
| CPL-001 | Architecture consolidation | `registry/`, `contracts/`, `discovery/` |
| CPL-002 | Thin adapters & orchestration | `adapters/`, `runtime/`, `health/`, `api/` |
| CPL-003 | Capability governance | `governance/` |

---

## Canonical paths

| Artefact | Path |
|----------|------|
| Platform entry | `frontend/src/platform/cognitive/index.js` |
| Registry | `registry/cognitivePlatformRegistry.js` |
| Contracts | `contracts/cognitiveContractDescriptors.js` |
| Discovery | `discovery/cognitiveDiscoveryIndex.js` |
| Adapter runtime | `runtime/cognitiveAdapterRuntime.js` |
| Adapters | `adapters/{logistics,quality,safety,environment}/` |
| Discovery API | `api/cognitiveDiscoveryApi.js` |
| Governance | `governance/{lifecycle,ownership,versioning,compatibility,catalog,graph,api}/` |

---

## CPL-001 evidence

- [CPL-001-COGNITIVE-DISCOVERY.md](../../../../docs/evidence/CPL-001-COGNITIVE-DISCOVERY.md)
- [CPL-001-CAPABILITY-MATRIX.md](../../../../docs/evidence/CPL-001-CAPABILITY-MATRIX.md)
- [CPL-001-CONTRACTS.md](../../../../docs/evidence/CPL-001-CONTRACTS.md)
- [CPL-001-ADAPTER-STRATEGY.md](../../../../docs/evidence/CPL-001-ADAPTER-STRATEGY.md)
- [CPL-001-REGISTRY.md](../../../../docs/evidence/CPL-001-REGISTRY.md)
- [CPL-001-EXECUTIVE-SUMMARY.md](../../../../docs/evidence/CPL-001-EXECUTIVE-SUMMARY.md)

## CPL-002 evidence

- [CPL-002-ADAPTER-RUNTIME.md](../../../../docs/evidence/CPL-002-ADAPTER-RUNTIME.md)
- [CPL-002-ADAPTER-CONTRACTS.md](../../../../docs/evidence/CPL-002-ADAPTER-CONTRACTS.md)
- [CPL-002-REGISTRY.md](../../../../docs/evidence/CPL-002-REGISTRY.md)
- [CPL-002-HEALTH.md](../../../../docs/evidence/CPL-002-HEALTH.md)
- [CPL-002-DISCOVERY-API.md](../../../../docs/evidence/CPL-002-DISCOVERY-API.md)
- [CPL-002-EXECUTIVE-SUMMARY.md](../../../../docs/evidence/CPL-002-EXECUTIVE-SUMMARY.md)

## CPL-003 evidence

- [CPL-003-CAPABILITY-LIFECYCLE.md](../../../../docs/evidence/CPL-003-CAPABILITY-LIFECYCLE.md)
- [CPL-003-OWNERSHIP.md](../../../../docs/evidence/CPL-003-OWNERSHIP.md)
- [CPL-003-COMPATIBILITY.md](../../../../docs/evidence/CPL-003-COMPATIBILITY.md)
- [CPL-003-CATALOG.md](../../../../docs/evidence/CPL-003-CATALOG.md)
- [CPL-003-DEPENDENCY-GRAPH.md](../../../../docs/evidence/CPL-003-DEPENDENCY-GRAPH.md)
- [CPL-003-GOVERNANCE-API.md](../../../../docs/evidence/CPL-003-GOVERNANCE-API.md)
- [CPL-003-EXECUTIVE-SUMMARY.md](../../../../docs/evidence/CPL-003-EXECUTIVE-SUMMARY.md)

---

## Tests

```bash
npm run test:cpl001
npm run test:cpl002
npm run test:cpl003
npm run test:cpl-platform   # 001 + 002 + 003
```

---

## Forbidden under `platform/cognitive/`

- `engines/`, `decision/`, `recommendation/`, `rules/`, `simulation/`, `timeline/`, `risk/`, `analytics/`, `ai/`
- New cognitive engines or parallel registries
- Modifications to OPM-003–008, cognitiveRuntime, certified domains (salvo escopo explícito)
