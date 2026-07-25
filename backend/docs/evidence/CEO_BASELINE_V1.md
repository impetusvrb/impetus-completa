# CEO_BASELINE_V1

**Incidente:** INC-CEO-DASHBOARD-RESTORE-AND-BASELINE-FREEZE-008  
**Data:** 2026-07-15  
**Perfil:** `ceo_executive`  
**Superfície:** `CentroComando` (`frontend/src/features/dashboard/centroComando/CentroComando.jsx`)

---

## 1. Identidade estrutural esperada

| Campo | Valor canónico |
|---|---|
| `role` | `ceo` (preferido) ou `diretor` + `functional_area=executive` |
| `functional_area` | `executive` |
| `dashboard_profile` (persistido) | `ceo_executive` |
| `company_role_id` | UUID válido → cargo CEO na Base Estrutural |
| Cargo formal | CEO — Diretor Executivo |
| Setor | Diretoria Executiva |
| `hierarchy_level` | `0` (Presidência) |

## 2. Contrato computacional

| Campo runtime (`/dashboard/me`) | Esperado |
|---|---|
| `profile_code` | `ceo_executive` |
| `functional_area` | `executive` |
| `functional_axis` | `executive` |
| `structural_profile.eixo_primario` | `eixo_executivo` |
| `module_access_governance.structural_complete` | `true` |
| `hasMaintenanceProfileContext` (frontend) | `false` |

## 3. Roteamento

```
Base Estrutural completa
  → profile_code ceo_executive
  → Dashboard.jsx: hasMaintenanceProfileContext = false
  → CentroComando (NUNCA DashboardMecanico)
```

## 4. Módulos

### REQUIRED (menu / visible_modules)

`dashboard`, `operational`, `chat`, `biblioteca`, `ai`, `hr_intelligence`, `anomaly_detection`, `settings`

### OPTIONAL

`audit`, `registro_inteligente`, `cadastrar_com_ia` (conforme cargo)

### PROIBIDOS

`manuia`, `manutencao`, superfície `DashboardMecanico`, textos exclusivos de manutenção

## 5. Onipresença Cognitiva (contrato INC-008)

| Item | Implementação |
|---|---|
| Componente | `CognitiveOmniPresence.jsx` |
| Shell | `CognitivePresenceShell.jsx` |
| Dados | `GET /api/dashboard/cognitive-pulse` → `global_whispers`, `global_presence` |
| Modo produção | `IMPETUS_COGNITIVE_LIVING_ENRICHMENT=false` → **presence-only** (`cognitive_core.status.cognitive_core = PRESENCE`) |
| UI | Label `ONIPRESENÇA COGNITIVA` + sussurros rotativos |
| Métricas CONF/SYNC/AWARE | `—` quando sem dados reais (nunca fabricar %) |
| Living enrichment | Só com `IMPETUS_COGNITIVE_LIVING_ENRICHMENT=true` (não baseline prod) |

## 6. Endpoints essenciais CEO

| Endpoint | Papel |
|---|---|
| `GET /api/dashboard/me` | Perfil, governança, structural_profile |
| `GET /api/dashboard/cognitive-pulse` | Ecossistema cognitivo + onipresença |
| `GET /api/dashboard/personalizado` | Layout widgets |
| `GET /api/dashboard/summary` | KPIs grid |
| `GET /api/dashboard/smart-summary` | Resumo executivo |
| `GET /api/dashboard/trend` | Gráfico tendência |
| `GET /api/dashboard/operational-brain/insights` | Insights IA |
| `GET /api/admin/structural/*` | Cadastro (SEC-RECON-GOV-004) |

## 7. Estados permitidos (sem dados)

| Área | Mensagem canónica |
|---|---|
| Cognitive Core | `PRESENÇA ATIVA` + CONF/SYNC/AWARE = `—` |
| Insights IA | “Sem insights gerados no momento…” |
| Tendência | Gráfico com série zero ou “sem volume” |
| PLC | “Fonte não conectada” — NON_BLOCKING |
| Resumo IA | Texto real ou indisponibilidade honesta |

## 8. Regras de não regressão

1. Não alterar `DashboardMecanico.jsx` (baseline manutenção congelada)
2. Não hardcode por user_id / email
3. Não activar living enrichment sintético em prod sem flag explícita
4. SEC-RECON: prefixo `/api/admin` em `USER_PORTAL_PREFIXES` (GOV-004)
5. Teste: `backend/src/tests/cognitivePresenceOnly.test.js`

## 9. Testes mínimos

| # | Teste | Artefacto |
|---|---|---|
| 1 | CEO + executive → ceo_executive | `dashboardProfileResolver` |
| 2 | ceo_executive → CentroComando | `Dashboard.jsx` + `roleUtils` |
| 3 | hasMaintenanceProfileContext = false | `roleUtils.js` |
| 4 | Não monta DashboardMecanico | E2E browser |
| 5 | Sem manuia | `/dashboard/me` visible_modules |
| 6 | Onipresença montada | `cognitivePresenceOnly.test.js` + UI |
| 7 | Sem métricas fabricadas | `CognitiveCoreSummaryCard` + WidgetInsightsIA |
| 8 | /dashboard/me ↔ sessão | logout/login |
| 9 | Refresh estável | sessão limpa |
| 10 | Mobile/desktop mesmo contrato | viewport tiers |

## 10. Evidência runtime (2026-07-15 pós-patch)

```
cognitive-pulse: whispers=12, global_presence.alive=true, core=PRESENCE
(living enrichment OFF, orgCtx.valid=true)
```

---

**Baseline congelado:** contrato funcional + estrutural. Gaps de dados operacionais (PLC, séries zero) classificados como `NON_BLOCKING_DATA_GAP`.
