# WAVE 6 — Plano: Frontend Enterprise Modular

> Preparação UX para expansão industrial. **Não** substitui frontend existente nem altera UX actual.

## 1. Frontend topology

```
frontend/src/
├── domains/                 ← registry frontend (espelha backend WAVE 5)
│   ├── domainRegistry.js
│   ├── domainLazyLoader.js
│   └── index.js
├── routing/                 ← segmentação de rotas
│   ├── routeManifest.js     ← operational vs management vs admin
│   └── DomainRoute.jsx      ← wrapper domain-aware (só scaffolding)
├── offline/                 ← offline-first base (idb-keyval já instalado)
│   ├── offlineQueue.js
│   ├── useOfflineStatus.js
│   └── serviceWorkerBridge.js
├── realtime/                ← canal unificado (sobre socket.io existente)
│   ├── unifiedChannelManager.js
│   ├── realtimeTopics.js
│   └── useUnifiedRealtime.js
└── workflow/                ← workflow-aware frontend
    ├── workflowStateManager.js
    └── useWorkflowContext.js
```

## 2. Routing strategy

| Segmento | Prefixo | Loader | Bundle |
|----------|---------|--------|--------|
| Auth | `/` | immediate | vendor |
| Operational | `/app` (não-admin) | lazy | ops |
| Management | `/app/admin`, `/app/settings` | lazy | mgmt |
| Industrial | `/app/industrial/*` | domain-lazy | domain-{name} |

## 3. Bundle strategy (vite manualChunks)

- `vendor` — react, react-dom, router (existente)
- `charts` — recharts (existente)
- `three` — three.js (existente)
- `ops-core` — dashboard, chat, operational (novo)
- `mgmt-core` — admin pages (novo)
- `domain-quality` — future quality pages (placeholder)
- `domain-logistics` — future logistics pages (placeholder)

## 4. Offline strategy

- `useOfflineStatus` — `navigator.onLine` + event listeners
- `offlineQueue` — fila IndexedDB (idb-keyval) para mutações offline
- `serviceWorkerBridge` — registo SW opt-in (sem SW criado ainda)
- Flag: `VITE_OFFLINE_QUEUE_ENABLED` (default false)

## 5. WebSocket strategy

- Canal unificado `unifiedChannelManager` — singleton sobre socket.io existente
- Topics declarativos: `CHAT`, `OPERATIONAL`, `WORKFLOW`, `ALERTS`, `PRESENCE`
- `useUnifiedRealtime(topic)` — hook por topic (zero breaking change)
- Existente `useChatSocket` continua intacto

## 6. Rollout plan

1. Módulos criados mas **não** importados por `App.jsx`
2. Staging: `VITE_OFFLINE_QUEUE_ENABLED=true`
3. Novos domínios industriais usam `domainLazyLoader`
4. vite bundle chunks activos no próximo `npm run build`

## 7. Gate W6→W7

- Bundle size main ≤ legado + 5%
- Offline queue operacional em staging
- SW bridge registado sem erros
- Zero breaking changes em rotas existentes
