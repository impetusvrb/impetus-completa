'use strict';

const assert = require('assert');
const { heuristicComplaint } = require('../services/aiComplaintDetectionService');

function run() {
  console.info('[TEST] complaintBridgeFalsePositives — iniciando');
  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    try {
      fn();
      passed++;
      console.info(`  ✓ ${name}`);
    } catch (err) {
      failed++;
      console.error(`  ✗ ${name}:`, err.message);
    }
  }

  const hypotheticals = [
    'Se você tivesse que reduzir o risco operacional hoje em 24h, o que faria?',
    'Qual seria o impacto financeiro de ignorar os alertas atuais?',
    'Considerando um aumento de 20% nos eventos operacionais, como isso afetaria o risco?',
    'Se a operação continuar nesse ritmo, o que tende a acontecer?',
    'Como o Impetus analisa a operação para gerar essas recomendações?',
    'O sistema utiliza múltiplas análises para chegar a uma decisão?',
    'Existe algum padrão de risco emergente na operação?',
    'Qual área da operação precisa de intervenção mais urgente?',
    'O que está causando a queda de eficiência operacional?',
    'Existe alguma relação entre os eventos recentes e a tendência de eficiência?',
    'Se eu desligar metade das máquinas, qual seria o impacto?',
    'Quero entender melhor o cenário atual de produção.',
    'Pode me explicar como funciona a análise preditiva?',
    'Qual decisão tomaria imediatamente se fosse o responsável?',
    'Me dê uma visão geral da operação.'
  ];

  hypotheticals.forEach((msg, i) => {
    test(`hipotética ${i + 1} NÃO é heurística: "${msg.slice(0, 50)}..."`, () => {
      const r = heuristicComplaint(msg);
      assert.strictEqual(r.hit, false, `Falso positivo: "${msg}"`);
    });
  });

  const realComplaints = [
    'Isso está errado, a máquina não está parada!',
    'Você está inventando dados que não existem!',
    'Essa informação não confere com a realidade.',
    'Dados incorretos, a produção está funcionando normalmente.',
    'Resposta completamente errada, revise.',
    'Isso é alucinação pura, não há nenhuma máquina parada.',
    'A resposta está errada, completamente errada.',
    'Estás a inventar, isso não é verdade.',
    'Isso não bate com os dados reais.',
    'Dados falsos na resposta anterior.'
  ];

  realComplaints.forEach((msg, i) => {
    test(`reclamação real ${i + 1} É heurística: "${msg.slice(0, 50)}..."`, () => {
      const r = heuristicComplaint(msg);
      assert.strictEqual(r.hit, true, `Falso negativo: "${msg}"`);
    });
  });

  console.info(`[TEST] complaintBridgeFalsePositives — ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

run();
