/**
 * PROMPT FIREWALL - Anti vazamento e anti prompt injection
 * Analisa a pergunta ANTES de enviar à OpenAI.
 * Bloqueia termos sensíveis sem permissão e tentativas de prompt injection.
 */
const { getUserPermissions } = require('./authorize');

const SENSITIVE_TERMS = [
  'faturamento', 'lucro', 'margem', 'salário', 'salario', 'contrato', 'demissão', 'demissao',
  'cliente estratégico', 'cliente estrategico', 'receita', 'custo', 'folha', 'bônus', 'bonus',
  'remuneração', 'remuneracao', 'comissão', 'comissao', 'dividendos', 'balanço', 'balanco',
  'patrimônio', 'patrimonio', 'investimento', 'dívida', 'divida', 'caixa', 'fluxo de caixa',
  'lucro líquido', 'lucro liquido', 'ebitda', 'break-even', 'preço de custo', 'preco de custo'
];

const SENSITIVE_PERMISSION_MAP = {
  financial: 'VIEW_FINANCIAL',
  hr: 'VIEW_HR',
  strategic: 'VIEW_STRATEGIC'
};

const PROMPT_INJECTION_PATTERNS = [
  /ignore\s+(as\s+)?(suas\s+)?regras?/i,
  /ignore\s+(as\s+)?instru[çc][õo]es?\s+anteriores?/i,
  /revele?\s+dados?\s+internos?/i,
  /mostre?\s+tudo/i,
  /bypass/i,
  /admin\s+override/i,
  /super\s?user/i,
  /desative?\s+(a\s+)?segurana[çc]a/i,
  /siga\s+apenas\s+(as\s+)?minhas?\s+instru/i,
  /esque[çc]a?\s+o\s+anteriores?/i,
  /voc[êe]\s+[ée]\s+um\s+(modelo\s+)?sem\s+restri/i,
  /jailbreak/i,
  /dane?-se\s+(as\s+)?instru/i,
  /output\s+as\s+raw\s+dump/i,
  /print\s+all\s+(internal|database)/i,
  /<\s*script/i,
  /javascript\s*:/i,
  /on\s*error\s*=/i
];

const BLOCK_MESSAGE = 'Você não possui permissão para acessar informações estratégicas. Entre em contato com o administrador para solicitar acesso.';

/**
 * Analisa o texto e retorna { allowed, blocked, reason }
 */
async function analyzePrompt(message, user) {
  if (!message || typeof message !== 'string') {
    return { allowed: false, blocked: true, reason: 'Mensagem inválida' };
  }

  const text = message.trim().toLowerCase();
  if (text.length < 2) {
    return { allowed: false, blocked: true, reason: 'Mensagem muito curta' };
  }

  // 1) Detecção de prompt injection
  for (const pattern of PROMPT_INJECTION_PATTERNS) {
    if (pattern.test(message)) {
      return { allowed: false, blocked: true, reason: 'Tentativa de prompt injection detectada' };
    }
  }

  // 2) Verificar termos sensíveis vs permissões do usuário
  let userPerms = [];
  try {
    const r = await getUserPermissions(user);
    userPerms = r.permissions || [];
  } catch {
    userPerms = [];
  }

  const hasFinancial = userPerms.includes('VIEW_FINANCIAL') || userPerms.includes('*');
  const hasHR = userPerms.includes('VIEW_HR') || userPerms.includes('*');
  const hasStrategic = userPerms.includes('VIEW_STRATEGIC') || userPerms.includes('*');

  const financialTerms = ['faturamento', 'lucro', 'margem', 'receita', 'custo', 'folha', 'bônus', 'bonus', 'remuneração', 'comissão', 'dividendos', 'balanço', 'patrimônio', 'investimento', 'dívida', 'caixa', 'fluxo de caixa', 'ebitda', 'break-even'];
  const hrTerms = ['salário', 'salario', 'contrato', 'demissão', 'demissao'];
  const strategicTerms = ['cliente estratégico', 'cliente estrategico'];

  for (const term of financialTerms) {
    if (text.includes(term) && !hasFinancial) {
      return { allowed: false, blocked: true, reason: 'VIEW_FINANCIAL', message: BLOCK_MESSAGE };
    }
  }
  for (const term of hrTerms) {
    if (text.includes(term) && !hasHR) {
      return { allowed: false, blocked: true, reason: 'VIEW_HR', message: BLOCK_MESSAGE };
    }
  }
  for (const term of strategicTerms) {
    if (text.includes(term) && !hasStrategic) {
      return { allowed: false, blocked: true, reason: 'VIEW_STRATEGIC', message: BLOCK_MESSAGE };
    }
  }

  return { allowed: true, blocked: false };
}

/**
 * Middleware para rotas de chat/IA
 * Coloca em req.promptFirewall = { allowed, blocked, reason, message }
 */
function promptFirewall(req, res, next) {
  const message = req.body?.message || req.body?.question || req.body?.query || '';
  const user = req.user;

  analyzePrompt(message, user || {}).then((result) => {
    req.promptFirewall = result;
    next();
  }).catch((err) => {
    console.error('[PROMPT_FIREWALL_ERROR]', err);
    req.promptFirewall = { allowed: false, blocked: true, reason: 'Erro na análise', message: BLOCK_MESSAGE };
    next();
  });
}

module.exports = { analyzePrompt, promptFirewall, BLOCK_MESSAGE };
