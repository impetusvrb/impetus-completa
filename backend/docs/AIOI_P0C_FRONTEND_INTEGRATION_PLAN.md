# AIOI-P0C — Frontend Integration Plan

**Data:** 2026-06-12  
**Fase:** ETAPA C.2  
**Modo:** OPERATIONAL ONLY · UI ONLY · NO COGNITIVE ACTIVATION  

---

## 1. Localização da Integração

### Dashboard CEO — CentroComando

| Componente | Path | Status |
|-----------|------|:------:|
| `CentroComando.jsx` | `frontend/src/features/dashboard/centroComando/CentroComando.jsx` | ✅ Atualizado |
| `LayoutPorCargo.js` | `frontend/src/features/dashboard/centroComando/LayoutPorCargo.js` | ✅ Atualizado |
| `WidgetAIOIQueue.jsx` | `frontend/src/features/dashboard/centroComando/WidgetAIOIQueue.jsx` | ✅ Criado |
| `CentroComando.css` | `frontend/src/features/dashboard/centroComando/CentroComando.css` | ✅ Atualizado |
| `services/api.js` | `frontend/src/services/api.js` | ✅ Atualizado |

---

## 2. Padrões Visuais Reutilizados

| Padrão | Origem | Aplicado |
|--------|--------|:--------:|
| `.cc-widget` | `CentroComando.css` | ✅ Widget herda a classe base |
| `cc-shimmer` animation | `CentroComando.css` | ✅ Skeleton loader |
| `var(--cyan)` accent | `tokens.css` | ✅ Header, badges, indicadores |
| `var(--red)` / `var(--amber)` | `tokens.css` | ✅ Critical / High bands |
| `var(--font-mono)` | `tokens.css` | ✅ Labels técnicos, scores |
| `var(--bg-panel)` | `tokens.css` | ✅ Fundo dos itens |
| `letter-spacing + uppercase` | DS Industrial 4.0 | ✅ Títulos e labels |
| Border-radius ≤ 8px | DS Industrial 4.0 | ✅ 2–4px em todos os elementos |

---

## 3. Componentes Reutilizáveis Identificados

| Componente | Path | Relevante para |
|-----------|------|----------------|
| `ModuleErrorBoundary` | `components/ModuleErrorBoundary.jsx` | Error boundary global (já protege widgets) |
| `useCachedFetch` | `hooks/useCachedFetch.js` | Cache (não usado no widget por design — queue deve ser fresh) |
| Layout grid CSS | `CentroComando.css` | Grid 4 colunas para posicionamento |
| `cc-widget--error` | `CentroComando.css` | Estado de erro padronizado |

---

## 4. API Service Adicionado

```javascript
// frontend/src/services/api.js
export const aioi = {
  health:       () => api.get('/aioi/health'),
  getQueue:     (params) => api.get('/aioi/queue', { params }),
  getQueueBundle: (params) => api.get('/aioi/queue/bundle', { params })
};
```

---

## 5. Registro no CentroComando

```javascript
// WIDGET_COMPONENTS (CentroComando.jsx)
import WidgetAIOIQueue from './WidgetAIOIQueue';

const WIDGET_COMPONENTS = {
  // ... outros widgets ...
  aioi_queue: WidgetAIOIQueue
};
```

---

## 6. Layout CEO — Posição do Widget

```javascript
// LayoutPorCargo.js — CEO layout
// AIOI-P0C: Fila Executiva CEO na posição de destaque (row 0 col 0 width 2)
if (r === 'ceo' || r === 'admin' || r.includes('execut')) {
  return [
    { id: WIDGET_IDS.AIOI_QUEUE, label: 'Fila Executiva CEO', position: pos(0, 0, 2) },
    // ... demais widgets ...
  ];
}
```

**Posição:** Linha 0, Coluna 0, Largura 2 (destaque máximo no CEO dashboard)

---

## 7. Diagrama de Integração

```
CentroComando (CEO role)
├── WIDGET_COMPONENTS['aioi_queue'] → WidgetAIOIQueue
│     ├── import aioi from services/api.js
│     ├── aioi.getQueue({ limit: 20 })
│     │     └── GET /api/aioi/queue
│     │           └── aioiQueueApiService
│     │                 └── aioi_executive_queue_snapshot
│     │                       └── industrial_operational_events
│     ├── Renderiza: indicators (total/critical/high/medium)
│     ├── Renderiza: source bar (authority + timestamp)
│     ├── Renderiza: lista de items com prioridade visual
│     └── Auto-refresh: a cada 60 segundos
```

---

## 8. Invariantes Preservados na UI

| Invariante | Implementação |
|------------|--------------|
| `runtime_enabled: false` | Rodapé do widget exibe o estado |
| `cognitive_execution_allowed: false` | Rodapé do widget exibe o estado |
| Sem execução no frontend | Widget é READ ONLY — sem botões de ação |
| Sem HITL no P0 | Sem botões de aprovação/decisão |
| Fonte única | Apenas `GET /api/aioi/queue` — proibido F47 direto |

---

**Veredito:** `FRONTEND_INTEGRATION_COMPLETE`
