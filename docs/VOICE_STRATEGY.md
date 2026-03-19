# Estratégia de voz Impetus

## Agora (OpenAI)

- **Texto + ritmo** importam mais que o timbre exato.
- Voz sugerida: `nova` ou `shimmer`; velocidade **~0,95–1,05** (padrão do sistema **0,98**).
- Ajuste **`OPENAI_TTS_INSTRUCTIONS`** no `.env` até soar “redondo” para o teu ouvido.
- Respostas **curtas, com pontos** → o pipeline já quebra em frases → pausas reais entre áudios.

## Depois (opcional, máxima naturalidade)

- **OpenAI** → raciocínio / chat.
- **Outro motor** (ElevenLabs, Azure Neural, Google) → só TTS.
- Integração limpa: mesma rota ou flag `TTS_PROVIDER=elevenlabs` só em `/voice/speak`.

Não vale travar semanas a tentar “perfeição só com OpenAI” — primeiro fecha **ritmo + cópia**, depois troca o motor de voz se o produto exigir.
