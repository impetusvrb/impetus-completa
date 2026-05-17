# Quality — Observabilidade de navegação

Métricas consolidadas (nomes em `shared/domain-publication/domainPublicationMetrics.cjs`):

| Métrica | Onde |
|---------|------|
| quality_navigation_publication_ms | serviço de contexto navegação |
| quality_navigation_denied_total | cliente (qualityOperationalTelemetry) |
| quality_menu_injection_total | cliente |
| quality_route_resolution_ms | amostras cliente |
| quality_lazy_chunk_load_ms | amostras cliente |
| quality_audience_resolution_ms | resolução de menu |
| quality_publication_failures_total | cliente |
| quality_publication_shadow_total | cliente e preview shadow |
| quality_activation_safe_check_ms | health service |

Rever cardinalidade de labels no backend antes de activação em larga escala.
