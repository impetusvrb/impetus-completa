# Quality Operational Runtime (Etapa 2) — Plano de Arquitectura

## Âmbito

Runtime **operacional** do domínio *quality* (camada dual-runtime): coleta de inspecções, evidências, scanner, offline-first, realtime shadow e kiosk — **sem** alterar `App.jsx`, design system canónico, ou enforcement WAVE7.

## Alinhamento Enterprise

| Onda | Uso nesta etapa |
|------|------------------|
| WAVE 1 | Eventos `quality.*` publicados via `publishQualityIndustrialEvent` → envelope industrial |
| WAVE 4 | Budget cognitivo preservado (UI de baixa densidade; sem dashboards executivos) |
| WAVE 5 | Código sob `frontend/src/domains/quality/*` e `backend/src/domains/quality/*` |
| WAVE 6 | Lazy barrel `operational-runtime/index.js`; integração `offline/` e `realtime/` |
| WAVE 7 | Compatível com ABAC/traceability (eventos + `actor_id` em metadata; sem authority no cliente) |

## Superfícies

### Backend

- **POST `/api/quality-operational/events`** — autenticado, `requireCompanyActive`; allowlist de tipos operacionais.
- **GET `/api/quality-operational/health`** — sempre disponível (indica `enabled` + sub-flags servidor).

### Frontend

- **`operational-runtime/`** — shells e fluxos UX industriais.
- **`offline/`** — fila qualidade dedicada (IndexedDB + prefixo por tenant) + compatibilidade com `VITE_OFFLINE_QUEUE_ENABLED` global quando aplicável.
- **`realtime/`** — tópico `QUALITY_OPERATIONS` e eventos `quality_operational_update` / `quality_inspection_delta`.

## Feature flags

### Servidor (`process.env`)

- `IMPETUS_QUALITY_OPERATIONAL_RUNTIME_ENABLED` (mestre API)
- `IMPETUS_QUALITY_OFFLINE_RUNTIME_ENABLED`
- `IMPETUS_QUALITY_SCANNER_RUNTIME_ENABLED`
- `IMPETUS_QUALITY_REALTIME_COLLECTION_ENABLED`
- `IMPETUS_QUALITY_KIOSK_RUNTIME_ENABLED`
- `IMPETUS_QUALITY_ATTACHMENT_RUNTIME_ENABLED`

### Cliente (`import.meta.env`)

Espelhar com prefixo `VITE_` para cada flag acima. Opcional: `VITE_IMPETUS_QUALITY_ULTRA_LOW_BANDWIDTH` (UI minimalista).

**Rollback:** desligar mestre + `VITE_*` → UI degrada para mensagens informativas; API responde 503 nas mutações.

## Fluxo operacional (feliz)

1. Operador abre shell (futura rota lazy) → `quality.inspection.started`.
2. Leituras scanner → `quality.scan.performed`.
3. Guardar rascunho → `quality.inspection.saved`.
4. Evidência → armazenamento IndexedDB + `quality.evidence.attached` (referência append-only).
5. Conclusão → `quality.inspection.completed`.
6. Reconnect → `quality.offline.sync_*` + dreno de fila qualidade.

## Offline

- Chaves `impetus:quality_op:*` **sempre** qualificadas com `company_id` UUID.
- Deduplicação por `idempotencyKey` na fila qualidade.
- Conflitos: `qualityOfflineConflictResolver.js` (shadow; sem promover estado servidor automaticamente no cliente).

## Kiosk

- Fullscreen opcional; PIN **não** substitui autenticação API — apenas UX de posto.
- Sessão: eventos `quality.kiosk.session_started` / `session_closed`.
- Inatividade: reset local (10 min default).

## Segurança

- Sem `localStorage` para blobs de evidência (apenas IndexedDB namespaced).
- Sem partilha de filas entre tenants.
- Sem bypass de workflow: transições permanecem no motor backend existente.

## Integração de rotas (equipa)

Sem alteração a `App.jsx` nesta entrega: importar lazy `domains/quality/operational-runtime` quando a rota enterprise modular for definida (WAVE6).

## Testes

- Backend: `npm run test:quality-operational-runtime` (pasta `backend/`).
- Frontend: `npm run test:quality-operational-runtime` (pasta `frontend/`).

## Eventos adicionados ao catálogo industrial

Ver `industrialEventCatalog.js` e `qualityDomainContract.js` CONTRACT v3.
