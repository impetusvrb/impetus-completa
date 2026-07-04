# SEC-14 — Arquitectura Adaptive Blocking

## Visão geral

```
SEC-01 Observatory ──┐
SEC-02 Correlation ──┤
SEC-03 Threat Intel ─┤
SEC-04 Runtime Int. ─┤
SEC-05 Notification ─┼──► secBlockingCollector (read-only)
SEC-06 Response ─────┤
SEC-07 SOC ──────────┤
SEC-10 Active Def. ──┤
SEC-11 Adaptive Prot.┤
SEC-12 Validation ───┤
SEC-13 Controlled ───┘
         │
         ▼
  adaptiveBlockingEngine
         │
    ┌────┴────┬──────────┬────────────┐
    ▼         ▼          ▼            ▼
reputation  behavior  fingerprint  blacklist
    │         │          │            │
    └────┬────┴──────────┴────────────┘
         ▼
 blockingRecommendationService
         │
         ▼
  adaptive_blocking_v1 DTO
         │
         ▼
 GET /api/audit/security-adaptive-blocking
```

## Estrutura de pastas

```
backend/src/securityAdaptiveBlocking/
├── config/securityAdaptiveBlockingFlags.js
├── collectors/secBlockingCollector.js
├── dto/adaptiveBlockingDto.js
├── engine/
│   ├── adaptiveBlockingEngine.js
│   ├── reputationService.js
│   ├── adaptiveBlacklistService.js
│   ├── behaviorAnalysisService.js
│   ├── fingerprintService.js
│   └── blockingRecommendationService.js
├── metrics/adaptiveBlockingMetrics.js
├── runtime/adaptiveBlockingRuntime.js
├── store/adaptiveBlockingStore.js
└── index.js
```

## Desacoplamento

- Nenhum módulo SEC-01→SEC-13A importa `securityAdaptiveBlocking`
- SEC-14 consome via `require()` read-only nos collectors
- Store in-memory por processo — sem persistência externa

## Ciclo de avaliação

1. Colector obtém incidentes certificados (SEC-02)
2. Behavior Engine analisa padrões por incidente
3. Reputation Engine calcula score por IP
4. Fingerprint Engine gera perfis técnicos
5. Blacklist Service classifica estado (registro only)
6. Recommendation Service gera acções com `auto_execute: false`
7. Dashboard DTO consolidado para audit endpoint

## Transição predictiva

SEC-14 representa a passagem de segurança **reactiva** (detectar/responder) para **preditiva** (reputação + comportamento + recomendação graduada), mantendo reversibilidade total nesta fase.
