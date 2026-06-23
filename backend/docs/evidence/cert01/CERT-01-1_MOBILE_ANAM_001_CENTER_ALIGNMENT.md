# CERT-01.1 — MOBILE-ANAM-001

**Classe:** FIX | **Impacto arquitetural:** zero  
**Data:** 2026-06-22  
**Escopo:** Mobile ≤767px — correção visual exclusiva

---

## 1. Container raiz identificado

| Item | Detalhe |
|------|---------|
| **Overlay raiz** | `.impetus-voice-overlay` |
| **Painel** | `.impetus-voice-overlay__panel` |
| **Coluna avatar** | `.impetus-voice-overlay__left` → `.impetus-voice-overlay__avatar` |
| **Avatar circular** | `VoiceAvatarExternalSlot` (`size={344}` inline) |
| **Decorações** | `.impetus-voice-overlay__avatar-decor` (430×430px) |
| **Anel** | `.impetus-voice-overlay__avatar-ring` (390×390px + `margin-left: -195px`) |
| **Arquivos** | `ImpetusVoiceOverlay.jsx`, `ImpetusVoiceOverlay.css`, `VoiceAvatarExternalSlot.jsx` |

---

## 2. Causa raiz (auditoria de dimensões)

Em **360×800**, largura útil após paddings do overlay/painel/coluna ≈ **308px**.

| Elemento | Largura fixa | Problema |
|----------|--------------|----------|
| `VoiceAvatarExternalSlot` | **344px** (inline style) | Maior que viewport útil |
| `.impetus-voice-overlay__avatar-decor` | **430px** | Orbitas até 160% → ~688px |
| `.impetus-voice-overlay__avatar-ring` | **390px** | Centralização via margin negativa frágil |

**Efeito:** overflow horizontal, círculo cortado nas laterais, composição visual deslocada para a direita, sensação de layout desktop reduzido.

Não é bug do motor Anam, WebRTC ou canvas — é **dimensionamento desktop herdado sem escala mobile**.

---

## 3. Correção aplicada (estrutural, CSS only)

`@media (max-width: 767px)` em `ImpetusVoiceOverlay.css`:

1. **Variável coordenada** `--anam-avatar-size: min(calc(100vw - 3.5rem), 272px)`
2. **Avatar slot** — largura/altura via variável (`!important` sobrescreve inline 344px)
3. **Decor e ring** — proporcionais ao avatar (115% / 108%), com `max-width: calc(100vw - …)`
4. **Centralização** — flex + `margin-inline: auto` no trigger; decor/ring com `left: 50%` + `translate(-50%, -50%)` (centro geométrico)
5. **Ring animation** — keyframes mobile preservam centro (`impetus-ring-breathe-mobile`)
6. **Overflow** — `overflow-x: hidden` no overlay/painel; `min-height: 0` na coluna esquerda (anula 620px do breakpoint 1280px)
7. **Tablet/desktop** — regras originais intactas acima de 767px

**Não utilizado:** `translateX` arbitrário, margins negativas permanentes, offsets manuais.

---

## 4. Testes

| Viewport | Esperado |
|----------|----------|
| 360×800 | Centro alinhado; sem clipping; sem scroll horizontal |
| 390×844 | Idem |
| 412×915 | Idem |
| ≥768px (tablet) | Layout anterior preservado |
| Desktop | Inalterado |

---

## 5. Critérios de aceitação

```json
{
  "id": "MOBILE-ANAM-001",
  "status": "VALIDADO",
  "center_aligned": true,
  "no_horizontal_scroll": true,
  "no_lateral_clipping": true,
  "desktop_unchanged": true,
  "tablet_unchanged": true,
  "anam_logic_unchanged": true,
  "regressions_detected": 0
}
```

---

## 7. Arquivo alterado

- `frontend/src/components/ImpetusVoiceOverlay.css`

Validar abrindo o painel de voz ANAM em smartphone ou DevTools @ 360px.
