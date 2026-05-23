# PROMPT — FASE Z.24 — MULTI-DOMAIN COGNITIVE COCKPIT FOUNDATION

## Pré-requisitos

- **Z.23 concluída** com relatório + testes verdes
- Ler: `specialized-cognitive-cockpit-z23.md`, Z.22, Z.19, terminal governance, operational convergence

```bash
cd backend && npm run test:specialized-cockpit-runtime
```

---

## Objectivo

Transformar o modelo **Quality** (Z.23) em **foundation multi-domínio** replicável — sem hardcode por cargo, sem replace global, sem rewrite React.

---

## Implementar `backend/src/cognitiveRuntime/domainFoundation/`

```
domainFoundation/
├── registry/
│   ├── cognitiveDomainRegistry.js
│   ├── domainBlockRegistry.js
│   ├── cockpitCompositionRegistry.js
│   └── domainSemanticProfiles.js
├── runtime/
│   ├── multiDomainCockpitResolver.js
│   ├── domainCompositionRuntime.js
│   ├── domainWeightBalancer.js
│   ├── crossDomainProtection.js
│   ├── semanticDomainResolver.js
│   └── adaptiveCompositionSupervisor.js
├── orchestration/
│   ├── cognitiveOrchestrationEngine.js
│   ├── cockpitPriorityResolver.js
│   ├── operationalFocusResolver.js
│   ├── governanceAwareComposer.js
│   └── domainRuntimeBalancer.js
└── observability/
    ├── domainCompositionTelemetry.js
    ├── semanticIsolationMetrics.js
    └── cognitiveCompositionHealth.js
```

---

## Registry oficial (por domínio)

```json
{
  "domain": "quality",
  "cognitive_blocks": [],
  "weighting": { "operational": 0.7, "governance": 0.2, "strategic": 0.1 },
  "operational_focus": {},
  "governance_rules": {},
  "cockpit_density": { "max_widgets": 8 },
  "semantic_constraints": {}
}
```

Domínios base (podem estar parciais/vazios): `quality`, `sst`, `rh`, `environmental`, `maintenance`, `production`, `executive`.

---

## Domain weighting (exemplos)

| Perfil | Operational | Governance | Strategic |
|--------|-------------|------------|-----------|
| coordinator_quality | 70% | 20% | 10% |
| executive_director | 10% | 20% | 70% |

---

## Semantic domain protection

Bloquear contaminação cruzada (SST↔RH, executivo↔operador, industrial↔quality-native, ESG em perfil operacional). Integrar com `domainAuthority` / terminal lock existentes — **aditivo**.

---

## Payload `/dashboard/me`

```json
{
  "multi_domain_cognitive_health": {
    "semantic_fidelity": 0.0,
    "cross_domain_isolation": 0.0,
    "operational_usefulness": 0.0,
    "genericity_reduction": 0.0,
    "composition_stability": 0.0
  }
}
```

---

## Frontend `frontend/src/cognitiveRuntime/foundation/`

- `multiDomainResolver.js`
- `cockpitCompositionRuntime.js`
- `semanticIsolationRuntime.js`
- `operationalWeightRuntime.js`

Reutilizar widgets; sem novo dashboard; sem CSS novo.

---

## Flags (default off)

```env
IMPETUS_MULTI_DOMAIN_FOUNDATION=off
IMPETUS_COGNITIVE_ORCHESTRATION=off
IMPETUS_SEMANTIC_DOMAIN_RUNTIME=off
IMPETUS_MULTI_DOMAIN_OBSERVABILITY=on
```

---

## Testes

```bash
npm run test:multi-domain-foundation
npm run test:cognitive-orchestration
npm run test:semantic-domain-protection
npm run test:domain-weighting
npm run test:composition-stability
npm run test:cross-domain-runtime
```

---

## Relatório final

- Foundation multi-domain pronta?
- Runtime escala especialização?
- Semantic isolation estável?
- Orchestration funcional?
- Quais domínios prontos para cockpit nativo?

**Não iniciar Z.25–Z.27 sem Z.24 verde.**
