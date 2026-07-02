# CERT — Responsividade Mobile ManuIA Campo

**Data:** 2026-06-23  
**Tipo:** FIX — UX mobile / overflow horizontal  
**Escopo:** ManuIA Campo, Ferramentas (ManuIA embedded), Assistência ao Vivo, Gestão de Ativos / Estoque  

## Problema reportado

Validação em smartphone Android:
- Scroll horizontal indevido (áreas vazias à direita)
- **Estoque de Peças** com tabela desktop cortada (P0)
- Copiloto técnico com input/botão comprimidos
- Área de vídeo/câmera com grande espaço morto sem stream ativo

## Princípio

Preservação integral do design industrial (dark, cyan/green, tipografia). Apenas correções responsivas — sem redesenho.

## Arquivos alterados

| Ficheiro | Correção |
|----------|----------|
| `StockTable.jsx` | Tabela desktop + **cards verticais** em `<768px` |
| `AssetManagement.module.css` | Cards mobile, `overflow-x: hidden`, grids 1 col |
| `LiveTechnicalAssistance.module.css` | Mobile: copiloto stacked, ações 2 col, overflow |
| `LiveTechnicalAssistanceModule.jsx` | Placeholder câmera compacto quando inativa |
| `ManuIA.css` | Tabs wrap, blocos embedded sem overflow |
| `ManuIA.jsx` | Classe `manuia--embedded` |
| `ManuIAExtensionApp.css` | `max-width: 100vw`, `overflow-x: hidden`, header mobile |
| `ManuIAExtensionApp.jsx` | Removida margem negativa no embed |
| `ManuiaOperationalKpiStrip.jsx` | KPIs `minWidth: 0` |
| `DigitalTwinApplied.css` | Breakpoints mobile (aba Gêmeo Digital) |

## Correções por etapa

### P0 — Estoque de Peças
- Desktop: tabela inalterada
- Mobile: cada peça vira card com Código, Nome, Qtd, Ponto, Sugestão IA, Status, Ações
- **Zero scroll horizontal** obrigatório para leitura

### Overflow horizontal global
- `max-width: 100%`, `overflow-x: hidden`, `box-sizing: border-box` em shells ManuIA Campo e módulos live

### Copiloto técnico
- Input largura total; botão Enviar abaixo em `<768px`
- Mensagens com `word-break` / `overflow-wrap`

### Câmera
- `videoWrapCompact` quando assistência inativa (max-height ~140px)
- Placeholder com ícone + texto orientativo

### Ações rápidas
- Grid 2 colunas em mobile; 1 coluna em `<360px`
- Botões `min-width: 0`, texto quebra linha

### Abas ManuIA (Ferramentas)
- Wrap 2 colunas em tablet/mobile; 1 coluna em `<390px`

## Breakpoints testados (CSS)

- 767px — transição tabela → cards, layout live assistance
- 480px — header ManuIA Campo
- 390px / 360px — abas e ações em coluna única

## Critérios de aceite

| Critério | Estado |
|----------|--------|
| Sem overflow horizontal nas telas Campo | ✅ CSS global + cards |
| Estoque legível em smartphone | ✅ Cards mobile |
| Copiloto sem compressão | ✅ Input stacked |
| Design industrial preservado | ✅ Apenas media queries |
| Sem regressão desktop | ✅ Tabela mantida `>767px` |
| Build frontend | ✅ Verificar pipeline |

## Regressões verificadas

- Desktop: tabela estoque visível (`tableWrapDesktop`)
- Desktop: grid live assistance 2 colunas em `>1100px`
- ManuIA desktop com Layout inalterado (classe `manuia--embedded` só no Campo)
