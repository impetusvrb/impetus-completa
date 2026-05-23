# Cognitive cockpit balancing (Z.23)

`coordinator_quality` — pesos oficiais via `phaseZ23FeatureFlags.domainWeights()`:

| Layer | Peso |
|-------|------|
| Operational | 70% |
| Governance | 20% |
| Strategic | 10% |

`cockpitDomainBalancer` ordena centros por `balanced_score = center.weight × domain_weight`.
