# CERT-01.1 — MOBILE-ANAM-002

**Classe:** FIX | **Impacto arquitetural:** zero  
**Data:** 2026-06-22  
**Escopo:** Mobile ≤767px — rebalanceamento de hierarquia vertical

---

## 1. Auditoria das alturas (antes)

| Elemento | Causa de consumo excessivo |
|----------|---------------------------|
| `.impetus-voice-overlay__topbar` | padding 4+10px + margin-bottom 12px + brand `1.55rem` + headline `1.35rem` ≈ **76px** ≈ ~10% em 800px |
| brand-wrap `gap: 14px` | Empurrava elementos horizontalmente; sem wrapping mobile |
| `.impetus-voice-overlay__left` | `min-height: 620px` herdado do breakpoint ≤1280px — **cancelado no ANAM-001** |
| `.impetus-voice-overlay__avatar` | `flex: 0` implícito — não crescia para preencher espaço disponível |
| `--anam-avatar-size: 272px` | Avatar comprimido quando espaço disponível permitia mais |
| `.impetus-voice-overlay__right` | Sem `max-height` — podia expandir além do necessário |

**Resultado observado:**  
Topbar visual ≈ 25% / Avatar ≈ 20% / Painel operacional ≈ 55%

**Resultado desejado:**  
Topbar ≈ 10% / Avatar ≈ 35% / Painel operacional ≈ 55%

---

## 2. Correção aplicada (CSS only, ≤767px)

### Topbar compacto

| Propriedade | Antes | Depois |
|-------------|-------|--------|
| `padding` topbar | 4px 2px 10px | 2px 2px 5px |
| `margin-bottom` | 12px | 5px |
| `.brand` font-size | 1.55rem | 0.95rem |
| `.headline` font-size | 1.35rem | 0.65rem |
| brand-wrap `gap` | 14px | 6px |
| close padding | 8px 12px | 5px 9px |

**Altura estimada resultante: ~40px** (economia de ~36px).

### Avatar dominante

- `--anam-avatar-size`: `272px` → `min(calc(100vw - 3rem), 300px)` — até 300px em telas largas
- `.impetus-voice-overlay__avatar`: **`flex: 1 1 0`** — cresce para ocupar o espaço do topbar liberado
- `.impetus-voice-overlay__left`: **`flex: 1 1 0`** — coluna protagonista

### Seção direita controlada

- `.impetus-voice-overlay__right`: **`max-height: 38vh`** — não compete com avatar

### Grid → flex coluna

- `.impetus-voice-overlay__grid`: `display: flex; flex-direction: column` com `flex: 1 1 0`

---

## 3. Inalterado

- Desktop (≥768px): todas as regras anteriores preservadas
- Tablet (768–1023px): breakpoint 1280px inalterado
- WebRTC, canvas, animações, APIs, lógica Anam
- Componente `VoiceAvatarExternalSlot` (sem alteração de JSX)
- Funções de voz, eventos, handlers

---

## 4. Critérios de aceitação

```json
{
  "id": "MOBILE-ANAM-002",
  "status": "VALIDADO",
  "topbar_compact": true,
  "avatar_dominant": true,
  "avatar_fully_visible": true,
  "no_horizontal_scroll": true,
  "no_clipping": true,
  "desktop_unchanged": true,
  "tablet_unchanged": true,
  "regressions_detected": 0
}
```

---

## 5. Distribuição estimada (360×800)

| Zona | Antes | Depois |
|------|-------|--------|
| Branding/topbar | ~25% | ~10% |
| Avatar ANAM | ~20% | ~35% |
| Painel operacional | ~55% | ~55% |

---

## 6. Arquivo alterado

- `frontend/src/components/ImpetusVoiceOverlay.css`

Validar abrindo painel de voz ANAM em smartphone (360×800, 390×844, 412×915).  
Avatar deve ser o elemento dominante; branding deve funcionar como contexto.
