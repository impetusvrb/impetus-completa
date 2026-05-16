# Mobile Low-Bandwidth Validation Plan — Frontend Enterprise

> Estratégia de validação para dispositivos móveis e redes degradadas.
> Executar antes do desenvolvimento dos módulos industriais.

---

## 1. Objectivos

- Confirmar comportamento offline-first em redes 3G/2G
- Validar chunk loading em baixa largura de banda
- Garantir que a UI opera em modo degradado sem crash
- Verificar offline queue e sync recovery em mobile

---

## 2. Estratégia de Simulação

### 2.1 Chrome DevTools — Network Throttling

| Perfil | Download | Upload | Latência |
|--------|----------|--------|----------|
| 4G (baseline) | 20 Mbps | 10 Mbps | 28ms |
| 3G | 1.5 Mbps | 750 Kbps | 100ms |
| 2G / Slow | 400 Kbps | 400 Kbps | 300ms |
| Offline | 0 | 0 | — |

### 2.2 Lighthouse CI Mobile Profiles

```bash
npx lighthouse http://localhost:5173 \
  --emulated-form-factor=mobile \
  --throttling-method=simulate \
  --throttling.rttMs=150 \
  --throttling.throughputKbps=1638
```

---

## 3. Cenários de Validação

### 3.1 Chunk Recovery em 3G

**Teste:**
1. Throttle → 3G no DevTools
2. Navegar para `/quality` (domain chunk lazy)
3. Verificar: chunk carrega em < 5s (SLA 3G)
4. Verificar: Suspense fallback visível durante load

**Threshold:** `domain-quality` chunk ≤ 5000ms em 3G

### 3.2 Offline Fallback

**Teste:**
1. Abrir aplicação em 4G (cache warm)
2. Colocar modo Offline
3. Navegar pela UI existente
4. Tentar enviar mensagem → deve entrar em `offlineQueue`
5. Reconectar → drain automático deve ocorrer

**Threshold:** zero crashes em modo offline; queue drena em < 10s após reconexão

### 3.3 Service Worker Cache

**Teste:**
1. `VITE_SW_ENABLED=true` no build
2. Verificar assets estáticos servidos de cache em offline
3. Verificar API calls falham gracefully (não bloqueiam UI)

### 3.4 Realtime Degraded Mode

**Teste:**
1. Socket.IO configurado com `reconnection: true`, `reconnectionDelay: 1000`
2. Simular drops intermitentes (10% packet loss via tc/netem)
3. Verificar auto-reconnect funciona
4. Verificar workflow state sync após reconnect

---

## 4. Thresholds Aceitáveis Mobile

| Métrica | 4G | 3G | 2G |
|---------|----|----|-----|
| TTI (Time to Interactive) | < 2s | < 5s | < 10s |
| Main chunk size (gzip) | ≤ 500KB | ≤ 500KB | ≤ 500KB |
| Domain chunk size | ≤ 100KB | ≤ 100KB | ≤ 100KB |
| Socket reconnect time | < 2s | < 5s | < 10s |
| Offline queue drain | < 3s | < 8s | < 15s |
| FCP (First Contentful Paint) | < 1s | < 2.5s | < 5s |

---

## 5. Degraded Mode UI Checklist

- [ ] Spinner/skeleton visível durante chunk load
- [ ] Toast "Sem conexão" quando offline
- [ ] Formulários salvam localmente ao submeter offline
- [ ] Sync indicator quando online + drenando queue
- [ ] Socket reconnect indicator no header
- [ ] Workflows em estado "sync pendente" visíveis

---

## 6. Acceptance Criteria

✅ UI acessível em 3G sem regressão de funcionalidade  
✅ Offline mode: zero crashes, queue activa  
✅ Drain automático ao reconectar  
✅ Service Worker cacheia assets estáticos  
✅ Domain chunks carregam em < 5s em 3G  
✅ Bundle principal ≤ 500KB gzip  
