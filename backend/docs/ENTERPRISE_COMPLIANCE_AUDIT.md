# IMPETUS — ENTERPRISE COMPLIANCE AUDIT

**Data:** 2026-05-25
**Escopo:** LGPD + ISO/IEC 42001 + governança enterprise + privacidade operacional + auditabilidade
**Tipo:** auditoria não-implementadora

---

## 0. Sumário executivo

A arquitetura do IMPETUS está **alinhada com os fundamentos da LGPD** e demonstra **maturidade ISO/IEC 42001 incipiente** (gestão de IA). Os pilares core — consentimento, auditabilidade, sanitização de dados sensíveis, anonimização, retenção, segregação multi-tenant, explainability — estão **implementados em código de produção** (`middleware/lgpd.js`, `middleware/audit.js`, `eventProcessor/anonymize.js`, `policyEngine/channels/secureChatContextBuilder.js`, `security/contextExposureSanitizer.js`).

Porém **há 6 áreas que requerem hardening e/ou redesign antes de comercialização enterprise plena e/ou certificação formal**:

1. **DPO / DSR formal workflow** (subject access requests com SLA documentado).
2. **Encryption at rest com KMS efetivamente ligado** (hoje opt-in e em fallback `env`).
3. **Cifragem de campos sensíveis em tabelas operacionais** (não só traces IA).
4. **Federation/SSO + MFA universal** (ausentes).
5. **Retention policies uniformes** (hoje só auditoria + traces IA, falta para `chat_messages`, `z_conversation_message_index`).
6. **AI governance ISO 42001 com AI-cards/model registry** (apenas explainability runtime).

---

## 1. Pergunta-a-pergunta (PHASE 4)

### 1.1 A arquitetura actual está alinhada com fundamentos LGPD?

**Sim, com gaps táticos.**

| Princípio LGPD | Estado | Evidência | Gap |
|----------------|--------|-----------|-----|
| **Finalidade** | OK | LGPD protocol injetado em prompts (`chatAIService.consolidated.js`, `impetusVoiceChatService.js`); `documentContext.getImpetusLGPDComplianceProtocol()` | — |
| **Adequação** | OK | `moduleAccessGovernanceEngine.js` filtra por `lgpd_scope`; sanitização cross-domain | Gap: scope tagging não-uniforme |
| **Necessidade** | OK | Sanitização de payloads sensíveis (`security/contextExposureSanitizer.js` para mqtt/modbus/opcua) | — |
| **Livre acesso** | PARCIAL | `lgpd_export_v1` em export profile; consent log queries existem | Falta UI estável para o titular |
| **Qualidade dos dados** | OK | Engine V2 + dashboardProfiles validam KPIs; structuralAI separa operational vs general | — |
| **Transparência** | OK | LGPD protocol + AI explainability runtimes (quality/environment) | Falta data subject portal padronizado |
| **Segurança** | PARCIAL | bcrypt password, encryption service AES-256 (`encryptionService.js`), KMS opt-in | KMS não-bootstrapped por defeito |
| **Prevenção** | OK | sanitização + audit + anti-leakage runtime | — |
| **Não-discriminação** | OK | structuralAIGovernance gate; AI governance bloqueia decisões sem domínio | Sem teste fairness formal |
| **Responsabilização / prestação de contas** | OK | `ai_legal_audit_logs`, lifecycle service, audit middleware | Falta DPO workflow formal |

### 1.2 Há governança de consentimento adequada?

**Sim, para os fluxos primários.**

- `consent_logs` (tabela append-only) com `consent_type`, `document_version`, `granted`, `consent_text`, `ip_address`, `user_agent`, `revoked_at`.
- `users.lgpd_consent` + `users.lgpd_consent_date` sincronizado.
- `revokeConsent` insere registo de revogação se inexistente (anti-perda histórica).
- `registerConsent` + `safeInsertConsentLog` com fail-safe (não derruba app).

**Gaps:**
- Sem **inventário de propósitos** mapeado a `consent_type` (granularidade textual).
- Sem **opt-in granular** por finalidade analítica/IA (apenas "termos / privacidade").
- Sem **API pública** documentada para o titular consultar/revogar online (`/api/lgpd` existe mas não-documentada externamente).

### 1.3 Dados operacionais sensíveis estão protegidos?

**Sim, com gaps em encryption-at-rest seletiva.**

- **Sanitização** robusta: `policyEngine/channels/secureChatContextBuilder.js` + `security/contextExposureSanitizer.js` removem `mqtt`, `modbus`, `opcua`, `primary_table` antes de prompts.
- **Anonimização**: `eventPipeline/processor/anonymize.js` mascara CPF, e-mail, telefone, CNPJ, sequências numéricas longas em payloads de eventos.
- **Anonimização de utilizadores**: `anonymizeUserData` (middleware/lgpd) substitui PII por hash determinístico.
- **Encryption**:
  - `services/encryptionService` AES-256 GCM para traces IA;
  - KMS opt-in (`DATA_ENCRYPTION_KMS_PROVIDER=aws|gcp`);
  - **Fallback:** chave `DATA_ENCRYPTION_KEY` em env (mock-compatible).

**Gaps:**
- Encryption **não cobre todas as tabelas** com PII operacional (ex.: `chat_messages` em plaintext).
- KMS **não bootstrapped automaticamente em produção** (`warmKmsEncryptionKey` é decisão explícita ops; documentado em `DATA_ENCRYPTION.md` linha 52).
- Sem column-level encryption transparente para `cpf`, `email`, `phone` em `users`.

### 1.4 A governança de memória conversacional é suficiente?

**SIM (SZ5 entregue), com ressalvas em retenção.**

- `z_conversation_message_index` segregado por `tenant_id` + `thread_id`.
- `zConversationalGovernanceRuntime.assertChatAccess` valida `chat_participants` por SQL scoped.
- `canExposeActor` aplica `roleAccessPolicy.canShareWith` antes de expor identidades em respostas.
- Facts-before-LLM evita o LLM inventar nomes/datas (`zUnifiedConversationalContextInjector`).

**Gaps:**
- **Sem política de retenção formal** para `z_conversation_message_index` (a tabela é additive-only; volumes crescem indefinidamente).
- **Sem direito-ao-esquecimento** sobre essa tabela (anonymizeUserData não a varre).
- **Cross-thread links** (`z_operational_memory_links`) podem persistir relações entre threads de utilizadores anonimizados.

### 1.5 Ações operacionais geradas por IA são auditáveis?

**Sim, parcialmente — registo existe, execução autónoma ainda não.**

- `ai_legal_audit_logs` (append-only com archive flag).
- `auditMiddleware` aplica-se a rotas críticas (`knowledge_doc_created`, etc.).
- `qualityCognitiveAuditEnvelope`, `environmentExecutiveExplainability` registam contextos de decisão.
- Hoje a IA **não executa ações operacionais autónomas** (`OPERATIONAL_TOOL_CALLING_ENABLED=false`), portanto risco baixo.

**Gaps:**
- Sem **AI-card por modelo/uso** (ISO 42001 §6/§9): que modelo, fine-tuning, dados de treino, métricas.
- Sem **model registry** versionado.
- Sem **human-in-the-loop** formal antes de promover ações IA → execução.

### 1.6 Identidade operacional está suficientemente protegida?

**Sim, em produção.**

- bcrypt + JWT + middleware/auth.
- `operationalIdentityGovernance` ativa (`IMPETUS_OPERATIONAL_IDENTITY_GOVERNANCE=on`).
- Tenant isolation cross-domain (`domainIsolationGuard`).
- Diacritics/sectorial mapping testados (`ENTERPRISE_IDENTITY_VISIBILITY_SOVEREIGNTY_REPORT.md`).
- `IMPETUS_HIERARCHY_AUTHORITY_VALIDATION=on`.

**Gaps:**
- **MFA universal ausente** (não há flag/middleware MFA obrigatório).
- **SSO/Federation ausente** (sem SAML/OIDC IdP integration).
- **Session policy** uniforme não documentada (timeouts, IP-pin).

### 1.7 Isolamento multi-tenant é robusto?

**Sim, com necessidade de testing rotineiro.**

- SQL queries sempre scoped por `tenant_id` / `company_id` nas rotas auditadas.
- `domainIsolationGuard` rejeita pipelines cross-domain proibidos (HR↔industrial, finance↔industrial).
- `chat_participants` controla cross-thread visibility.
- Tenant promotion lists (`IMPETUS_SZ4_PROMOTED_TENANTS=…`) restringe runtime expansion.

**Gaps:**
- Sem **suite de fuzzing multi-tenant** automatizada (apenas testes funcionais).
- Sem **row-level security PostgreSQL (RLS)** — proteção é a nível aplicação.

### 1.8 Há riscos em SZ5 (memória conversacional)?

**Sim, dois riscos médios:**

1. **Retenção indefinida** — `z_conversation_message_index` cresce sem TTL; impacto a 12–18 meses em dimensionamento e LGPD (direito ao esquecimento).
2. **Cross-thread leakage potencial** — `z_operational_memory_links` correlaciona threads por workflow/actor; deve ser inspeccionado para garantir que não atravessa fronteira tenant.

Risco baixo:
- Segurança de query: SQL scoped + governance assert.
- Sensitive sanitization: `canExposeActor` filtra.

### 1.9 Há riscos em persistência de telemetria?

**Sim, conceptuais (telemetria real ainda em shadow).**

- Tabelas `industrial_event_outbox`, `industrial_event_dlq`, `industrial_event_replay_log` activas em modo *mirror*.
- **Sem KMS-encryption** para payloads industriais (tipicamente não-PII, mas regulatorialmente sensíveis em ambientes farmacêuticos/alimentares).
- **Sem retention policy industrial** declarada para outbox.
- Quando telemetria real for ligada, volumes serão >100k/dia/tenant e exigirão particionamento + arquivamento.

### 1.10 Há gaps de governança em Runtime Z?

**Sim, quatro:**

1. **Z.28 adaptive orchestration `shadow`** — orquestração adaptativa ainda observativa; ao promover, deve passar por audit gate IEC 62443-like.
2. **Z.29 governance learning `shadow`** — aprendizagem de governança não-supervisionada; risco se promovida sem human-in-the-loop.
3. **SZ4 persistence off** — sinais operacionais SZ4 não persistem após reboot; impacto em auditabilidade forense.
4. **Cognitive block registry** definitional (delivery_active=false) — divergência entre catálogo declarado e o que efetivamente roda.

---

## 2. Identificação detalhada de gaps

### 2.1 Compliance gaps (LGPD)

| ID | Gap | Severidade | Evidência | Impacto |
|----|-----|-----------|-----------|---------|
| C1 | Sem DSR (Data Subject Request) workflow formal com SLA | Médio | `/api/lgpd` parcialmente documentado; sem UI | Risco de incumprimento ANPD (prazo 15 dias) |
| C2 | Retention policy só para `ai_legal_audit_logs` + DI trace; falta para `chat_messages`, `z_conversation_message_index`, `eventos_empresa` | Alto | `dataLifecycleService.runRetentionCycle()` cobre subset | Acumulação indefinida; risco direito ao esquecimento |
| C3 | Encryption-at-rest não cobre PII em `users` (cpf, e-mail) | Médio | encryptionService só usado em traces IA; users em plaintext | LGPD §46 (segurança); breach amplificado |
| C4 | Sem column-level encryption para sensitive operational data | Médio | `industrial_event_outbox.payload` em JSONB plaintext | Risco em ambientes regulados (ANVISA, ANP) |
| C5 | Anonimização ao revogar consentimento não cobre SZ5 | Médio | `anonymizeUserData` cobre `users`, `user_sessions`; não toca `z_conversation_message_index` | Esquecimento incompleto |
| C6 | Granularidade de consent_type limitada (apenas "termos/privacidade") | Baixo | `syncUserConsentFlags` whitelist | Sem opt-in granular IA / analytics |

### 2.2 Legal risks

| ID | Risco | Severidade |
|----|-------|-----------|
| L1 | Operação em chão de fábrica com IA decisora sem ISO/IEC 42001 ou IEC 61508 (safety) | Alto se autonomia for promovida |
| L2 | Direito ao esquecimento incompleto (SZ5) | Médio |
| L3 | Falta de DPO declarado e workflow formal | Médio (ANPD vai cobrar em fiscalização) |
| L4 | Cláusulas de DPA (Data Processing Agreement) entre IMPETUS e clientes não auditadas neste corpo | Médio (depende do contrato comercial) |

### 2.3 Privacy risks

| ID | Risco |
|----|-------|
| P1 | `z_conversation_message_index` pode armazenar **content** completa de mensagens (auditar coluna) → retenção crítica |
| P2 | `chat_messages` em plaintext (sem encryption) — exposição em backups |
| P3 | Voice context (`impetusVoiceChatService`) pode atravessar sanitização menos rigorosa que chat texto |

### 2.4 Governance inconsistencies

| ID | Inconsistência |
|----|----------------|
| G1 | `cognitiveBlockRegistry` declara blocos com `delivery_active=false`; runtime real entrega via outro pipeline → catálogo divergente |
| G2 | Flags `IMPETUS_COGNITIVE_RUNTIME=off` mas `IMPETUS_SEMANTIC_DELIVERY_OBSERVABILITY=on` força execução da facade → contradição semântica |
| G3 | Quality publication `full`, Safety/Environment `shadow` — clientes podem ver UX inconsistente entre tenants pilot |
| G4 | Z.18 Cognitive Block Registry Foundation declarado mas com `delivery_active=false` |
| G5 | `chatAIService.js` (legado) coexiste com `chatAIService.consolidated.js` — confusão sobre hot path |

### 2.5 Auditability gaps

| ID | Gap |
|----|-----|
| A1 | Decisões cognitivas SZ4 não persistem por defeito (`IMPETUS_SZ4_PERSISTENCE=off`) — forensics limitada |
| A2 | Sem trail formal de promoção entre stages (Z_SHADOW → Z_ASSISTIVE → Z_AUTHORITATIVE) |
| A3 | AI prompts efetivos enviados ao LLM não são amostrados/persistidos para auditoria post-hoc |
| A4 | `auditMiddleware` aplicado a subset de rotas, não universal |

---

## 3. Explicação por categoria de remediação

### 3.1 O que **precisa ser corrigido**

| Item | Recomendação |
|------|--------------|
| C1 | Implementar `GET /api/lgpd/subject/me/export`, `POST /api/lgpd/subject/me/erase` com SLA 15 dias; UI no perfil utilizador |
| C2 | Adicionar políticas em `dataLifecycleService` para `chat_messages`, `z_conversation_message_index`, `eventos_empresa` (TTL configurável por tenant e tipo) |
| C5 | Estender `anonymizeUserData` para varrer `z_conversation_message_index` e marcar threads como anonimizadas |
| A1 | Ligar `IMPETUS_SZ4_PERSISTENCE=on` num tenant pilot com retenção limitada (90 dias) |
| L3 | Designar DPO formal + workflow documentado (RACI) |

### 3.2 O que **já é suficiente**

- Consent core (`registerConsent` / `revokeConsent` / `consent_logs`).
- Audit append-only com archive (`ai_legal_audit_logs`).
- Sanitização de payloads sensíveis cross-domain.
- Anonimização básica de utilizadores.
- Tenant isolation a nível aplicação (com domain isolation guard).
- Encryption AES-256 para traces IA + KMS opt-in com fallback seguro.
- Explainability runtimes por domínio (quality + environment).
- LGPD protocol no prompt LLM.

### 3.3 O que **precisa só de hardening**

| Item | Hardening |
|------|-----------|
| Encryption | Ligar KMS por defeito em produção (warm na startup); migrar chaves periodicamente |
| Tenant isolation | Acrescentar suite de fuzzing multi-tenant + RLS PostgreSQL opcional |
| Audit middleware | Aplicar a **todas** as rotas mutantes (write) sem exceções |
| Retention | Uniformizar e expor política em `/api/lgpd/policy` |
| Sessões | Adicionar IP-pin opcional + revogação central |

### 3.4 O que **precisa redesign**

| Item | Motivo |
|------|--------|
| AI governance ISO 42001 | Hoje há explainability mas não há **model registry** + **AI-cards** + **risk register** formal por modelo |
| Federation/SSO | Não existe; redesign para suportar SAML/OIDC + SCIM |
| OPA-policy | Governança fragmentada em N flags + N guards; consolidar em policy engine declarativo (Rego ou similar) |
| Action runtime IA autónomo | Hoje "tool calling" desligado; ao promover precisa redesign com IEC 61508 SIL-rating + HITL |

---

## 4. Alinhamento normativo (resumo)

| Norma | Estado de alinhamento | Justificação |
|-------|----------------------|--------------|
| **LGPD (Brasil)** | **Substantivamente alinhado, com gaps táticos** | Pilares cobertos (§§6, 18, 37, 46); falta workflow DSR + retention uniforme |
| **ISO/IEC 42001** (gestão de IA) | **Incipiente (Foundation)** | LGPD protocol obrigatório, audit trail legal, explainability — mas falta model registry, AI-cards, risk register, HITL formal |
| **ISO/IEC 27001** (SGSI) | **Foundation parcial** | Encryption, RBAC, audit, lifecycle service; falta SoA documentado, controles operacionais formais |
| **SOC 2 Type II** | **Não pronto** | Sem operational evidence acumulado (>6 meses) + sem APM externo |
| **IEC 62443** (industrial control systems) | **Não pronto** | Requer separação zone/conduit, agente edge endurecido, segregação rede industrial — ausentes |
| **GDPR (UE)** | **Substantivamente equivalente a LGPD** | Mesmos pilares; necessidade de data residency UE (multi-region storage) é gap para internacionalização |

---

## 5. Conclusão

O IMPETUS é **substantivamente alinhado com LGPD e fundamentos enterprise**. Não há **risco crítico imediato** em ambiente piloto controlado. Para **certificação formal** (ISO 27001, SOC 2, ISO 42001) é necessário um plano de remediação de 6 meses focado em:

1. DSR workflow + retention uniforme (Tier 1 — `FINAL_STRATEGIC_DEVELOPMENT_ROADMAP.md`).
2. KMS por defeito + column-level encryption.
3. Federation/SSO + MFA.
4. Model registry + AI-cards (ISO 42001).
5. OPA-policy engine.
6. Operational evidence acumulado (APM + SLO).

Esse plano consta no roadmap estratégico.

---
*Documento gerado como auditoria estratégica. Nenhum código foi alterado.*
