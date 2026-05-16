# Memory Leak Inspection Plan — Frontend Enterprise

> Plano técnico para inspeção de memory leaks no frontend Impetus.
> NÃO requer implementação imediata — executar antes dos módulos industriais.

---

## 1. Objectivos

- Garantir que nenhum componente React mantém referências após unmount
- Validar que subscriptions de realtime são limpas (unsubscribe)
- Verificar que o `workflowStateManager` não acumula workflows obsoletos
- Confirmar que `offlineQueue` não retém entradas após drain bem-sucedido

---

## 2. Heap Analysis Strategy

### 2.1 Chrome DevTools — Memory Tab

**Procedimento:**
1. Abrir Chrome com `--enable-precise-memory-info`
2. Navegar para a área operacional
3. Tirar `Heap Snapshot 1` (baseline)
4. Executar carga: 50 chatbot interactions + 20 workflow transitions
5. Navegar para admin e voltar 3x (exercer lazy loading)
6. Force GC (botão "Collect garbage")
7. Tirar `Heap Snapshot 2`
8. Comparar: `Objects allocated between snapshots` deve ser < 1MB

**Thresholds:**
| Operação | Heap Delta Aceitável |
|----------|---------------------|
| 50 chats | < 5MB |
| 20 workflow transitions | < 2MB |
| 3x lazy load/unload | < 1MB |

### 2.2 Node.js heap (para testes CJS)

```bash
node --expose-gc --max-old-space-size=512 workflowRenderingStress.cjs
```

Verificar delta < 20MB após 500 lifecycle cycles.

---

## 3. React Leak Checklist

### 3.1 Socket/Realtime Subscriptions
- [ ] `useUnifiedRealtime` chama `unsubscribe()` no cleanup do `useEffect`
- [ ] `useWorkflowContext` cancela subscriptions no unmount
- [ ] `unifiedChannelManager` não retém handlers após unsubscribe

### 3.2 Workflow State Manager
- [ ] `workflowStateManager.subscribe()` retorna unsub function
- [ ] `useWorkflowContext` chama unsub no cleanup
- [ ] Workflows com status `completed/failed` são removidos em < 5min

### 3.3 Offline Queue
- [ ] `useOfflineStatus` limpa event listeners (`online`/`offline`) no unmount
- [ ] `offlineQueue.drain()` remove entradas após sucesso
- [ ] IndexedDB não acumula entradas inválidas/expiradas

### 3.4 Service Worker
- [ ] `serviceWorkerBridge.register()` não re-registra em cada render
- [ ] Mensagens SW não ficam em fila ilimitada

---

## 4. Automated Leak Detection

### 4.1 Jest + jest-extended (quando implementado)

```js
it('should not leak after unmount', async () => {
  const { unmount } = render(<WorkflowPanel />);
  const before = process.memoryUsage().heapUsed;
  for (let i = 0; i < 100; i++) { unmount(); render(<WorkflowPanel />); }
  global.gc?.();
  const after = process.memoryUsage().heapUsed;
  expect(after - before).toBeLessThan(5 * 1024 * 1024); // 5MB
});
```

### 4.2 Playwright + CDP (Continuous)

```js
// Em CI: verificar heap após cada teste e2e
const cdp = await page.context().newCDPSession(page);
const { result } = await cdp.send('Runtime.evaluate', { expression: 'performance.memory.usedJSHeapSize' });
expect(result.value).toBeLessThan(50 * 1024 * 1024); // 50MB
```

---

## 5. Acceptance Criteria

✅ Zero detached DOM nodes após navegação completa  
✅ Zero subscriptions ativas após component unmount  
✅ Heap estável (< 10% crescimento) após 30min de navegação  
✅ `workflowStateManager._subscribers.size === 0` após todos componentes unmounted  
✅ `offlineQueue.size === 0` após drain completo  
