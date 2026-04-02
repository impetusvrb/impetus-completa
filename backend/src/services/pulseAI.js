/**
 * IA do Impetus Pulse — perguntas dinâmicas (foco em acertos), feedback e diagnóstico.
 */
const { chatCompletion } = require('./ai');

const FIXED_KEYS = ['efficiency', 'confidence', 'proactivity', 'synergy'];

function templateQuestions(snapshot, userName) {
  const n = (userName || 'Você').split(' ')[0];
  const tpm = snapshot.tpm_incidents_recorded || 0;
  const prop = snapshot.proacao_proposals_submitted || 0;
  const reg = snapshot.intelligent_registrations || 0;

  const q = [];
  if (tpm > 0) {
    q.push({
      qid: 'dyn-1',
      text: `${n}, notamos ${tpm} registro(s) TPM no seu nome neste período. Como você avalia sua sensação de domínio ao registrar perdas e manutenção com agilidade?`,
      focus: 'success_tpm'
    });
  }
  if (prop > 0) {
    q.push({
      qid: 'dyn-2',
      text: `Você contribuiu com ${prop} proposta(s) no Pró-Ação. Como foi sua experiência ao sugerir melhorias e reduzir desperdícios?`,
      focus: 'success_proacao'
    });
  }
  if (reg > 0) {
    q.push({
      qid: 'dyn-3',
      text: `Você utilizou ${reg} vez(es) registros inteligentes no sistema. Quão confiante você se sente ao usar essas ferramentas digitais no dia a dia?`,
      focus: 'success_digital'
    });
  }

  while (q.length < 3) {
    const idx = q.length + 1;
    q.push({
      qid: `dyn-fill-${idx}`,
      text:
        idx === 1
          ? `${n}, olhando para o ritmo desta semana, como você avalia sua agilidade na resolução de demandas e alertas?`
          : idx === 2
            ? 'O quanto você se sentiu seguro e confiante ao usar os dashboards e fluxos do Impetus recentemente?'
            : 'Quão bem você sente que trocou informações e apoiou a equipe nos passos operacionais registrados?',
      focus: 'generic_positive'
    });
  }
  return q.slice(0, 3);
}

async function generateDynamicQuestions(companyId, userId, snapshot, userName, billing) {
  const prompt = `Você é coach industrial do Impetus. Gere EXATAMENTE 3 perguntas curtas em português, positivas e específicas, com base APENAS nestes dados de SUCESSO (nunca mencione falhas ou erros):
Nome: ${userName}
Snapshot JSON: ${JSON.stringify(snapshot)}
Regras: tom acolhedor; cada pergunta em uma linha numerada 1-3; sem texto extra.`;

  let text = '';
  try {
    text = await chatCompletion(prompt, {
      max_tokens: 500,
      billing: { companyId, userId }
    });
  } catch (_) {
    return templateQuestions(snapshot, userName);
  }

  if (!text || text.startsWith('FALLBACK')) {
    return templateQuestions(snapshot, userName);
  }

  const lines = text
    .split(/\n/)
    .map((l) => l.replace(/^\d+[\).\s]+/, '').trim())
    .filter(Boolean)
    .slice(0, 3);

  if (lines.length < 3) {
    const t = templateQuestions(snapshot, userName);
    return lines.map((textLine, i) => ({
      qid: `ai-${i + 1}`,
      text: textLine,
      focus: 'ai_generated'
    }));
  }

  return lines.map((textLine, i) => ({
    qid: `ai-${i + 1}`,
    text: textLine,
    focus: 'ai_generated'
  }));
}

async function generateSelfFeedbackMessage(companyId, userId, fixedScores, snapshot, billing) {
  const prompt = `Você é coach de chão de fábrica Impetus. O colaborador avaliou-se (1-5) nas dimensões: eficiência=${fixedScores.efficiency}, confiança=${fixedScores.confidence}, proatividade=${fixedScores.proactivity}, sinergia=${fixedScores.synergy}.
Dados reais positivos (JSON): ${JSON.stringify(snapshot)}
Escreva 2-4 frases em português, amigáveis, acolhedoras, comparando percepção com dados quando fizer sentido. Se a nota for modesta mas os dados forem fortes, incentive com base nos números. Máximo 600 caracteres. Sem emojis se o ambiente for corporativo — pode usar no máximo um emoji opcional.`;

  const out = await chatCompletion(prompt, {
    max_tokens: 400,
    billing: { companyId, userId }
  });
  if (!out || out.startsWith('FALLBACK')) {
    return buildFallbackFeedback(fixedScores, snapshot);
  }
  return out.trim().slice(0, 800);
}

function buildFallbackFeedback(fixedScores, snapshot) {
  const avg =
    FIXED_KEYS.reduce((s, k) => s + (parseInt(fixedScores[k], 10) || 0), 0) / FIXED_KEYS.length;
  const tpm = snapshot.tpm_incidents_recorded || 0;
  let msg = 'Obrigado por compartilhar sua autoavaliação. ';
  if (tpm > 0 && avg < 3.5) {
    msg += `Os registros do Impetus mostram ${tpm} contribuição(ões) TPM no período — isso é um sinal forte de engajamento.`;
  } else if (avg >= 4) {
    msg += 'Sua percepção está alinhada com uma postura de alta performance. Continue registrando no sistema para manter a visibilidade da equipe.';
  } else {
    msg += 'Seguimos com você: pequenos passos consistentes geram grandes resultados no tempo.';
  }
  return msg;
}

async function generateMotivationPill(companyId, userId, lastEvalSummary, billing) {
  const prompt = `Mensagem motivacional curta para início de semana (máx 270 caracteres), português, tom acolhedor, base: ${JSON.stringify(lastEvalSummary || {})}. Uma frase ou duas.`;

  const out = await chatCompletion(prompt, {
    max_tokens: 200,
    billing: { companyId, userId }
  });
  if (!out || out.startsWith('FALLBACK')) {
    return 'Boa semana! Continue registrando suas ações no Impetus — consistência e clareza fortalecem o time.';
  }
  return out.trim().slice(0, 280);
}

async function generateHrDiagnosticReport(companyId, userId, evaluation, billing) {
  const prompt = `Você é Business Partner de RH. Gere um diagnóstico de potencial em português (JSON estrito) com chaves:
executive_summary (string), alignment_matrix (array de {dimension, status: "aligned"|"partial"|"gap", note}),
pdi_suggestions (array de {action, rationale}),
talent_highlight (string).
Dados: autoavaliação (scores JSON): ${JSON.stringify(evaluation.fixed_scores || {})},
snapshot: ${JSON.stringify(evaluation.ai_operational_snapshot || {})},
percepção do supervisor (texto, sem notas do colaborador): ${JSON.stringify(evaluation.supervisor_perception || '')}.
Não invente números que não estejam nos dados.`;

  const out = await chatCompletion(prompt, {
    max_tokens: 1200,
    billing: { companyId, userId }
  });
  if (!out || out.startsWith('FALLBACK')) {
    return {
      executive_summary: 'Diagnóstico automático indisponível. Utilize os dados brutos para análise.',
      alignment_matrix: [],
      pdi_suggestions: [],
      talent_highlight: ''
    };
  }
  try {
    const j = JSON.parse(out.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim());
    return j;
  } catch (_) {
    return { executive_summary: out.slice(0, 2000), alignment_matrix: [], pdi_suggestions: [], talent_highlight: '' };
  }
}

module.exports = {
  generateDynamicQuestions,
  generateSelfFeedbackMessage,
  generateMotivationPill,
  generateHrDiagnosticReport,
  templateQuestions,
  FIXED_KEYS
};
