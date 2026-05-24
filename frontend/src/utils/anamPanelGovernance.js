/**
 * Governança Anam → SmartPanel: o painel só executa após a persona confirmar o acordo.
 */
import { inferVoiceVisualIntent } from '../voice/voiceVisualPanelService';

function norm(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function hasVisualTopic(userText, assistantText) {
  const blob = `${norm(userText)} ${norm(assistantText)}`;
  if (inferVoiceVisualIntent(userText) || inferVoiceVisualIntent(assistantText)) return true;
  return /\b(painel|grafico|gráfico|kpi|relatorio|relatório|dashboard|export|pdf|excel|indicador|metrica|métrica|linha\s+[a-z0-9])\b/.test(
    blob
  );
}

/** A persona anunciou que vai gerar no painel (após acordo), não só uma pergunta. */
export function isAnamPanelCommitPhrase(assistantText, userText = '') {
  const raw = String(assistantText || '').trim();
  const a = norm(raw);
  if (a.length < 12) return false;
  if (!hasVisualTopic(userText, assistantText)) return false;

  if (raw.endsWith('?')) return false;

  const isQuestion =
    /\b(quer|gostaria|prefere|qual\s|quando\s|como\s|posso preparar|devo\s|confirma|confirme|deseja|precisa de|me diz|me diga)\b/.test(
      a
    );
  const hasCommitVerb =
    /\b(gerando|montando|preparando|exibindo|a gerar|a montar|a preparar|vou gerar|vou montar|vou mostrar|vou exibir|vou preparar|vou criar|vou colocar|ja vou|já vou|irei gerar|irei montar)\b/.test(
      a
    );
  if (isQuestion && !hasCommitVerb) return false;

  const commitPatterns = [
    /\b(gerando|montando|preparando|exibindo)\b/,
    /\b(vou|ja vou|já vou|irei)\s+(gerar|montar|mostrar|exibir|preparar|criar|colocar)\b/,
    /\b(tudo bem|ok|certo|perfeito|pronto),?\s+(vou\s+)?(gerar|montar|mostrar|exibir|preparar)\b/,
    /\bno painel\b/,
    /\b(esta|está)\s+(sendo\s+)?(gerad|montad|preparad|exibid)/,
    /\b(enviei|mandei)\s+(para\s+)?o painel\b/
  ];
  return commitPatterns.some((re) => re.test(a));
}

/**
 * @param {{ role: 'user'|'assistant', text: string }[]} [recentTurns]
 */
export function buildAnamPanelCommand(userText, assistantText, recentTurns = []) {
  const lines = [];
  const turns = Array.isArray(recentTurns) ? recentTurns.slice(-6) : [];
  if (turns.length) {
    lines.push(
      'Conversa acordada (Anam + utilizador):',
      ...turns.map((t) => `- ${t.role === 'user' ? 'Utilizador' : 'Anam'}: ${String(t.text || '').trim()}`)
    );
  }
  const u = String(userText || '').trim();
  const a = String(assistantText || '').trim();
  if (u) lines.push(`Pedido final do utilizador: ${u}`);
  if (a) lines.push(`Instrução de execução no painel (confirmada pela Anam): ${a}`);
  lines.push(
    'Monte no painel direito apenas o que foi acordado acima. Use dados reais IMPETUS quando existirem.'
  );
  return lines.join('\n').slice(0, 3800);
}
