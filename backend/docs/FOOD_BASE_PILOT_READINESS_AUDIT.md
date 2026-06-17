# PRE-PILOT OPERATIONAL ACTIVATION AUDIT — Food Base

**Data:** 2026-06-15  
**Objectivo:** Antes da Food Base começar a usar o sistema, confirmar que **tudo o que faz parte do produto está realmente ON** — não em shadow, não em audit-only, não em feature-flag desligada, não em runtime suspenso.

> **Pergunta-âncora desta auditoria:**  
> *"Se a Food Base começar a usar amanhã, tudo o que ela espera usar está realmente activo?"*

---

## 0. Veredicto da auditoria

| Pergunta | Resposta |
|----------|----------|
| Existe alguma funcionalidade do produto contratado em modo `shadow`/`audit`/`off` que afetaria o piloto? | **SIM, com nuances.** Ver §4. |
| As correções podem ser feitas antes do piloto, sem nova fase de desenvolvimento? | **SIM.** Tudo é configuração de `.env` + um restart PM2. |
| Há algo que ainda precisa de **código novo** para o piloto Food Base começar? | **SIM, mas só se a Food Base depender de MES / Logística / Analytics.** Não existem ainda. |

```json
{
  "phase": "PRE_PILOT_FOOD_BASE",
  "core_aioi_pipeline_live": true,
  "core_ai_tri_active": true,
  "core_workflows_active": true,
  "core_quality_active": true,
  "core_telemetry_plc_active": true,
  "tenant_food_base_identified": false,
  "blocking_issues_for_pilot_start": [
    "FOOD_BASE_TENANT_ID_NOT_IN_DB",
    "FOOD_BASE_NOT_IN_AIOI_PILOT_TENANTS",
    "FOOD_BASE_NOT_IN_SZ4_PROMOTED_TENANTS",
    "FOOD_BASE_NOT_IN_ACTION_RUNTIME_PILOT",
    "FOOD_BASE_NOT_IN_RLS_PILOT",
    "FOOD_BASE_NOT_IN_MFA_PILOT"
  ],
  "scope_decisions_required_before_pilot": [
    "SAFETY_SST_RUNTIME_STAGE",
    "ENVIRONMENT_RUNTIME_STAGE",
    "MAINTENANCE_RUNTIME_STAGE",
    "HR_RUNTIME_STAGE",
    "EXECUTIVE_BOARDROOM_STAGE"
  ]
}
```

---

## 1. RESPOSTA ÀS SUAS PREOCUPAÇÕES (uma a uma)

### 1.1 "O sistema não está capturando eventos"

**Antes:** workers AIOI desligados (`AIOI_OUTBOX_WORKER_ENABLED=false`). Risco real de a Food Base perceber "alerta não apareceu" e a equipa responder "está em shadow".  
**Agora:** workers ON, ciclos a correr a cada 30s, IOE serão capturados imediatamente. Se a Food Base disser "o alerta não apareceu", o motivo só pode ser:

- regra de classificação não disparou (falta calibrar threshold), **ou**
- o tenant da Food Base não está em `IMPETUS_AIOI_PILOT_TENANTS` (ver §3, **risco 1**).

Não pode mais ser "feature flag desligada".

### 1.2 "Falso negativo por shadow / audit / read-only"

Eliminado para o pipeline AIOI. Mantido (intencionalmente) em SST / Ambiental / Manutenção / HR / Executive — ver §4 para decisão de escopo.

### 1.3 "Diferença entre fase de certificação (P1A→P1S) e fase de piloto operacional"

Confirmado: a fase 1 está **fechada** (Truth Program closed, P1S Historical Closure registrado). A partir do go-live de hoje, todas as métricas são **operacionais reais**, não certificação.

### 1.4 "Categoria A — deve estar ON" (do seu plano)

| Item | Estado | Variável principal |
|------|--------|---------------------|
| IOE ingestion | ✅ ON | `IMPETUS_AIOI_ENABLED=true`, `IMPETUS_AIOI_QUEUE_ACTIVE=true` |
| Outbox | ✅ ON | `IMPETUS_AIOI_OUTBOX_WORKER_ENABLED=true`, `IMPETUS_INDUSTRIAL_OUTBOX_ENABLED=true` |
| CEO chat | ✅ ON | `UNIFIED_DECISION_ENGINE=true`, `CHAT_ENABLE_CONSOLIDATED=true` |
| Executive queue | ✅ ON | `aioi_executive_queue_snapshot` populando (11.182 snapshots) |
| Workflows | ✅ ON | `IMPETUS_WORKFLOW_ENGINE_MODE=on`, `IMPETUS_WORKFLOW_ENGINE_ENABLED=true` |
| Truth enforcement | ✅ ON | `IMPETUS_INDUSTRIAL_TRUTH_MODE=enforce` |
| OpenAI / Anthropic / Gemini | ✅ ON | `/api/health` reporta os 3 UP |
| Telemetria PLC (MQTT/OPC-UA/Modbus/Edge) | ✅ ON (modo `on`) | `IMPETUS_MQTT_REAL_MODE=on`, `IMPETUS_OPCUA_REAL_MODE=on`, `IMPETUS_MODBUS_REAL_MODE=on`, `IMPETUS_EDGE_RUNTIME_MODE=on` |
| Notificações (DSR / SLA / RETENTION / KMS) | ✅ ON | `IMPETUS_DSR_NOTIFICATION` activo, schedulers iniciados |
| Painéis | ✅ ON | Dashboard centro de comando (P0A→P0E secções) |
| KPIs / Sidebar | ✅ ON | `IMPETUS_KPI_RUNTIME_ENFORCEMENT=on`, `IMPETUS_SIDEBAR_OBSERVABILITY=on` |
| MFA / Federation / RLS | ✅ ON (pilot only) | `IMPETUS_MFA_MODE=on`, `IMPETUS_FEDERATION_MODE=on`, `IMPETUS_RLS_MODE=on` |
| Hallucination detection | ✅ ON (`enforce` + `block`) | `IMPETUS_HALLUCINATION_DETECTION=enforce` |
| Action Runtime + HITL | ✅ ON (production real) | `IMPETUS_ACTION_RUNTIME_MODE=on`, `OPERATIONAL_TOOL_SHADOW_MODE=false` |
| SZ4 Operational Nervous System | ✅ ON (5 tenants) | `IMPETUS_SZ4_OPERATIONAL_NERVOUS_SYSTEM=on` |
| SZ5 Memory + facts | ✅ ON | `IMPETUS_SZ5_ENABLED=on`, `IMPETUS_SZ5_OPERATIONAL_MEMORY=on` |
| APM / Prometheus / SLO | ✅ ON | `IMPETUS_APM_ENTERPRISE_MODE=on`, `IMPETUS_PROMETHEUS_ENDPOINT_ENABLED=true` |

**Categoria A: 17/17 itens ON.**

### 1.5 "Categoria B — pode permanecer OFF"

Itens experimentais/não contratados que estão OFF/SHADOW por desenho — **não são bug**:

- `IMPETUS_OTEL_EXPORTER_ENABLED=false` (collector externo não validado)
- `IMPETUS_GRAFANA_STACK_ENABLED=false` (stack externa)
- `IMPETUS_TIMESCALE_ENABLED=false` (TimescaleDB ainda não decidido)
- `AKOOL_API_KEY` ausente (avatar talking head opcional)
- `IMPETUS_DASHBOARD_ENGINE_V2=off` (Engine V2 alternativo, Motor A é canónico)
- `IMPETUS_C6_ENGINE_V2_RETIREMENT=retired_shadow_reference` (V2 deprecado por desenho)
- Várias flags Z.13–Z.18 governance em `off` (são **recommendation-first**, não bug)

---

## 2. ESTADO REAL ACTUAL — pós go-live

| Camada | Sinal de vida | Observação |
|--------|---------------|------------|
| Backend | online · pid 2891429 · uptime 26m+ · 0 unstable_restarts | Estável |
| AIOI continuous worker | 50 ciclos completos · 29-49ms cada · 0 falhas | Saudável |
| AIOI outbox worker | scheduler activo · 0 entregas pendentes (histórico já 100% delivered) | Saudável |
| Event pipeline | ON · types: chat_message, sensor_alert, task_update, external_data, system_health_snapshot | Saudável |
| Edge agent | online · 2D uptime · queue pending = 0 | Saudável |
| Lab MQTT/OPC-UA/Modbus/SMTP | online · 2D-18D uptime | Saudável |
| TRI-AI | OpenAI ✓ · Anthropic ✓ · Vertex ✓ | Saudável |
| Tenants pilot AIOI | 2 (`find fish alimentos`, `industria de teste`) | **Food Base ausente** |

---

## 3. RISCOS BLOQUEANTES PARA O PILOTO FOOD BASE

### Risco 1 — TENANT FOOD BASE NÃO EXISTE NA BD (CRÍTICO)

Pesquisa em `companies` retornou:

| ID | Nome |
|----|------|
| `21dd3cee-2efa-4936-908f-9ff1ba04e2a3` | find fish alimentos |
| `ffd94fb8-79f4-4a38-af21-fe596adfffb5` | industria de teste |
| `511f4819-fc48-479e-b11e-49ba4fb9c81b` | Fresh & Fit Indústria de Alimentos Naturais Ltda |
| `c1045d7d-8596-4c48-aa5f-b43f246be454` | Fresh & Fit Indústria de Alimentos Naturais Ltda *(duplicado)* |
| `37f4af98-db7d-4221-8f32-2aecc085987b` | Empresa Teste |

**Não há linha com nome "Food Base".** Se a Food Base é o nome interno/marketing de uma destas (ex.: a "find fish alimentos" pode ser ela), confirmar antes do piloto. Caso contrário, há 2 caminhos:

a) **Criar a company `Food Base`** via fluxo de provisionamento normal (admin portal, sem migração ad-hoc).  
b) **Promover uma das companies existentes** (por exemplo `511f4819` Fresh & Fit) como o tenant piloto.

**Acção mínima após escolha:** adicionar o `company_id` resultante a TODOS os blocos `*_PILOT_TENANTS` listados no risco 2.

### Risco 2 — TENANT DA FOOD BASE NÃO ESTÁ NAS LISTAS PILOT (CRÍTICO se Food Base não for `21dd3cee`)

As variáveis abaixo restringem features a tenants específicos. Se o `company_id` da Food Base não estiver listado, esses recursos **não correm para ela**, mesmo com flag global `=on`:

| Variável | Tenants actuais | Falta Food Base? |
|----------|-----------------|-------------------|
| `IMPETUS_AIOI_PILOT_TENANTS` | 21dd3cee, ffd94fb8 | **CONFIRMAR** |
| `IMPETUS_SZ4_PROMOTED_TENANTS` | 21dd3cee, ffd94fb8, 37f4af98, c1045d7d, 511f4819 | **CONFIRMAR** |
| `IMPETUS_ACTION_RUNTIME_PILOT_TENANTS` | 21dd3cee, ffd94fb8, 511f4819 | **CONFIRMAR** |
| `IMPETUS_RUNTIME_UNIFICATION_PILOT_TENANTS` | 21dd3cee, ffd94fb8, 511f4819 | **CONFIRMAR** |
| `IMPETUS_LEGACY_DEPRECATION_PILOT_TENANTS` | 21dd3cee, ffd94fb8, 511f4819 | **CONFIRMAR** |
| `IMPETUS_COGNITIVE_REGISTRY_PILOT_TENANTS` | 21dd3cee, ffd94fb8, 511f4819 | **CONFIRMAR** |
| `IMPETUS_WORKFLOW_ENGINE_PILOT_TENANTS` | 21dd3cee, ffd94fb8, 511f4819 | **CONFIRMAR** |
| `IMPETUS_INDUSTRIAL_BACKBONE_PILOT_TENANTS` | 21dd3cee | **CONFIRMAR** |
| `IMPETUS_RLS_PILOT_TENANTS` | 21dd3cee | **CONFIRMAR** |
| `IMPETUS_MFA_PILOT_TENANTS` | 21dd3cee | **CONFIRMAR** |
| `IMPETUS_FEDERATION_PILOT_TENANTS` | 21dd3cee | **CONFIRMAR** |
| `IMPETUS_MQTT_REAL_PILOT_TENANTS` | 21dd3cee | **CONFIRMAR** |
| `IMPETUS_OPCUA_REAL_PILOT_TENANTS` | 21dd3cee | **CONFIRMAR** |
| `IMPETUS_MODBUS_REAL_PILOT_TENANTS` | 21dd3cee | **CONFIRMAR** |
| `IMPETUS_EDGE_RUNTIME_PILOT_TENANTS` | 21dd3cee | **CONFIRMAR** |
| `IMPETUS_AUDIT_PILOT_TENANTS` | ffd94fb8, 511f4819 | **CONFIRMAR** |
| `IMPETUS_SZ4_PERSISTENCE_PILOT_TENANTS` | 21dd3cee | **CONFIRMAR** |
| `IMPETUS_RETENTION_PILOT_TENANTS` | 37f4af98 | **CONFIRMAR** |
| `IMPETUS_EDGE_AGENT_COMPANY_ID` | 21dd3cee | **CONFIRMAR** |

**Se a Food Base for `21dd3cee` (find fish):** quase tudo está OK, faltando só `IMPETUS_AUDIT_PILOT_TENANTS` e `IMPETUS_RETENTION_PILOT_TENANTS`.  
**Se a Food Base for outra:** é necessário adicioná-la em todas as variáveis acima e fazer um restart com `--update-env`.

---

## 4. DECISÕES DE ESCOPO QUE PRECISAM DA SUA DEFINIÇÃO

Os módulos abaixo têm runtime cognitive em **shadow** ou **audit**. Para o piloto isto significa: a UI/menu pode aparecer, mas a IA específica daquele domínio é silenciosa (não publica recomendações reais, não dispara alertas).

| Domínio | Flag actual | Significado | Decisão necessária |
|---------|-------------|-------------|---------------------|
| **SST / Safety** | `IMPETUS_SAFETY_ACTIVATION_STAGE=shadow`, `IMPETUS_SAFETY_PUBLICATION_SHADOW_MODE=true`, `IMPETUS_SAFETY_COGNITIVE_RUNTIME=shadow` | UI aparece, dados entram, IA não publica para utilizadores finais | Food Base usa SST? Se sim → mover para `full` |
| **Ambiental** | `IMPETUS_ENVIRONMENT_PUBLICATION_SHADOW_MODE=true`, `IMPETUS_ENVIRONMENTAL_COGNITIVE_RUNTIME=shadow`, `IMPETUS_ENVIRONMENTAL_LIVE_VALIDATION=shadow` | idem | Food Base usa Ambiental? |
| **Manutenção** | `IMPETUS_MAINTENANCE_COGNITIVE_RUNTIME=shadow`, `IMPETUS_MAINTENANCE_LIVE_VALIDATION=shadow` | idem | Food Base usa Manutenção? |
| **HR / RH** | `IMPETUS_HR_COGNITIVE_RUNTIME=shadow` | idem | Food Base usa RH? |
| **Executive Boardroom** | `IMPETUS_EXECUTIVE_COGNITIVE_RUNTIME=shadow`, `IMPETUS_EXECUTIVE_LIVE_VALIDATION=shadow` | CEO chat funciona, mas o "boardroom" cognitive não publica relatórios autónomos | Quer relatórios CEO autónomos? |
| **Production native cockpit** | `IMPETUS_PRODUCTION_COGNITIVE_RUNTIME=production_native` | ✅ ATIVO (não é shadow) | OK |
| **Quality native cockpit** | `IMPETUS_QUALITY_NATIVE_COCKPIT=on`, `IMPETUS_QUALITY_ACTIVATION_STAGE=full`, `IMPETUS_QUALITY_PUBLICATION_SHADOW_MODE=false` | ✅ ATIVO | OK |
| **Adaptive Orchestration** | `IMPETUS_ADAPTIVE_ORCHESTRATION=shadow` | Aprende, não age sozinho | Recomendado manter shadow no piloto |
| **Governance Learning** | `IMPETUS_GOVERNANCE_LEARNING=shadow` | idem | Recomendado manter shadow no piloto |

**Recomendação por defeito (escopo mínimo Food Base):** Production + Quality em produção. SST / Ambiental / Manutenção / HR / Executive: decidir explicitamente módulo a módulo, em função do que está realmente contratado para a Food Base.

---

## 5. CHECKLIST EXECUTIVA — PRÉ-PILOTO

```
[ ] 1. Identificar/criar a company `Food Base` na BD e obter o company_id
[ ] 2. Adicionar esse company_id a todos os blocos *_PILOT_TENANTS aplicáveis
       (mínimo: AIOI, SZ4, ACTION_RUNTIME, RLS, MFA, AUDIT)
[ ] 3. Decidir escopo de SST / Ambiental / Manutenção / HR / Executive
       (full / shadow); ajustar flags conforme decisão
[ ] 4. (Opcional) Configurar AKOOL_API_KEY se avatar for usado
[ ] 5. (Opcional) Calibrar thresholds de classificação IOE para evitar
       "alertas demasiado raros" no início (regras dependem de telemetria
       real chegando — nada a fazer no .env)
[ ] 6. pm2 restart impetus-backend --update-env (após alterações)
[ ] 7. Verificar boot logs (mesmos 3 marcos)
[ ] 8. Reexecutar P0C / P0D (ainda dará pending até aparecerem IOE reais)
[ ] 9. Comunicar ao stakeholder: "sistema pronto para utilização real"
[ ] 10. Em +24h: validar P0D (first_24h_stable)
[ ] 11. Em +72h: validar P0E (first_72h_stable, production_accepted)
[ ] 12. Em +7d: emitir relatório final operacional
```

---

## 6. O QUE JÁ ESTÁ FEITO (resumo objectivo)

| Capacidade | Estado |
|-----------|--------|
| Arquitetura industrial (P1A→P1S) | ✅ Certificada e fechada |
| Truth Program | ✅ Closed |
| AIOI Continuous Operation (P0A→P0E) | ✅ Implementado |
| AIOI go-live activado (P0 GO-LIVE) | ✅ **Hoje** |
| Workers em produção contínua | ✅ Activos e estáveis |
| TRI-AI (OpenAI + Anthropic + Vertex) | ✅ Operacional |
| CEO chat + voz realtime + lipsync | ✅ Operacional |
| Workflow engine + Action runtime HITL | ✅ Operacional |
| Quality cockpit native (full) | ✅ Operacional |
| Production cockpit native | ✅ Operacional |
| Telemetria PLC (MQTT/OPC-UA/Modbus/Edge) | ✅ Operacional (pilot 21dd3cee) |
| Multi-tenant RLS | ✅ Operacional (pilot 21dd3cee) |
| Federation (OIDC/SAML/SCIM) | ✅ Operacional (pilot 21dd3cee) |
| MFA universal (TOTP/WebAuthn) | ✅ Operacional (pilot 21dd3cee) |
| Hallucination detection (enforce + block) | ✅ Operacional |
| KMS / DSR / Retention / Anonymization | ✅ Operacional |
| Observabilidade APM / Prometheus / SLO | ✅ Operacional |
| Dashboard Centro de Comando | ✅ Operacional (com secções P0A/P0B/P0C/P0D/P0E) |
| API operations/* (continuous, observation, active, runtime, golive) | ✅ Operacional |

---

## 7. O QUE FALTA — para piloto Food Base começar

**Configuração apenas (sem código novo):**

1. Identificação/criação do tenant Food Base na BD.
2. Adição do `company_id` da Food Base aos blocos `*_PILOT_TENANTS`.
3. Decisão de escopo dos cockpits SST / Ambiental / Manutenção / HR / Executive (`shadow` vs `full`).

**Tudo isto é feito em minutos, sem deploy de código.**

---

## 8. O QUE FALTA — para produção em escala (pós-piloto)

Estes itens **não são bloqueantes** para o piloto Food Base começar, mas são necessários antes de abrir mais clientes:

| Item | Estado actual | Acção |
|------|---------------|-------|
| **MES (Manufacturing Execution System)** | Não implementado | Desenvolvimento futuro |
| **Logística** | Não implementado | Desenvolvimento futuro |
| **Analytics avançado** | Não implementado | Desenvolvimento futuro |
| Promoção SST / Ambiental para `full` | Em shadow | Pós-piloto, com base no feedback Food Base |
| Promoção `IMPETUS_DASHBOARD_ENGINE_V2` | `off` (usa Motor A) | Decisão arquitetural pós-piloto |
| Collector OpenTelemetry externo | Não validado | Configurar antes de operação multi-cliente |
| Grafana stack | Não habilitada | Opcional para operação multi-cliente |
| TimescaleDB | Não habilitado | Avaliar quando volume de telemetria justificar |
| Avatar AKOOL talking head | API key ausente | Configurar quando se decidir usar |
| Limpeza warning `uq_aioi_eqs_idempotency` | Cosmética | `INSERT ... ON CONFLICT DO NOTHING` futuro |
| Promoção `IMPETUS_AIOI_DISTRIBUTED_RUNTIME_ACTIVE` | `false` (single-instance) | Quando volume justificar múltiplos workers |

---

## 9. CONCLUSÃO

> **A arquitetura já não é a pergunta.**  
> A pergunta agora é: *o tenant da Food Base está na lista de pilotos?*

Hoje:
- Pipeline AIOI **ON** em produção contínua.
- TRI-AI **ON**.
- Workflows + Action runtime + Quality + Production cockpits **ON**.
- Telemetria PLC **ON** (no tenant `find fish`).
- Truth + RLS + MFA + Federation **ON**.

Falta apenas:
1. Saber qual é o `company_id` real da Food Base e activar a Food Base nas listas pilot.
2. Decidir o escopo dos cockpits adicionais (SST/Ambiental/Manutenção/HR/Executive).

Sem nova fase. Sem novo código. Apenas configuração informada.

---

*Pre-Pilot Operational Activation Audit — emitido sob o Truth Program.*
