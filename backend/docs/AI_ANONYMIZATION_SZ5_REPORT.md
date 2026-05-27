# AI Anonymization SZ5 — Relatório de Implementação (T1.8.2)

**Data:** 2026-05-26  
**Classificação:** ENTERPRISE / LGPD Art. 18, VI + Art. 20  
**Flag:** `IMPETUS_AI_ANONYMIZATION=off|audit|on`  
**Default Produção:** `audit` (dry-run seguro)

---

## 1. RESUMO EXECUTIVO

Implementação de **pipelines de anonimização governada** para dados IA (SZ5), garantindo:
- Não-re-identificação do titular após anonimização
- Audit trail completo por operação
- Qualidade mínima preservada (metadados estruturais mantidos)
- Idempotência comprovada (re-execução = zero mutations)
- Proteção absoluta de tabelas `AUDIT_IMMUTABLE`

---

## 2. ARQUITECTURA

```
┌─────────────────────────────────────────────────────────────────┐
│                    AI ANONYMIZATION SERVICE                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐  │
│  │ Anonymization    │  │ Re-Embedding     │  │ Summary      │  │
│  │ Pipelines (6)    │  │ Pipeline (1)     │  │ Regen (1)    │  │
│  └────────┬─────────┘  └────────┬─────────┘  └──────┬───────┘  │
│           │                      │                    │          │
│  ┌────────▼──────────────────────▼────────────────────▼───────┐ │
│  │            Non-Re-Identification Verifier                   │ │
│  └────────────────────────────┬────────────────────────────────┘ │
│                               │                                  │
│  ┌────────────────────────────▼────────────────────────────────┐ │
│  │                  Audit Trail (audit_logs)                    │ │
│  └─────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

---

## 3. MODOS DE OPERAÇÃO

| Modo | Comportamento | Mutations | Logs |
|------|--------------|-----------|------|
| `off` | Nenhuma execução | ❌ | ❌ |
| `audit` | Dry-run: conta e loga o que SERIA anonimizado | ❌ | ✅ |
| `on` | Execução real de anonymization | ✅ | ✅ |

---

## 4. PIPELINES IMPLEMENTADOS

### 4.1 Anonymization Pipelines (6)

| ID | Tabela | Tipo | Descrição |
|----|--------|------|-----------|
| `ai_traces_payload` | `ai_interaction_traces` | payload_redact | Input/output de chamadas LLM → `{_anonymized: true}` |
| `memoria_usuario_profiles` | `memoria_usuario` | profile_redact | Perfis cognitivos (técnico, comportamental, estratégico) → marker |
| `strategic_behavior` | `strategic_user_behavior` | generalize | user_id → UUID zero (dados estatísticos preservados) |
| `session_context_purge` | `session_context` | purge | Contexto de sessão deletado (regenera-se automaticamente) |
| `cognitive_hitl_feedback` | `cognitive_hitl_feedback` | generalize | user_id → UUID zero, comments → marker |
| `knowledge_exchange_payload` | `ai_knowledge_exchange` | payload_redact | Referências pessoais em payload → marker |

### 4.2 Re-Embedding Pipeline

| Alvo | Acção | Condição |
|------|-------|----------|
| `manual_chunks.embedding` | Set NULL (trigger re-vectorização) | Chunk com manual_id órfão |

### 4.3 Summary Regeneration Pipeline

| Alvo | Acção | Condição |
|------|-------|----------|
| `operational_memory.metadata` | Marca `_summary_regen_needed=true` | Conteúdo = `[RETENTION_ANONYMIZED]` |

---

## 5. TABELAS PROTEGIDAS (NUNCA ANONIMIZADAS)

| Tabela | Razão | Base Legal |
|--------|-------|------------|
| `ai_decision_logs` | Explicabilidade IA | Art. 20 LGPD |
| `ai_legal_audit_logs` | Trilha legal obrigatória | Art. 37 LGPD |
| `ai_audit_logs` | Auditoria operacional | ISO 42001 |
| `ai_outbound_audit` | Comunicações externas | Art. 37 LGPD |

---

## 6. GARANTIAS DE NÃO-RE-IDENTIFICAÇÃO

Verificação pós-execução em 3 dimensões:

1. **traces_payload_exposed** — Zero payloads com PII em `ai_interaction_traces`
2. **cognitive_profiles_exposed** — Zero perfis não-anonimizados em `memoria_usuario`
3. **session_context_exposed** — Zero registos de contexto remanescentes

Se qualquer check falhar: `re_identification_safe = false` (alerta imediato).

---

## 7. QUALIDADE MÍNIMA PRESERVADA

| Pipeline | O que preserva | O que anonimiza |
|----------|---------------|-----------------|
| Traces | `module_name`, `model_info`, `legal_basis`, timestamps | Input/output payloads |
| Memoria | Estrutura da tabela, metadata de onboarding | Textos de perfil |
| Strategic | Intent, scores, confidence | Vínculo user_id |
| Session | Nada (regenera-se) | Tudo (transiente) |
| HITL | Action, metadata | User + comentários |
| Knowledge | Estrutura de exchange | Referências pessoais |

---

## 8. TESTES DE VALIDAÇÃO

### 8.1 Mode=audit (dry-run)
```
✅ 6 pipelines auditados
✅ Zero mutations
✅ Contagem correcta de elegíveis (115 traces expostos)
✅ Re-identification check: SAFE
```

### 8.2 Mode=on (execution)
```
✅ 4 traces anonimizados (user deaf8278)
✅ 1 trace anonimizado (user 226b8321)
✅ Post-anonymize: 0 expostos
✅ Payload verificado: {_anonymized:true, _marker:"SZ5_GOVERNED", _ts:...}
```

### 8.3 Idempotência
```
✅ Re-execução após anonymize: 0 affected
✅ Filtro de elegibilidade: (input_payload->>'_anonymized') IS NULL
```

### 8.4 Disabled mode
```
✅ mode=off → {ok:false, code:"DISABLED"}
```

---

## 9. ENDPOINTS ADMIN

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/admin/runtime/ai-anonymization` | Diagnóstico (modo, pipelines, protected) |
| POST | `/api/admin/runtime/ai-anonymization/run` | Executar pipeline (requer user_id + company_id) |

---

## 10. INTEGRAÇÃO COM DSR

Este serviço integra-se com `dsrEraseService.js`:
- DSR Erase marca dados para soft-delete/anonymization
- AI Anonymization executa anonymization específica de dados IA
- Separação de concerns: DSR = obrigação legal geral; AI Anon = governança IA específica

---

## 11. FLAGS E CONFIGURAÇÃO

| Flag | Valor | Descrição |
|------|-------|-----------|
| `IMPETUS_AI_ANONYMIZATION` | `off\|audit\|on` | Modo do serviço |

Registered in Flag Reconciler: ✅ (`CRITICAL_FLAGS`)

---

## 12. ROLLBACK PLAN

1. Setar `IMPETUS_AI_ANONYMIZATION=off`
2. PM2 restart `--update-env`
3. Serviço desactivado instantaneamente
4. Dados já anonimizados: payloads originais não recuperáveis (one-way by design)
5. Metadados estruturais e contagens preservados em todo caso

---

## 13. RISCOS RESIDUAIS

| Risco | Mitigação | Severidade |
|-------|-----------|------------|
| Re-identificação por correlação temporal | Timestamps de traces mantidos — aceite para auditoria | BAIXO |
| Perda de qualidade em modelos downstream | Quality checks por pipeline; marker permite filter out | BAIXO |
| Execução acidental em mode=on | Default `audit`; flag em Flag Reconciler | BAIXO |

---

## 14. ARTEFACTOS PRODUZIDOS

| Ficheiro | Tipo |
|----------|------|
| `backend/src/services/aiAnonymizationService.js` | Serviço principal |
| `backend/src/routes/admin/runtimeFlags.js` | Endpoints GET + POST |
| `backend/src/governance/flagReconcilerRuntime.js` | Flag registada |
| `backend/.env` | Flag configurada (`audit`) |
| `backend/docs/AI_ANONYMIZATION_SZ5_REPORT.md` | Este relatório |

---

**STATUS: CONCLUÍDO — GOVERNANÇA SZ5 OPERACIONAL**  
**NEXT:** T1.8.3 — Consent Lifecycle + AI Re-training Governance (se necessário)
