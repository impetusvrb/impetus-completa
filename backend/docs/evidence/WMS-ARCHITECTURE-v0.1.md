# WMS Architecture v0.1

**Programa:** Operational Completion — Logistics  
**Fase:** WMS-001 Foundation  
**Data:** 2026-07-17  
**Estado:** foundation · produção OFF

---

## 1. Contexto

AUD-001 classificou Logistics como **IMPLEMENTATION INCOMPLETE** na camada operacional WMS, enquanto **logistics_native** (runtime cognitivo) está homologado e LOCKED.

WMS-001 estabelece o bounded context **`logistics-operational`** sem modificar a cadeia cognitiva Z.19→Z.23.

---

## 2. Camadas

```
┌─────────────────────────────────────────────────────────┐
│  Centro de Comando — logistics_native (LOCKED INC-043)   │
│  Signal loader · Promotion · 7 hubs                      │
└───────────────────────────┬─────────────────────────────┘
                            │ read-only bridge (futuro)
┌───────────────────────────▼─────────────────────────────┐
│  logistics-operational (WMS SSOT) — WMS-001 foundation   │
│  wms_* tables · repositories · service contracts         │
│  /api/logistics-operational/*                            │
└───────────────────────────┬─────────────────────────────┘
                            │ coexistência controlada
┌───────────────────────────▼─────────────────────────────┐
│  Legacy: warehouse_* · logistics M1.2 · TMS intelligence │
└─────────────────────────────────────────────────────────┘
```

---

## 3. Bounded context

| Campo | Valor |
|-------|-------|
| Domain ID | `logistics-operational` |
| Event prefix | `wms.` |
| Table prefix | `wms_` |
| API mount | `/api/logistics-operational` |
| Registry status | `foundation` |

---

## 4. Estrutura backend

```
backend/src/domains/logistics-operational/
├── core/wmsEntityRegistry.js
├── schemas/wmsSchemas.js
├── repositories/          # CRUD base
├── services/            # contracts only
├── controllers/
├── routes/
├── validators/
├── dto/
├── events/
└── shared/              # flags, RBAC, integrations
```

---

## 5. Frontend

```
frontend/src/domains/logistics-operational/
├── config/wmsFeatureFlags.js
├── hooks/useWmsFeatureFlags.js
├── services/wmsOperationalApi.js
├── components/WmsFoundationShell.jsx
├── pages/WmsOperationalWorkspacePage.jsx
└── routes/wmsOperationalRegistry.js  # menu_visible: false
```

Rota: `/app/logistics-operational/workspace` (gated)

---

## 6. Flags e rollout

Todas as flags WMS default **false**. Menu **não publicado** até WMS-005.

Rollout programático:

```
WMS-001 Foundation (actual)
  → WMS-002 Services
  → WMS-003 APIs
  → WMS-004 Frontend
  → WMS-005 RBAC + Navigation
  → WMS-006 Validation
  → BASELINE-WMS-v1.0
```

---

## 7. Integrações (contratos only)

ERP · PLC · Colectores · Etiquetadoras · MQTT · REST — definidos em `integrationContracts.js`, **active: false**.

---

## 8. Regras invioláveis

1. Não alterar ficheiros `cognitiveRuntime/domains/logistics/**` homologados  
2. Não alterar BASELINE-LOGISTICS-v1.1 surfaces LOCKED  
3. SSOT operacional WMS = prefixo `wms_*`  
4. Dual stack legacy documentado antes de WMS-002 implementar regras  

---

## 9. Referências

- AUD-001: `backend/docs/audit/AUD-001-LOGISTICS-OPERATIONAL-AUDIT.md`
- WMS-001 evidence: `WMS-001-FOUNDATION.md`
- Roadmap: `backend/docs/architecture/WMS-IMPLEMENTATION-ROADMAP.md`
