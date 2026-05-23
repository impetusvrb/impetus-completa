# Z.24 — Multi-Domain Cognitive Cockpit Foundation

**Data:** 2026-05-22
**Fase:** Z.24 — Domain Foundation
**Dependências:** Z.18 → Z.19 → Z.20 → Z.21 → Z.22 → Z.23

---

## Objectivo

Transformar o modelo quality-native da Z.23 numa **foundation multi-domínio** capaz de escalar a especialização cognitiva para todos os domínios industriais: quality, safety, hr, environmental, maintenance, production e executive.

## Arquitectura

```
Identity Resolution → Governance Resolution → Domain Resolution
    → Block Composition → Operational Weighting → Semantic Isolation
    → Orchestration → Density Control → Governed Cockpit Runtime
```

## Componentes

### Registry (`domainFoundation/registry/`)

| Módulo | Função |
|--------|--------|
| `cognitiveDomainRegistry.js` | Registry canónico de 7 domínios cognitivos |
| `domainBlockRegistry.js` | Resolve blocos por domínio com weighting |
| `cockpitCompositionRegistry.js` | Matriz persona×domínio e composition config |
| `domainSemanticProfiles.js` | Resolve domínio a partir de profile/functional_area |

### Runtime (`domainFoundation/runtime/`)

| Módulo | Função |
|--------|--------|
| `multiDomainCockpitResolver.js` | Resolve cockpit multi-domínio para utilizador |
| `domainCompositionRuntime.js` | Compõe blocos por domínio e perfil |
| `domainWeightBalancer.js` | Balança pesos operacional/governance/strategic |
| `crossDomainProtection.js` | Impede contaminação cross-domain |
| `semanticDomainResolver.js` | Resolve e valida fidelidade semântica |
| `adaptiveCompositionSupervisor.js` | Supervisiona composição completa |

### Orchestration (`domainFoundation/orchestration/`)

| Módulo | Função |
|--------|--------|
| `cognitiveOrchestrationEngine.js` | Motor principal de orquestração |
| `cockpitPriorityResolver.js` | Resolve prioridade visible/deferred |
| `operationalFocusResolver.js` | Calcula foco operacional |
| `governanceAwareComposer.js` | Compõe com governance-awareness |
| `domainRuntimeBalancer.js` | Controla densidade runtime |

### Observability (`domainFoundation/observability/`)

| Módulo | Função |
|--------|--------|
| `domainCompositionTelemetry.js` | Telemetria de composição |
| `semanticIsolationMetrics.js` | Métricas de isolamento semântico |
| `cognitiveCompositionHealth.js` | Health score multi-domínio |

## Matriz de Weighting Oficial

| Persona | Operacional | Gestão | Estratégico |
|---------|-------------|--------|-------------|
| Operador | 95% | 5% | 0% |
| Supervisor | 85% | 10% | 5% |
| Coordenador | 70% | 20% | 10% |
| Gerente | 40% | 40% | 20% |
| Director | 10% | 30% | 60% |
| Executivo | 5% | 15% | 80% |

## Domínios Registados

| Domínio | Maturity | Cockpit Ready |
|---------|----------|---------------|
| quality | native | SIM |
| safety | foundation | NÃO |
| hr | foundation | NÃO |
| environmental | foundation | NÃO |
| maintenance | foundation | NÃO |
| production | foundation | NÃO |
| executive | foundation | NÃO |

## Feature Flags

```env
IMPETUS_MULTI_DOMAIN_FOUNDATION=shadow   # off|shadow|controlled|active
IMPETUS_COGNITIVE_ORCHESTRATION=shadow    # off|shadow|controlled|active
IMPETUS_SEMANTIC_DOMAIN_RUNTIME=shadow    # off|shadow|controlled|active
IMPETUS_MULTI_DOMAIN_OBSERVABILITY=on     # on|off
```

## Cognitive Health Score

```json
{
  "multi_domain_cognitive_health": {
    "semantic_fidelity": 0.0-1.0,
    "cross_domain_isolation": 0.0-1.0,
    "operational_usefulness": 0.0-1.0,
    "genericity_reduction": 0.0-1.0,
    "composition_stability": 0.0-1.0
  }
}
```

## Testes

63/63 aprovados:
- Domain Registry: 9 tests
- Domain Weighting: 4 tests
- Semantic Isolation: 3 tests
- Semantic Profiles: 4 tests
- Composition Registry: 4 tests
- Block Registry: 2 tests
- Cross-Domain Protection: 3 tests
- Weight Balancer: 1 test
- Adaptive Supervisor: 6 tests
- Orchestration Engine: 2 tests
- Priority Resolver: 2 tests
- Operational Focus: 2 tests
- Governance Composer: 2 tests
- Density: 1 test
- Health: 3 tests
- Semantic Fidelity: 3 tests
- Leakage: 3 tests
- Executive Isolation: 2 tests
- Determinism: 3 tests
- Feature Flags: 4 tests

## Garantias

- Zero leakage cross-domain
- Zero executive contamination
- Zero semantic contamination
- Determinismo preservado
- Governance intacta
- Composição estável
- Rollback safe (flags off reverte a shadow/off)
- Regressão Z.19–Z.23: 82/82 testes verdes
