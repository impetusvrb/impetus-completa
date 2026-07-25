# PERFORMANCE BASELINE 2026 — IMPETUS Stabilization

**Auditoria:** STABILIZATION_AUDIT_001  
**Data medição:** 2026-07-13T17:54 UTC  
**Ambiente:** Produção local (PM2), probe sem autenticação  
**Restrição:** Nenhuma alteração de arquitectura — apenas registo de evidências

---

## 1. Runtime snapshot

| Processo PM2 | Status | Porta | Uptime (snapshot) |
|--------------|--------|-------|-------------------|
| impetus-backend | online | 4000 | ~23 min (último restart) |
| impetus-frontend | online | 3000 | ~5 h |
| impetus-admin-portal | online | 5174 | ~5 h |

---

## 2. Tempos de resposta — APIs (localhost:4000)

Medição: Node.js `http.get`, sem token JWT.

| Endpoint | HTTP | Tempo (ms) | Notas |
|----------|------|------------|-------|
| `GET /health` | 200 | **1040–3073** | ⚠ Lento — probe integrações IA (OpenAI, Anthropic, Vertex, Akool) |
| `GET /api/system/health/deep` | 200 | **10–37** | ✅ Rápido — readiness interno |
| `GET /api/dashboard/me` | 401 | 17–19 | Auth required (rota existe) |
| `GET /api/dashboard/trend` | 401 | 19 | Auth required |
| `GET /api/dashboard/maintenance/summary` | 401 | 19 | Auth required (rota existe) |
| `GET /api/admin/users` | 401 | 20–30 | Auth required |
| `GET /api/admin/logs/audit` | 401 | 22 | Auth required (path correcto) |
| `GET /api/admin/audit-logs` | 404 | 30 | ⚠ Path incorrecto (legacy probe) |
| `GET /api/implementation-guide/status` | 404 | 31 | Endpoint não exposto |

### Análise `/health` lento

Payload inclui:
```json
{
  "integrations": {
    "cache_ttl_ms": 45000,
    "openai": {"status":"up"},
    "anthropic": {"status":"up"},
    "google_vertex": {"status":"up"},
    "akool": {"status":"down","detail":"AKOOL_API_KEY ausente"}
  }
}
```

**Causa provável:** Probe síncrono/await de APIs externas no cold cache.  
**Impacto:** Health checks de load balancer podem timeout se threshold < 3s.  
**Recomendação (fase fix):** Separar `/health` (liveness rápido) de `/health/integrations` (readiness completo).

---

## 3. Tempos de abertura — frontends

| Recurso | HTTP | Tempo (ms) | Notas |
|---------|------|------------|-------|
| Frontend Vite `:3000/` | 200 | **~110** | HTML shell |
| Admin-portal `:5174/` | 302 | **~99** | Redirect login |
| Nginx `:80` (localhost) | — | ~2 | Sem vhost match |

**Nota:** Tempos de renderização React pós-hydration requerem browser profiling (não executado nesta fase).

---

## 4. Baseline estimada — páginas admin (lazy-loaded)

Baseado em: lazy routes em `App.jsx`, tamanho de bundle por chunk, ausência de build profiling nesta fase.

| Página | Linhas JSX | Complexidade | Tempo estimado 1.º paint* |
|--------|------------|--------------|---------------------------|
| AdminUsers | 782 | Alta (form + table) | 300–800 ms |
| AdminStructural | 1171 | Muito alta | 500–1200 ms |
| AdminWarehouse | 984 | Alta | 400–900 ms |
| AdminLogistics | 660 | Alta | 400–800 ms |
| AdminEquipmentLibrary | 545 | Média-alta | 300–700 ms |
| RolloutCenterHub | 187 | Média | 200–500 ms |
| CognitiveGovernance | 991 | Alta (read-only) | 400–900 ms |
| SecurityDashboard | 1104 | Muito alta (mapa SVG) | 600–1500 ms |

*\*Estimativa estática — validar com Lighthouse/Web Vitals na fase de correção.*

---

## 5. Dashboards — endpoints críticos

| Dashboard | API principal | Auth | Status probe |
|-----------|---------------|------|--------------|
| Centro Comando | `/api/dashboard/me`, `/api/dashboard/trend` | JWT | 401 (rotas existem) |
| Manutenção | `/api/dashboard/maintenance/*` | JWT | 401 (rotas existem) |
| SOC | `/api/security/*` (admin-portal) | Admin JWT | Não medido (portal separado) |
| Nexus IA | `/api/nexus-ia/*`, `/api/nexus-wallet/*` | JWT | Não medido sem auth |
| Cognitive Governance | `/api/cognitive-governance/*` | JWT + flag | Não medido sem auth |

---

## 6. Warnings React / Console (análise estática)

| Categoria | Achados | Severidade |
|-----------|---------|------------|
| Hooks após early return | 0 em SecurityDashboard (R8A corrigido) | ✅ |
| Missing keys em listas | Não varrido exaustivamente | — |
| useEffect deps | AdminAuditLogs L55: `[activeTab, pagination.offset]` — loadLogs não em deps (eslint warn potencial) | P3 |
| StrictMode double render | Activo em dev — renders duplicados esperados | Info |

**Nota:** Warnings runtime requerem `npm run dev` + browser console capture — pendente fase E2E.

---

## 7. Requisições repetidas (padrões detectados)

| Módulo | Padrão | Risco |
|--------|--------|-------|
| Layout.jsx | `fetchNavigationPublicationContextsStaggered` no mount | Múltiplas APIs paralelas no load global |
| useVisibleModules | `dashboard.getMe()` + cache | OK se memoizado |
| AdminAuditLogs | `loadLogs` + `getStats` separados no mount | 2 requests (aceitável) |
| ImplementationGuide | 5+ APIs paralelas para score | Burst no 1.º load |
| SecurityDashboard | Polling snapshot + GeoIP async | Documentado SEC-001 (by design) |

---

## 8. Renders desnecessários (análise estática)

| Componente | Observação | Prioridade |
|------------|------------|------------|
| AdminStructural | Múltiplos sub-componentes com state local — OK | — |
| NexusIACustos | `useMemo`/`useCallback` presentes | ✅ |
| SecurityDashboard | `useCallback` em handlers de mapa/drawer | ✅ |
| Layout.jsx | Re-render em publication contexts | P3 |

---

## 9. Métricas alvo sugeridas (fase fix)

| Métrica | Baseline actual | Alvo |
|---------|-----------------|------|
| `/health` p95 | ~3000 ms | < 200 ms (liveness) |
| `/api/system/health/deep` p95 | ~40 ms | < 100 ms |
| Frontend TTFB | ~110 ms | < 150 ms |
| Admin page LCP (est.) | 600–1500 ms | < 2500 ms |
| API autenticada p95 | N/A | < 500 ms |

---

## 10. Limitações desta baseline

1. **Sem JWT:** tempos de APIs autenticadas não medidos
2. **Sem browser:** LCP, FID, CLS não capturados
3. **Sem carga:** single request, sem concorrência
4. **Snapshot único:** variância não calculada (recomendado 100 samples na fase fix)

---

## 11. Comandos de reprodução

```bash
# Health timing
curl -s -w "\nTIME:%{time_total}s\n" http://127.0.0.1:4000/health

# Deep health
curl -s -w "\nTIME:%{time_total}s\n" http://127.0.0.1:4000/api/system/health/deep

# Frontend TTFB
curl -s -o /dev/null -w "HTTP:%{http_code} TIME:%{time_total}s\n" http://127.0.0.1:3000/
```

---

*Baseline read-only. PM2 e PostgreSQL não foram alterados.*
