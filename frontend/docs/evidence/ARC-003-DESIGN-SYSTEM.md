# ARC-003 — Design System (EOX)

**Referência:** Design System Industrial 4.0 (`tokens.css`, `styles.css`)  
**Data:** 2026-07-19

---

## Tokens utilizados

EOX reutiliza classes ONX certificadas (`onx-*`) e estende com prefixo `eox-*`:

| Token / classe | Uso |
|----------------|-----|
| `--bg-primary`, `--bg-panel` | Fundos escuros industriais |
| `--cyan` | Breadcrumb actual, acções primárias |
| `--text-primary/secondary/tertiary` | Hierarquia tipográfica |
| `--border-subtle` | Separadores de header |
| `--font-mono` (Share Tech Mono) | Breadcrumb, meta, acções |
| `--font-display` (Rajdhani) | Título do módulo |

---

## EoxHeader — especificação visual

| Elemento | Estilo |
|----------|--------|
| Breadcrumb | Mono 10px, uppercase, separador `›` |
| Breadcrumb link | `--text-tertiary`, hover `--cyan` |
| Breadcrumb actual | `--cyan` |
| Título | Rajdhani 20px, uppercase, letter-spacing 0.04em |
| Subtítulo | Mono 11px, `--text-secondary` |
| Meta (versão/fase) | Mono 10px, `--text-tertiary` |
| Retornos | Link secundário mono 10px — **não** `btn-ghost` |
| Border-radius | ≤ 4px (acções), ≤ 8px (painéis) |

---

## EoxActionBar — ordem canónica

1. **Atualizar** (`refresh`)
2. **Exportar** (`export`)
3. **Ajuda** (`help`)
4. Acções específicas do módulo (ordem 100+)

Classe: `btn btn-ghost eox-action-btn` — alinhamento top-right do header.

---

## Responsividade

Breakpoint `768px`:

- Título reduz para 17px
- Top row (breadcrumb + retornos) empilha verticalmente
- Action bar alinha à esquerda em mobile

---

## Proibições (DS Industrial 4.0)

- ❌ Fundo branco / Material azul royal
- ❌ Inter, Roboto, Arial como fonte principal
- ❌ `border-radius` > 8px em novos componentes EOX
- ❌ Termos legados no breadcrumb (Workspace, Painel, Centro Operacional)

---

## Ficheiros CSS

| Ficheiro | Conteúdo |
|----------|----------|
| `operational-navigation/operational-navigation.css` | Base ONX certificada (breadcrumb, retornos, título) |
| `presentation/eox/eox.css` | Extensões EOX (title-row, action-bar) |

Import em `EoxHeader.jsx` — ambos carregados.
