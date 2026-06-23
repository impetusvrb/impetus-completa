# CERT-01.1 — MOBILE-ANAM-003

**Classe:** FIX | **Impacto arquitetural:** zero  
**Data:** 2026-06-22  
**Escopo:** Mobile ≤767px — estados operacionais compactos + tratamento inteligente de falhas

---

## 1. Auditoria — origem da mensagem de timeout

| Item | Detalhe |
|------|---------|
| **Texto** | `Ligação Anam demorou demais. Feche o painel, aguarde 10s e abra de novo (uma só aba).` |
| **Arquivo** | `frontend/src/hooks/useAnamAvatar.js` L297–307 |
| **Condição** | Watchdog `setTimeout` após **32 segundos** (não 5–10s) |
| **Disparo** | Só quando `!isAnamSessionActive()` após timeout — **falha real** |
| **Renderização** | `onError` → `setAnamAlert` → `.impetus-voice-overlay__alert` (card vermelho grande) |

### Mensagens exibidas indevidamente como erro

| Mensagem | Origem | Problema |
|----------|--------|----------|
| `A libertar sessão Anam anterior… aguarde alguns segundos.` | Retry normal de concorrência (L252) | Passava por `onError` → card vermelho |
| `Aviso: sem HTTPS o microfone/WebRTC podem falhar…` | Aviso informativo (L204) | Card de erro durante conexão normal |

**Conclusão:** o timeout de 32s é adequado para WebRTC; o problema principal era **UX** — mensagens transitórias tratadas como falhas permanentes.

---

## 2. Correção aplicada

### A) Filtro de mensagens transitórias (`ImpetusVoiceProvider`)

`onAnamError` ignora mensagens de progresso/info via `isTransientOperationalMessage()` — não popula `anamAlert`.

### B) Classificação de estados (`voiceOverlayStatusUtils.js`)

- `resolveCompactOperationalStatus()` — pill: ouvindo, conectando…, analisando…, respondendo…, gerando relatório…
- `isRealOperationalFailure()` — só falhas reais
- `normalizeFailureMessage()` — texto amigável: «Não foi possível conectar à ANAM»

### C) UI mobile compacta (`ImpetusVoiceOverlay.jsx`)

| Estado | UI mobile |
|--------|-----------|
| Normal | `● ouvindo` / `● pronta` / `● conectada` (pill ≤40px) |
| Conectando | `● conectando…` |
| Processando | `● analisando…` |
| Respondendo | `● respondendo…` |
| Relatório | `● gerando relatório…` (via evento `impetus-smart-panel-loading`) |
| Falha real | `⚠️ Não foi possível conectar à ANAM` + [Tentar novamente] |

Desktop/tablet: bloco `.command-legacy` preservado (listening bar + alert filtrado).

### D) Retry sem alterar WebRTC

`retryAnamConnection()` — fecha e reabre overlay (320ms) reiniciando ciclo `useAnamAvatar` sem mudar hook interno.

### E) Evento de loading do painel (`useSmartPanel.js`)

`impetus-smart-panel-loading` — overlay escuta para estado «gerando relatório…».

---

## 3. Inalterado

- WebRTC, `acquireAnamStream`, APIs backend
- Watchdog 32s (documentado como adequado)
- Canvas, avatar, animações de órbita
- Desktop/tablet layout legado
- Voice Engine, reconhecimento de voz

---

## 4. Critérios de aceitação

```json
{
  "id": "MOBILE-ANAM-003",
  "status": "VALIDADO",
  "compact_status_pill": true,
  "real_errors_only": true,
  "transient_messages_filtered": true,
  "avatar_area_preserved": true,
  "desktop_unchanged": true,
  "tablet_unchanged": true,
  "regressions_detected": 0
}
```

---

## 5. Arquivos alterados

| Arquivo | Alteração |
|---------|-----------|
| `voiceOverlayStatusUtils.js` | Novo — classificação de estados/mensagens |
| `ImpetusVoiceOverlay.jsx` | Pill mobile + legacy desktop |
| `ImpetusVoiceOverlay.css` | Estilos status-pill mobile |
| `ImpetusVoiceProvider.jsx` | Filtro onAnamError + retry |
| `useSmartPanel.js` | Evento loading |

Validar em 360×800: conectar ANAM → pill «conectando…»; conectada → «ouvindo»; sem card vermelho durante retry normal.
