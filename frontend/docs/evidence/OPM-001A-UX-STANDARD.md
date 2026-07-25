# OPM-001A — UX Standard

**Entrega:** OPM-001A  
**Data:** 2026-07-19

---

## Hierarquia visual (top → bottom)

```
┌─────────────────────────────────────────┐
│ HEADER · título + badge fase + contexto │
├─────────────────────────────────────────┤
│ KPI PANEL · 4 cards (configurável 6/8)  │
├─────────────────────────────────────────┤
│ TOOLBAR · acções habilitadas por módulo │
├─────────────────────────────────────────┤
│ SEARCH BAR · slot (disabled OPM-001A)   │
├─────────────────────────────────────────┤
│ FILTER BAR · slot (placeholder)         │
├─────────────────────────────────────────┤
│ MAIN · grid ou estado (loading/empty/…) │
├─────────────────────────────────────────┤
│ DETAILS PANEL · lateral ao seleccionar  │
├─────────────────────────────────────────┤
│ TIMELINE · eventos operacionais         │
├─────────────────────────────────────────┤
│ ALERT PANEL · reservado cognitivo       │
├─────────────────────────────────────────┤
│ INSIGHT PANEL · reservado cognitivo     │
├─────────────────────────────────────────┤
│ ACTION BAR · acções negócio (disabled)  │
└─────────────────────────────────────────┘
```

---

## Toolbar — acções standard

| Acção | ID | OPM-001A |
|-------|-----|----------|
| Pesquisar | `search` | Slot disabled |
| Actualizar | `refresh` | **Activo** (reload hook) |
| Exportar | `export` | Placeholder |
| Filtros | `filters` | Placeholder |
| Colunas | `columns` | Placeholder |
| Preferências | `preferences` | Não exposto WMS |
| Histórico | `history` | Não exposto WMS |
| Ajuda | `help` | Placeholder |
| IA | `ai` | Não exposto OPM-001A |

Cada módulo futuro passa `enabledActions` à toolbar.

---

## KPI cards

- Layout: CSS grid `auto-fill` com classes `--4`, `--6`, `--8`
- Label: uppercase mono, cor `--text-tertiary`
- Valor: mono 20px, cor configurável (`--cyan`, `--green`, etc.)
- Responsivo: 2 colunas tablet · 1 coluna mobile industrial

---

## Grid industrial

- Ordenação local por coluna (click header)
- Paginação client-side (25 linhas default)
- Selecção de linha → abre `IndustrialDetailsPanel`
- Sem agrupamento/favoritos/export (OPM-001+)

---

## Painel lateral — tabs reservadas

Resumo · Histórico · Eventos · Auditoria · Timeline · IA

Conteúdo actual: JSON do registo seleccionado (debug/shell).

---

## Painel cognitivo

- Borda dashed `--border-subtle`
- `data-industrial-cognitive` para testes
- Texto explícito: integração futura, CC inalterado

---

## Identidade visual preservada

- Fundos `--bg-panel` / `--bg-tertiary`
- Acentos `--cyan`, `--amber`, `--green`, `--red`
- Classes globais: `.impetus-card`, `.btn`, `.btn-ghost`, `.data-table`, `.screen-header`
- Animações existentes do DS (sem novas dependências)
