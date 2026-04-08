'use strict';

const AXIS_KEYWORDS = {
  eixo_humano: ['rh', 'pessoas', 'absenteismo', 'turnover', 'treinamento', 'disciplina', 'clima', 'admiss', 'demiss'],
  eixo_operacional: ['producao', 'linha', 'turno', 'meta', 'eficiencia', 'refugo', 'perda', 'gargalo', 'setup', 'oee'],
  eixo_manutencao: ['manutenc', 'preventiv', 'corretiv', 'falha', 'ordem de servico', 'mttr', 'mtbf', 'disponibilidade'],
  eixo_qualidade: ['qualidade', 'nao conform', 'desvio', 'inspec', 'auditoria', 'pop', 'analise', 'laborat'],
  eixo_logistica: ['logistica', 'entrega', 'rota', 'frete', 'transporte', 'armazen', 'expedicao'],
  eixo_estoque: ['estoque', 'almox', 'inventario', 'reposicao', 'sku', 'romaneio'],
  eixo_financeiro: ['financeiro', 'custo', 'despesa', 'fluxo de caixa', 'inadimplencia', 'orcamento', 'margem'],
  eixo_seguranca: ['seguranca', 'acidente', 'risco', 'epi', 'sso', 'trabalho seguro', 'incidente'],
  eixo_laboratorial: ['laboratorio', 'amostra', 'laudo', 'microbi', 'analitico', 'coleta'],
  eixo_executivo: ['estrateg', 'diretoria', 'governanca', 'resultado', 'board', 'portifolio'],
  eixo_planejamento: ['planejamento', 'pcm', 'pcp', 'programacao', 'previsao', 'sequenciamento']
};

const RESPONSIBILITY_KEYWORDS = {
  pessoas: ['equipe', 'lideranca', 'colaborador', 'escala', 'clima', 'desenvolvimento'],
  producao: ['producao', 'linha', 'meta', 'eficiencia', 'refugo', 'turno'],
  maquina: ['maquina', 'ativo', 'equipamento', 'falha', 'disponibilidade', 'parada'],
  qualidade: ['qualidade', 'conformidade', 'inspecao', 'desvio', 'auditoria'],
  custo: ['custo', 'despesa', 'margem', 'orcamento', 'financeiro'],
  estoque: ['estoque', 'almoxarifado', 'inventario', 'reposicao'],
  seguranca: ['seguranca', 'acidente', 'risco', 'epi', 'sst'],
  laboratorio: ['amostra', 'laudo', 'microbiologia', 'analise laboratorial']
};

function normalizeText(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9\s/_-]/g, ' ').replace(/\s+/g, ' ').trim();
}

function computeKeywordScore(text, keywords) {
  if (!text || !keywords?.length) return 0;
  let score = 0;
  for (const keyword of keywords) if (text.includes(keyword)) score += keyword.length > 7 ? 2 : 1;
  return score;
}

function detectLevel(user) {
  const explicit = Number(user?.level || user?.hierarchy_level || 0);
  if (explicit > 0) return explicit;
  const role = normalizeText(user?.role);
  if (role === 'ceo') return 1;
  if (role === 'diretor' || role === 'director') return 2;
  if (role === 'gerente') return 3;
  if (role === 'coordenador') return 4;
  if (role === 'supervisor') return 5;
  return 6;
}

function interpretProfileContext(user = {}) {
  const role = normalizeText(user.role);
  const jobTitle = normalizeText(user.job_title || user.cargo);
  const area = normalizeText(user.functional_area || user.departamento || user.department || user.area);
  const description = normalizeText(user.hr_responsibilities || user.descricao_funcional || user.description || user.descricao || user.bio);
  const baseText = [role, jobTitle, area, description].filter(Boolean).join(' ');
  const level = detectLevel(user);

  const axisScores = {};
  for (const [axis, keywords] of Object.entries(AXIS_KEYWORDS)) {
    const score = computeKeywordScore(baseText, keywords);
    if (score > 0) axisScores[axis] = score;
  }
  if (level <= 2) axisScores.eixo_executivo = (axisScores.eixo_executivo || 0) + 2;
  if (['gerente', 'coordenador', 'supervisor'].includes(role)) axisScores.eixo_planejamento = (axisScores.eixo_planejamento || 0) + 2;

  const axes = Object.entries(axisScores).sort((a, b) => b[1] - a[1]).map(([axis]) => axis);
  const responsibilities = Object.entries(RESPONSIBILITY_KEYWORDS).filter(([, keys]) => computeKeywordScore(baseText, keys) > 0).map(([k]) => k);

  return {
    normalized_profile: { role, area, job_title: jobTitle, description, level },
    axes,
    primary_axis: axes[0] || 'eixo_operacional',
    responsibilities,
    confidence: Math.min(1, 0.35 + (Object.values(axisScores).reduce((s, n) => s + n, 0) / 20)),
    signals: { used_description: Boolean(description), description_tokens: description ? description.split(' ').slice(0, 30) : [] }
  };
}

module.exports = { interpretProfileContext, normalizeText };
