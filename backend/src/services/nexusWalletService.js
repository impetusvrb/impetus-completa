/**
 * Nexus IA — carteira de créditos por empresa, débito proporcional por serviço, recargas (Stripe).
 * Ativar: NEXUS_CREDIT_WALLET=true
 * Bloquear chamadas sem saldo (pré-check): NEXUS_WALLET_ENFORCE=true
 */
'use strict';

const crypto = require('crypto');
const { createResilientClient } = require('../utils/httpClient');
const db = require('../db');

const WALLET_ENABLED =
  String(process.env.NEXUS_CREDIT_WALLET || '').toLowerCase() === 'true' ||
  process.env.NEXUS_CREDIT_WALLET === '1';
const ENFORCE =
  String(process.env.NEXUS_WALLET_ENFORCE || '').toLowerCase() === 'true' ||
  process.env.NEXUS_WALLET_ENFORCE === '1';

const http = createResilientClient();
const STRIPE_API = 'https://api.stripe.com/v1';

function stripeKey() {
  return (process.env.STRIPE_SECRET_KEY || '').trim();
}

async function ensureWallet(companyId) {
  if (!companyId) return null;
  await db.query(
    `INSERT INTO nexus_company_wallets (company_id) VALUES ($1)
     ON CONFLICT (company_id) DO NOTHING`,
    [companyId]
  );
  const r = await db.query(`SELECT * FROM nexus_company_wallets WHERE company_id = $1`, [companyId]);
  return r.rows[0] || null;
}

async function getWallet(companyId) {
  await ensureWallet(companyId);
  const r = await db.query(`SELECT * FROM nexus_company_wallets WHERE company_id = $1`, [companyId]);
  return r.rows[0] || null;
}

async function getCreditsPerUnit(companyId, servico) {
  const s = String(servico || 'outro').toLowerCase();
  const r1 = await db.query(
    `SELECT credits_per_unit FROM nexus_wallet_company_rates WHERE company_id = $1 AND servico = $2`,
    [companyId, s]
  );
  if (r1.rows[0]) return Number(r1.rows[0].credits_per_unit);
  const r2 = await db.query(`SELECT credits_per_unit FROM nexus_wallet_global_rates WHERE servico = $1`, [s]);
  if (r2.rows[0]) return Number(r2.rows[0].credits_per_unit);
  const r3 = await db.query(`SELECT credits_per_unit FROM nexus_wallet_global_rates WHERE servico = 'outro'`);
  return Number(r3.rows[0]?.credits_per_unit || 1);
}

/**
 * Pré-check antes de chamar API externa (usa consumo estimado em unidades do serviço).
 */
async function canConsumeEstimate(companyId, servico, estimatedUnits) {
  if (!WALLET_ENABLED || !companyId) return { ok: true, skipped: true };
  if (!ENFORCE) return { ok: true };
  const w = await getWallet(companyId);
  if (!w) return { ok: false, reason: 'no_wallet' };
  if (w.consumption_paused) return { ok: false, reason: 'paused', balance: w.balance_credits };
  const rate = await getCreditsPerUnit(companyId, servico);
  const need = rate * Math.max(0, Number(estimatedUnits) || 0);
  const bal = Number(w.balance_credits);
  if (need <= 0) return { ok: true, balance: bal };
  if (bal < need) return { ok: false, reason: 'insufficient_credits', balance: bal, need };
  return { ok: true, balance: bal, need };
}

/**
 * Débito após uso real (chamado a partir de billingTokenService).
 */
async function debitAfterUsageSafe(companyId, userId, servico, quantidade, unidade = 'tokens') {
  if (!WALLET_ENABLED || !companyId) return { skipped: true };
  const q = Number(quantidade);
  if (!Number.isFinite(q) || q <= 0) return { skipped: true };

  const rate = await getCreditsPerUnit(companyId, servico);
  const credits = rate * q;
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const lock = await client.query(
      `SELECT balance_credits, consumption_paused, low_balance_threshold_credits
       FROM nexus_company_wallets WHERE company_id = $1 FOR UPDATE`,
      [companyId]
    );
    if (!lock.rows[0]) {
      await client.query(
        `INSERT INTO nexus_company_wallets (company_id) VALUES ($1) ON CONFLICT DO NOTHING`,
        [companyId]
      );
    }
    const w2 = await client.query(
      `SELECT balance_credits, consumption_paused, low_balance_threshold_credits
       FROM nexus_company_wallets WHERE company_id = $1 FOR UPDATE`,
      [companyId]
    );
    const row = w2.rows[0];
    let balance = Number(row.balance_credits);
    const threshold = Number(row.low_balance_threshold_credits || 0);
    let paused = row.consumption_paused;

    if (paused) {
      await client.query('ROLLBACK');
      return { skipped: true, reason: 'paused' };
    }

    if (balance < credits) {
      const newBal = 0;
      await client.query(
        `UPDATE nexus_company_wallets SET
          balance_credits = $2,
          consumption_paused = true,
          updated_at = now()
         WHERE company_id = $1`,
        [companyId, newBal]
      );
      await client.query(
        `INSERT INTO nexus_wallet_ledger (
          company_id, entry_type, credits_delta, balance_after, servico, quantidade, unidade, meta
        ) VALUES ($1, 'debit_api_insufficient', $2, $3, $4, $5, $6, $7)`,
        [
          companyId,
          -balance,
          newBal,
          servico,
          q,
          unidade,
          JSON.stringify({
            user_id: userId,
            requested_credits: credits,
            shortfall: credits - balance,
            partial: true
          })
        ]
      );
      await client.query('COMMIT');
      console.warn('[NEXUS_WALLET] Saldo insuficiente — consumo pausado', { companyId, servico, credits, balance });
      return { ok: false, paused: true, partialDebit: balance };
    }

    balance -= credits;
    let lowWarn = false;
    if (threshold > 0 && balance <= threshold) {
      lowWarn = true;
    }
    if (balance <= 0) {
      paused = true;
    }

    await client.query(
      `UPDATE nexus_company_wallets SET
        balance_credits = $2,
        consumption_paused = $3,
        low_balance_last_notified_at = CASE WHEN $4 THEN now() ELSE low_balance_last_notified_at END,
        updated_at = now()
       WHERE company_id = $1`,
      [companyId, balance, paused, lowWarn]
    );
    await client.query(
      `INSERT INTO nexus_wallet_ledger (
        company_id, entry_type, credits_delta, balance_after, servico, quantidade, unidade, meta
      ) VALUES ($1, 'debit_api', $2, $3, $4, $5, $6, $7)`,
      [
        companyId,
        -credits,
        balance,
        servico,
        q,
        unidade,
        JSON.stringify({ user_id: userId, credits_charged: credits, rate, low_balance_warn: lowWarn })
      ]
    );
    await client.query('COMMIT');
    return { ok: true, balance_after: balance, low_balance_warn: lowWarn, paused };
  } catch (e) {
    try {
      await client.query('ROLLBACK');
    } catch (_) {}
    console.warn('[NEXUS_WALLET] debitAfterUsageSafe:', e.message);
    return { ok: false, error: e.message };
  } finally {
    client.release();
  }
}

async function creditTopUp(client, companyId, credits, entryType, refExternal, meta) {
  const w = await client.query(
    `SELECT balance_credits FROM nexus_company_wallets WHERE company_id = $1 FOR UPDATE`,
    [companyId]
  );
  if (!w.rows[0]) {
    await client.query(`INSERT INTO nexus_company_wallets (company_id) VALUES ($1)`, [companyId]);
  }
  const w2 = await client.query(
    `SELECT balance_credits FROM nexus_company_wallets WHERE company_id = $1 FOR UPDATE`,
    [companyId]
  );
  const bal = Number(w2.rows[0].balance_credits) + Number(credits);
  await client.query(
    `UPDATE nexus_company_wallets SET
      balance_credits = $2,
      consumption_paused = false,
      updated_at = now()
     WHERE company_id = $1`,
    [companyId, bal]
  );
  await client.query(
    `INSERT INTO nexus_wallet_ledger (
      company_id, entry_type, credits_delta, balance_after, ref_external, meta
    ) VALUES ($1, $2, $3, $4, $5, $6)`,
    [companyId, entryType, credits, bal, refExternal || null, meta ? JSON.stringify(meta) : null]
  );
  return bal;
}

async function completeStripeTopUp(sessionId, paymentIntentId) {
  const key = stripeKey();
  if (!key || !sessionId) return { ok: false, error: 'stripe_not_configured' };

  const done = await db.query(
    `SELECT id FROM nexus_wallet_topups WHERE stripe_checkout_session_id = $1 AND status = 'completed'`,
    [sessionId]
  );
  if (done.rows?.length) return { ok: true, duplicate: true };

  let session;
  try {
    const res = await http.get(`${STRIPE_API}/checkout/sessions/${sessionId}`, {
      headers: { Authorization: `Bearer ${key}` },
      timeout: 20000
    });
    session = res.data;
  } catch (e) {
    return { ok: false, error: e.response?.data?.error?.message || e.message };
  }

  if (session.payment_status !== 'paid') return { ok: false, error: 'not_paid' };

  const companyId = session.metadata?.company_id || session.client_reference_id;
  if (!companyId) return { ok: false, error: 'missing_company' };

  const amountBrl = Number(session.amount_total || 0) / 100;
  const wallet = await getWallet(companyId);
  const perBrl = Number(wallet?.credits_per_brl || 1000);
  const creditsStr = (amountBrl * perBrl).toFixed(6);

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const dupLedger = await client.query(
      `SELECT 1 FROM nexus_wallet_ledger WHERE ref_external = $1 AND entry_type = 'topup_stripe' LIMIT 1`,
      [String(sessionId)]
    );
    if (dupLedger.rows?.length) {
      await client.query('COMMIT');
      return { ok: true, duplicate: true };
    }
    const up = await client.query(
      `UPDATE nexus_wallet_topups SET
        status = 'completed',
        completed_at = now(),
        amount_brl = $2,
        credits_to_credit = $3::numeric
       WHERE stripe_checkout_session_id = $1 AND status = 'pending'`,
      [sessionId, amountBrl, creditsStr]
    );
    if (up.rowCount === 0) {
      await client.query(
        `INSERT INTO nexus_wallet_topups (
          company_id, provider, amount_brl, credits_to_credit, stripe_checkout_session_id, status, completed_at
        ) VALUES ($1, 'stripe', $2, $3, $4, 'completed', now())`,
        [companyId, amountBrl, creditsStr, sessionId]
      );
    }
    await creditTopUp(
      client,
      companyId,
      creditsStr,
      'topup_stripe',
      String(sessionId),
      { payment_intent: paymentIntentId || session.payment_intent, amount_brl: amountBrl }
    );
    await client.query('COMMIT');
    return { ok: true, companyId, credits: Number(creditsStr) };
  } catch (e) {
    try {
      await client.query('ROLLBACK');
    } catch (_) {}
    throw e;
  } finally {
    client.release();
  }
}

function verifyStripeSignature(rawBody, sigHeader, secret) {
  if (!sigHeader || !secret || !rawBody) return false;
  const parts = String(sigHeader)
    .split(',')
    .map((p) => p.trim().split('='))
    .filter((x) => x.length === 2);
  const t = parts.find((x) => x[0] === 't')?.[1];
  const v1s = parts.filter((x) => x[0] === 'v1').map((x) => x[1]);
  if (!t || !v1s.length) return false;
  const signed = `${t}.${rawBody}`;
  const expected = crypto.createHmac('sha256', secret).update(signed, 'utf8').digest('hex');
  return v1s.some((sig) => {
    try {
      const a = Buffer.from(sig, 'hex');
      const b = Buffer.from(expected, 'hex');
      return a.length === b.length && crypto.timingSafeEqual(a, b);
    } catch {
      return false;
    }
  });
}

async function handleStripeWebhook(rawBodyBuffer, sigHeader) {
  const secret = (process.env.STRIPE_WEBHOOK_SECRET_NEXUS || '').trim();
  if (!secret) return { ok: false, error: 'webhook_secret_missing' };
  const raw = rawBodyBuffer.toString('utf8');
  if (!verifyStripeSignature(raw, sigHeader, secret)) return { ok: false, error: 'invalid_signature' };
  let event;
  try {
    event = JSON.parse(raw);
  } catch {
    return { ok: false, error: 'invalid_json' };
  }
  if (event.type === 'checkout.session.completed') {
    const sess = event.data?.object;
    const id = sess?.id;
    const pi = sess?.payment_intent;
    return completeStripeTopUp(id, pi);
  }
  return { ok: true, ignored: true, type: event.type };
}

async function createStripeCheckoutSession(companyId, amountBrl, successUrl, cancelUrl) {
  const key = stripeKey();
  if (!key) {
    const e = new Error('Stripe não configurado (STRIPE_SECRET_KEY)');
    e.status = 503;
    throw e;
  }
  if (!companyId || Number(amountBrl) < 5) {
    const e = new Error('Valor mínimo de recarga: R$ 5,00');
    e.status = 400;
    throw e;
  }
  const wallet = await getWallet(companyId);
  const cents = Math.round(Number(amountBrl) * 100);
  if (cents < 500) {
    const e = new Error('Valor mínimo de recarga: R$ 5,00');
    e.status = 400;
    throw e;
  }

  const params = new URLSearchParams();
  params.append('mode', 'payment');
  params.append('success_url', successUrl);
  params.append('cancel_url', cancelUrl);
  params.append('client_reference_id', companyId);
  params.append('metadata[company_id]', companyId);
  params.append('line_items[0][quantity]', '1');
  params.append('line_items[0][price_data][currency]', 'brl');
  params.append('line_items[0][price_data][unit_amount]', String(cents));
  params.append('line_items[0][price_data][product_data][name]', 'Nexus IA — créditos');

  const res = await http.post(`${STRIPE_API}/checkout/sessions`, params.toString(), {
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    timeout: 25000
  });
  const url = res.data?.url;
  const id = res.data?.id;
  if (!url || !id) {
    const e = new Error('Resposta inválida do Stripe');
    e.status = 502;
    throw e;
  }

  const perBrl = Number(wallet?.credits_per_brl || 1000);
  const creditsPreview = Number(amountBrl) * perBrl;
  await db.query(
    `INSERT INTO nexus_wallet_topups (
      company_id, provider, amount_brl, credits_to_credit, stripe_checkout_session_id, status
    ) VALUES ($1, 'stripe', $2, $3, $4, 'pending')`,
    [companyId, Number(amountBrl), creditsPreview, id]
  );

  return { url, sessionId: id };
}

async function getDashboard(companyId, ledgerLimit = 40) {
  await ensureWallet(companyId);
  const wallet = await getWallet(companyId);
  const ledger = await db.query(
    `SELECT * FROM nexus_wallet_ledger WHERE company_id = $1 ORDER BY created_at DESC LIMIT $2`,
    [companyId, ledgerLimit]
  );
  const byService = await db.query(
    `SELECT servico,
            COALESCE(SUM(ABS(credits_delta)), 0)::numeric AS credits_used
     FROM nexus_wallet_ledger
     WHERE company_id = $1
       AND entry_type LIKE 'debit_api%'
       AND created_at >= date_trunc('month', now() AT TIME ZONE 'UTC')
     GROUP BY servico
     ORDER BY credits_used DESC`,
    [companyId]
  );
  const ratesCompany = await db.query(
    `SELECT servico, credits_per_unit FROM nexus_wallet_company_rates WHERE company_id = $1 ORDER BY servico`,
    [companyId]
  );
  const ratesGlobal = await db.query(`SELECT servico, credits_per_unit, description FROM nexus_wallet_global_rates ORDER BY servico`);
  return {
    wallet,
    ledger: ledger.rows,
    consumptionByServiceThisMonth: byService.rows,
    ratesCompany: ratesCompany.rows,
    ratesGlobal: ratesGlobal.rows,
    walletEnabled: WALLET_ENABLED,
    enforce: ENFORCE
  };
}

async function updateWalletSettings(companyId, body) {
  const b = body || {};
  await ensureWallet(companyId);
  const threshold =
    b.low_balance_threshold_credits != null
      ? Math.max(0, Number(b.low_balance_threshold_credits))
      : null;
  const paused = b.consumption_paused != null ? !!b.consumption_paused : null;

  await db.query(
    `UPDATE nexus_company_wallets SET
      low_balance_threshold_credits = COALESCE($2, low_balance_threshold_credits),
      consumption_paused = COALESCE($3, consumption_paused),
      updated_at = now()
     WHERE company_id = $1`,
    [companyId, threshold, paused]
  );
  return getWallet(companyId);
}

async function upsertCompanyRate(companyId, servico, creditsPerUnit) {
  const s = String(servico || '').trim().toLowerCase();
  const c = Number(creditsPerUnit);
  if (!s || !Number.isFinite(c) || c <= 0) {
    const e = new Error('servico e credits_per_unit inválidos');
    e.status = 400;
    throw e;
  }
  await db.query(
    `INSERT INTO nexus_wallet_company_rates (company_id, servico, credits_per_unit)
     VALUES ($1, $2, $3)
     ON CONFLICT (company_id, servico) DO UPDATE SET credits_per_unit = $3, updated_at = now()`,
    [companyId, s, c]
  );
  return { ok: true };
}

async function deleteCompanyRate(companyId, servico) {
  await db.query(
    `DELETE FROM nexus_wallet_company_rates WHERE company_id = $1 AND servico = $2`,
    [companyId, String(servico).toLowerCase()]
  );
  return { ok: true };
}

module.exports = {
  WALLET_ENABLED,
  ENFORCE,
  ensureWallet,
  getWallet,
  getCreditsPerUnit,
  canConsumeEstimate,
  debitAfterUsageSafe,
  handleStripeWebhook,
  createStripeCheckoutSession,
  getDashboard,
  updateWalletSettings,
  upsertCompanyRate,
  deleteCompanyRate
};
