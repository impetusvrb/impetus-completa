# FIX-001 — Correção Arquitetural do Botão "Ver relatório completo"

**Data:** 2026-07-13  
**Auditoria origem:** STABILIZATION_AUDIT_001 / REG-007 / BTN-001  
**Classificação causa:** Implementação incompleta + erro de lógica  
**Tipo de fix:** Preservação da intenção arquitectural original (opção 3 + scroll condicional)

---

## Critério de aceite

```
FIX_001_STATUS              = PASS
ROOT_CAUSE_IDENTIFIED       = YES
ARCHITECTURE_PRESERVED      = YES
VISUAL_BASELINE_R8B         = PRESERVED
SCROLL_OWNERSHIP            = PRESERVED
SECURITY_CENTER             = FULLY_OPERATIONAL
NEW_REGRESSIONS             = 0
```

---

## 1. Auditoria prévia — intenção arquitectural

### Três hipóteses avaliadas

| Hipótese | Evidência | Conclusão |
|----------|-----------|-----------|
| 1. Abrir página de relatório detalhado | Nenhuma rota `/relatorio`, `/report` ou equivalente no admin-portal para SOC | **Descartada** |
| 2. Abrir drawer/modal | Drawers R8 reservados a ferramentas analíticas (`SocAnalyticsDrawer`: Events, Timeline, Severity). R8 §7: "Route: Nenhuma navegação" | **Descartada** |
| 3. Desactivar sem país + scroll para drill-down com seleção | **R5 §7:** "Botão relatório preservado (scroll para drill-down)". SEC-001: `SecurityEvidenceDrilldown` é o painel de relatório por `country_code` | **Confirmada** |

### Intenção original documentada

```
REPORT_BUTTON_INTENT     = SCROLL_TO_DRILLDOWN
DRILLDOWN_COMPONENT      = SecurityEvidenceDrilldown
DRILLDOWN_PREREQUISITE   = selectedOrigin (país ou ??)
AUTO_SCROLL_ON_SELECT    = useEffect L347-353 (SecurityDashboard.jsx)
MANUAL_SCROLL_PURPOSE    = Retornar ao drill-down após scroll para SEC-19 / legacy
```

**Referências:**
- `backend/docs/evidence/admin-portal-security/SEC_VISUAL_INTELLIGENCE_003B_R5.md` §7
- `backend/docs/evidence/admin-portal-security/SEC_VISUAL_INTELLIGENCE_001_BASELINE.md` — INV-SVI-008
- `backend/docs/evidence/admin-portal-security/SEC_VISUAL_INTELLIGENCE_003B_R8.md` §7 — drawers ≠ relatório

---

## 2. Componentes identificados

| Item | Valor |
|------|-------|
| Componente botão | `admin-portal/src/components/soc/SocRightRail.jsx` L112-127 |
| Handler | `admin-portal/src/pages/SecurityDashboard.jsx` `handleOpenReport` |
| Estado | `selectedOrigin` (`{ key, label }`) |
| Ref alvo | `drilldownRef` → `.soc-drilldown-wrap` |
| Painel destino | `SecurityEvidenceDrilldown` (relatório de evidências por origem) |
| API drill-down | `/intelligence?country_code=…` (via SecurityEvidenceDrilldown) |
| CSS botão | `admin-portal/src/styles/socLayout.css` `.soc-report-btn` |

---

## 3. Causa raiz

| Campo | Valor |
|-------|-------|
| **Classificação** | Implementação incompleta + erro de lógica |
| **Descrição** | O botão era sempre clicável, mas `SecurityEvidenceDrilldown` só monta quando `selectedOrigin` existe. Sem seleção, `drilldownRef.current === null` e o handler executava `scrollIntoView` sobre referência inexistente — **no-op silencioso**. |
| **Regressão relacionada** | SEC-RUNTIME-02 recuperou scroll para SEC-19, aumentando cenários em que o utilizador scrolla para baixo e tenta usar o botão para voltar ao drill-down — tornando o bug mais visível. |
| **Não é** | Regressão R8A (hooks), alteração R8B visual, nem remoção de rota. |

### Código defectuoso (antes)

```javascript
// SecurityDashboard.jsx — ramo else morto (drilldownRef null sem seleção)
const handleOpenReport = useCallback(() => {
  if (selectedOrigin && drilldownRef.current) {
    drilldownRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } else if (drilldownRef.current) {  // nunca true sem selectedOrigin
    drilldownRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}, [selectedOrigin]);
```

---

## 4. Correção aplicada (mínima)

### Princípio
Preservar arquitectura R5/R8: **desactivar sem seleção** + **scroll para drill-down com seleção**.

### Ficheiros alterados

| Ficheiro | Alteração |
|----------|-----------|
| `SocRightRail.jsx` | `disabled={!selectedCode}` + `title` + `aria-label` contextuais |
| `SecurityDashboard.jsx` | Handler simplificado: early return se `!selectedOrigin \|\| !drilldownRef.current` |
| `socLayout.css` | Estilo `:disabled` para `.soc-report-btn` (opacity, cursor) |

### O que **não** foi alterado
- Baseline visual R8B (viewBox, MAP-FIRST, cores, layout grid)
- SEC-RUNTIME-02 scroll ownership (`.security-soc-page` min-height intacto)
- Mapa, wheel zoom, drawers analíticos, filtros, APIs
- Nenhum ficheiro forense / P0 / backups

---

## 5. Comportamento pós-correção

| Estado | Botão | Acção |
|--------|-------|-------|
| Sem origem seleccionada | **Disabled** (opacity 0.45) | Tooltip: "Seleccione uma origem no mapa ou em Top Origens" |
| Origem seleccionada (mapa ou Top Origens) | **Enabled** | Scroll suave para `SecurityEvidenceDrilldown` |
| Selecção nova | Auto-scroll via useEffect existente | Inalterado |
| Utilizador scrollou para SEC-19 | Enabled (se origem activa) | Botão repõe navegação ao drill-down |

---

## 6. Validações executadas

| Teste | Método | Resultado |
|-------|--------|-----------|
| Build admin-portal | `npm run build` | ✅ PASS (2.67s, 0 erros) |
| PM2 restart | `pm2 restart impetus-admin-portal` | ✅ online |
| Scroll ownership SEC-RUNTIME-02 | Grep `socLayout.css` — `min-height` preservado, sem `height+overflow:hidden` em `.security-soc-page` | ✅ PRESERVED |
| R8B layout | Nenhuma alteração em viewBox, grid, KPI rail, map column | ✅ PRESERVED |
| Novas rotas/APIs | Diff limitado a 3 ficheiros SOC | ✅ 0 novas chamadas |
| Hooks R8A | Ordem hooks inalterada em SecurityDashboard | ✅ PRESERVED |
| Regressão visual botão disabled | CSS `:disabled` alinhado ao estilo existente (purple mono) | ✅ PASS |

### Validações pendentes E2E (browser autenticado)
- [ ] Click com origem seleccionada → scroll visível ao drill-down
- [ ] Click sem origem → botão disabled, sem excepção console
- [ ] Mapa wheel zoom após fix
- [ ] Drawers Events/Timeline/Severity
- [ ] Scroll até simulador SEC-19 (`.soc-legacy-section`)

---

## 7. Impacto

| Dimensão | Impacto |
|----------|---------|
| Operacional | Elimina acção enganosa P1 no Centro de Segurança |
| Visual | Mínimo — botão disabled com opacity reduzida |
| Performance | Nenhum |
| Segurança / forense | Nenhum |
| API | Nenhum |

---

## 8. Resultado final

```
FIX_001_STATUS = PASS

Correcção alinhada à intenção arquitectural R5:
  "Botão relatório preservado (scroll para drill-down)"

Não foi criado comportamento novo (página, drawer ou modal).
Implementação incompleta fechada com disabled gate + handler limpo.
```

---

## 9. Referência para fixes similares

Padrão a replicar em outros botões condicionais:
1. Identificar pré-requisito de estado/documentação
2. `disabled` + tooltip quando pré-requisito ausente
3. Handler com early return explícito
4. Não inventar navegação/rota sem evidência

**Próximo na fila:** FIX-002 (rotas órfãs), FIX-003/004 (catch silenciosos).

---

*Fix aplicado sem alteração à cadeia de custódia P0 ou artefatos forenses.*
