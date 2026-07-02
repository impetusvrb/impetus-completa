# Volume II — Dashboard Vivo
## ICEB v1.0 · Centro de Comando e Ecossistema Cognitivo

**Classificação global:** AB (componentes existem) · partes com enriquecimento seeded marcadas explicitamente.

---

## 2.1 Visão geral

O Dashboard Vivo é a superfície principal pós-login para perfis executivos e operacionais. Compõe-se de:

| Bloco | Componente | Rota típica | Classificação |
|-------|------------|-------------|---------------|
| Centro de Comando | `CentroComando.jsx` | `/app` (redirect) | AB |
| Ecossistema Cognitivo Vivo | `cognitiveEcosystem/*` | embutido no dashboard | AB |
| Layout por cargo | `LayoutPorCargo.js` | widgets por `dashboard_profile` | AB |
| Pulso cognitivo | `CognitivePulseContext` | global em `Layout.jsx` | AB |
| Presença compacta | `CognitiveCompactPresence` | rotas ≠ `/app` | AB |
| SSE live-surface | `dashboard.js` `/live-surface/stream` | poll/SSE | AB |
| Claude Panel | `claudePanelService` | painel IA | AB |
| Smart Panel | `smartPanelCommandService` | comandos IA | AB |

---

## 2.2 Centro de Comando (`CentroComando.jsx`)

**Propósito:** painel executivo com KPIs, gráficos reais (`ImpetusChart`), ecossistema cognitivo e widgets por perfil.

**APIs principais:**
- `GET /api/dashboard/me` — perfil + módulos + structural
- `GET /api/dashboard/kpis` — KPIs tenant-scoped
- `GET /api/dashboard/cognitive-pulse` — pulso (audiência por cargo)
- `GET /api/dashboard/trend` — séries gráficos

**Governança:** `moduleAccessGovernanceEngine` define `visible_modules` antes da reconciliação Z.

**Nota AB/N:** widgets que mostram "Digital Twin Sync: SYNCING" podem usar `cognitiveLivingEnrichment` — classificar como AB com flag `seeded: true` até telemetria industrial real (Volume X).

---

## 2.3 Ecossistema Cognitivo Vivo

| Ficheiro | Função |
|----------|--------|
| `CognitivePresenceShell.jsx` | shell completo no dashboard |
| `CognitiveCompactPresence.jsx` | barra compacta em outras rotas |
| `CognitivePulseContext.jsx` | provider global (guard anti-aninhamento) |
| `cognitiveEcosystem.css` | animações DS Industrial 4.0 |

**Motor backend:** `cognitivePulseService.js` + `cognitiveLivingEnrichment.js`

**Regra normativa (N):** todo utilizador com cargo estrutural completo vê pulso adaptado — não apenas CEO ou RH.

---

## 2.4 Dashboards por perfil operacional

| Perfil | Componente | Rota |
|--------|------------|------|
| Operador | `DashboardOperador.jsx` | via `DashboardRouteEntry` |
| Mecânico | `DashboardMecanico.jsx` | via `DashboardRouteEntry` |
| CEO | `Dashboard` / Centro Comando | `/app/ceo` |

Todos com `CognitivePresenceShell` ou equivalente pós-Fase 1 ICEB.

---

## 2.5 Fichas ICEB relacionadas

- Telas: etapas **336–412** em `fichas/telas/`
- Motores T4: etapas **1–335** (filtrar `dashboard`, `panel`, `pulse` no índice)
- Ver [ICEB_ETAPAS_INDEX.md](./ICEB_ETAPAS_INDEX.md)

---

*Volume II · ICEB v1.0 · 2026-06-30*
