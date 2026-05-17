# Quality — Enterprise Navigation

Integração no **Layout** após `buildHybridMenu`:

- `mergeQualityPublicationIntoMenu` recebe `user`, `visibleModules`, `serverPublication` (opcional).
- Caminhos com `?view=` preservam links distintos no menu.
- Telemetria cliente: `qualityOperationalTelemetry.js` (`quality_navigation_*`, `quality_menu_injected_*`).
