# Fase L — Delivery Precision Audit

**Data:** 2026-05-19  
**Escopo:** Runtime de entrega (módulos, ferramentas, widgets, KPIs, summaries, cards)  
**Modo:** Shadow-first + observabilidade ON (`IMPETUS_RUNTIME_PRECISION_OBSERVABILITY=on`)

---

## Resumo executivo

Após a Fase K (alinhamento semântico), o IMPETUS detecta inconsistências e leakage, mas a **entrega operacional** ainda apresenta imprecisão contextual: módulos parcialmente corretos, widgets com escopo herdado, KPIs/summaries dependentes de builders globais e composição corporativa residual em dashboards operacionais.

A Fase L introduz camada **additive-only** em `backend/src/precisionRuntime/` para medir, comparar e explicar entrega — sem enforcement automático por defeito.

---

## Classificação de achados

| ID | Achado | Severidade | Impacto operacional | Impacto cognitivo | Impacto governance | ISO/IEC 42001 | UX | Trustworthiness |
|----|--------|------------|---------------------|-------------------|-------------------|---------------|-----|-----------------|
| L-A01 | Módulos exclusivos visíveis fora do eixo (ex.: `quality` em `safety`) | **CRITICAL** | Alto — decisões em domínio errado | Alto — modelo mental incorreto | Alto — violação de publication | Controlo de escopo AI | Confusão de navegação | Baixa confiança |
| L-A02 | Widgets sem `domain` aceites como legacy (confiança 0.75) | **HIGH** | Médio — cards genéricos | Médio | Médio | Transparência de origem | Layout inconsistente | Média |
| L-A03 | KPI com `generic_fallback` residual | **HIGH** | Alto — métricas não acionáveis | Alto | Alto | Rastreabilidade de dados | KPIs “corporativos” | Baixa |
| L-A04 | Summary sintético sem `provenance` | **HIGH** | Médio | Alto — alucinação percebida | Alto | Explicabilidade | Resumo não confiável | Baixa |
| L-A05 | Ferramentas expostas por permissão genérica | **MEDIUM** | Médio | Baixo | Médio | Autorização | Itens irrelevantes | Média |
| L-A06 | Overdelivery vs precise_modules (shadow) | **MEDIUM** | Médio | Médio | Observabilidade | Monitorização | Sem alteração UX (shadow) | Melhora com L |
| L-A07 | Underdelivery_risk com poucos módulos elegíveis | **MEDIUM** | Baixo | Médio | Baixo | — | Possível underexposure | Média |
| L-A08 | Shared modules excessivos (`reports`, `analytics`) | **LOW** | Baixo | Baixo | Baixo | — | Aceitável se governado | Alta se auditado |
| L-A09 | Delivery mismatch legacy vs governed | **MEDIUM** | Médio | Médio | Alto | Auditoria | Nenhum (shadow) | Alta pós-validação |
| L-A10 | Profile/domain mismatch em tools registry | **MEDIUM** | Médio | Baixo | Médio | — | Ferramentas ocultas erradas se ON | Média |
| L-A11 | Runtime delivery uncertainty (sem score) | **HIGH** | Alto | Alto | Alto | Métricas de confiança | — | Resolvido por telemetria L |
| L-A12 | Cards com contexto incorreto (domain mismatch) | **HIGH** | Alto | Alto | Médio | — | Widgets errados no painel | Baixa |
| L-A13 | Hierarquia vs tool `min_hierarchy` | **LOW** | Baixo | Baixo | Baixo | — | Menus restritos | OK |
| L-A14 | Semantic incompatibility sem estado UI | **MEDIUM** | — | Médio | Alto | Explainability | Frontend ignora `precision_delivery` hoje | Melhora futura |
| L-A15 | Builders globais em smart-summary | **CRITICAL** | Alto | Alto | Alto | Proveniência | Resumo genérico | Baixa |

---

## Delivery mismatch (legacy vs precise)

| Cenário | Legacy entrega | Precise recomenda | Tipo |
|---------|----------------|-------------------|------|
| Safety + modules `[sst, quality]` | Ambos | `quality` negado | Overdelivery |
| Operations + maintenance | OK | OK | Match |
| Executive + operational_actions tool | Visível se legacy | Negado (hierarchy) | Tool mismatch |
| KPI generic_fallback | Exibido | Flagged / denied se ON | KPI residual |

---

## Recomendações (não automáticas)

1. Manter **shadow** até `delivery_precision_score` estável ≥ 0.9 em staging.
2. Activar `IMPETUS_PRECISE_MODULE_DELIVERY=on` apenas por tenant piloto.
3. Não activar KPI/summary enforcement sem validar builders e provenance.
4. Expor `precision_delivery` no frontend apenas após UX review (fora do escopo L).

---

## Referências

- Implementação: `runtime-delivery-precision-implementation.md`
- Código: `backend/src/precisionRuntime/`
- API: `GET /api/internal/governance/runtime-precision/*`
