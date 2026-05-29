# IMPETUS — Inventário de Gaps e Plano de Industrialização (Chão de Fábrica)

**Data:** 2026-05-28 (consolidado)  
**Versão:** 2.0 — pós-P32 Tier A (aliases canónicos)  
**Baseline:** P32 — `overall_weighted = 85`, classificação `international_ready`, **31/32** prompts `production_on`  
**Objetivo:** teste industrial **real** — dados reais, PLCs reais, operadores reais, decisões assistidas por IA  
**Tipo:** plano operacional (não altera código por si só; execução via `.env` governado + site)

**Documentos de referência (auditoria):**  
`MASTER_ENTERPRISE_GAP_AUDIT.md` · `ENTERPRISE_COMPLIANCE_AUDIT.md` · `TECHNICAL_DEBT_MASTER_REPORT.md` · `MARKET_READINESS_ASSESSMENT.md` · `FINAL_STRATEGIC_DEVELOPMENT_ROADMAP.md` · `ENTERPRISE_OPERATIONAL_MATURITY_SCORE.md` · `PROMPT_32_FLAG_GOVERNANCE_CONSOLIDATION.md`

---

## 0. Verdade operacional (não confundir score com chão de fábrica)

| Indicador | Valor | Significado |
|-----------|-------|-------------|
| Score P32 global | **85/100** | Maturidade **declarativa/governança** enterprise |
| Classificação P32 | `international_ready` | Federação, MFA, RLS, locale, waves P23–32 ON |
| Prontidão chão de fábrica (estimada) | **55–65%** | OT em **lab/localhost + pilot_only**; sem aceitação 90d no site |
| Tier A P32 (aliases) | **Aplicado** | Alinha catálogo P32 ao runtime; **não** liga PLCs na VLAN |
| Domínio Quality | **Produção plena** | `ACTIVATION_STAGE=full`, `PUBLICATION_SHADOW_MODE=false` |
| Domínios Safety / Environment | **Publicação shadow** | Runtimes/ingest activos; UI/cockpit **não autoritativo** |
| Conectores MQTT/OPC/Modbus/Edge | **MODE=on** + **PILOT_ONLY** | Endpoints **`127.0.0.1`**; tenant piloto dominante `21dd3cee-…` |

> **Critério de sucesso deste plano:** dados de PLC/sensor chegam ao PostgreSQL do **tenant da fábrica**, aparecem em cockpit/dashboard, com **operadores reais** a usar chat e registos — **sem** depender de simulação ou `localhost`.

### Legenda de prontidão (usada em todo o documento)

| Símbolo | Significado |
|---------|-------------|
| ✔️ | Pronto para chão de fábrica real (com pré-condições indicadas) |
| ⚠️ | Funciona em lab / localhost / piloto restrito |
| ❌ | Bloqueia teste industrial real neste momento |

---

## 1. PARTE 1 — Inventário técnico completo

### 1.1 Legenda de estados (flags / runtime)

| Estado | Significado no IMPETUS |
|--------|------------------------|
| **on / enforce** | Activo em produção (global ou com efeito real) |
| **shadow** | Observa / prepara; **não altera** entrega autoritativa |
| **off** | Módulo inerte ou legado intencional |
| **audit** | Regista; efeito lateral limitado |
| **pilot / pilot_only** | Activo só para tenants em `*_PILOT_TENANTS` |
| **enrich** | Enriquece payload; **não governa** UI nem decisão final |
| **partial** | Código/rotas presentes; validador ou flag canónica em falta |
| **observability-only** | Observabilidade ON sem execução autónoma correspondente |

### 1.2 PROMPTs P01–P32 (pós Tier A aliases)

| Prompt | Título | Estado P32 | Chão de fábrica |
|--------|--------|------------|-----------------|
| P01 | Visibility API | **ON** | ✔️ Rota **`GET /api/dashboard/visibility`** implementada (`routes/dashboard.js` L244). Gap real: `IMPETUS_VISIBILITY_HARDENED=off` |
| P02 | Dashboard sections | **ON** | ⚠️ Frontend integrado; validar payload `sections` vs legado local |
| P03 | Audit universal | **ON** | ✔️ `IMPETUS_UNIVERSAL_AUDIT=on` |
| P04 | Flag reconciler | **partial** | ⚠️ Runtime: `flagReconcilerRuntime.js`; validador P32 não o referencia |
| P05 | Cognitive exec split | **ON** (alias) | ⚠️ `IMPETUS_COGNITIVE_RUNTIME_EXEC=on` declarativo; `COGNITIVE_RUNTIME=off` — hot path Motor A + gate observability |
| P06–P07 | DSR / Retention | **ON** | ✔️ `DSR_EXPORT/ERASE=on`, `RETENTION_MODE=enforce` |
| P08–P15 | AI anon / KMS / SZ5 / SZ4 / APM | **ON** (aliases + runtime) | ⚠️ SZ4 persistence **1 tenant**; KMS **audit** funcional |
| P16–P18 | Federation / MFA / RLS | **ON** + **pilot_only** | ⚠️ Expandir tenant fábrica; WebAuthn `localhost` |
| P19–P22 | MQTT / OPC / Modbus / Edge | **ON** catálogo | ❌ URLs **127.0.0.1**; sem agente edge na VLAN |
| P23–P32 | Backbone / Action / Workflow / Rollout / Locale / Cert / P32 | **ON** | ⚠️ `INDUSTRIAL_REPLAY_MODE=audit`; OTEL export off |

**Único prompt não ON no score:** P04 (metadado validador).

### 1.3 Telemetria industrial (crítico)

| Mecanismo | Flag(s) | Estado efectivo | Evidência (código) | Fábrica |
|-----------|---------|-----------------|-------------------|---------|
| MQTT real | `MQTT_REAL_MODE=on`, `PILOT_ONLY=true` | ON, 1 tenant | `industrial-mqtt/runtime/mqttRealClientRuntime.js` | ❌ `mqtt://127.0.0.1:1883` |
| OPC-UA real | `OPCUA_REAL_MODE=on`, `PILOT_ONLY=true` | ON, 1 tenant | `industrial-opcua/` | ❌ `opc.tcp://127.0.0.1:4840/UA/ImpetusLab` |
| Modbus real | `MODBUS_REAL_MODE=on`, `PILOT_ONLY=true` | ON, 1 tenant | `industrial-modbus/` | ❌ `MODBUS_HOST=127.0.0.1` |
| Edge runtime | `EDGE_RUNTIME_MODE=on`, `PERSIST_QUEUE=true` | ON, 1 tenant | `edgeRealSyncRuntime.js`, `edge_runtime_queue` | ❌ Sem agente VLAN; `EDGE_AGENT_API_URL=127.0.0.1:4000` |
| Lab E2E | `INDUSTRIAL_LAB_ENABLED`, `AUTO_E2E_ON_BOOT` | Lab | `industrialLabE2eService.js` | ⚠️ Smoke local; não substitui aceitação no site |
| Environment telemetry | `ENVIRONMENT_TELEMETRY_*=true` | Ingest ON | `environmentTelemetryOrchestrator.js` | ⚠️ Ingest OK; **publication shadow** |
| Quality telemetry | `QUALITY_*_TELEMETRY=true` | Produção | `qualityTelemetryIngestService.js` | ✔️ Se fonte = formulários/scanner da planta |
| Industrial backbone | `BACKBONE_MODE=on`, `BACKPRESSURE=enforce` | ON | `industrial_event_outbox` | ⚠️ Piloto 1 tenant; `REPLAY_MODE=audit` |
| Timescale | `TIMESCALE_ENABLED=false` | OFF | — | ❌ Risco saturação PG em volume real |
| OTEL export | `OTEL_EXPORTER_ENABLED=false` | OFF | `observabilityFlags.js` | ⚠️ SLO externo inexistente |
| Prometheus | `PROMETHEUS_ENDPOINT_ENABLED=true` | ON | — | ✔️ Se scraper no NOC |

### 1.4 Domínios industriais

| Domínio | Activation | Publication | Cockpit | Telemetria | Fábrica |
|---------|------------|-------------|---------|------------|---------|
| **Quality** | `full` | shadow **false** | native **pilot** | **ON** | ✔️ Pronto com dados planta + UAT cockpit |
| **Production** | operacional | — | native **pilot** | partial | ⚠️ Promover cockpit se linha OEE no escopo |
| **Safety (SST)** | **shadow** | shadow **true** | pilot | shadow | ❌ Piloto 1 sem UAT SST dedicado |
| **Environment** | **shadow** | shadow **true** | pilot + cognitive shadow | ingest ON | ❌ Painéis não autoritativos |
| **Maintenance** | — | — | pilot, cognitive shadow | partial (REST) | ⚠️ Se OS ManuIA no escopo |
| **HR / Executive** | — | — | pilot | n/a | ⚠️ Opcional |
| **Logistics** | — | — | scaffold | — | ❌ Não implementado |

### 1.5 Cognição / chat / SZ / Action

| Mecanismo | Estado | Fábrica |
|-----------|--------|---------|
| SZ5 conversational memory | **ON** | ✔️ Chat contextual se dados ingeridos |
| SZ1–SZ3 | sub-flags **on**; SZ1 default `Z_SHADOW` | ⚠️ Assistive, não autónomo |
| SZ4 nervous system | **on**; persistence **pilot 1 tenant** | ⚠️ Expandir tenant fábrica |
| Action Runtime + HITL | **MODE=on**, `ACTION_RUNTIME_ENABLED=true` | ✔️ Mutações com aprovação humana |
| Workflow engine | **MODE=on**, pilot 3 tenants | ✔️ Se processos BPMN cadastrados |
| `OPERATIONAL_TOOL_CALLING_ENABLED=true` | ON | ✔️ Tools operacionais; shadow tools **false** |
| Adaptive orchestration / governance learning | **shadow** | ✔️ Manter no piloto |
| Multi-domain foundation | **shadow** | ✔️ Manter no piloto |
| `COGNITIVE_RUNTIME=off` | Intencional | ✔️ **Manter** — preserva Motor A hot path |

### 1.6 Segurança, persistência, observabilidade

| Mecanismo | Estado | Fábrica |
|-----------|--------|---------|
| KMS | `GOVERNANCE=audit` (alias `KMS_MODE=on` declarativo) | ⚠️ Promover `on` após clone staging (fase B) |
| MFA / RLS / Federation | **on** + **pilot_only** | ⚠️ Expandir tenants; corrigir RP_ID produção |
| Universal audit | **on** | ✔️ |
| Retention purge | **false** | ❌ Piloto longo → crescimento BD |
| Visibility hardened | **off** | ❌ Antes de 10+ operadores (rota visibility **já existe**) |
| Hallucination | **enforce**, `BLOCK=off` | ✔️ |

### 1.7 Infraestrutura transversal (bloqueadores de site)

| Item | Valor actual (.env) | Fábrica |
|------|---------------------|---------|
| Broker MQTT | `127.0.0.1:1883` | ❌ |
| OPC-UA / Modbus | `127.0.0.1` | ❌ |
| Edge API | `127.0.0.1:4000` | ❌ |
| Federation mock | `FEDERATION_BASE_URL=127.0.0.1:4000` | ⚠️ |
| MFA WebAuthn | `RP_ID=localhost` | ❌ Em URL produção planta |
| Frontend URLs | `localhost:3000` | ⚠️ Ajustar em deploy planta |
| Piloto OT dominante | `21dd3cee-2efa-4936-908f-9ff1ba04e2a3` (+ 2–4 UUIDs waves) | ⚠️ Incluir UUID fábrica |

### 1.8 Flags OFF intencionais (não bloqueiam piloto Quality-centric)

`DASHBOARD_ENGINE_V2=off`, `COGNITIVE_RUNTIME=off`, `COGNITIVE_COMPOSITION_ENGINE=off`, governança terminal — **manter off** durante piloto fábrica para não alterar hot path `/dashboard/me` e chat consolidado.

---

## 2. PARTE 2 — Gaps que impedem teste industrial real (apenas gaps reais)

| # | Gap | Módulo | Risco operacional | Impacto no teste |
|---|-----|--------|-------------------|------------------|
| **G1** | Broker/PLC não são da planta | `.env` MQTT/OPC/Modbus | Falso positivo industrial | Zero tag real na UI |
| **G2** | Tenant fábrica fora de `*_PILOT_TENANTS` | Flags piloto | Isolamento | Ingest/chat ignoram a fábrica |
| **G3** | Sem edge agent na VLAN | `industrial-edge/` | Perda offline | Sensores sem caminho até IMPETUS |
| **G4** | Cadastro tags OPC/Modbus por tenant | BD / admin API | Config | Conectores ON sem dados mapeados |
| **G5** | Cockpits Quality/Production em **pilot** | Runtime Z domínios | UX | Supervisores sem cockpit nativo autoritativo |
| **G6** | Safety/Environment **publication shadow** | Domínios env/sst | Decisão | Alarmes SST/ambiental não governam UI |
| **G7** | `TIMESCALE_ENABLED=false` | Backbone / PG | Escala | Degradação sob carga real |
| **G8** | `RETENTION_PURGE_ENABLED=false` | Workers | Compliance/custo | BD cresce sem limite |
| **G9** | `INDUSTRIAL_REPLAY_MODE=audit` | Backbone | Recovery | Replay sem efeito operacional |
| **G10** | `VISIBILITY_HARDENED=off` | `dashboardVisibilityHardened` | Segurança | Módulos visíveis além do perfil (**rota visibility existe**) |
| **G11** | MFA WebAuthn `localhost` | MFA | Auth | Passkeys falham em produção |
| **G12** | Sem operadores reais + formação | Processo | Adopção | Piloto só técnico, não operacional |
| **G13** | Sem evidência 90d PLC↔BD↔UI | Processo | Aceitação | Não defensável para escala |

**Não são gaps para piloto Quality-centric:** Motor A ON, Engine V2 off, Logistics scaffold, Z.28/Z.29 shadow, P04 metadado.

---

## 3. PARTE 3 — Classificação de promoção (A / B / C)

### A) Promover agora — baixo risco, necessário para piloto fábrica

| ID | Item | Acção | Motivo |
|----|------|-------|--------|
| A1 | Tenant piloto OT | Incluir `company_id` fábrica em **todos** `*_PILOT_TENANTS` (MQTT, OPC, Modbus, Edge, Action, Workflow, SZ4, MFA, RLS) | Sem isto o runtime ignora o tenant |
| A2 | Broker MQTT planta | `IMPETUS_MQTT_BROKER_URL=mqtt://<broker-vlan>:1883` (+ TLS) | Dado real |
| A3 | Endpoints OPC/Modbus | Cadastro em `tenant_opcua_endpoints` / `tenant_modbus_devices` | Tags mapeadas |
| A4 | `IMPETUS_VISIBILITY_HARDENED=on` | Após smoke `GET /api/dashboard/visibility` | Rota **já existe**; hardening é a camada em falta |
| A5 | Quality cockpit | `QUALITY_NATIVE_COCKPIT=on` + `QUALITY_RENDER_PROMOTION=on` (tenant fábrica) | Domínio já `ACTIVATION_STAGE=full` |
| A6 | Production cockpit | `PRODUCTION_NATIVE_COCKPIT=on` se OEE no escopo | UAT supervisão |
| A7 | Persistência MQTT audit | `MQTT_REAL_AUDIT_PERSIST=true` + validar 24h em BD | Evidência ingest |
| A8 | Runbook rollback | `promote-industrial-connectors-on.js --rollback` + snapshot Rollout Center | Governança |
| A9 | URLs produção | Frontend, `MFA_WEBAUTHN_RP_ID`, `FEDERATION_BASE_URL`, `EDGE_AGENT_API_URL` | Login e edge no site real |

### B) Promover após checklist (médio risco)

| ID | Item | Checklist |
|----|------|-----------|
| B1 | Edge agent no site | mTLS; fila persistente; 72h estável |
| B2 | OPC-UA persistência plena | Certificados; tags; 72h sem DLQ |
| B3 | Modbus mapa validado | Manual equipamento vs BD |
| B4 | `INDUSTRIAL_REPLAY_MODE=on` | Divergência replay < 0,1% |
| B5 | `KMS_GOVERNANCE=on` | Warm KMS em clone BD planta |
| B6 | `RETENTION_PURGE_ENABLED=true` | Backup; política 90d telemetria |
| B7 | `OTEL_EXPORTER_ENABLED=true` | `OTEL_ENDPOINT` → collector NOC |
| B8 | SZ4 persistence | Tenant fábrica em `SZ4_PERSISTENCE_PILOT_TENANTS` |
| B9 | `FLAG_RECONCILER_STRICT=on` | Boot sem critical |
| B10 | Chat SZ5 com factos OT | ≥80% em amostra 50 perguntas sobre tags/alarmes |
| B11 | Lab E2E no servidor com rede planta | `industrial_lab_runs` verde (não só localhost) |
| B12 | 10+ operadores MFA real | Zero lockouts 1 semana |

### C) Não promover neste piloto

| ID | Item | Motivo |
|----|------|--------|
| C1 | `SAFETY/ENVIRONMENT_ACTIVATION_STAGE=on` | UAT SST/ambiental dedicado |
| C2 | `PUBLICATION_SHADOW_MODE=false` Safety/Env | Mutação cross-domain |
| C3 | `ADAPTIVE_ORCHESTRATION` / `GOVERNANCE_LEARNING` → on | Sem HITL board |
| C4 | `IMPETUS_COGNITIVE_RUNTIME=on` | Altera hot path Z |
| C5 | `DASHBOARD_ENGINE_V2=on` | Regressão `/dashboard/me` |
| C6 | MQTT “on” sem broker planta | Score inflado, zero dado |
| C7 | `HALLUCINATION_BLOCK=on` | Bloqueio operacional chat |
| C8 | Domínio Logistics | Scaffold |
| C9 | Remoção flags legadas / Motor A | Viola additive-only |

---

## 4. PARTE 4 — Plano de ação (85% → 100% prontidão industrial real)

*Novo ciclo pós-P01–P32. Não reexecuta waves; industrializa o que já existe.*

### Fase 0 — Enquadramento (Semana 0)

| Passo | Acção | Validação |
|-------|-------|-----------|
| 0.1 | Tenant UUID fábrica + RACI + operadores (hierarquia) | Documento assinado |
| 0.2 | Diagrama OT: PLC, broker, MES, edge | Eng. automação |
| 0.3 | Rede: `nc -zv` 1883/4840/502 do host IMPETUS → VLAN | Log rede |
| 0.4 | Baseline P32: `POST /api/final-consolidation-audit/audit` + snapshot | ID snapshot guardado |
| 0.5 | Clone `.env` staging com flags fábrica (sem prod ainda) | Diff revisado |

### Fase 1 — Infra OT no site (Semanas 1–2) — OT / DevOps

| Passo | Acção | Rollback |
|-------|-------|----------|
| 1.1 | Broker MQTT planta (ou existente) | Reverter `MQTT_BROKER_URL` |
| 1.2 | Deploy edge agent + `PERSIST_QUEUE=true` | `EDGE_RUNTIME_MODE=audit` |
| 1.3 | Cadastro OPC-UA + certs BD | Desactivar endpoint |
| 1.4 | Cadastro Modbus | Desactivar device |
| 1.5 | `.env`: A1–A3, A9; `pm2 reload --update-env` | Git revert + reload |
| 1.6 | `POST /api/admin/runtime-flags/industrial-lab/e2e` **com rede planta** | `industrial_lab_runs` |

**Testes Fase 1:** TCP broker/OPC; ≥1000 msgs MQTT → buffer/outbox; p95 ingest < 2s (Prometheus).

```bash
# Promoção governada (exemplo)
node backend/scripts/promote-industrial-connectors-on.js --tenant=<UUID_FABRICA>
# Rollback
IMPETUS_MQTT_REAL_MODE=audit
IMPETUS_OPCUA_REAL_MODE=audit
IMPETUS_MODBUS_REAL_MODE=audit
IMPETUS_EDGE_RUNTIME_MODE=audit
pm2 reload impetus-backend --update-env
```

### Fase 2 — Dados reais no pipeline (Semanas 2–3) — Backend

| Passo | Acção |
|-------|-------|
| 2.1 | A4–A7: visibility hardened, cockpits Quality/Production ON (tenant fábrica) |
| 2.2 | Fluxo: sensor → edge/MQTT → orchestrator → `industrial_event_outbox` → cockpit |
| 2.3 | `EVENT_LAG_MONITORING` + DLQ zero 24h |
| 2.4 | Amostra 20 tags: valor PLC vs UI (≥95% match) |
| 2.5 | Expandir SZ4 persistence (B8) |

**Testes Fase 2:** Reinício backend — perda buffer < 1%; 500 msg/min 1h — CPU/mem estáveis.

### Fase 3 — Operadores reais (Semanas 4–6) — Produto + Planta

| Passo | Acção |
|-------|-------|
| 3.1 | 10–15 operadores; formação 2h (dashboard, chat, alarmes) |
| 3.2 | CAPA / Registo Inteligente em cenários reais |
| 3.3 | Feedback diário; `pilot` → `on` só com aceite supervisor |
| 3.4 | B10: chat com factos OT |
| 3.5 | **Não** promover C1/C2 (Safety/Environment full) |

**Testes Fase 3:** Zero P1 atribuível a IMPETUS; audit trail IA completo.

### Fase 4 — Hardening e aceitação (Semanas 7–8)

| Passo | Acção |
|-------|-------|
| 4.1 | Drill rollback ≤ 15 min |
| 4.2 | B4–B7, B9–B12 conforme checklist |
| 4.3 | Relatório piloto assinado (eng. automação + gerência + IMPETUS) |
| 4.4 | Reauditoria P32 com evidência site |

---

## 5. Cronograma e RACI

| Marco | Semana | Entregável |
|-------|--------|------------|
| M0 | 0 | RACI + diagrama OT + tenant UUID + snapshot P32 |
| M1 | 1–2 | Rede + broker + edge + lab E2E verde (rede planta) |
| M2 | 2–3 | Ingest persistente + cockpits ON + match tags |
| M3 | 4–6 | Piloto humano + chat OT |
| M4 | 7–8 | Aceitação + hardening + rollback testado |

| Área | R (executa) | A (aprova) |
|------|-------------|------------|
| Rede / firewall | OT cliente | TI cliente |
| Flags `.env` | DevOps IMPETUS | Arquiteto |
| Tags OPC/Modbus | Integrador | Eng. automação |
| UAT Quality/Production | Supervisão | Gerência planta |
| KMS/DSR | SecOps | DPO |

---

## 6. Segurança, rollback e princípios

1. **Additive-only** — não remover Motor A nem flags legadas.  
2. **Tenant isolation** — dados OT só no `company_id` da fábrica.  
3. **HITL** — Action Runtime mantém aprovação humana.  
4. **Safety/Environment** — publication shadow até UAT dedicado.  
5. **Teste real > score** — não promover flags sem evidência PLC↔BD↔UI.

**Rollback (≤ 15 min):** reverter bloco OT no `.env` → `pm2 reload --update-env` → parar edge agent → `MQTT_REAL_MODE=audit` → registar em `rollout_center_audit`.

---

## 7. PARTE 5 — Critérios de aceitação

### 7.1 “Pronto para piloto em fábrica” (gate M3)

Todas verdadeiras:

1. ≥1 fluxo OT ponta-a-ponta (PLC/sensor → BD → cockpit) no **tenant fábrica**, amostra ≥95% assinada pela eng. automação.  
2. Quality (e Production se escopo) cockpit **on** para esse tenant; operadores formados.  
3. Chat Impetus com **factos** de dados ingeridos (B10 ≥80%).  
4. Safety/Environment em shadow publication **ou** UAT limitado documentado — sem C1/C2.  
5. Rollback testado; audit trail para acções IA.  
6. **Nenhuma** dependência crítica de `127.0.0.1` para dados da linha piloto.

### 7.2 “100% operacional industrial” (pós-piloto 8 semanas + 90d)

| Critério | Métrica | Alvo |
|----------|---------|------|
| OT conectado | 4/4 conectores + tenant fábrica | Sim |
| Dados reais | Tag PLC vs BD/UI | ≥95% |
| Performance | p95 ingest | <2s |
| Disponibilidade | Horário operação | ≥99% |
| Operadores | Logins reais | ≥10 |
| Segurança | Cross-tenant | 0 incidentes |
| Rollback | Restore | <15 min |
| Evidência | Lab runs + relatório + 90d OT | Sim |
| P32 `industrial_readiness` | Com evidência site | ≥92 |

> **100%** inclui Timescale/particionamento, KMS on, retenção, edge em todas as linhas do escopo — **fase posterior** ao piloto inicial.

### 7.3 Impacto esperado no score P32

| Dimensão | Actual (~85) | Pós-piloto com evidência |
|----------|------------|--------------------------|
| `industrial_readiness_score` | ~88–92 (flags) | **≥92** (90d OT real) |
| Classificação | `international_ready` | Mantém; **confiança operacional** sobe |

O score **não substitui** aceitação da planta.

---

## 8. Referências técnicas

| Recurso | Caminho / API |
|---------|----------------|
| Visibility (correcção v2) | `backend/src/routes/dashboard.js` — `GET /visibility` |
| Consolidação flags P32 | `backend/docs/PROMPT_32_FLAG_GOVERNANCE_CONSOLIDATION.md` |
| MQTT / Edge reports | `MQTT_REAL_ENTERPRISE_REPORT.md`, `EDGE_RUNTIME_INDUSTRIAL_LAB_REPORT.md` |
| Script promoção OT | `backend/scripts/promote-industrial-connectors-on.js` |
| Lab E2E | `POST /api/admin/runtime-flags/industrial-lab/e2e` |
| UI governança | `/app/admin/rollout-center`, `/app/admin/final-consolidation` |
| Flag reconciler (runtime real P04) | `backend/src/governance/flagReconcilerRuntime.js` |

---

## 9. Histórico de revisões

| Versão | Data | Alteração |
|--------|------|-----------|
| 1.0 | 2026-05-28 | Plano inicial pós-P32 |
| 2.0 | 2026-05-28 | Consolidação inventário A/B/C; **correcção P01**: rota `/api/dashboard/visibility` existe; gap = `VISIBILITY_HARDENED`; Tier A aliases aplicado; critérios 7.1/7.2 |

---

*Execução requer aprovação explícita da planta + alteração governada de `.env`. Não altera código neste documento.*
