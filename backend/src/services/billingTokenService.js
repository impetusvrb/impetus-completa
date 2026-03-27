/**
 * NexusIA — billing unificado de tokens por empresa (company_id).
 * registrarUsoSafe nunca lança para o chamador (falhas só em log).
 */
const db = require('../db');
const { createResilientClient } = require('../utils/httpClient');
const asaasService = require('./asaasService');

const ENABLED = process.env.ENABLE_TOKEN_BILLING !== 'false' && process.env.ENABLE_TOKEN_BILLING !== '0';

const CUSTO_REAL_POR_UNIDADE = {
  voz: 0.00006,
  chat: 0.000025,
  claude: 0.000015,
  gemini: 0.000005,
  avatar: 0.5,
  tts: 0.00018,
  analise: 0.000015,
  conteudo: 0.000015,
  outro: 0.00001
};

const http = createResilientClient();
const ASAAS_API = process.env.ASAAS_ENV === 'production'
  ? 'https://api.asaas.com/v3'
  : 'https://api-sandbox.asaas.com/v3';

function asaasHeaders() {
  const key = process.env.ASAAS_API_KEY;
  return {
    'Content-Type': 'application/json',
    'access_token': key
  };
}

function defaultPrecoToken(planType) {
  const map = {
    essencial: 0.00005,
    profissional: 0.00004,
    estratégico: 0.00003,
    enterprise: 0.00002
  };
  return map[planType] ?? map.profissional;
}

/**
 * @param {string|null|undefined} companyId
 * @param {string|null|undefined} userId
 * @param {string} servico
 * @param {number} quantidade
 * @param {string} [unidade]
 */
function registrarUsoSafe(companyId, userId, servico, quantidade, unidade = 'tokens') {
  if (!ENABLED || !companyId) return;
  const q = Number(quantidade);
  if (!Number.isFinite(q) || q <= 0) return;

  const unit = CUSTO_REAL_POR_UNIDADE[servico] ?? CUSTO_REAL_POR_UNIDADE.outro;
  const custo = unit * q;

  setImmediate(() => {
    db.query(
      `INSERT INTO token_usage (company_id, user_id, servico, quantidade, unidade, custo_real)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [companyId, userId || null, servico, q, unidade, custo]
    ).catch((err) => {
      if (!String(err.message || '').includes('token_usage')) {
        console.warn('[NEXUS_BILLING] registrarUso:', err.message);
      }
    });
  });
}

async function getPrecoTokenBrl(planType) {
  try {
    const r = await db.query(
      'SELECT preco_token_brl FROM token_billing_plans WHERE plan_type = $1',
      [planType || 'profissional']
    );
    if (r.rows?.length) return Number(r.rows[0].preco_token_brl);
  } catch (_) {}
  return defaultPrecoToken(planType);
}

/**
 * Resumo para o admin da empresa — sem custo_real nem detalhe por serviço.
 */
async function getClienteCustosResumo(companyId, ano, mes) {
  const y = parseInt(ano, 10) || new Date().getFullYear();
  const m = parseInt(mes, 10) || new Date().getMonth() + 1;

  const companyRes = await db.query(
    `SELECT id, name, plan_type, COALESCE(subscription_status, '') AS subscription_status
     FROM companies WHERE id = $1`,
    [companyId]
  );
  if (!companyRes.rows?.length) {
    const e = new Error('Empresa não encontrada');
    e.status = 404;
    throw e;
  }
  const company = companyRes.rows[0];
  const precoToken = await getPrecoTokenBrl(company.plan_type);
  const mensalidade = asaasService.getPlanValue(company.plan_type);

  const totalRes = await db.query(
    `SELECT COALESCE(SUM(quantidade), 0)::numeric AS total_tokens
     FROM token_usage
     WHERE company_id = $1
       AND EXTRACT(YEAR FROM created_at AT TIME ZONE 'UTC') = $2
       AND EXTRACT(MONTH FROM created_at AT TIME ZONE 'UTC') = $3`,
    [companyId, y, m]
  );
  const totalTokens = Number(totalRes.rows[0]?.total_tokens || 0);

  const diarioRes = await db.query(
    `SELECT EXTRACT(DAY FROM created_at AT TIME ZONE 'UTC')::int AS dia,
            COALESCE(SUM(quantidade), 0)::numeric AS tokens
     FROM token_usage
     WHERE company_id = $1
       AND EXTRACT(YEAR FROM created_at AT TIME ZONE 'UTC') = $2
       AND EXTRACT(MONTH FROM created_at AT TIME ZONE 'UTC') = $3
     GROUP BY 1
     ORDER BY 1`,
    [companyId, y, m]
  );

  const valorTokens = totalTokens * precoToken;
  const totalFatura = Number(mensalidade) + valorTokens;

  return {
    ok: true,
    plano: company.plan_type,
    mensalidade: Number(mensalidade),
    preco_token: precoToken,
    totalTokens,
    valorTokens,
    totalFatura,
    ano: y,
    mes: m,
    diario: (diarioRes.rows || []).map((row) => ({
      dia: Number(row.dia),
      tokens: Number(row.tokens)
    }))
  };
}

async function calcularFaturaMes(companyId, ano, mes) {
  const companyRes = await db.query(
    `SELECT c.id, c.name, c.plan_type, s.asaas_customer_id
     FROM companies c
     LEFT JOIN subscriptions s ON s.company_id = c.id AND s.asaas_customer_id IS NOT NULL
     WHERE c.id = $1
     ORDER BY s.updated_at DESC NULLS LAST
     LIMIT 1`,
    [companyId]
  );
  if (!companyRes.rows?.length) return null;

  const row = companyRes.rows[0];
  const precoToken = await getPrecoTokenBrl(row.plan_type);
  const mensalidade = asaasService.getPlanValue(row.plan_type);

  const usageRes = await db.query(
    `SELECT
       COALESCE(SUM(quantidade), 0)::numeric AS total_tokens,
       COALESCE(SUM(custo_real), 0)::numeric AS total_custo_real
     FROM token_usage
     WHERE company_id = $1
       AND EXTRACT(YEAR FROM created_at AT TIME ZONE 'UTC') = $2
       AND EXTRACT(MONTH FROM created_at AT TIME ZONE 'UTC') = $3`,
    [companyId, ano, mes]
  );

  const totalTokens = Number(usageRes.rows[0]?.total_tokens || 0);
  const custoReal = Number(usageRes.rows[0]?.total_custo_real || 0);
  const valorTokens = totalTokens * precoToken;
  const totalFatura = Number(mensalidade) + valorTokens;

  return {
    companyId: row.id,
    companyNome: row.name,
    asaasCustomerId: row.asaas_customer_id,
    plano: row.plan_type,
    mensalidade: Number(mensalidade),
    totalTokens,
    valorTokens,
    totalFatura,
    custoReal,
    lucro: totalFatura - custoReal
  };
}

function nextDueDateFirstOfFollowingMonth() {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + 1);
  return d.toISOString().split('T')[0];
}

async function createAsaasTokenPayment(asaasCustomerId, valueBrl, description) {
  const key = process.env.ASAAS_API_KEY;
  if (!key || !asaasCustomerId) return null;
  const val = Math.round(Number(valueBrl) * 100) / 100;
  if (val < 1) return null;

  try {
    const billingType = String(process.env.NEXUS_ASAAS_TOKEN_BILLING_TYPE || 'BOLETO').trim() || 'BOLETO';
    const res = await http.post(
      `${ASAAS_API}/payments`,
      {
        customer: asaasCustomerId,
        billingType,
        value: val.toFixed(2),
        dueDate: nextDueDateFirstOfFollowingMonth(),
        description: String(description || '').slice(0, 140)
      },
      { headers: asaasHeaders(), timeout: 20000 }
    );
    return res.data?.id ? { id: res.data.id } : null;
  } catch (err) {
    console.error('[NEXUS_BILLING] Asaas payment:', err.response?.data || err.message);
    return null;
  }
}

/**
 * Fatura mês civil anterior em relação a `referencia` (default: hoje).
 * No dia 1 às 8h, referencia = hoje → mês faturado = mês anterior.
 */
function resolveMesAnteriorFaturamento(referencia = new Date()) {
  const d = new Date(referencia);
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  const ano = d.getFullYear();
  const mes = d.getMonth() + 1;
  return { ano, mes };
}

async function runMonthlyTokenBilling(opts = {}) {
  if (!ENABLED) return { ok: false, skipped: true };
  const minValor = Number(process.env.NEXUS_TOKEN_MIN_CHARGE_BRL || 1);
  const ref = opts.referenceDate ? new Date(opts.referenceDate) : new Date();
  const { ano, mes } = resolveMesAnteriorFaturamento(ref);

  const companiesRes = await db.query(`
    SELECT c.id, c.active, c.subscription_status
    FROM companies c
    WHERE c.active = true
      AND (c.subscription_status IS NULL OR c.subscription_status IN ('active', 'pending', 'overdue'))
  `);

  const results = [];
  for (const c of companiesRes.rows || []) {
    try {
      const f = await calcularFaturaMes(c.id, ano, mes);
      if (!f) continue;
      if (f.valorTokens < minValor) {
        results.push({ companyId: c.id, skipped: true, reason: 'below_min' });
        continue;
      }
      if (!f.asaasCustomerId) {
        results.push({ companyId: c.id, skipped: true, reason: 'no_asaas_customer' });
        continue;
      }

      const mesNome = new Date(ano, mes - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      const desc = `Impetus — Tokens consumidos (${mesNome}) — ${Math.round(f.totalTokens).toLocaleString('pt-BR')} un.`;

      const dup = await db.query(
        `SELECT id FROM token_invoices WHERE company_id = $1 AND mes = $2 AND ano = $3`,
        [c.id, mes, ano]
      );
      if (dup.rows?.length) {
        results.push({ companyId: c.id, skipped: true, reason: 'already_invoiced' });
        continue;
      }

      const pay = await createAsaasTokenPayment(f.asaasCustomerId, f.valorTokens, desc);
      await db.query(
        `INSERT INTO token_invoices (
           company_id, mes, ano, mensalidade_brl, tokens_totais, valor_tokens_brl,
           total_cobrado_brl, custo_real_brl, asaas_payment_id
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (company_id, mes, ano) DO NOTHING`,
        [
          c.id,
          mes,
          ano,
          f.mensalidade,
          Math.round(f.totalTokens),
          f.valorTokens,
          f.valorTokens,
          f.custoReal,
          pay?.id || null
        ]
      );
      results.push({ companyId: c.id, ok: true, valorTokens: f.valorTokens, paymentId: pay?.id });
    } catch (err) {
      console.error('[NEXUS_BILLING] company', c.id, err.message);
      results.push({ companyId: c.id, ok: false, error: err.message });
    }
  }

  return { ok: true, ano, mes, results };
}

module.exports = {
  ENABLED,
  CUSTO_REAL_POR_UNIDADE,
  registrarUsoSafe,
  getClienteCustosResumo,
  calcularFaturaMes,
  runMonthlyTokenBilling,
  resolveMesAnteriorFaturamento
};
