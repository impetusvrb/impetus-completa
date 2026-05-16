# Frontend Enterprise Stress Plan

> Plano técnico — NÃO implementar frontend ainda.
> Métricas, cenários e thresholds aceitáveis para validação de readiness.

---

## 1. Cenários de stress

### 1.1 Lazy Loading Massivo
| Parâmetro | Threshold |
|-----------|-----------|
| Chunk load time (cold) | ≤ 2000ms |
| Chunk load time (warm/cache) | ≤ 200ms |
| Concurrent chunk loads | ≥ 5 sem race |
| Retry after network fail | ≤ 3 tentativas |
| Bundle size main chunk | ≤ baseline + 5% |

**Cenários:**
- 10 lazy imports simultâneos
- Network throttle 3G → verificar graceful fallback
- Cache clear → reload sem regressão
- Domain chunk isolation: falha num chunk não afecta outros

### 1.2 Socket Reconnect Storm
| Parâmetro | Threshold |
|-----------|-----------|
| Reconnect latency | ≤ 5000ms |
| Message loss window | ≤ 5s |
| Topic resubscription | automática |
| State consistency após reconnect | 100% |
| Max reconnect attempts | 10 |

**Cenários:**
- Drop súbito de conexão → re-subscribe a todos os topics
- 50 reconnect events em 10s → backoff deve activar
- Workflow state sync após reconnect
- Presence state recovery

### 1.3 Offline Queue Pressure
| Parâmetro | Threshold |
|-----------|-----------|
| Queue persist latency (idb) | ≤ 50ms/op |
| Drain throughput | ≥ 10 req/sec |
| Duplicate prevention | 100% |
| Max queue size | 1000 entries |
| Drain recovery time | ≤ 10s após online |

**Cenários:**
- 100 mutations offline → drain completo
- Duplicate inject → deduplication
- Drain failure → retry with backoff
- Mixed online/offline transitions

### 1.4 Workflow Rendering Pressure
| Parâmetro | Threshold |
|-----------|-----------|
| Concurrent workflow updates | ≥ 50/sec |
| React Suspense recovery | ≤ 500ms |
| State manager subscriber notify | ≤ 5ms |
| Workflow list render (100 items) | ≤ 16ms/frame |

**Cenários:**
- 100 workflows activos simultâneos
- 50 updates/sec via realtime channel
- Suspense boundary recovery após chunk fail
- Subscriber cleanup on unmount

---

## 2. Performance thresholds

| Componente | Métrica | Threshold |
|-----------|---------|-----------|
| domainLazyLoader | prefetch overhead | ≤ 1ms/chunk |
| unifiedChannelManager | dispatch latency | ≤ 1ms/handler |
| workflowStateManager | subscriber notify | ≤ 5ms/update |
| offlineQueue | enqueue latency | ≤ 50ms |
| routeManifest | classify latency | ≤ 0.1ms |

---

## 3. Estratégia de medição

### Tools recomendadas
- **Chrome DevTools Performance** — frame drops, long tasks
- **Lighthouse CI** — core web vitals
- **React DevTools Profiler** — component renders
- **Network tab throttling** — 3G/offline simulation
- **heap snapshots** — memory leak detection

### Métricas primárias
- **TTI** (Time to Interactive): ≤ 3s em 4G
- **FCP** (First Contentful Paint): ≤ 1.5s
- **Bundle main chunk**: ≤ 500KB gzip
- **Cumulative chunk load**: ≤ 1MB total lazy

---

## 4. Acceptance criteria (Gate W6→Módulos Industriais)

✅ Todos os domain chunks carregam em < 2s  
✅ Socket reconecta automaticamente após drop  
✅ Offline queue drena sem duplicados  
✅ Workflow state manager estável sob 50 updates/sec  
✅ Memory heap estável (sem leak após 30min navegação)  
✅ Mobile 3G: degraded gracefully, offline-first activo  
