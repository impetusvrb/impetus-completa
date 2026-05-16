# Quality Operational Runtime — Validação

## Critérios verificados (automatizados)

| Área | Teste | Comando |
|------|--------|---------|
| Catálogo industrial | `quality.inspection.saved`, `evidence.attached`, `offline.sync_*`, `scan.performed`, `kiosk.session_*` em strict | `backend npm run test:quality-operational-runtime` |
| Router scanner | Normalização + roteamento declarativo | `frontend npm run test:quality-operational-runtime` |
| Build Vite | Novos `.jsx` compilam | `frontend npm run build` |

## Checklist manual recomendado

1. **Tenant isolation:** dois utilizadores de empresas diferentes — filas IndexedDB não se misturam (inspeccionar DevTools → Application → IDB).
2. **API 503:** `IMPETUS_QUALITY_OPERATIONAL_RUNTIME_ENABLED=false` → POST `/events` retorna `QUALITY_OPERATIONAL_OFF`; GET `/health` mostra `enabled: false`.
3. **Backbone:** com `IMPETUS_INDUSTRIAL_EVENTS_ENABLED=true`, publicar `quality.inspection.saved` e verificar outbox/DLQ conforme política de ambiente.
4. **Offline:** simular `offline` no DevTools; guardar inspeção com `VITE_IMPETUS_QUALITY_OFFLINE_RUNTIME_ENABLED=true` — entrada na fila qualidade.
5. **Realtime:** com socket e flags realtime ON, emitir `quality_inspection_delta` não deve alterar estado de workflow no servidor (shadow).
6. **Kiosk:** verificar fullscreen + saída limpa sem erro de consola.
7. **Attachment:** blob guardado em IDB + evento com `evidence_ref` (sem expor bytes no evento).

## Observabilidade

- Métricas existentes WAVE2 absorvem publicações industriais; correlação propagada no envelope (`correlation_id`, `trace_id`, `workflow_id`).

## Regressão

- `App.jsx` intocado.
- Rotas existentes intocadas até integração explícita WAVE6.
- Governance core intocado; apenas nova rota `quality-operational` aditiva.

## Próximos passos (fora desta etapa)

- Endpoint dedicado de upload de evidências para dreno de blobs IDB → object storage auditável.
- Testes e2e browser (Playwright) para reconnect storm e memory.
