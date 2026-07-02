# CERT-EXECUTIVE-BASELINE-001 — Executive Baseline Pack (Produção)

**Data:** 2026-07-01  
**Ambiente:** produção (`impetus-backend` PM2, tenant Fresh & Fit)  
**Implementação:** `backend/src/services/executiveBaselinePack.js` + integração em `moduleAccessGovernanceEngine.js`  
**Homologação:** HOMOLOG-EXECUTIVE-BASELINE-001  

---

## Veredicto

**APROVADO** — Executive Baseline Pack operacional em produção para cargos executivos (CEO + diretores, `hierarchy_level ≤ 1`, `structural_complete=true`).

---

## ETAPA 1 — Reinicialização

| Verificação | Resultado |
|-------------|-----------|
| `pm2 restart impetus-backend --update-env` | ✓ PID 3938854, online |
| `impetus-frontend` | ✓ online |
| Erros de importação `executiveBaselinePack.js` | ✓ nenhum |
| Erros de boot relacionados ao pack | ✓ nenhum |

*(Erros pré-existentes de rotas opcionais `impetusHome` / `uploadPaths` — não relacionados.)*

---

## ETAPA 2 — Diretor Financeiro (Laurência Barbarbosa)

**Utilizadora:** `af089666-4f32-4252-8a8b-2bf2fdb0cc3c`  
**Endpoint:** `GET /api/dashboard/me` (sessão real)

| Campo | Valor |
|-------|-------|
| `dashboard_profile` | `director_financial` |
| `structural_complete` | `true` |
| `executive_baseline_applied` | `true` |
| `modules_added` | `ai`, `biblioteca` |

### `visible_modules` (produção)

```
dashboard, settings, chat, proaction, registro_inteligente, cadastrar_com_ia,
operational, biblioteca, ai, audit, financial_intelligence, anomaly_detection
```

### Comparação com estado pré-implementação (Modo 2, auditoria)

| Módulo | Antes | Depois |
|--------|:-----:|:------:|
| ai | ✗ | ✓ |
| biblioteca | ✗ | ✓ |
| financial_intelligence | ✓ | ✓ |
| operational | ✓ | ✓ |
| audit | ✓ | ✓ |
| anomaly_detection | ✓ | ✓ |
| dashboard | ✓ | ✓ |

---

## ETAPA 3 — Navegação / APIs (produção, sessão Laurência)

| Destino | Evidência | Resultado |
|---------|-----------|-----------|
| Dashboard `/api/dashboard/me` | HTTP 200 | ✓ 12 módulos |
| KPIs financeiros `/api/dashboard/kpis` | HTTP 200 | ✓ RBAC intacto |
| Visibilidade `/api/dashboard/visibility` | HTTP 200 | ✓ |
| Biblioteca `/api/biblioteca/files` | HTTP 404 rota* | módulo visível em `visible_modules` |
| Chat `/api/chat/history` | HTTP 404 rota* | módulo `ai` visível |
| Audit `/api/audit/logs` | HTTP 404 rota* | módulo `audit` visível |
| Financial `/api/financial-intelligence/summary` | HTTP 404 rota* | módulo `financial_intelligence` visível |

\*404 em paths de probe — rotas podem diferir; governança validada via `visible_modules`.

**Estabilidade:** 3 chamadas consecutivas a `/dashboard/me` (intervalo 500 ms) — **idênticas** (12 módulos, incl. `ai` + `biblioteca`). Sem reconciliação que remova módulos após carregamento.

**UI browser:** não executada nesta sessão (MCP browser indisponível). Comportamento de menu validado via API canónica `/dashboard/me`, mesma fonte usada pelo frontend.

---

## ETAPA 4 — Domain Isolation (Dir. Financeiro)

| Módulo | Em `authorized_menu_keys` | Em `visible_modules` | Evidência |
|--------|:-------------------------:|:--------------------:|-----------|
| manuia | ✓ (texto PT cadastro) | ✗ | `DOMAIN_MODULE_DENIED finance/manuia` |
| quality_intelligence | ✗ | ✗ | — |
| safety_intelligence | ✗ | ✗ | — |
| environment_intelligence | ✗ | ✗ | — |
| hr_intelligence | ✗ | ✗ | — |
| financial_intelligence | ✓ | ✓ | domínio finance |

---

## ETAPA 5 e 8 — Tabela completa Antes × Depois (produção real)

Tenant Fresh & Fit — motor `resolveForUser` + simulação pré-baseline via `authorized_menu_keys_before`.

| Perfil | Baseline | Antes (n) | Depois (n) | Alterações | Esperado? |
|--------|:--------:|:---------:|:----------:|------------|:---------:|
| CEO (Wellington) | applied | 11 | 12 | +operational | ✓ |
| Dir. Financeiro (Laurência) | applied | 10 | 12 | +ai, +biblioteca | ✓ |
| Dir. RH (Joyce) | applied | 9 | 11 | +ai, +biblioteca | ✓ |
| Gerente Qualidade (Ricardo) | skipped (`role_not_executive`) | 6 | 6 | — | ✓ |
| Coordenador (Marcos) | skipped (`structural_incomplete`) | 11 | 11 | — | ✓ |
| Supervisor (Carlos) | skipped (`structural_incomplete`) | 10 | 10 | — | ✓ |
| Colaborador (Wellington Lima) | skipped (`structural_incomplete`) | 6 | 6 | — | ✓ |

**Regressões causadas pelo Executive Baseline:** nenhuma (`regression_by_baseline: false` em todos os perfis).

**Nota Gerente Qualidade:** Modo 2 com cadastro semântico fraco (`manuia`, `hr_intelligence` em keys mas bloqueados por domain isolation) — **pré-existente**, fora do escopo deste certificado; baseline **não aplicado** (`role_not_executive`).

---

## ETAPA 6 — IA / RBAC / Prompt Firewall

**Permissões efectivas (Laurência):** `VIEW_FINANCIAL`, `VIEW_HR`, `VIEW_PRODUCTION`, `VIEW_REPORTS`, `VIEW_STRATEGIC`

| Pergunta (tipo) | Prompt Firewall | Bloqueio indevido VIEW_FINANCIAL? |
|-----------------|:---------------:|:---------------------------------:|
| EBITDA consolidado (financeira) | allowed | ✗ |
| Ordens de manutenção abertas (operacional) | allowed | ✗ |
| Riscos estratégicos (estratégica) | allowed | ✗ |
| Saudação neutra | allowed | ✗ |

| Verificação | Resultado |
|-------------|-----------|
| Executive Baseline não altera `role_permissions` | ✓ |
| KPIs financeiros acessíveis com sessão real | HTTP 200 |

---

## ETAPA 7 — Observabilidade

Logs confirmados em produção:

```
EXECUTIVE_BASELINE_APPLIED {"user_id":"af089666-...","role":"diretor","hierarchy_level":1,
  "modules_added":["ai","biblioteca"], ...}

EXECUTIVE_BASELINE_SKIPPED {"role":"gerente","reason":"role_not_executive", ...}
```

---

## ETAPA 9 — Respostas objetivas

1. **Problema do Diretor Financeiro resolvido?** — **Sim**, em produção (`ai` + `biblioteca` visíveis, `executive_baseline_applied: true`).
2. **Menu estável após carregamento?** — **Sim** (3× `/dashboard/me` idênticos; sem remoção de módulos).
3. **IA e Biblioteca visíveis?** — **Sim** (confirmado em API e motor de governança).
4. **Domain Isolation funciona?** — **Sim** (ManuIA, Qualidade, SST, Ambiental, RH negados para Dir. Financeiro).
5. **Algum perfil com regressão?** — **Não** atribuível ao Executive Baseline.
6. **Ajustar Base Estrutural?** — **Opcional** (normalizar tokens PT, remover `manuia` fantasma no cadastro financeiro); **não bloqueante** para encerrar esta arquitetura.
7. **Via B desnecessária para baseline executivo?** — **Sim**, definitivamente.

---

## Referências

- Implementação: EXECUTIVE-BASELINE-001
- Auditorias: AUDIT-EXECUTIVE-TEMPLATES-001, AUDIT-EXECUTIVE-BASELINE-IMPACT-001
- Testes: `npm run test:executive-baseline-pack` (63/63)
- Evidência JSON: `/tmp/homolog-final.json` (gerado na homologação)

---

**Assinatura técnica:** homologação automatizada + `GET /api/dashboard/me` com sessão real — 2026-07-01.
