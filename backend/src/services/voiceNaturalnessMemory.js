/**
 * Memória leve por usuário para voz: último assunto + aberturas recentes da IA
 * (evita "Olá, em que posso ajudar?" repetido).
 *
 * Persistência: apenas Maps em memória no processo Node (sem Redis, sem PostgreSQL, sem chave .env).
 * Reinício do PM2 ou do processo limpa o estado — por desenho, para baixa latência e simplicidade.
 */
'use strict';

const MAX_OPENINGS = 6;
const SNIPPET_MAX = 220;

const lastUserSnippet = new Map(); // userId -> string
const recentAssistantOpenings = new Map(); // userId -> string[]

function key(id) {
  return String(id ?? '');
}

function noteUserTurn(userId, message) {
  const t = String(message || '').trim();
  if (t.length < 8) return;
  lastUserSnippet.set(key(userId), t.slice(0, SNIPPET_MAX));
}

function trackAssistantOpening(userId, reply) {
  const line =
    String(reply || '')
      .trim()
      .split(/\n/)
      .find((l) => l.trim().length > 0) || '';
  const norm = line
    .slice(0, 88)
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
  if (norm.length < 12) return;
  const k = key(userId);
  const prev = recentAssistantOpenings.get(k) || [];
  const next = [norm, ...prev.filter((x) => x !== norm)].slice(0, MAX_OPENINGS);
  recentAssistantOpenings.set(k, next);
}

function recentOpeningsLine(userId) {
  const arr = recentAssistantOpenings.get(key(userId));
  if (!arr?.length) return '';
  return arr
    .slice(0, 4)
    .map((x, i) => `${i + 1}) “${x.slice(0, 72)}…”`)
    .join(' ');
}

/**
 * Texto extra injetado no system / extraContext (só modo voz).
 */
function buildPromptExtra(userId, { firstName, hasAssistantHistory }) {
  const nome = String(firstName || 'você').trim() || 'você';
  const topic = lastUserSnippet.get(key(userId));
  const avoid = recentOpeningsLine(userId);

  const lines = [
    '## Tom voz — autoridade operacional (industrial) — siga à risca:',
    '- Personalidade: assistente corporativa **segura, objetiva e profissional**. Clara, direta, leve cordialidade. **Nunca** infantil nem exageradamente animada.',
    '- Proibido abrir com fórmulas de call center: "tudo bem?", "como posso te ajudar hoje?", "estou aqui para te ajudar", emojis ou tom de entusiasmo artificial. Prefira: "Como posso ajudar?", "Informe a solicitação.", "Aguardando comando."',
    '- **Primeira frase diferente** a cada resposta: retomada de contexto, confirmação seca ou pergunta objetiva — nunca o mesmo molde duas vezes seguidas.',
    `- O primeiro nome do usuário é **${nome}**. Use **no máximo uma vez** na primeira frase, só se soar natural (ex.: "${nome}, preciso de uma confirmação.").`,
    '- Prefira estrutura curta: sujeito + pedido ou dado + próximo passo. Ex.: "Tarefa identificada. Deseja executar agora?"',
    '- Fim: última frase com **fechamento humano** — pergunta clara ou convite (“Pode me dizer o que precisa?”, “O que você precisa agora?”) ou confirmação curta; evite repetir “Aguardando comando.” sempre igual.',
    '- Alertas: tom firme; alterne confirmação seca, instrução imediata ou pergunta objetiva.'
  ];

  if (!hasAssistantHistory) {
    lines.push(
      '- **Pouco histórico:** abertura **profissional**, uma por sessão de ideia. Variações (inspire-se, não copie):',
      `  • "Olá, ${nome}. Em que posso ajudar?"`,
      `  • "${nome}, sistema ativo. Qual a prioridade?"`,
      `  • "Olá, ${nome}. Tudo operacional. Diga o próximo passo."`,
      `  • "${nome}. Aguardando instrução."`,
      `  • "Sistema online. Como posso ajudar?"`
    );
  } else {
    lines.push(
      '- **Já há histórico:** sem saudação de telemarketing. Retomada: "Então", "Sobre isso", "Continuando", "Confirmado" + conteúdo.',
      '- Se o último turno foi só confirmação ("ok"), não saúde de novo; avance.'
    );
  }

  if (topic) {
    lines.push(
      `- **Contexto salvo (última fala relevante do usuário):** "${topic.slice(0, 160)}${topic.length >= 160 ? '…' : ''}" — use para retomar se fizer sentido.`
    );
  }

  if (avoid) {
    lines.push(
      '- **Não replique** o início destas respostas suas recentes (mude palavras e estrutura):',
      `  ${avoid}`
    );
  }

  return `\n${lines.join('\n')}\n`;
}

module.exports = {
  noteUserTurn,
  trackAssistantOpening,
  buildPromptExtra
};
