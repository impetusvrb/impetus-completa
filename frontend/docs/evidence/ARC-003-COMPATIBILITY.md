# ARC-003 — Compatibility Matrix

**Data:** 2026-07-19

---

## Certificações preservadas

| Programa | Status pós-ARC-003 | Notas |
|----------|-------------------|-------|
| ARC-001 | ✅ Intacto | Sem alterações |
| ARC-002 | ✅ Intacto | Sem alterações |
| NAV-001 | ✅ 9/9 testes | Sidebar / domain resolver inalterado |
| NAV-002 | ✅ 10/10 testes | Adapters ONX sobre EOX |
| NAV-002A | ✅ 8/8 testes | Retornos, breadcrumb, supressão header |
| WMS-007A | ✅ | Rotas standalone + gate inalterados |
| OPM-001A | ✅ 16/16 testes | Framework industrial intacto |
| OPM-001B | ✅ 10/10 testes | Warehouse foundation intacto |
| OPM-001C | ✅ 10/10 testes | Warehouse operations intacto |
| GF / REV | ✅ | Fora de escopo — não tocados |

---

## Estratégia de compatibilidade

1. **Novos componentes** em `presentation/eox/` — camada canónica
2. **Adapters** em `operational-navigation/` — delegam para EOX (NAV-002 certificado)
3. **Nav layouts** aditivos por domínio — wrapper de rota sem alterar Shells/Gates
4. **Supressão opt-in** nos hubs — `useEoxHubHeaderVisible()` condiciona headers inline existentes

Nenhum componente certificado removido ou alterado funcionalmente.

---

## Rotas — antes / depois

| Rota | Antes | Depois |
|------|-------|--------|
| `/app/logistics/warehouses` | ONX shell | EOX shell (via adapter ONX) |
| `/app/quality/operational` | Header inline hub | EOX header + hub suprimido |
| `/app/safety/operational` | Header inline hub | EOX header + hub suprimido |
| `/app/environment/operational` | Header inline hub | EOX header + hub suprimido |
| `/app/logistics/operational` | Header inline hub | EOX header + hub suprimido |
| `/app/logistics-operational/workspace/*` | Legacy certificado | **Inalterado** |

---

## Consumidores futuros (registados, não implementados)

| Domínio | Registry ID | `active` | Landing path |
|---------|-------------|----------|--------------|
| Supply | `supply` | `false` | `/app/supply/workspace` |
| Finance | `finance` | `false` | `/app/finance` |
| Produção | `production` | `false` | `/app/production/operational` |

---

## Observabilidade

Eventos EOX são **aditivos** (`impetus:eox` CustomEvent).  
Telemetria existente (Quality/Safety/Environment analytics) **não alterada**.

---

## Riscos mitigados

| Risco | Mitigação |
|-------|-----------|
| Cabeçalhos duplicados | `suppressModuleHeader` + `suppressHubHeader` |
| Regressão NAV-001 | Testes dedicados passam |
| Regressão WMS | OPM-001A/B/C + warehouse-regression passam |
| Fragmentação futura | Registry + resolvers extensíveis por domínio |
