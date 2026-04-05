/**
 * Painel visual pós-voz: Claude gera JSON estruturado (gráfico, tabela, KPI, relatório, alerta).
 * Não substitui a OpenAI na conversação — só o output do painel direito.
 */
const claudeService = require('./claudeService');
const dashboardAccessService = require('./dashboardAccessService');

const ALLOWED_TYPES = new Set(['chart', 'table', 'kpi', 'report', 'alert']);

function stripMarkdownJson(raw) {
  let t = String(raw || '').trim();
  t = t.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
  return t;
}

function parseClaudePanelJson(raw) {
  const clean = stripMarkdownJson(raw);
  try {
    const parsed = JSON.parse(clean);
    return validateAndNormalizePanel(parsed);
  } catch (_) {
    const m = String(raw || '').match(/\{[\s\S]*\}/);
    if (m) {
      try {
        return validateAndNormalizePanel(JSON.parse(m[0]));
      } catch (_) {}
    }
  }
  return {
    shouldRender: true,
    type: 'alert',
    title: 'Não entendi',
    description: 'Tente reformular o pedido.',
    output: {
      items: [
        {
          level: 'info',
          message:
            'Exemplos: «gráfico de linha do mês», «cards de KPI», «relatório da semana», «tabela de status», «alertas críticos».'
        }
      ]
    }
  };
}

function validateAndNormalizePanel(parsed) {
  if (parsed && parsed.shouldRender === false) {
    return { shouldRender: false };
  }
  const shouldRender = parsed?.shouldRender !== false;
  if (!shouldRender) {
    return { shouldRender: false };
  }
  let type = String(parsed?.type || 'chart').toLowerCase();
  if (type === 'kpi_cards') type = 'kpi';
  if (!ALLOWED_TYPES.has(type)) type = 'chart';

  const title = String(parsed?.title || 'Painel').slice(0, 160);
  const description = String(parsed?.description || '').slice(0, 500);
  const output = parsed?.output && typeof parsed.output === 'object' ? parsed.output : {};

  if (type === 'chart') {
    const chartType = ['bar', 'line', 'pie', 'donut', 'area'].includes(String(output.chartType || '').toLowerCase())
      ? String(output.chartType).toLowerCase()
      : 'bar';
    const labels = Array.isArray(output.labels) ? output.labels.map((x) => String(x).slice(0, 48)) : [];
    const datasets = Array.isArray(output.datasets)
      ? output.datasets.map((d) => ({
          label: String(d?.label || 'Série').slice(0, 48),
          data: Array.isArray(d?.data) ? d.data.map((n) => (Number.isFinite(Number(n)) ? Number(n) : 0)) : []
        }))
      : [];
    return {
      shouldRender: true,
      type: 'chart',
      title,
      description,
      output: { chartType, labels, datasets }
    };
  }

  if (type === 'table') {
    const columns = Array.isArray(output.columns) ? output.columns.map((c) => String(c).slice(0, 64)) : [];
    const rows = Array.isArray(output.rows)
      ? output.rows.map((r) => (Array.isArray(r) ? r.map((c) => String(c ?? '—').slice(0, 200)) : []))
      : [];
    return { shouldRender: true, type: 'table', title, description, output: { columns, rows } };
  }

  if (type === 'kpi') {
    const cards = Array.isArray(output.cards)
      ? output.cards.map((c) => ({
          label: String(c?.label || '—').slice(0, 64),
          value: String(c?.value ?? '—').slice(0, 32),
          trend: c?.trend != null ? String(c.trend).slice(0, 16) : ''
        }))
      : [];
    return { shouldRender: true, type: 'kpi', title, description, output: { cards } };
  }

  if (type === 'report') {
    const sections = Array.isArray(output.sections)
      ? output.sections.map((s) => ({
          heading: String(s?.heading || '').slice(0, 120),
          body: String(s?.body || '').slice(0, 4000)
        }))
      : [];
    return { shouldRender: true, type: 'report', title, description, output: { sections } };
  }

  const items = Array.isArray(output.items)
    ? output.items.map((it) => ({
        level: ['warning', 'error', 'info'].includes(String(it?.level || '').toLowerCase())
          ? String(it.level).toLowerCase()
          : 'info',
        message: String(it?.message || '').slice(0, 500)
      }))
    : [{ level: 'info', message: 'Sem alertas.' }];
  return { shouldRender: true, type: 'alert', title, description, output: { items } };
}

function buildSystemPrompt(user) {
  const perms = (dashboardAccessService.getEffectivePermissions(user) || []).slice(0, 40);
  const role = String(user?.role || 'colaborador');
  const dept = String(user?.area || user?.functional_area || '').slice(0, 80);

  return `Você é o motor analítico visual do IMPETUS. O usuário conversou com a IA de voz (OpenAI); você NÃO fala, NÃO conversa — só define o que mostrar no painel direito.

Contexto do utilizador (não invente permissões além disto):
- Perfil: ${role}
- Área: ${dept || '—'}
- Permissões (amostra): ${perms.join(', ') || '—'}

REGRAS:
1. Responda APENAS um JSON válido, sem markdown, sem texto fora do JSON.
2. Se a conversa for só saudação, despedida ou sem pedido de dados/visualização, retorne exatamente: {"shouldRender":false}
3. Caso contrário shouldRender: true e preencha type, title, description, output conforme o pedido.
4. Gere dados plausíveis para o contexto industrial/operacional quando não houver números explícitos na conversa — nunca deixe labels vazios para gráficos pedidos.

Schema obrigatório quando shouldRender é true:
{
  "shouldRender": true,
  "type": "chart" | "table" | "kpi" | "report" | "alert",
  "title": "título do output",
  "description": "breve descrição",
  "output": {
    // chart:
    "chartType": "bar" | "line" | "pie" | "donut" | "area",
    "labels": ["label1", "label2"],
    "datasets": [{ "label": "nome da série", "data": [n1, n2] }],

    // table:
    "columns": ["col1", "col2"],
    "rows": [["val1", "val2"]],

    // kpi:
    "cards": [{ "label": "nome", "value": "valor", "trend": "+12%" }],

    // report:
    "sections": [{ "heading": "título", "body": "texto" }],

    // alert:
    "items": [{ "level": "warning"|"error"|"info", "message": "texto" }]
  }
}

Alinhe labels e números ao que o utilizador pediu (ex.: vendas do mês → eixo temporal ou categorias coerentes).`;
}

function buildUserContent(userTranscript, assistantResponse) {
  return `Última fala do utilizador:
"""${String(userTranscript || '').slice(0, 3500)}"""

Resposta da IA de voz ao utilizador:
"""${String(assistantResponse || '').slice(0, 3500)}"""

Gere o JSON do painel visual mais adequado para complementar esta conversa.`;
}

/**
 * @param {object} user — req.user
 * @param {{ userTranscript?: string, assistantResponse?: string }} body
 */
async function generateVisualPanel(user, body) {
  const userTranscript = String(body?.userTranscript || '').trim();
  const assistantResponse = String(body?.assistantResponse || '').trim();
  if (!userTranscript && !assistantResponse) {
    return { ok: false, error: 'Transcrição vazia.', shouldRender: false };
  }

  if (!claudeService.isAvailable()) {
    const reason = claudeService.getPanelUnavailableReason() || 'Claude indisponível.';
    return { ok: false, error: reason, shouldRender: false };
  }

  const billing =
    user.company_id && user.id ? { companyId: user.company_id, userId: user.id } : null;

  const messages = [
    { role: 'system', content: buildSystemPrompt(user) },
    { role: 'user', content: buildUserContent(userTranscript, assistantResponse) }
  ];

  const raw = await claudeService.completeOpenAIStyleMessages(messages, {
    max_tokens: 2000,
    timeout: 60000,
    billing,
    model: process.env.CLAUDE_PANEL_MODEL || process.env.SMART_PANEL_CLAUDE_MODEL
  });

  if (typeof raw === 'string' && raw.startsWith('FALLBACK:')) {
    return {
      ok: false,
      error: raw.replace(/^FALLBACK:\s*/i, '').trim().slice(0, 200),
      shouldRender: false
    };
  }
  if (!raw || !String(raw).trim()) {
    return { ok: false, error: 'Resposta vazia do Claude.', shouldRender: false };
  }

  const panel = parseClaudePanelJson(raw);
  if (!panel.shouldRender) {
    return { ok: true, shouldRender: false };
  }

  return { ok: true, shouldRender: true, panel };
}

module.exports = {
  generateVisualPanel,
  parseClaudePanelJson,
  validateAndNormalizePanel
};
