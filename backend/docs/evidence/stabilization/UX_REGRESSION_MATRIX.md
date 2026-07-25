# UX REGRESSION MATRIX — IMPETUS Stabilization 2026-07-13

**Auditoria:** STABILIZATION_AUDIT_001  
**Design System de referência:** `.cursor/rules/design-system-industrial-4.mdc`, `frontend/src/styles/tokens.css`  
**Método:** Análise estática CSS/JSX + cruzamento com auditorias anteriores

---

## Legenda de severidade UX

| Nível | Descrição |
|-------|-----------|
| UX-P0 | Conteúdo inacessível / bloqueio total de tarefa |
| UX-P1 | Acção enganosa ou perda significativa de usabilidade |
| UX-P2 | Inconsistência visual ou navegação confusa |
| UX-P3 | Polimento / acessibilidade menor |

---

## Matriz de achados UX

| ID | Módulo / Área | Categoria | Descrição | Severidade | Prioridade fix | Facilidade |
|----|---------------|-----------|-----------|------------|----------------|------------|
| UX-001 | Centro Segurança | Acção enganosa | Botão "Ver relatório completo →" clicável sem feedback quando nenhum país seleccionado | UX-P1 | P1 | Alta |
| UX-002 | AdminIntegrations | Feedback | Botão "Copiar token" copia em silêncio — sem toast de sucesso/erro | UX-P2 | P3 | Alta |
| UX-003 | Navegação admin | Descoberta | 3 rotas funcionais sem entrada no sidebar (warehouse, logistics, audio-logs) | UX-P2 | P2 | Alta |
| UX-004 | Layout manutenção | Navegação | Roles `technician_maintenance`, `manager_maintenance` etc. caem em menu colaborador genérico | UX-P2 | P2 | Média |
| UX-005 | chat-module | Design System | `chat.css` L3: `font-family: 'Inter'` — viola regra Rajdhani + Share Tech Mono | UX-P2 | P2 | Média |
| UX-006 | cognitiveEcosystem | Scroll | Múltiplos `overflow: hidden` em `.cognitiveEcosystem.css` — risco scroll duplo com SmartPanel | UX-P2 | P2 | Média | **PASS** (FIX-009 — legítimo) |
| UX-007 | SmartPanel | Scroll | `.smartPanel` com `overflow: auto` aninhado — potencial double scroll | UX-P2 | P3 | Média | **PASS** (FIX-009 — INTERNAL_SCROLL intencional) |
| UX-008 | AdminUsers | Texto cortado | `.AdminUsers.css` L112: `overflow: hidden` em células — nomes longos truncados | UX-P3 | P3 | Baixa |
| UX-009 | AdminAuditLogs | Texto cortado | Payload preview truncado a 20k chars (intencional) + ellipsis em metadados | UX-P3 | P3 | N/A |
| UX-010 | AdminDepartments | Acessibilidade | Ícones Editar/Apagar sem `title`/`aria-label` | UX-P3 | P3 | Alta |
| UX-011 | AdminEquipmentLibrary | Acessibilidade | Botões "Principal" e "Validar IA" disabled sem tooltip explicativo | UX-P3 | P3 | Alta |
| UX-012 | AdminAudioLogs | Acessibilidade | Paginação Anterior/Próxima disabled sem title (contexto parcial via "Página X de Y") | UX-P3 | P3 | Baixa |
| UX-013 | AdminIntegrations | Acessibilidade | Revogar token disabled quando agente inactivo — sem razão inline | UX-P3 | P3 | Baixa |
| UX-014 | Overlays globais | Stacking | Toast/Voice/FloatButton z-index 9998–9999 — colisão potencial com modais | UX-P2 | P3 | Média |
| UX-015 | Centro Comando | Colisão | Botão Atualizar parcialmente encoberto por overlay cognitivo em 1366×768 (CERT-01-1) | UX-P2 | P2 | Média | **PASS** (FIX-007) |
| UX-016 | Centro Segurança | Responsividade | Layout MAP-FIRST optimizado desktop; breakpoints mobile não certificados pós-R8B | UX-P2 | P2 | Média |
| UX-017 | Centro Segurança | Contraste | Histórico 003A: vermelho = volume eventos (não alarme) — legenda R8B parcialmente mitiga | UX-P3 | P3 | Baixa |
| UX-018 | ImplementationGuide | Consistência | Usa CSS próprio alinhado ao DS; sem Layout wrapper (página standalone strict admin) | UX-P3 | P3 | N/A |
| UX-019 | CompanyAdminSettings | Abas | 7 tabs — URL sync funcional; tab `manuals` redirecciona para biblioteca | UX-P3 | P3 | N/A |
| UX-020 | CognitiveGovernance | Estado vazio | Mensagem técnica quando flag desactivada — adequado ao DS | UX-P3 | P3 | N/A |

---

## Checklist UX por dimensão

| Dimensão | Achados | Estado |
|----------|---------|--------|
| Alinhamentos | Sem desalinhamentos críticos detectados estaticamente | ✅ |
| Componentes sobrepostos | UX-015 resolvido (FIX-007) | ✅ |
| Textos cortados | UX-008, UX-009 — ellipsis intencional em tabelas | ⚠ |
| Scrolls duplos | UX-006/007 auditados FIX-009 — sem regressão | ✅ |
| Elementos fora da tela | REG-001 resolvido (SEC-19) | ✅ |
| Responsividade | UX-016 — SOC mobile não re-certificado | ⚠ |
| Espaçamentos | Admin modules seguem tokens e `.impetus-card` | ✅ |
| Contraste | DS dark + acentos cyan/green — conforme tokens | ✅ |
| Consistência visual | UX-005 Inter no chat — excepção | ⚠ |
| Componentes duplicados | AdminDashboard órfão vs hubs existentes | ⚠ |

---

## Conformidade Design System Industrial 4.0

| Regra | Conformidade | Excepções |
|-------|--------------|-----------|
| Fundos dark (`--bg-*`) | ✅ | chat-module legacy |
| Tipografia Rajdhani + Share Tech Mono | ⚠ 95% | `chat.css` Inter |
| border-radius ≤ 8px | ✅ | — |
| Botões primários translúcidos cyan | ✅ | — |
| Gráficos com tokens `--chart-*` | ✅ | NexusIACustos usa Recharts + tokens |
| Sem mock/random em gráficos | ✅ | — |

---

## Resumo quantitativo

| Métrica | Valor |
|---------|-------|
| Total achados UX | 20 |
| UX-P0 | 0 |
| UX-P1 | 1 |
| UX-P2 | 8 |
| UX-P3 | 11 |

---

## Priorização recomendada

1. **UX-001** — Corrigir ou desactivar "Ver relatório completo" (bloqueia confiança no SOC)
2. **UX-003** — Expor rotas órfãs no menu admin
3. **UX-005** — Migrar chat-module para fontes DS
4. **UX-015** — ~~Re-testar colisão overlay Centro Comando~~ **DONE (FIX-007)**
5. **UX-006/007** — ~~Auditar scroll ownership~~ **DONE (FIX-009 — NO_PATCH_REQUIRED)**

---

*Análise estática. Validação visual E2E recomendada na fase de correção.*
