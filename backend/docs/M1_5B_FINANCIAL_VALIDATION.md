# M1.5B.6 — Financial Validation (Permissões)

**Data:** 2026-06-15  
**Fase:** M1.5B — Validação de permissões (sem alteração de runtime)  
**Modo:** Read-only validation · Nenhuma flag `.env` alterada

---

## Veredicto

```json
{
  "phase": "M1.5B.6",
  "domain": "financial",
  "runtime_altered": false,
  "financial_runtime_ready": true,
  "verdict": "FINANCIAL_PERMISSION_VALIDATION_COMPLETE"
}
```

---

## 1. Escopo

Conforme spec M1.5B.6: **NÃO alterar runtime financeiro.** Validar gating de permissões e serviços canónicos.

---

## 2. Permissões na base de dados

| Permissão | Existe |
|-----------|--------|
| `VIEW_FINANCIAL` | ✅ |
| `VIEW_STRATEGIC` | ✅ |

### Perfis CEO / Diretor (roles)

| Role | Permissões relevantes |
|------|----------------------|
| `ceo` | `VIEW_FINANCIAL`, `VIEW_STRATEGIC`, `VIEW_HR`, `VIEW_PRODUCTION`, `VIEW_REPORTS`, `ACCESS_AI_ANALYTICS`, `MANAGE_USERS` |
| `diretor` | Idem CEO |

Role `cfo` não registada como código dedicado — perfil financeiro coberto via `VIEW_FINANCIAL` em roles de diretoria.

---

## 3. `smartPanelCommandService`

**Ficheiro:** `backend/src/services/smartPanelCommandService.js`

| Dataset | Permissão exigida | Lógica |
|---------|-------------------|--------|
| `financeiro`, `costs`, `financial` | `VIEW_FINANCIAL` ou `VIEW_STRATEGIC` ou `*` | `canUseDataset()` |
| `estategico`, `strategic` | `VIEW_STRATEGIC` ou `*` | `canUseDataset()` |
| `relatorios` | `VIEW_STRATEGIC` | `AVAILABLE_DATA_SOURCES` |

**CEO bypass:** `permSet()` adiciona `*` para role `ceo` ou `admin`.

**AVAILABLE_DATA_SOURCES** inclui entradas explícitas:

- `{ id: 'financeiro', permission: 'VIEW_FINANCIAL' }`
- `{ id: 'estategico', permission: 'VIEW_STRATEGIC' }`
- `{ id: 'relatorios', permission: 'VIEW_STRATEGIC' }`

---

## 4. `secureContextBuilder`

**Ficheiro:** `backend/src/services/secureContextBuilder.js`

| Scope | Condição |
|-------|----------|
| `scope.financial` | `VIEW_FINANCIAL` ou `*` |
| `scope.strategic` | `VIEW_STRATEGIC` ou `*` |
| `scope.hr` | `VIEW_HR` ou `*` |

Restrições injectadas no prompt quando scope = false:

- Sem `VIEW_FINANCIAL` → "Não mencione dados financeiros"
- Sem `VIEW_STRATEGIC` → "Não mencione clientes estratégicos"

**Validação runtime (utilizadores sintéticos):**

| Perfil | scope.financial | scope.strategic | Restrição financeira no prompt |
|--------|-----------------|-----------------|-------------------------------|
| CEO (`VIEW_FINANCIAL` + `VIEW_STRATEGIC`) | ✅ true | ✅ true | ❌ Não injectada |
| Supervisor (só `VIEW_OPERATIONAL`) | ❌ false | ❌ false | ✅ Injectada |

---

## 5. `dashboardAccessService`

**Ficheiro:** `backend/src/services/dashboardAccessService.js`

- Módulos financeiros **não** estão em `UNIVERSAL_SAFE_ACCESS_MODULES`
- Baseline mínimo **não** inclui domínios financeiros (comentário explícito anti-vazamento)
- CEO tem deny-list operacional (`CEO_DENIED_MODULES`) — não afecta financeiro

---

## 6. APIs financeiras (gating)

| Rota | Gating |
|------|--------|
| `/api/dashboard/costs/*` | `can_see_costs` / `VIEW_FINANCIAL` |
| `/api/dashboard/financial-leakage/*` | Permissões financeiras |
| `/api/admin/nexus-custos`, `/api/admin/nexus-wallet` | Admin + tenant scope |
| `/api/nexus-ia` | Provider transparency + auth |

Comportamento esperado (M1.5A): utilizador sem permissão recebe `meta.restricted: true` ou `summary: null` — **correcto por desenho**.

---

## 7. Integração TRI-AI / Nexus

- Nexus IA providers transparency activa
- Sem flag `IMPETUS_FINANCIAL_*` shadow — domínio **operational_partial** (não shadow)

---

## 8. Confirmação canónica

```json
{
  "financial_runtime_ready": true
}
```

---

## 9. Acções pendentes (onboarding Food Base, não M1.5B)

- Atribuir `VIEW_FINANCIAL` / `VIEW_STRATEGIC` aos utilizadores CFO/CEO da Food Base após definir `company_id`
- Configurar `nexus_wallet_*` por tenant se Nexus custos for requisito piloto

Nenhuma alteração de runtime necessária para M1.5B.
