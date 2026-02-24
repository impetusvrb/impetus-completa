/**
 * SERVIÇO ASAAS
 * Integração com API Asaas para assinaturas recorrentes B2B
 * Criar cliente, assinatura e processar webhooks
 */

const db = require('../db');
const { createResilientClient } = require('../utils/httpClient');
const { logAction } = require('../middleware/audit');

const ASAAS_API = process.env.ASAAS_ENV === 'production'
  ? 'https://api.asaas.com/v3'
  : 'https://api-sandbox.asaas.com/v3';

const ASAAS_API_KEY = process.env.ASAAS_API_KEY;
const ASAAS_WEBHOOK_TOKEN = process.env.ASAAS_WEBHOOK_TOKEN || '';

// IPs oficiais Asaas (produção e sandbox) - validar origem do webhook
const ASAAS_IPS = [
  '177.93.230.0/24',
  '177.93.231.0/24',
  '177.93.232.0/24'
];

const http = createResilientClient();
const TIMEOUT_MS = 15000;

function getHeaders() {
  return {
    'Content-Type': 'application/json',
    'User-Agent': 'Impetus-Comunica-IA/1.0',
    'access_token': ASAAS_API_KEY
  };
}

/**
 * Valida token do webhook Asaas
 */
function validateWebhookToken(req) {
  const token = req.headers['asaas-access-token'] || req.headers['access-token'] || '';
  if (!ASAAS_WEBHOOK_TOKEN) return true; // Se não configurado, aceita (dev)
  return token === ASAAS_WEBHOOK_TOKEN && token.length > 0;
}

/**
 * Valida IP de origem (simplificado - em produção usar lista completa)
 */
function isAllowedWebhookIp(ip) {
  if (!ASAAS_WEBHOOK_TOKEN) return true;
  if (!ip) return false;
  return ip.startsWith('177.93.') || ip === '127.0.0.1' || ip === '::1';
}

/**
 * Cria cliente no Asaas
 */
async function createCustomer(company) {
  if (!ASAAS_API_KEY) throw new Error('ASAAS_API_KEY não configurada');

  const payload = {
    name: company.name,
    cpfCnpj: (company.cnpj || '').replace(/\D/g, '') || undefined,
    email: company.data_controller_email || company.config?.billing_email,
    phone: (company.data_controller_phone || '').replace(/\D/g, ''),
    mobilePhone: (company.data_controller_phone || '').replace(/\D/g, ''),
    address: company.address,
    addressNumber: company.config?.address_number || 'S/N',
    complement: company.config?.address_complement,
    province: company.city,
    city: company.city,
    state: company.state,
    postalCode: (company.config?.postal_code || '').replace(/\D/g, ''),
    externalReference: company.id
  };

  const res = await http.post(`${ASAAS_API}/customers`, payload, {
    headers: getHeaders(),
    timeout: TIMEOUT_MS
  });

  return res.data;
}

/**
 * Cria assinatura recorrente mensal no Asaas
 */
async function createSubscription(asaasCustomerId, planType, value, companyId) {
  if (!ASAAS_API_KEY) throw new Error('ASAAS_API_KEY não configurada');

  const nextDue = new Date();
  nextDue.setDate(1);
  if (nextDue <= new Date()) nextDue.setMonth(nextDue.getMonth() + 1);

  const payload = {
    customer: asaasCustomerId,
    billingType: 'BOLETO',
    nextDueDate: nextDue.toISOString().split('T')[0],
    value: value || getPlanValue(planType),
    cycle: 'MONTHLY',
    description: `Impetus Comunica IA - Plano ${planType}`,
    externalReference: companyId
  };

  const res = await http.post(`${ASAAS_API}/subscriptions`, payload, {
    headers: getHeaders(),
    timeout: TIMEOUT_MS
  });

  return res.data;
}

function getPlanValue(planType) {
  const values = {
    essencial: 199,
    profissional: 399,
    estratégico: 799,
    enterprise: 1499
  };
  return values[planType] || values.profissional;
}

/**
 * Ativa assinatura comercial - cria cliente + assinatura no Asaas
 */
async function activateCompanySubscription(companyId, planType = 'profissional') {
  const companyRes = await db.query(`
    SELECT id, name, cnpj, address, city, state,
           data_controller_email, data_controller_phone, config
    FROM companies WHERE id = $1
  `, [companyId]);

  if (companyRes.rows.length === 0) throw new Error('Empresa não encontrada');

  const company = companyRes.rows[0];

  const customer = await createCustomer(company);
  const subscription = await createSubscription(customer.id, planType, null, companyId);

  await db.query(`
    INSERT INTO subscriptions (
      company_id, asaas_customer_id, asaas_subscription_id,
      plan_type, status, next_due_date, grace_period_days
    ) VALUES ($1, $2, $3, $4, 'pending', $5, 10)
    ON CONFLICT (company_id) DO UPDATE SET
      asaas_customer_id = EXCLUDED.asaas_customer_id,
      asaas_subscription_id = EXCLUDED.asaas_subscription_id,
      plan_type = EXCLUDED.plan_type,
      status = 'pending',
      next_due_date = EXCLUDED.next_due_date,
      updated_at = now()
  `, [
    companyId,
    customer.id,
    subscription.id,
    planType,
    subscription.nextDueDate || new Date().toISOString().split('T')[0]
  ]);

  await db.query(`
    UPDATE companies
    SET subscription_status = 'pending', plan_type = $1, active = false, updated_at = now()
    WHERE id = $2
  `, [planType, companyId]);

  return { customer, subscription };
}

/**
 * Processa evento PAYMENT_CONFIRMED
 */
async function handlePaymentConfirmed(payment, subscription) {
  const subIdRef = subscription?.id || payment.subscription;
  const customerRef = payment.customer || subscription?.customer;
  const sub = await db.query(`
    SELECT s.id, s.company_id, s.status
    FROM subscriptions s
    WHERE s.asaas_subscription_id = $1 OR s.asaas_customer_id = $2
  `, [subIdRef, customerRef]);

  if (sub.rows.length === 0) return;

  const { id: subId, company_id } = sub.rows[0];

  await db.query(`
    UPDATE subscriptions
    SET status = 'active', next_due_date = $1, overdue_since_date = NULL, updated_at = now()
    WHERE id = $2
  `, [payment.dueDate || payment.due_date, subId]);

  await db.query(`
    UPDATE companies
    SET active = true, subscription_status = 'active', updated_at = now()
    WHERE id = $1
  `, [company_id]);

  await logAction({
    companyId: company_id,
    action: 'subscription_payment_confirmed',
    entityType: 'subscription',
    entityId: subId,
    description: 'Pagamento confirmado - assinatura ativada',
    changes: { paymentId: payment.id },
    severity: 'info'
  }).catch(() => {});
}

/**
 * Processa evento PAYMENT_OVERDUE
 */
async function handlePaymentOverdue(payment, subscription) {
  const subIdRef = subscription?.id || payment.subscription;
  const customerRef = payment.customer || subscription?.customer;
  const sub = await db.query(`
    SELECT s.id, s.company_id, s.grace_period_days
    FROM subscriptions s
    WHERE s.asaas_subscription_id = $1 OR s.asaas_customer_id = $2
  `, [subIdRef, customerRef]);

  if (sub.rows.length === 0) return;

  const { id: subId, company_id, grace_period_days } = sub.rows[0];
  const overdueSince = payment.dueDate || payment.due_date || new Date().toISOString().split('T')[0];

  await db.query(`
    UPDATE subscriptions
    SET status = 'overdue', overdue_since_date = $1, updated_at = now()
    WHERE id = $2
  `, [overdueSince, subId]);

  await db.query(`
    UPDATE companies SET subscription_status = 'overdue', updated_at = now() WHERE id = $1
  `, [company_id]);

  await logAction({
    companyId: company_id,
    action: 'subscription_payment_overdue',
    entityType: 'subscription',
    entityId: subId,
    description: 'Pagamento em atraso - início do período de carência',
    changes: { paymentId: payment.id, gracePeriodDays: grace_period_days },
    severity: 'warning'
  }).catch(() => {});
}

/**
 * Processa evento PAYMENT_RECEIVED (regularização)
 */
async function handlePaymentReceived(payment, subscription) {
  await handlePaymentConfirmed(payment, subscription);
}

/**
 * Processa evento SUBSCRIPTION_CANCELED
 */
async function handleSubscriptionCanceled(subscription) {
  const sub = await db.query(`
    SELECT id, company_id FROM subscriptions WHERE asaas_subscription_id = $1
  `, [subscription?.id]);

  if (sub.rows.length === 0) return;

  const { id: subId, company_id } = sub.rows[0];

  await db.query(`
    UPDATE subscriptions SET status = 'canceled', updated_at = now() WHERE id = $1
  `, [subId]);

  await db.query(`
    UPDATE companies SET subscription_status = 'canceled', active = false, updated_at = now() WHERE id = $1
  `, [company_id]);
}

/**
 * Retorna URL de pagamento (boleto/assinatura) para empresa com assinatura em atraso
 * Usado na página de assinatura expirada para permitir regularização
 */
async function getSubscriptionPaymentLink(companyId) {
  if (!ASAAS_API_KEY) return null;

  const subRes = await db.query(`
    SELECT asaas_subscription_id FROM subscriptions
    WHERE company_id = $1 AND asaas_subscription_id IS NOT NULL
      AND status IN ('pending', 'overdue', 'suspended')
    LIMIT 1
  `, [companyId]);

  if (subRes.rows.length === 0) return null;

  const asaasSubId = subRes.rows[0].asaas_subscription_id;
  try {
    const res = await http.get(
      `${ASAAS_API}/subscriptions/${asaasSubId}/payments`,
      { headers: getHeaders(), timeout: TIMEOUT_MS }
    );
    const payments = res.data?.data || res.data || [];
    const list = Array.isArray(payments) ? payments : [];
    const unpaid = list.find(p => p && ['PENDING', 'OVERDUE'].includes(String(p.status)));
    if (!unpaid?.id) return null;

    const payRes = await http.get(`${ASAAS_API}/payments/${unpaid.id}`, {
      headers: getHeaders(),
      timeout: TIMEOUT_MS
    });
    return payRes.data?.invoiceUrl || payRes.data?.bankSlipUrl || null;
  } catch (err) {
    console.warn('[ASAAS_GET_PAYMENT_LINK]', err.message);
    return null;
  }
}

/**
 * Verifica se grace period expirou e aplica bloqueio
 */
async function checkGracePeriodAndSuspend() {
  const result = await db.query(`
    SELECT s.id, s.company_id, s.overdue_since_date, s.grace_period_days
    FROM subscriptions s
    WHERE s.status = 'overdue'
      AND s.overdue_since_date IS NOT NULL
      AND s.overdue_since_date + (s.grace_period_days || ' days')::interval < now()
  `);

  for (const row of result.rows) {
    await db.query(`
      UPDATE subscriptions SET status = 'suspended', updated_at = now() WHERE id = $1
    `, [row.id]);

    await db.query(`
      UPDATE companies SET active = false, subscription_status = 'suspended', updated_at = now() WHERE id = $1
    `, [row.company_id]);

    await logAction({
      companyId: row.company_id,
      action: 'subscription_suspended',
      entityType: 'subscription',
      entityId: row.id,
      description: 'Assinatura suspensa - período de carência excedido',
      severity: 'critical'
    }).catch(() => {});
  }
}

module.exports = {
  createCustomer,
  createSubscription,
  activateCompanySubscription,
  handlePaymentConfirmed,
  handlePaymentOverdue,
  handlePaymentReceived,
  handleSubscriptionCanceled,
  checkGracePeriodAndSuspend,
  getSubscriptionPaymentLink,
  validateWebhookToken,
  isAllowedWebhookIp,
  getPlanValue
};
