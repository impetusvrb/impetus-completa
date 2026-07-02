'use strict';

const db = require('../../db');
const { resolveBillingContext, logBlockedAttempt } = require('./billingContext');
const { calculateCharge } = require('./pricing');

const ENGINE_ENABLED =
  String(process.env.NEXUS_BILLING_ENGINE_V4 || '').toLowerCase() === 'true' ||
  process.env.NEXUS_BILLING_ENGINE_V4 === '1';

const WALLET_ENABLED =
  String(process.env.NEXUS_CREDIT_WALLET || '').toLowerCase() === 'true' ||
  process.env.NEXUS_CREDIT_WALLET === '1';

function isEnabled() {
  return ENGINE_ENABLED;
}

/**
 * Pré-validação de saldo (sem débito).
 */
async function authorizeConsumption(input, usage = {}) {
  const resolved = await resolveBillingContext(input);
  if (!resolved.ok) {
    logBlockedAttempt(resolved.code, input, { phase: 'authorize' });
    return resolved;
  }
  const { context, wallet } = resolved;
  if (!WALLET_ENABLED) {
    return { ok: true, skipped: true, context };
  }
  if (wallet.consumption_paused) {
    return { ok: false, code: 'PAUSED', message: 'Consumo pausado', context };
  }
  const charge = await calculateCharge(context.companyId, usage);
  const bal = Number(wallet.balance_credits);
  if (charge.credits > 0 && bal < charge.credits) {
    return {
      ok: false,
      code: 'INSUFFICIENT_BALANCE',
      message: 'Saldo insuficiente',
      context,
      need: charge.credits,
      balance: bal
    };
  }
  return { ok: true, context, charge };
}

/**
 * Cobrança atómica: ledger append-only + débito carteira + token_usage.
 */
async function chargeConsumption(input, usage = {}) {
  const resolved = await resolveBillingContext(input);
  if (!resolved.ok) {
    logBlockedAttempt(resolved.code, input, { phase: 'charge' });
    return resolved;
  }
  const { context } = resolved;
  const charge = await calculateCharge(context.companyId, usage);

  if (charge.quantidade <= 0 && charge.credits <= 0) {
    return { ok: true, skipped: true, context };
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const dup = await client.query(`SELECT id FROM billing_ledger WHERE request_id = $1`, [
      context.requestId
    ]);
    if (dup.rows[0]) {
      await client.query('ROLLBACK');
      return { ok: true, idempotent: true, ledger_id: dup.rows[0].id, context };
    }

    const lock = await client.query(
      `SELECT company_id, wallet_id, balance_credits, consumption_paused
       FROM nexus_company_wallets
       WHERE company_id = $1 AND wallet_id = $2
       FOR UPDATE`,
      [context.companyId, context.walletId]
    );
    const w = lock.rows[0];
    if (!w) {
      await client.query('ROLLBACK');
      logBlockedAttempt('WALLET_NOT_FOUND', context);
      return { ok: false, code: 'WALLET_NOT_FOUND', message: 'Carteira inválida' };
    }
    if (String(w.company_id) !== String(context.companyId)) {
      await client.query('ROLLBACK');
      logBlockedAttempt('WALLET_COMPANY_MISMATCH', context);
      return { ok: false, code: 'WALLET_COMPANY_MISMATCH', message: 'Isolamento violado' };
    }

    let balanceBefore = Number(w.balance_credits);
    let balanceAfter = balanceBefore;
    let status = 'completed';
    let creditsToDebit = WALLET_ENABLED ? charge.credits : 0;

    if (WALLET_ENABLED && w.consumption_paused) {
      await client.query('ROLLBACK');
      return { ok: false, code: 'PAUSED', message: 'Consumo pausado', context };
    }

    if (WALLET_ENABLED && creditsToDebit > 0) {
      if (balanceBefore < creditsToDebit) {
        await client.query('ROLLBACK');
        logBlockedAttempt('INSUFFICIENT_BALANCE', context, { need: creditsToDebit, balance: balanceBefore });
        return {
          ok: false,
          code: 'INSUFFICIENT_BALANCE',
          message: 'Saldo insuficiente',
          context,
          need: creditsToDebit,
          balance: balanceBefore
        };
      }
      balanceAfter = balanceBefore - creditsToDebit;
      await client.query(
        `UPDATE nexus_company_wallets SET
          balance_credits = $3,
          consumption_paused = CASE WHEN $3 <= 0 THEN true ELSE consumption_paused END,
          updated_at = now()
         WHERE company_id = $1 AND wallet_id = $2`,
        [context.companyId, context.walletId, balanceAfter]
      );
    }

    const ledgerInsert = await client.query(
      `INSERT INTO billing_ledger (
        tenant_id, company_id, workspace_id, wallet_id, department_id, user_id,
        provider, model, service, operation,
        input_tokens, output_tokens, cached_tokens, images, audio_seconds, embeddings,
        execution_time_ms, price_brl, credits_charged, balance_before, balance_after,
        request_id, trace_id, session_id, conversation_id, status, ip, user_agent, meta
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29
      ) RETURNING id`,
      [
        context.tenantId,
        context.companyId,
        context.workspaceId,
        context.walletId,
        context.departmentId,
        context.userId,
        usage.provider || 'openai',
        usage.model || null,
        charge.service,
        usage.operation || 'completion',
        charge.inputTokens,
        charge.outputTokens,
        charge.cachedTokens,
        usage.images || 0,
        usage.audioSeconds || usage.audio_seconds || 0,
        usage.embeddings || 0,
        usage.executionTimeMs || usage.execution_time_ms || null,
        charge.priceBrl,
        creditsToDebit,
        balanceBefore,
        balanceAfter,
        context.requestId,
        context.traceId,
        context.sessionId,
        context.conversationId,
        status,
        context.ip,
        context.userAgent,
        JSON.stringify({
          rate: charge.rate,
          quantidade: charge.quantidade,
          unidade: usage.unidade || 'tokens'
        })
      ]
    );

    if (WALLET_ENABLED && creditsToDebit > 0) {
      await client.query(
        `INSERT INTO nexus_wallet_ledger (
          company_id, entry_type, credits_delta, balance_after, servico, quantidade, unidade, ref_external, meta
        ) VALUES ($1, 'debit_billing_engine', $2, $3, $4, $5, $6, $7, $8)`,
        [
          context.companyId,
          -creditsToDebit,
          balanceAfter,
          charge.service,
          charge.quantidade,
          usage.unidade || 'tokens',
          context.requestId,
          JSON.stringify({ billing_ledger_id: ledgerInsert.rows[0].id, trace_id: context.traceId })
        ]
      );
    }

    await client.query(
      `INSERT INTO token_usage (company_id, user_id, servico, quantidade, unidade, custo_real)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        context.companyId,
        context.userId,
        charge.service,
        charge.quantidade,
        usage.unidade || 'tokens',
        charge.priceBrl
      ]
    );

    await client.query('COMMIT');
    return {
      ok: true,
      ledger_id: ledgerInsert.rows[0].id,
      context,
      balance_before: balanceBefore,
      balance_after: balanceAfter,
      credits_charged: creditsToDebit,
      status
    };
  } catch (e) {
    try {
      await client.query('ROLLBACK');
    } catch (_) {
      /* ignore */
    }
    if (String(e.message || '').includes('idx_billing_ledger_request_id')) {
      return { ok: true, idempotent: true, context };
    }
    console.error('[NEXUS_BILLING_ENGINE][charge]', e.message);
    return { ok: false, code: 'CHARGE_FAILED', message: e.message };
  } finally {
    client.release();
  }
}

/**
 * Crédito de recarga — ledger append-only + actualização de saldo.
 */
async function creditTopUp(input, { credits, amountBrl = 0, gateway = 'stripe', refExternal } = {}) {
  const resolved = await resolveBillingContext({
    ...input,
    requestId: input.requestId || refExternal || `topup-${Date.now()}`
  });
  if (!resolved.ok) return resolved;
  const { context } = resolved;
  const creditAmt = Math.max(0, Number(credits) || 0);
  if (creditAmt <= 0) return { ok: false, code: 'INVALID_CREDITS', message: 'Créditos inválidos' };

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const dup = await client.query(`SELECT id FROM billing_ledger WHERE request_id = $1`, [context.requestId]);
    if (dup.rows[0]) {
      await client.query('ROLLBACK');
      return { ok: true, idempotent: true, ledger_id: dup.rows[0].id, context };
    }

    const lock = await client.query(
      `SELECT company_id, wallet_id, balance_credits FROM nexus_company_wallets
       WHERE company_id = $1 AND wallet_id = $2 FOR UPDATE`,
      [context.companyId, context.walletId]
    );
    const w = lock.rows[0];
    if (!w || String(w.company_id) !== String(context.companyId)) {
      await client.query('ROLLBACK');
      return { ok: false, code: 'WALLET_NOT_FOUND', message: 'Carteira inválida' };
    }

    const balanceBefore = Number(w.balance_credits);
    const balanceAfter = balanceBefore + creditAmt;

    const ledgerInsert = await client.query(
      `INSERT INTO billing_ledger (
        tenant_id, company_id, workspace_id, wallet_id, department_id, user_id,
        provider, model, service, operation,
        input_tokens, output_tokens, cached_tokens, images, audio_seconds, embeddings,
        execution_time_ms, price_brl, credits_charged, balance_before, balance_after,
        request_id, trace_id, status, gateway, meta
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,0,0,0,0,0,0,NULL,$11,$12,$13,$14,$15,$16,'completed',$17,$18
      ) RETURNING id`,
      [
        context.tenantId,
        context.companyId,
        context.workspaceId,
        context.walletId,
        context.departmentId,
        context.userId,
        gateway,
        null,
        'wallet',
        'topup',
        Number(amountBrl) || 0,
        -creditAmt,
        balanceBefore,
        balanceAfter,
        context.requestId,
        context.traceId,
        gateway,
        JSON.stringify({ ref_external: refExternal, credits_added: creditAmt })
      ]
    );

    await client.query(
      `UPDATE nexus_company_wallets SET balance_credits = $3, consumption_paused = false, updated_at = now()
       WHERE company_id = $1 AND wallet_id = $2`,
      [context.companyId, context.walletId, balanceAfter]
    );

    await client.query('COMMIT');
    return {
      ok: true,
      ledger_id: ledgerInsert.rows[0].id,
      context,
      balance_before: balanceBefore,
      balance_after: balanceAfter,
      credits_added: creditAmt
    };
  } catch (e) {
    try {
      await client.query('ROLLBACK');
    } catch (_) {
      /* ignore */
    }
    console.error('[NEXUS_BILLING_ENGINE][creditTopUp]', e.message);
    return { ok: false, code: 'TOPUP_FAILED', message: e.message };
  } finally {
    client.release();
  }
}

async function getCompanyDashboard(companyId, userId) {
  const resolved = await resolveBillingContext({ companyId, userId, requestId: `dash-${Date.now()}` });
  if (!resolved.ok) return resolved;

  const cid = resolved.context.companyId;
  const [wallet, today, month, topUsers, topServices] = await Promise.all([
    db.query(`SELECT * FROM nexus_company_wallets WHERE company_id = $1`, [cid]),
    db.query(
      `SELECT COALESCE(SUM(credits_charged),0)::float AS credits, COALESCE(SUM(price_brl),0)::float AS brl
       FROM billing_ledger WHERE company_id = $1 AND created_at >= date_trunc('day', now())`,
      [cid]
    ),
    db.query(
      `SELECT COALESCE(SUM(credits_charged),0)::float AS credits, COALESCE(SUM(price_brl),0)::float AS brl
       FROM billing_ledger WHERE company_id = $1 AND created_at >= date_trunc('month', now())`,
      [cid]
    ),
    db.query(
      `SELECT user_id, SUM(credits_charged)::float AS credits
       FROM billing_ledger WHERE company_id = $1 AND created_at >= date_trunc('month', now())
       GROUP BY user_id ORDER BY credits DESC LIMIT 10`,
      [cid]
    ),
    db.query(
      `SELECT service, SUM(credits_charged)::float AS credits
       FROM billing_ledger WHERE company_id = $1 AND created_at >= date_trunc('month', now())
       GROUP BY service ORDER BY credits DESC LIMIT 10`,
      [cid]
    )
  ]);

  return {
    ok: true,
    wallet_id: wallet.rows[0]?.wallet_id,
    balance_credits: Number(wallet.rows[0]?.balance_credits || 0),
    consumption_paused: wallet.rows[0]?.consumption_paused === true,
    consumption_today: today.rows[0],
    consumption_month: month.rows[0],
    top_users: topUsers.rows,
    top_services: topServices.rows
  };
}

module.exports = {
  isEnabled,
  authorizeConsumption,
  chargeConsumption,
  creditTopUp,
  getCompanyDashboard,
  resolveBillingContext
};
