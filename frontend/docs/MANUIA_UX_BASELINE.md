# MANUIA-UX-BASELINE — Baseline oficial de UX do módulo ManuIA

**Versão:** 001 + 002 (congelamento + protocolo de regressão)  
**Status:** CONGELADO (baseline aprovada)  
**Data de congelamento:** 2026-07-01  
**Escopo:** exclusivamente o módulo **ManuIA** — não se aplica a Dashboard, Centro de Comando, Qualidade, SST, Ambiental, Logística, Administração, Chat nem demais módulos Impetus.

---

## 1. Objetivo

Estabelecer a interface atual da ManuIA como **referência oficial**, impedindo regressões de UX em implementações futuras. Alterações estruturais nesta hierarquia exigem **revisão explícita** (ticket/arquitetura do módulo) antes de merge.

**Evidências de evolução até esta baseline:**  
`CERT-UX-MANUIA-001`, `CERT-UX-MANUIA-002`, `CERT-UX-MANUIA-002A`, `CERT-UX-MANUIA-002B`, `CERT-DASHBOARD-P0-POST-DEPLOY-001`, `CERT-MANUIA-UX-BASELINE-001`, `CERT-MANUIA-UX-BASELINE-002`.

**Protocolo de regressão (MANUIA-UX-BASELINE-002):** secção 11 — obrigatório antes de concluir qualquer alteração na ManuIA.

---

## 2. Rotas cobertas

| Rota | Descrição |
|---|---|
| `/app/manutencao/manuia` | ManuIA principal (desktop + mobile) |
| `/app/manutencao/manuia-app` | ManuIA Campo (embedded; herda baseline quando usa os mesmos componentes) |

---

## 3. Hierarquia oficial (ordem imutável)

Do topo ao fundo da viewport de conteúdo:

```
Layout (global)
└─ Cognitive Core compacto          ← variant="manuia" (Layout.jsx)
└─ ManuIA (página)
   ├─ 1. Cabeçalho                   ← .manuia-header
   ├─ 2. Centro de Ação              ← ManuiaActionCenter (4 tiles)
   ├─ 3. Runtime compacto            ← ManuiaOperationalKpiStrip (recolhível)
   ├─ 4. Ferramentas (navegação)     ← lista vertical (mobile) OU tabs (desktop)
   ├─ 5. Conteúdo da ferramenta      ← módulo ativo (activeTab)
   ├─ 6. Resultados                  ← pesquisa: 3D + Copiloto; emergências
   └─ 7. Atalhos                     ← Diagnosticar Falha, Minhas OS (abas primárias)
```

### 3.1 Centro de Ação (ações rápidas — não substitui navegação de módulos)

Grid 2×2 no mobile; 4 colunas no desktop. Tiles fixos:

| Tile | Ação |
|---|---|
| Pesquisa | `goSearch()` |
| Ao vivo | `goLive()` |
| Upload | `goUpload()` |
| Código / QR | modal QR → `handleQrSearch` |

**Arquivo:** `frontend/src/features/manutencao-ia/ManuiaActionCenter.jsx`

### 3.2 Runtime compacto

- Recolhido (default mobile): uma linha — `● Online · N máquinas · N sessões`
- Expandido: KPIs completos (máquinas, sessões, emergências, backend)
- **Não mover** acima do Centro de Ação nem abaixo do conteúdo principal.

**Arquivo:** `frontend/src/features/manutencao-ia/ManuiaOperationalKpiStrip.jsx`

### 3.3 Ferramentas (navegação de módulos — ordem fixa)

| # | ID `activeTab` | Label mobile | Label desktop |
|---|---|---|---|
| 1 | `search` | Pesquisa | Pesquisa por texto |
| 2 | `vision3d` | Assistência Técnica ao Vivo | Assistência Técnica ao Vivo |
| 3 | `asset-management` | Gestão de Ativos | Gestão de Ativos |
| 4 | `field-analysis` | Análise Foto/Vídeo | Análise foto/vídeo |
| 5 | `digital-twin` | Gêmeo Digital | Gêmeo Digital |

**Admin (somente desktop):** `technical-library` — Biblioteca técnica inteligente.

**Constante:** `MODULE_TABS` em `frontend/src/pages/ManuIA.jsx`

### 3.4 Cognitive Core (ManuIA)

- Renderizado pelo `Layout.jsx` quando `isManuiaRoute`
- Variant `manuia`: banner de uma linha; expandir ao toque; link «Ecossistema Cognitivo»
- **Não competir visualmente** com o conteúdo ManuIA no mobile

**Arquivos:**  
`CognitiveCompactPresence.jsx`, `cognitiveCompactPresence.css`

---

## 4. Navegação — regra de ouro (002B)

### Uma única instância no DOM

| Viewport | Renderização | Proibido |
|---|---|---|
| Mobile `≤767px` | `<nav class="manuia-tools-stack">` — lista vertical | Montar `manuia-tabs` no DOM |
| Desktop `≥768px` | `<div class="manuia-tabs">` — barra horizontal | Montar `manuia-tools-stack` no DOM |

Implementação: **render condicional** via `useIsMobileNav()` — **nunca** duplicar com `display: none`.

### Handlers oficiais (não duplicar)

| Contexto | Pesquisa | Ao vivo | Demais |
|---|---|---|---|
| Mobile (stack) | `goSearch()` | `goLive()` | `setActiveTab(id)` |
| Desktop (tabs) | `setActiveTab('search')` | `setActiveTab('vision3d')` | `setActiveTab(id)` |

Estado único: `activeTab` / `setActiveTab`.

---

## 5. Responsividade

| Breakpoint | Comportamento |
|---|---|
| `≤767px` | Mobile-first; header sem subtítulo; pesquisa sem título duplicado; stack vertical; Runtime recolhido por default |
| `768px–1024px` | Tablet segue desktop (tabs horizontais, Action Center 4 colunas) |
| `≥768px` | Tabs horizontais; títulos e descrições de blocos visíveis |

Viewports de validação obrigatória: ver **secção 11.1** (360×800, 390×844, 768×1024, ≥1366px + orientações).

---

## 6. Inventário de componentes e ficheiros

### Página e estilos

| Ficheiro | Função |
|---|---|
| `frontend/src/pages/ManuIA.jsx` | Orquestração, `activeTab`, `MODULE_TABS`, render condicional nav |
| `frontend/src/pages/ManuIA.css` | Estilos do módulo (header, stack, tabs, blocos, atalhos) |

### Features ManuIA

| Ficheiro | Função |
|---|---|
| `ManuiaActionCenter.jsx` | Centro de Ação (4 tiles) |
| `ManuiaOperationalKpiStrip.jsx` | Runtime KPI recolhível |
| `diagnosisMapping.js` | Mapeamento diagnóstico por sintoma |

### Módulos de conteúdo (por `activeTab`)

| `activeTab` | Componente |
|---|---|
| `search` | Pesquisa, `ManuIAUnityViewer`, Copiloto IA |
| `vision3d` | `LiveTechnicalAssistanceModule`, `LiveSessionStatus` |
| `asset-management` | `AssetManagementModule` |
| `field-analysis` | `TechnicalFieldAnalysisModule` |
| `digital-twin` | `DigitalTwinAppliedModule` |
| `technical-library` | `TechnicalLibraryInteligenteModule` (admin) |

### Layout / Cognitive

| Ficheiro | Função |
|---|---|
| `frontend/src/components/Layout.jsx` | `CognitiveCompactPresence variant="manuia"` em rotas ManuIA |

### Live Assistance (fluxo aprovado)

| Ficheiro | Função |
|---|---|
| `LiveTechnicalAssistanceModule.jsx` | Assistência ao vivo (câmera, IA, WebRTC) |
| `LiveSessionStatus.jsx` | Status de sessão progressivo |
| `LiveTechnicalAssistance.module.css` | Estilos live |

### ManuIA Campo

| Ficheiro | Função |
|---|---|
| `frontend/src/manuia-app/ManuIAExtensionApp.jsx` | App embedded mobile |

---

## 7. Princípios de UX específicos da ManuIA

1. **Uma decisão por camada** — Centro de Ação para ações rápidas; stack/tabs para troca de módulo; sem terceiro menu paralelo.
2. **Scroll mínimo no mobile** — Runtime e Cognitive compactos; sem títulos redundantes na pesquisa.
3. **Feedback táctil** — tiles e stack com estados `:active` e `--active`.
4. **Design System Industrial 4.0** — tokens em `tokens.css`; Rajdhani + Share Tech Mono; sem fundos claros.
5. **Dados reais** — sem mocks em gráficos/KPIs do Runtime (APIs `manutencaoIa.*`).

---

## 8. Proibições (sem aprovação explícita)

- Alterar a hierarquia da secção 3
- Reintroduzir navegação horizontal no mobile
- Duplicar menus, componentes, handlers ou estado de navegação
- Montar duas árvores de navegação (mesmo ocultas por CSS)
- Mover Runtime ou Centro de Ação
- Alterar a ordem das 5 ferramentas em `MODULE_TABS`
- Criar menus paralelos (ex.: tabs + stack + «Mais»)
- Regressão desktop ao refinar mobile

---

## 9. Como incorporar novas funcionalidades

1. Identificar o `activeTab` ou tile do Centro de Ação adequado.
2. Se nova ferramenta de módulo: **proposta de arquitetura** — altera `MODULE_TABS` (ordem congelada).
3. Conteúdo novo entra em **secção 5 (Conteúdo)** ou **secção 6 (Resultados)** — nunca entre Runtime e Ferramentas.
4. Executar **protocolo completo** da secção 11 antes de merge.

---

## 10. Checklist de auditoria rápida

Resumo executivo — o protocolo completo está na **secção 11**.

Sempre que houver PR/tarefa que toque ficheiros ManuIA listados na secção 6:

- [ ] Existe **apenas uma** navegação principal de ferramentas no mobile (stack OU tabs, nunca ambas no DOM)
- [ ] Nenhum componente de navegação duplicado
- [ ] Runtime permanece compacto e na posição oficial (após Centro de Ação)
- [ ] Centro de Ação mantém 4 tiles e handlers originais
- [ ] Ferramentas na ordem oficial (`MODULE_TABS`)
- [ ] Fluxo Cabeçalho → … → Atalhos consistente
- [ ] Protocolo secção 11 executado nos 4 viewports obrigatórios
- [ ] Evidência registada em `backend/docs/evidence/cert01/`
- [ ] Cognitive Core `variant="manuia"` inalterado salvo fix pontual
- [ ] Nenhuma alteração em módulos fora do escopo ManuIA

---

## 11. Testes Obrigatórios de Regressão Visual da ManuIA

**MANUIA-UX-BASELINE-002** — processo permanente de validação.  
Toda alteração na ManuIA (código, CSS ou layout) **só pode ser considerada concluída** após execução integral desta secção.

> Esta secção não altera interface nem comportamento — institucionaliza auditoria para preservar a UX aprovada.

### 11.1 Viewports obrigatórios

Validar **obrigatoriamente** nos quatro cenários abaixo antes de encerrar qualquer tarefa:

| Cenário | Resolução | Uso |
|---|---|---|
| Mobile pequeno | **360 × 800** | Android compacto, retrato |
| Mobile padrão | **390 × 844** | iPhone padrão, retrato |
| Tablet | **768 × 1024** | iPad / tablet, retrato e paisagem |
| Desktop | **≥ 1366 px** largura | Laptop e monitor (mínimo e tela ampla) |

**Orientações adicionais (secção 11.5):** mobile e tablet também em **paisagem**; desktop em largura mínima e tela ampla (≥1920px recomendado quando disponível).

Ferramentas aceites: DevTools responsive mode, dispositivo físico, ou automação browser (MCP/browser) com capturas arquivadas na evidência.

### 11.2 Checklist — Estrutura

| # | Item | ☐ |
|---|---|---|
| 1 | Ordem oficial dos componentes preservada | |
| 2 | Cognitive Core continua na posição definida (Layout, acima do conteúdo ManuIA) | |
| 3 | Centro de Ação permanece na posição oficial (após cabeçalho) | |
| 4 | Runtime permanece compacto (após Centro de Ação) | |
| 5 | Ferramentas permanecem abaixo do Runtime | |
| 6 | Conteúdo continua abaixo das ferramentas | |
| 7 | Resultados permanecem abaixo do conteúdo | |
| 8 | Atalhos continuam após os resultados (abas primárias) | |

### 11.3 Checklist — Navegação

| # | Item | ☐ |
|---|---|---|
| 1 | Existe apenas uma navegação principal de ferramentas | |
| 2 | Não existem componentes duplicados no DOM | |
| 3 | Não existem menus redundantes | |
| 4 | Não existem handlers duplicados para a mesma ferramenta | |
| 5 | Desktop continua utilizando `manuia-tabs` (horizontal) | |
| 6 | Mobile continua utilizando somente `manuia-tools-stack` (vertical) | |

### 11.4 Checklist — Funcionalidade

Validar que todos os acessos respondem normalmente (toque/clique → módulo ou ação esperada):

| Acesso | Via | ☐ |
|---|---|---|
| Pesquisa | Stack/tab + tile Centro de Ação | |
| Assistência Técnica ao Vivo | Stack/tab + tile «Ao vivo» | |
| Gestão de Ativos | Stack/tab | |
| Análise Foto/Vídeo | Stack/tab | |
| Gêmeo Digital | Stack/tab | |
| Upload | Tile Centro de Ação | |
| Código / QR | Tile Centro de Ação → modal | |

### 11.5 Checklist — Interface

| # | Item | ☐ |
|---|---|---|
| 1 | Runtime inicia recolhido no mobile | |
| 2 | Cognitive Core permanece compacto | |
| 3 | Centro de Ação preservado (4 tiles, grid oficial) | |
| 4 | Espaçamentos mantidos (sem expansão acidental de padding/gap) | |
| 5 | Hierarquia visual preservada | |
| 6 | Nenhum componente sobreposto | |
| 7 | Nenhum overflow horizontal | |
| 8 | Nenhum scroll horizontal involuntário | |
| 9 | Scroll inicial permanece reduzido (sem blocos redundantes) | |

### 11.6 Checklist — Responsividade

| Contexto | Orientação / largura | ☐ |
|---|---|---|
| Mobile | Retrato (360, 390) | |
| Mobile | Paisagem (ex.: 844×390) | |
| Tablet | Retrato (768×1024) | |
| Tablet | Paisagem (1024×768) | |
| Desktop | Largura mínima (1366px) | |
| Desktop | Tela ampla (≥1920px, se disponível) | |

### 11.7 Evidências obrigatórias

Toda alteração na ManuIA deve produzir um ficheiro em:

```text
backend/docs/evidence/cert01/CERT-MANUIA-REGRESSION-<TICKET>-<YYYYMMDD>.md
```

**Modelo mínimo do relatório:**

```markdown
# Regressão ManuIA — [ID da tarefa]

- **Data:** YYYY-MM-DD
- **Alteração:** (resumo)
- **Viewports testados:** 360×800, 390×844, 768×1024, ≥1366px (+ paisagem quando aplicável)
- **Checklist:** estrutura / navegação / funcionalidade / interface / responsividade
- **Resultado:** APROVADO | REPROVADO
- **Regressões encontradas:** (lista ou «nenhuma»)
- **Correções aplicadas:** (lista ou «n/a»)
- **Capturas:** (caminhos ou referência)
```

Evidência inicial do protocolo: `CERT-MANUIA-UX-BASELINE-002.md`.

### 11.8 Critério de conclusão de tarefa

Uma tarefa que toque a ManuIA **não está concluída** se:

- faltar validação em qualquer viewport da secção 11.1;
- faltar item obrigatório dos checklists 11.2–11.6;
- não existir evidência na pasta `cert01`;
- houver regressão estrutural não documentada e não aprovada.

---

## 12. Alterações estruturais

Qualquer mudança que viole a secção 8 é **alteração arquitetural do módulo ManuIA** e requer:

1. Ticket com justificativa de negócio  
2. Revisão de UX/arquitetura  
3. Atualização deste documento (nova versão de baseline)  
4. Novas evidências em `backend/docs/evidence/cert01/`

---

## 13. Referência rápida de implementação

```text
Layout
  CognitiveCompactPresence (variant=manuia)
  ManuIA
    manuia-header
    ManuiaActionCenter
    ManuiaOperationalKpiStrip
    isMobileNav ? manuia-tools-stack : manuia-tabs
    [conteúdo por activeTab]
    [atalhos se isPrimaryTab]
```

**Fonte canónica:** `frontend/src/pages/ManuIA.jsx` (baseline 2026-07-01).
