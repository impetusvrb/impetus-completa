# M1.15 — Financial F48 Root Cause Analysis

**Data:** 2026-06-16  
**Tenant piloto:** Fresh & Fit `511f4819` · Food Base Pilot  
**Modo:** READ ONLY · diagnóstico — sem remediação

---

## Resultado

```json
{
  "financial_f48_confirmed": true,
  "financial_partial_confirmed": true,
  "affected_endpoints": [
    "POST /api/dashboard/chat",
    "POST /api/dashboard/chat-multimodal",
    "GET /api/dashboard/costs/executive-summary",
    "GET /api/dashboard/charts/* (when can_see_costs=false)",
    "smartPanelCommandService datasets financeiro/estratégico"
  ],
  "root_cause_identified": true
}
```

---

## Divergência M1.11 vs F48

| Dimensão | M1.11 | F48 Stress |
|----------|-------|------------|
| Critério | `financial_leakage_reports` + traces com role `VIEW_FINANCIAL` | Chat Truth com utilizador sem permissão efectiva |
| Resultado | `financial_operational: true` | `financial_partial: true`, 5× `empty_response` |
| Tenant | Fresh Fit `511f4819` | Lab `21dd3cee` (CERT_REAL_COMPANY_ID) |

**Conclusão:** Não é falha de backend financeiro (6 leakage reports com AI no piloto). É **divergência de critérios + gap RBAC no gateway de chat**.

---

## As 5 respostas vazias (F48)

| ID | Pergunta | HTTP | Termo bloqueado | Gateway |
|----|----------|------|-----------------|---------|
| ST-061 | Qual o custo operacional do mês? | **403** | `custo` | promptFirewall |
| ST-062 | Qual a margem de contribuição actual? | **403** | `margem` | promptFirewall |
| ST-066 | Qual o custo por unidade produzida? | **403** | `custo` | promptFirewall |
| ST-067 | Qual a receita consolidada da semana? | **403** | `receita` | promptFirewall |
| ST-069 | Qual o EBITDA operacional do mês? | **403** | `ebitda` | promptFirewall |

**Utilizador F48:** `ia@impetus.internal` · role `ai_system` · `permissions: []`  
**Evidência:** `backend/docs/STRESS_TEST_RESULTS.json`, `STRESS_TEST_FAILURES.md`

Respostas classificadas como `empty_response` porque o script F48 lê `body.reply` — o endpoint devolve `{ ok: false, code: 'VIEW_FINANCIAL' }` **sem campo `reply`**.

---

## Causa raiz

### 1. Gateway: `promptFirewall`

**Ficheiro:** `backend/src/middleware/promptFirewall.js`

- Termos financeiros (`custo`, `margem`, `receita`, `ebitda`, …) exigem `VIEW_FINANCIAL` **efectivo**
- `getUserPermissions()` (`authorize.js`) resolve apenas `users.permissions` JSON — **não** herda `role_permissions`
- CEOs/diretores Fresh Fit: `role=ceo|diretor`, `permissions=[]`, `role_id=null` → permissão efectiva **vazia** no firewall

### 2. Critério M1.11 diferente

**Ficheiro:** `pilotOperationWindowService.js` → `_usersWithPermTraces`

- Join `roles.code = u.role` + `role_permissions` → detecta 6 utilizadores com traces financeiros
- Combina com 6 `financial_leakage_reports` → `financial_operational: true`

### 3. Gates de permissão envolvidos

| Gate | Onde | Comportamento |
|------|------|---------------|
| `VIEW_FINANCIAL` | promptFirewall, smartPanelCommandService, secureContextBuilder | Bloqueio hard (403) ou negação LLM |
| `VIEW_STRATEGIC` | promptFirewall, dashboardAccessService | Bloqueio estratégico |
| Role CEO/CFO/Director | `role_permissions` (ceo, diretor, gerente) | Definido na BD; **não propagado** ao firewall |
| `can_see_costs` | dashboardChartDataService | Role-based (ceo/financeiro/diretor) — **path separado** do chat |

---

## Perfis piloto Fresh Fit

- Utilizadores CEO/diretor/gerente: `permissions: []` (excepto admin com `*`)
- `role_permissions` define `VIEW_FINANCIAL` para ceo/diretor/gerente — **não reflectido** em `getUserPermissions()`

---

## Remediação (M1.16 — fora de scope)

1. Unificar resolução RBAC: `getUserPermissions()` deve incluir `role_permissions`
2. Alinhar resposta 403 do chat com mensagem Truth (evitar `empty_response` no scoring)
3. Propagar `VIEW_FINANCIAL` aos perfis piloto CEO/CFO ou usar utilizador certificado no stress F48 financeiro

**Truth Program:** comportamento correcto de **não inventar KPI** — falha é UX/gateway, não hallucination.
