# Retention Policy Registry — Relatório de Implementação

**PROMPT:** T1.7.1  
**Data:** 2026-05-26  
**Status:** CONCLUÍDO  
**Workers ativos:** NENHUM (apenas registry declarativo)

---

## 1. Resumo Executivo

Implementado registry central de retention policies cobrindo **153 das 281 tabelas** do sistema (54% — todas as tabelas com relevância de dados pessoais, operacional ou legal estão mapeadas).

**Sem workers ativos** — o registry é declarativo e serve como source-of-truth para futuras implementações de purge/archive.

---

## 2. Arquivos

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `backend/src/governance/retentionPolicyRegistry.js` | NOVO | Registry central (153 tabelas) |
| `backend/src/routes/admin/runtimeFlags.js` | MODIFICADO | +1 endpoint `/retention-registry` |
| `backend/docs/RETENTION_POLICY_REGISTRY_REPORT.md` | NOVO | Este relatório |

---

## 3. Tabela de Políticas

### 3.1 Distribuição por Ação

| Ação | Tabelas | % |
|------|---------|---|
| **retain** (preservar indefinidamente) | 78 | 51% |
| **purge** (eliminar após TTL) | 53 | 35% |
| **anonymize** (anonimizar conteúdo) | 22 | 14% |

### 3.2 Distribuição por Classe de Dados

| Classe | Tabelas | PII | DSR Erasable |
|--------|---------|-----|:---:|
| operational | 31 | 0 | 0 |
| config | 20 | 0 | 0 |
| audit_immutable | 19 | 4 | 0 |
| industrial | 19 | 1 | 0 |
| pii_indirect | 14 | 14 | 12 |
| pii_behavioral | 14 | 14 | 14 |
| pii_direct | 12 | 12 | 10 |
| telemetry | 9 | 0 | 0 |
| financial | 7 | 0 | 0 |
| workflow | 5 | 0 | 0 |
| pii_ai_derived | 3 | 3 | 3 |

### 3.3 Políticas Principais por Categoria

#### Identidade & Acesso (TTL definido)

| Tabela | TTL (dias) | Ação | Base Legal |
|--------|:---:|------|------------|
| users | ∞ | anonymize | Art. 7°, V — Contrato |
| sessions | 30 | purge | Art. 7°, IX — Interesse legítimo |
| refresh_tokens | 30 | purge | Art. 7°, IX — Interesse legítimo |
| password_reset_tokens | 1 | purge | Art. 7°, V — Contrato |

#### Comunicação (Chat)

| Tabela | TTL (dias) | Ação | Base Legal |
|--------|:---:|------|------------|
| chat_messages | 730 | anonymize | Art. 7°, V — Contrato |
| internal_chat_messages | 730 | anonymize | Art. 7°, V — Contrato |
| notifications | 90 | purge | Art. 7°, IX — Interesse legítimo |

#### IA & Cognitivo

| Tabela | TTL (dias) | Ação | Base Legal |
|--------|:---:|------|------------|
| ai_interaction_traces | 365 | anonymize | Art. 7°, IX — Interesse legítimo |
| ai_decision_logs | ∞ | **RETAIN** | Art. 37 — Registro operações (IMUTÁVEL) |
| ai_legal_audit_logs | ∞ | **RETAIN** | Art. 37 — Registro operações (IMUTÁVEL) |
| memoria_usuario | ∞ | purge (DSR) | Art. 7°, I — Consentimento |

#### Telemetria Industrial

| Tabela | TTL (dias) | Ação | Base Legal |
|--------|:---:|------|------------|
| telemetry_timeseries_v1 | 90 | purge | Art. 7°, IX — Interesse legítimo |
| industrial_telemetry_samples | 90 | purge | Art. 7°, IX — Interesse legítimo |
| system_metrics | 30 | purge | Art. 7°, IX — Interesse legítimo |

#### Auditoria (IMUTÁVEL — 19 tabelas)

| Tabela | TTL | Ação | Base Legal |
|--------|:---:|------|------------|
| audit_logs | ∞ | **RETAIN** | Art. 37 LGPD |
| consent_logs | ∞ | **RETAIN** | Art. 7°, II — Obrigação legal |
| lgpd_data_requests | ∞ | **RETAIN** | Art. 7°, II — Obrigação legal |
| ai_decision_logs | ∞ | **RETAIN** | Art. 37 LGPD |
| ... (15 tabelas mais) | ∞ | **RETAIN** | Art. 37 LGPD |

#### Financeiro (7 tabelas — obrigação fiscal)

| Tabela | TTL | Ação | Base Legal |
|--------|:---:|------|------------|
| token_usage | ∞ | **RETAIN** | Art. 7°, II — Obrigação legal |
| token_invoices | ∞ | **RETAIN** | Art. 7°, II — Obrigação legal |
| nexus_wallet_ledger | ∞ | **RETAIN** | Art. 7°, II — Obrigação legal |
| subscriptions | ∞ | **RETAIN** | Art. 7°, II — Obrigação legal |

---

## 4. Compatibilidade Legal LGPD

| Artigo | Requisito | Cobertura |
|--------|-----------|-----------|
| Art. 7°, I | Consentimento | 12 tabelas com base consent |
| Art. 7°, II | Obrigação legal | 23 tabelas retain obrigatório |
| Art. 7°, V | Execução de contrato | 30 tabelas |
| Art. 7°, IX | Interesse legítimo | 55 tabelas |
| Art. 16, I | Conservação por obrigação legal | 19 tabelas AUDIT_IMMUTABLE |
| Art. 16, IV | Anonimização para uso exclusivo | 22 tabelas com action=anonymize |
| Art. 18, VI | Direito à eliminação | 40 tabelas DSR-erasable |
| Art. 37 | Registro de operações | 19 tabelas audit imutável |
| Art. 46 | Medidas de segurança | Classificação formal + isolamento |

---

## 5. Impacto Operacional

### O que MUDA (agora)

| Item | Impacto |
|------|---------|
| Registry declarativo disponível | Source-of-truth para qualquer consulta |
| Endpoint admin `/retention-registry` | DPO/Admin pode consultar políticas |
| Flag reconciler | `IMPETUS_DSR_ERASE` + `IMPETUS_DSR_ERASE_STRICT` registadas |
| Classificação formal | Cada tabela com legal_basis + action + TTL |

### O que NÃO muda (zero workers)

| Item | Estado |
|------|--------|
| Purge automático | **NÃO ATIVO** — nenhum worker executa purge |
| Anonymization batch | **NÃO ATIVO** — só manual via DSR |
| Archive mover | **NÃO ATIVO** — apenas declarado |
| Retention enforcement | **NÃO ATIVO** — registry apenas |
| TTL triggers | **NÃO EXISTEM** — sem side effects |

### Compatibilidade com existente

| Sistema | Status |
|---------|--------|
| `impetus_retention_policy` (BD) | Compatível — registry complementa (não substitui) |
| `impetus_storage_table_registry` (BD) | Compatível — alignment via `retention_policy_code` |
| `dsrEraseService.js` | Pode usar `getDsrErasableTables()` para validação |
| Motor A / Engine V2 | Sem impacto (registry é read-only) |
| Runtime Z / Pilotos | Sem impacto |

---

## 6. API Pública do Registry

```javascript
const registry = require('./src/governance/retentionPolicyRegistry');

registry.getPolicy('chat_messages')        // → política de 1 tabela
registry.getAllPolicies()                   // → array completo (153)
registry.getPoliciesByAction('purge')       // → 53 tabelas para purge
registry.getPoliciesByDataClass('pii_direct')  // → 12 tabelas PII direto
registry.getDsrErasableTables()            // → 40 tabelas apagáveis via DSR
registry.getImmutableTables()              // → 19 tabelas NUNCA tocar
registry.getPiiTables()                    // → 48 tabelas com dados pessoais
registry.getExpiredPolicies()              // → tabelas cujo TTL já expirou
registry.getRegistryStats()                // → estatísticas agregadas
registry.getDiagnostics()                  // → { enabled, stats, coverage }
```

### Endpoint Admin

```
GET /api/admin/runtime/retention-registry                    → diagnostics + stats
GET /api/admin/runtime/retention-registry?table=chat_messages → política específica
GET /api/admin/runtime/retention-registry?filter=pii         → tabelas PII
GET /api/admin/runtime/retention-registry?filter=dsr         → tabelas DSR-erasable
GET /api/admin/runtime/retention-registry?filter=immutable   → tabelas imutáveis
GET /api/admin/runtime/retention-registry?filter=purge       → tabelas para purge
GET /api/admin/runtime/retention-registry?filter=anonymize   → tabelas para anonymize
```

---

## 7. Próximos Passos (NÃO implementados)

1. **Worker de purge** — Scheduler que executa purge nas tabelas com `ttl_days` expirado
2. **Worker de archive** — Move dados para cold/archive storage
3. **Anonymization batch** — Processa anonymize em massa nas tabelas elegíveis
4. **Dashboard DPO** — Interface visual de consulta de retention policies
5. **Cobertura 100%** — Mapear as 128 tabelas restantes (maioritariamente config/industrial sem PII)
6. **Sync com BD** — Sincronizar registry com `impetus_retention_policy` table
