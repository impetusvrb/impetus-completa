# Sidebar Terminal Hardening (Z.16)

## Problema

Reinjeção tardia via `safeMergeSafetyPublicationIntoMenu`, `safeMergeEnvironmentPublicationIntoMenu` e `buildHybridMenu` no frontend.

## Solução

1. Backend: `runGovernanceTerminalStage` congela `visible_modules` e `sidebar_governance_runtime`.
2. Frontend: `runtimeTerminalGovernance/terminalGovernanceGuard.js` — `shouldSkipLegacyPipeline()`.
3. `sidebarGovernanceAdapter.js` — ramo terminal sem legacy pipeline.

## Injectors ignorados quando locked

- `buildHybridMenu`
- `safeMergeSafety*`, `safeMergeEnvironment*`, `safeMergeLogistics*`
- `sidebarAugmentation`, `contextual_enrich`, `cockpitModuleFallbacks`

Código legacy **mantido**; execução **saltada** quando `governance_freeze_state.legacy_pipeline_disabled === true`.
