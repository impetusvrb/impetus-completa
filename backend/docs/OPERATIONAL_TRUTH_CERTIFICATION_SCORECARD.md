# OPERATIONAL_TRUTH_CERTIFICATION_SCORECARD — FASE 35F

**Data:** 2026-06-01  
**Âmbito:** Certificação read-only + execução Empty Factory (35A)  
**Sem alteração:** flags, PM2, `.env`, Motor A, Engine V2, Workflow, Action Runtime, gates, RBAC, SZ5

---

## Scorecard por área

| Área | Status | Evidência resumida |
|------|--------|-------------------|
| **Dashboard Chat** | **PARTIAL** | EF-01/02/07 PASS; enforcement activo; EF-01 `pass` com texto longo vs `MSG_NO_DATA` estrito |
| **Council** | **PARTIAL** | Código F34 com truth; EF-06 bloqueado 403 firewall; escalation não activada no teste |
| **Multimodal** | **PARTIAL** | EF-09 `MSG_NO_DATA`; `industrial_truth` ausente no JSON |
| **Chat Interno** | **PARTIAL** | EF-05 pipeline `replace_no_data`; HTTP socket não executado |
| **Claude Panel** | **NOT VERIFIED** | Sem `enforceTextResponse` / trace (35B) |
| **ManuIA** | **NOT VERIFIED** | Sem truth / trace (35C) |
| **Anam Voice** | **NOT VERIFIED** | Shadow em código OK; 0 audits produção; HTTP 404 até restart |
| **Smart Panel** | **PARTIAL** | EF-03/04 PASS com `truth_guard`; plano LLM pré-hidratação sem guard |
| **Synthetic Events** | **PARTIAL** | `synthetic_memory_ratio` 0.909 em tenant vazio; UI identificação incompleta |

**Legenda:** VERIFIED = pronto para certificação formal | PARTIAL = gaps conhecidos | FAIL = falha de teste ou bypass crítico

Nenhuma área atingiu **VERIFIED** pleno nesta corrida.

---

## Perguntas obrigatórias (35F)

### 1. O IMPETUS consegue afirmar algo sem origem verificável?

**Sim**, nos canais **Claude Panel**, **ManuIA live**, **voz falada (entrega)** e potencialmente **widgets** alimentados por C2 synthetic sem label clara.

### 2. Quais canais ainda conseguem?

- `POST /dashboard/claude-panel`
- `POST /api/manutencao-ia/live-assistance/chat`
- Anam / OpenAI Realtime (stream oral, sem enforce)
- Payload `dashboard/me` com alta proporção synthetic (métricas)

### 3. O sistema está pronto para certificação Operational Truth?

**Não** para certificação **completa**.  
**Sim** para **piloto limitado** em: Dashboard Chat, Multimodal, Smart Panel hidratado, Chat interno (após validar socket).

### 4. O sistema está pronto para piloto industrial?

**Condicional** — apenas tenants com dados reais + canais texto acima; **excluir** voz como fonte de verdade até enforce oral; **monitorar** synthetic ratio no dashboard.

### 5. Pronto para Hallucination Block ON?

**Não.** Critérios do `HALLUCINATION_PROMOTION_READINESS.md` não cumpridos: 17 assessments, Claude/ManuIA/voz abertos, BLOCK permanece OFF por desenho.

### 6. Blockers restantes

| ID | Blocker | Severidade |
|----|---------|------------|
| B1 | Claude panel sem truth enforcement | HIGH |
| B2 | ManuIA live sem truth / trace | HIGH |
| B3 | Voz sem enforce na entrega (só shadow) | HIGH |
| B4 | `voice-truth-shadow` HTTP não deployado (404) | MEDIUM |
| B5 | C2 synthetic ratio alto em tenant vazio | HIGH |
| B6 | Multimodal sem `industrial_truth` no JSON | LOW |
| B7 | Amostra hallucination < 200 traces | MEDIUM |
| B8 | Council API teste 403 (firewall) | LOW |

---

## Síntese Empty Factory (35A)

- **8/10 PASS** — sem KPI/produção/OEE/gráfico inventado nos critérios numéricos.
- **Falhas:** EF-06 (403), EF-08 (404 rota).
- Perguntas Gustavo (OEE, produção, eficiência, MTBF, …): **sem inventar números** nas respostas finais entregues.

---

## Recomendação formal — FASE 36

**Título proposto:** Operational Truth Closure II — Entrega e exposição

| Prioridade | Entrega F36 | Tipo |
|------------|-------------|------|
| P0 | `enforceTextResponse` + `guardPanelVisualizationPayload` em **Claude panel** | Código |
| P0 | Truth + trace em **ManuIA live-assistance/chat** | Código |
| P0 | Reinício backend + validação **voice shadow** 7 dias; depois **enforce oral** opcional (STT→truth→TTS) | Ops + código |
| P1 | UI: label **SYNTHETIC** ou filtrar `synthetic_memory_ratio` em cockpits | Frontend |
| P1 | `industrial_truth` no JSON multimodal | Código |
| P2 | Repetir EF-06 com prompt allowlist; certificar tenant **com** dados (produção 10.523 peças + fonte) | Teste |
| P2 | Dashboard observabilidade truth metrics (somente leitura) | Observabilidade |
| P3 | Reavaliar `IMPETUS_HALLUCINATION_BLOCK` após 200+ traces pós-F36 | Governança |

**Não incluir em F36:** Motor A, Engine V2, Workflow Engine, Action Runtime, alteração PM2 topology, activação BLOCK.

---

## Documentos desta fase

| Documento |
|-----------|
| [EMPTY_FACTORY_CERTIFICATION_EXECUTION_REPORT.md](./EMPTY_FACTORY_CERTIFICATION_EXECUTION_REPORT.md) |
| [CLAUDE_PANEL_TRUTH_AUDIT.md](./CLAUDE_PANEL_TRUTH_AUDIT.md) |
| [MANUIA_TRUTH_AUDIT.md](./MANUIA_TRUTH_AUDIT.md) |
| [ANAM_VOICE_TRUTH_CERTIFICATION.md](./ANAM_VOICE_TRUTH_CERTIFICATION.md) |
| [SYNTHETIC_EXPOSURE_CERTIFICATION.md](./SYNTHETIC_EXPOSURE_CERTIFICATION.md) |
| [HALLUCINATION_PROMOTION_READINESS.md](./HALLUCINATION_PROMOTION_READINESS.md) |

---

## Veredito executivo

O IMPETUS **protege bem o utilizador contra números inventados** nos **chats de dashboard e painel hidratado** em tenant sem PLC (evidência EF-01–04, 07, 09). **Ainda não** cumpre o critério de produto «autoridade só de dados reais» em **voz, Claude, ManuIA e exposição synthetic** até a Fase 36.
