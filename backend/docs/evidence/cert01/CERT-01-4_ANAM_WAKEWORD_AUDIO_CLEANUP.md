# CERT-01.4 — ANAM-P0-WAKEWORD-AUDIO-CLEANUP

**Classe:** FIX (P0 estabilidade) | **Impacto arquitetural:** zero  
**Data:** 2026-06-22  
**Referência:** `AUDIT_ANAM_AUTOSTART_AUDIO_SESSION.md`

---

## Objetivo

Estabilizar wake word, encerramento de sessão e alertas — **sem alterar** arquitectura Dashboard → escuta → «Ok Impetus» → Overlay → ANAM → WebRTC.

---

## P0-1 — Endurecimento wake word

### Alterações

| Ficheiro | Mudança |
|----------|---------|
| `frontend/src/services/wakeWordMatch.js` | **Novo** — regex estrito `ok/okay` + variante `impetus` |
| `frontend/src/services/wakeWordDetector.js` | Usa `matchesWakePhrase()` + `logWakeRecognition()` |

### Frases aceites (teste Node)

| Frase | Resultado |
|-------|-----------|
| ok impetus | ✅ matched |
| okay impetus | ✅ matched |
| Ok Impetus abre o painel | ✅ matched |
| okay impetis | ✅ matched |

### Frases rejeitadas

| Frase | Resultado |
|-------|-----------|
| impetus | ❌ false |
| sistema impetus | ❌ false |
| abre impetus | ❌ false |
| impetus relatório | ❌ false |
| oi impetus | ❌ false |
| hey impetus | ❌ false |

### Logs de reconhecimento

```javascript
window.__IMPETUS_WAKE_LOG__           // ring buffer últimas 50 entradas
sessionStorage.setItem('impetus-wake-audit-log', '1')  // console.info
```

---

## P0-2 — Encerramento completo

### Alterações

| Ficheiro | Mudança |
|----------|---------|
| `frontend/src/voice/voiceWakeCooldown.js` | **Novo** — cooldown 4s pós-close |
| `frontend/src/hooks/useVoiceEngine.js` | `releaseBargeMonitor`, `forceCleanupAudioSession`, RAF/barge em `stopSpeaking` |
| `frontend/src/voice/ImpetusVoiceProvider.jsx` | `closeLiveSession` reforçado |

### closeLiveSession() — ordem

1. `stopWakeWord()` — `abort` + `stop` SpeechRecognition  
2. `beginWakeCooldown(4000ms)`  
3. `stopSpeaking()` — inclui barge cleanup + cancel RAF  
4. `forceCleanupAudioSession()` — barge, RAF, `AudioContext.close()`  
5. `toggleVoice` off se contínuo  
6. `stopVoiceCapture()`  
7. `setOverlayOpen(false)`  
8. `stopAnamStreamNow()` (WebRTC ANAM inalterado)  
9. `scheduleWakeWordAfterCooldown` — wake só após 4s  

### Cooldown

```javascript
window.__IMPETUS_WAKE_COOLDOWN_UNTIL__  // timestamp ms
isInWakeCooldown()                       // true durante 4s pós-close
```

---

## P0-3 — Alertas operacionais

Removido `setOverlayOpen(true)` do polling de alertas (`ImpetusVoiceProvider.jsx` L369).

Alertas continuam a falar TTS se configurado — **não abrem overlay nem ANAM**.

Início de fluxo voz: **clique explícito**, **Alt+Shift+V**, ou **wake word válida**.

---

## Critérios de aceite

| Cenário | Esperado | Evidência |
|---------|----------|-----------|
| Login | Dashboard, overlay fechado | Reset `impetus_reset_voice_on_entry` preservado |
| 5 min silêncio | Sem overlay/ANAM | Sem autostart no código |
| «impetus» isolado | Nada | Teste Node `matched: false` |
| «ok impetus» | Overlay + ANAM | Wake flow preservado |
| closeLiveSession | Sem restart imediato wake | Cooldown 4s |
| 60s pós-close | Sem loop SR agressivo | Cooldown + cleanup |

---

## Inalterado

- WebRTC / `anamSessionSingleton.js` (lógica connect/stop)
- Rotas pós-login / Dashboard
- Overlay / Voice Engine core
- Fluxo arquitectural original

---

## Build e deploy

```bash
cd frontend && npm run build
pm2 restart impetus-frontend --update-env
```

Executado em 2026-06-22 — build OK.
