/**
 * IMPETUS - Alertas críticos com voz (TTS via backend)
 * Usar apenas para: erros críticos, riscos operacionais, avisos importantes.
 */
import { dashboard } from '../services/api';

function tocarAudio(base64) {
  if (!base64) return;
  const audio = new Audio('data:audio/mp3;base64,' + base64);
  audio.play().catch(() => {});
}

/**
 * Fala um alerta crítico (ex.: "Atenção: temperatura crítica no setor B").
 * Não narra respostas normais do chat — só chamar em situações que exigem voz.
 */
export function alertaIA(mensagem) {
  if (!mensagem || typeof mensagem !== 'string') return;
  const texto = mensagem.trim().slice(0, 5000);
  if (!texto) return;
  dashboard
    .gerarVoz(texto, true)
    .then((r) => {
      if (r?.data?.ok && r?.data?.audio) tocarAudio(r.data.audio);
    })
    .catch(() => {});
}
