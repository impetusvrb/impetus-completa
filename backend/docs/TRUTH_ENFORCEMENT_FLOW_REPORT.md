# TRUTH_ENFORCEMENT_FLOW_REPORT

**Data:** 2026-06-01  
**Objetivo:** Mapear injeção de contexto, lacunas e ponto de enforcement industrial.

---

## 1. Fluxo canónico (voz / Anam / chat)

```text
Utilizador (voz ou texto)
    ↓
buildAnamSystemPrompt / POST /dashboard/chat
    ↓
structuralAIGovernance.buildAIGovernancePackage
    ↓
voiceRealtimeContextService.buildVoiceRealtimeContext
    ├─ dashboardKPIs.getDashboardKPIs + getDashboardSummary
    ├─ softwareOperationalSnapshotService.buildSnapshotsForQuery
    └─ chatContextBridge.resolveChatContextForChannel (VOICE | PANEL)
    ↓
Prompt system (OpenAI Realtime / GPT) + regras «não inventar»
    ↓
Resposta LLM
    ↓
[NOVO] industrialTruthEnforcementService.enforceTextResponse
    ↓
Utilizador (texto final + metadata industrial_truth)
```

### Ficheiros por etapa

| Etapa | Ficheiro | Responsabilidade |
|-------|----------|------------------|
| Voz context | `services/voiceRealtimeContextService.js` | KPIs, snapshot software, bridge |
| Anam prompt | `services/anamService.js` → `buildAnamSystemPrompt` | Compõe identidade + voice context |
| Snapshot | `services/softwareOperationalSnapshotService.js` | Dados reais por domínio (PLC, manutenção, chat…) |
| Bridge | `runtimeUnification/bridge/chatContextBridge.js` | Unificação SZ5 / legacy |
| Governança | `services/structuralAIGovernanceService.js` | Intent, allow_operational_data |
| Chat | `routes/dashboard.js` | GPT + síntese + egress + safety |
| Painel | `services/smartPanelCommandService.js` | Plano IA + `hydrate` com dados reais |

---

## 2. Onde os dados são injetados

1. **KPIs dashboard** — `dashboardKPIs` filtrados por `dashboardAccessService` (máx. 14 linhas no prompt de voz).
2. **Resumo agregado** — alertas críticos, interações 7d, propostas, insights IA.
3. **Snapshots por domínio** — `company_id` + permissões; tabelas `plc_collected_data`, `proposals`, `communications`, etc.
4. **Chat unificado** — mensagens não lidas / thread via `chatContextBridge`.
5. **Base estrutural** — `structuralAIGovernance` (cargo, setor, intent).

Instruções explícitas já existentes:

- «(nenhum indicador neste snapshot — não inventes valores)»
- «Resumo agregado indisponível — não inventes totais»
- Modo educativo quando `allow_operational_data=false`

---

## 3. Onde o contexto pode ficar vazio

| Cenário | Efeito anterior | Mitigação nova |
|---------|-----------------|----------------|
| `allow_operational_data=false` | Prompt educativo | Enforcement skipped (`non_operational_turn`) |
| `tenant_empty` / `tenant_inactive` | Modelo improvisa | `MSG_NO_DATA` se métricas na resposta |
| Domínio sem PLC/manutenção/chat | Snapshot vazio | Chart guard no painel |
| KPIs todos zero | Gráfico genérico «Interações/Insights» | `guardPanelVisualizationPayload` downgrade |
| Truncamento 14k chars | Perde snapshot no final | Limite mantido; log truncamento |
| Anam Realtime sem pós-processamento server | Alucinação possível | Appendix Industrial Truth no system prompt |

---

## 4. Onde o modelo pode preencher lacunas

- Perguntas operacionais **sem** snapshot no turno (intent geral).
- Pergunta pede OEE/produção **fora** dos domínios inferidos (`inferDomainsFromText` falha).
- Resposta com **números novos** não presentes no texto injetado.
- Painel: plano IA com `type: chart` e `barData` só com zeros do resumo fixo.
- Multimodal: ficheiro sem dados operacionais mas pergunta sobre fábrica.

---

## 5. Camada implementada — Industrial Truth Enforcement

**Ficheiro:** `backend/src/services/industrialTruthEnforcementService.js`

### 5.1 Data availability

- `hasOperationalData(domain, company_id)` — consultas tenant-scoped (PLC, proposals, communications, maintenance cards).
- `checkOperationalAvailability(user, opts)` — agrega domínios + `data_state`.

### 5.2 Text enforcement

- `enforceTextResponse(text, opts)` — após safety/egress no chat.
- Mensagens canónicas:
  - Sem dados: `Não existem dados disponíveis para este período.`
  - Claim sem evidência: `UNSUPPORTED_OPERATIONAL_CLAIM`

### 5.3 Chart guard

- `guardPanelVisualizationPayload` — em `smartPanelCommandService.hydrate`.
- Converte `chart`/`kpi_cards` sem dados em `report` + aviso.

### 5.4 Evidence binding

Metadata interna (resposta API `industrial_truth.evidence_binding`):

```json
{
  "source_table": "communications",
  "timestamp": "ISO-8601",
  "company_id": "uuid",
  "confidence": "snapshot_backed | no_operational_data"
}
```

### 5.5 Flags

```env
IMPETUS_INDUSTRIAL_TRUTH_ENFORCEMENT=on   # default on
IMPETUS_INDUSTRIAL_TRUTH_MODE=enforce   # enforce | shadow | off
```

**Rollback:** `IMPETUS_INDUSTRIAL_TRUTH_ENFORCEMENT=off` — zero alteração de texto.

---

## 6. Integrações (additive-only)

| Canal | Hook |
|-------|------|
| `POST /dashboard/chat` | Após `cognitiveSafetyRuntimeService` |
| `POST /dashboard/chat-multimodal` | Após `aiEgressGuard` |
| `GET /dashboard/voice-realtime-context` | Appendix no prompt |
| Smart Panel `hydrate` | `guardPanelVisualizationPayload` |

**Não alterado:** Motor A, Engine V2, Cockpits, Workflow Runtime, Action Runtime.

---

## 7. Relação com Hallucination Detection V1

| Camada | Momento | Bloqueio |
|--------|---------|----------|
| Industrial Truth | Síncrono, pré-resposta | Substitui texto / downgrade gráfico |
| Hallucination V1 | Assíncrono pós-trace | `IMPETUS_HALLUCINATION_BLOCK=off` (audit only) |

Complementares: Truth = regra industrial determinística; Hallucination = scoring multi-sinal em traces.

---

## 8. Testes

```bash
cd backend
node scripts/industrial-truth-enforcement-smoke.js   # integração leve
# Unitário rápido:
node -e "..." # ver README interno do script
```

---

## 9. Limitações conhecidas

- **Anam WebRTC:** enforcement primário via prompt; não há interceptação server-side da stream.
- Realtime OpenAI: depende do cliente consumir `voice-realtime-context` atualizado.
- Domínios sem tabela (ex. `maintenance_orders`) usam fallback `getCards`.
