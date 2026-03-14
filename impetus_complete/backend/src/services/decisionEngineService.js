'use strict';

const CRITERIA_WEIGHTS = {
  people_safety:    0.35,
  health_wellbeing: 0.20,
  ethics_compliance:0.15,
  financial:        0.15,
  operational:      0.15,
};

const RISK_LEVELS = { critical: 1, high: 2, medium: 3, low: 4, none: 5 };

function scoreOption(option) {
  const s = option.scores || {};
  let total = 0;
  for (const [key, weight] of Object.entries(CRITERIA_WEIGHTS)) {
    const raw = typeof s[key] === 'number' ? s[key] : 5;
    total += (raw / 10) * weight;
  }
  const riskPenalty = option.humanRisk ? (RISK_LEVELS[option.humanRisk] || 3) / 5 : 1;
  return parseFloat((total * riskPenalty).toFixed(4));
}

function buildExplanation(chosen, options, situation) {
  const lines = [];
  lines.push(`Situação detectada: ${situation}`);
  lines.push('');
  lines.push('Opções analisadas:');
  for (const opt of options) {
    const mark = opt === chosen ? '✅ ESCOLHIDA' : '   ';
    lines.push(`  ${mark} ${opt.label} (score: ${opt._score})`);
    if (opt.reason) lines.push(`         → ${opt.reason}`);
  }
  lines.push('');
  lines.push(`Decisão: ${chosen.label}`);
  lines.push(`Justificativa: ${chosen.justification || chosen.reason || 'Melhor equilíbrio entre segurança, ética e resultado operacional.'}`);
  return lines.join('\n');
}

function evaluate(situation, options = []) {
  if (!options.length) throw new Error('Nenhuma opção fornecida para avaliação.');

  const scored = options.map(opt => ({
    ...opt,
    _score: scoreOption(opt),
  }));

  scored.sort((a, b) => {
    if (a.humanRisk === 'critical' && b.humanRisk !== 'critical') return -1;
    if (b.humanRisk === 'critical' && a.humanRisk !== 'critical') return 1;
    return b._score - a._score;
  });

  const chosen = scored[scored.length - 1 - scored.slice().reverse().findIndex(o => o._score === Math.max(...scored.map(s => s._score)))];
  const best = scored.reduce((prev, curr) => {
    if (curr.humanRisk === 'critical') return prev;
    return curr._score > prev._score ? curr : prev;
  }, scored[0]);

  const explanation = buildExplanation(best, scored, situation);

  return {
    situation,
    chosen: best,
    options: scored,
    explanation,
    timestamp: new Date().toISOString(),
    engine: 'IMPETUS Decision Engine v1.0',
  };
}

function buildOptions(context) {
  const opts = [];

  if (context.type === 'pressure_drop') {
    opts.push({
      label: 'Ignorar o problema',
      reason: 'Não interrompe a produção imediatamente',
      humanRisk: 'high',
      scores: { people_safety: 2, health_wellbeing: 3, ethics_compliance: 2, financial: 4, operational: 5 },
      justification: 'Alto risco: falha progressiva pode causar acidente.',
    });
    opts.push({
      label: 'Reduzir consumo de ar comprimido',
      reason: 'Alivia a pressão sem parar a produção',
      humanRisk: 'medium',
      scores: { people_safety: 6, health_wellbeing: 7, ethics_compliance: 7, financial: 6, operational: 6 },
      justification: 'Medida paliativa enquanto se avalia a causa raiz.',
    });
    opts.push({
      label: 'Parar máquinas temporariamente',
      reason: 'Evita danos e risco de acidente',
      humanRisk: 'low',
      scores: { people_safety: 9, health_wellbeing: 8, ethics_compliance: 9, financial: 5, operational: 4 },
      justification: 'Protege pessoas e equipamentos, pequena perda de produção.',
    });
    opts.push({
      label: 'Desligar compressor e inspecionar',
      reason: 'Solução definitiva mas pára completamente',
      humanRisk: 'none',
      scores: { people_safety: 10, health_wellbeing: 9, ethics_compliance: 10, financial: 3, operational: 2 },
      justification: 'Máxima segurança, maior impacto financeiro e operacional.',
    });
    opts.push({
      label: 'Gerar alerta de manutenção imediato',
      reason: 'Aciona equipe técnica sem parar produção',
      humanRisk: 'low',
      scores: { people_safety: 8, health_wellbeing: 8, ethics_compliance: 9, financial: 7, operational: 7 },
      justification: 'Melhor equilíbrio: protege pessoas e mantém operação com supervisão.',
    });
  } else if (context.type === 'overload') {
    opts.push({
      label: 'Redistribuir tarefas entre equipe',
      reason: 'Reduz sobrecarga sem contratar',
      humanRisk: 'low',
      scores: { people_safety: 7, health_wellbeing: 8, ethics_compliance: 8, financial: 8, operational: 7 },
      justification: 'Equilibra carga de trabalho respeitando limites humanos.',
    });
    opts.push({
      label: 'Manter sobrecarga atual',
      reason: 'Mantém produtividade no curto prazo',
      humanRisk: 'high',
      scores: { people_safety: 3, health_wellbeing: 2, ethics_compliance: 3, financial: 6, operational: 7 },
      justification: 'Insustentável: risco de adoecimento e turnover.',
    });
    opts.push({
      label: 'Ativar protocolo de apoio emergencial',
      reason: 'Suporte imediato à equipe sobrecarregada',
      humanRisk: 'none',
      scores: { people_safety: 9, health_wellbeing: 9, ethics_compliance: 9, financial: 5, operational: 6 },
      justification: 'Prioriza saúde das pessoas, custo pontual justificado.',
    });
  } else if (context.type === 'financial_risk') {
    opts.push({
      label: 'Cortar custos operacionais imediatamente',
      reason: 'Reduz gastos rapidamente',
      humanRisk: 'medium',
      scores: { people_safety: 5, health_wellbeing: 4, ethics_compliance: 5, financial: 8, operational: 5 },
      justification: 'Pode impactar qualidade e moral da equipe.',
    });
    opts.push({
      label: 'Otimizar processos para reduzir desperdício',
      reason: 'Melhoria sustentável sem demissões',
      humanRisk: 'none',
      scores: { people_safety: 9, health_wellbeing: 9, ethics_compliance: 9, financial: 7, operational: 8 },
      justification: 'Decisão equilibrada: sustentável, ética e eficiente.',
    });
    opts.push({
      label: 'Aumentar produtividade sem investimento',
      reason: 'Resultado rápido com recursos existentes',
      humanRisk: 'medium',
      scores: { people_safety: 5, health_wellbeing: 4, ethics_compliance: 6, financial: 7, operational: 6 },
      justification: 'Risco de sobrecarga se não houver planejamento adequado.',
    });
  } else {
    opts.push({
      label: 'Analisar situação e acionar equipe responsável',
      reason: 'Resposta padrão segura e documentada',
      humanRisk: 'low',
      scores: { people_safety: 8, health_wellbeing: 8, ethics_compliance: 9, financial: 7, operational: 7 },
      justification: 'Abordagem equilibrada para situações não mapeadas.',
    });
    opts.push({
      label: 'Aguardar mais dados antes de decidir',
      reason: 'Evita decisão precipitada',
      humanRisk: 'medium',
      scores: { people_safety: 6, health_wellbeing: 7, ethics_compliance: 7, financial: 6, operational: 5 },
      justification: 'Válido quando risco não é imediato.',
    });
    opts.push({
      label: 'Acionar protocolo de emergência',
      reason: 'Garantia máxima de segurança',
      humanRisk: 'none',
      scores: { people_safety: 10, health_wellbeing: 9, ethics_compliance: 10, financial: 3, operational: 3 },
      justification: 'Apenas quando há risco real de vida ou dano grave.',
    });
  }

  return opts;
}

async function analyzeWithAI(situation, context, aiService) {
  const options = context.options || buildOptions(context);
  const result = evaluate(situation, options);

  if (aiService && typeof aiService.generate === 'function') {
    try {
      const prompt = `
Você é o Motor de Decisão Inteligente do IMPETUS.

Situação: ${situation}
Tipo: ${context.type || 'geral'}
Opções avaliadas:
${options.map(o => `- ${o.label}: ${o.reason}`).join('\n')}

Decisão pré-selecionada pelo sistema: ${result.chosen.label}
Justificativa: ${result.chosen.justification}

Confirme ou refine esta decisão considerando:
1. Segurança das pessoas (PRIORIDADE MÁXIMA)
2. Saúde e bem-estar dos colaboradores
3. Ética e conformidade legal
4. Proteção financeira da empresa
5. Continuidade operacional

Responda de forma clara e objetiva explicando a decisão final.
      `.trim();

      const aiResponse = await aiService.generate(prompt);
      result.aiEnhancement = aiResponse;
    } catch (e) {
      result.aiEnhancement = null;
    }
  }

  return result;
}

module.exports = {
  evaluate,
  analyzeWithAI,
  buildOptions,
  CRITERIA_WEIGHTS,
};
