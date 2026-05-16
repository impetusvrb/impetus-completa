# Quality — Integração Enterprise Runtime (WAVE 6)

## Âncora de routing

O React Router 6 da aplicação está centralizado em `frontend/src/App.jsx`. Não existe segundo `BrowserRouter` montável sem duplicar o runtime. A integração **aditiva** do Quality Operational usa:

- Prefixo: `/app/quality/operational` (alinhado a `DOMAIN_ROUTES.quality.routePrefix` em registo incremental).
- **Lazy loading**: `QualityOperationalLayout` + páginas filhas carregadas com `React.lazy` e `Suspense` (`PageLoader`).
- **Gates**: `PrivateRoute` → `SetupGuard` → `ColaboradorRouteGuard` → `FactoryTeamMemberGate` (mesmo padrão do dashboard operacional).
- **Flag mestre**: `VITE_IMPETUS_QUALITY_OPERATIONAL_RUNTIME_ENABLED` — com flag `false`, o layout redireciona para `/app` **sem** montar conteúdo operacional (chunk das páginas filhas não é necessário após redirect; o layout ainda descarrega o módulo leve de gate).

## Contexto tenant (Outlet)

`QualityOperationalShell` suporta `renderOutlet` e passa `{ companyId, stationId }` via `Outlet context` para evitar `cloneElement` sobre `<Outlet />`. Componentes filhos resolvem contexto com `useOutletContext()`.

## Flags frontend (enterprise)

| Variável | Efeito |
|----------|--------|
| `VITE_IMPETUS_QUALITY_OPERATIONAL_RUNTIME_ENABLED` | Rota útil + UI operacional |
| `VITE_IMPETUS_QUALITY_OFFLINE_RUNTIME_ENABLED` | Fila offline qualidade |
| `VITE_IMPETUS_QUALITY_REALTIME_ENABLED` | Realtime (alias de `VITE_IMPETUS_QUALITY_REALTIME_COLLECTION_ENABLED`) |
| `VITE_IMPETUS_QUALITY_KIOSK_ENABLED` | Kiosk (alias de `VITE_IMPETUS_QUALITY_KIOSK_RUNTIME_ENABLED`) |
| `VITE_IMPETUS_QUALITY_OPERATIONAL_SHADOW_MODE` | Preload + métricas passivas (ver doc shadow) |
| `VITE_IMPETUS_QUALITY_OPERATIONAL_DIAGNOSTICS` | Painel diagnostics no workspace |

Com **realtime OFF**, `subscribeQualityOperations` não subscreve; canal unificado não é inicializado pelo domínio qualidade.

## Backend — fan-out Socket.IO (bridge)

Ficheiro: `backend/src/domains/quality/realtime/qualityOperationalSocketFanout.js`

- Condicionado a `IMPETUS_QUALITY_REALTIME_COLLECTION_ENABLED=true`.
- Emite para `io.to('company:' + companyId)`:
  - `quality_operational_update`
  - `quality_inspection_delta` (quando `event_name` começa por `quality.inspection.`)

Não altera `chatSocket.js` nem handlers legados — apenas `emit` aditivo pós-publicação HTTP em `routes/qualityOperational.js`.

## Hardening anexos (sem object storage)

- Hash SHA-256 no staging (meta).
- Retry exponencial leve na publicação do evento `quality.evidence.attached`.
- Limpeza opcional de staging antigo: `pruneOrphanStagedEvidence` (evidências locais > TTL).
- UI: barra de progresso + «Repetir envio».

## Observabilidade aditiva

`frontend/src/observability/qualityOperationalTelemetry.js` — contadores em memória + `sessionStorage` para reconnects e tempo de probe shadow. Não altera o pipeline WAVE2 core.

## Rollback

1. `VITE_IMPETUS_QUALITY_OPERATIONAL_RUNTIME_ENABLED=false` + rebuild frontend.
2. Remover entradas de rota em `App.jsx` apenas se se quiser URL inacessível (comportamento por defeito: redirect).
3. `IMPETUS_QUALITY_REALTIME_COLLECTION_ENABLED=false` — sem fan-out socket.

## Testes

- Backend: `npm run test:quality-enterprise-runtime` (em `backend/`).
- Frontend: `npm run test:quality-enterprise-runtime` (em `frontend/`).
