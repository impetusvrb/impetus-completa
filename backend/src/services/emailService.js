/**
 * SERVIÇO DE EMAIL
 * Envio de emails para ativação comercial (fallback para log quando SMTP não configurado)
 */

const crypto = require('crypto');

/** SHA-256 hex para correlacionar eventos sem expor PII em logs. */
function safeHash(value) {
  return crypto.createHash('sha256').update(String(value ?? '')).digest('hex');
}

/** Domínio do destinatário (sem local-part). */
function emailRecipientDomain(to) {
  const s = String(to || '').trim();
  const i = s.indexOf('@');
  return i > 0 && i < s.length - 1 ? s.slice(i + 1) : null;
}

function generateSecurePassword(length = 12) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let result = '';
  const bytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    result += chars[bytes[i] % chars.length];
  }
  return result + '1aA';
}

async function sendActivationEmail(opts) {
  const {
    to,
    contactName,
    login,
    temporaryPassword,
    appUrl,
    companyName
  } = opts;

  const baseUrl = (process.env.FRONTEND_URL || process.env.BASE_URL || 'https://app.impetus.com.br').replace(/\/$/, '');
  const link = `${baseUrl}/`;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Bem-vindo ao IMPETUS</title></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #2563eb;">Bem-vindo ao IMPETUS Comunica IA</h2>
    <p>Olá, ${contactName || 'Cliente'}!</p>
    <p>Sua conta foi ativada. Utilize as credenciais abaixo para acessar a plataforma:</p>
    <div style="background: #f1f5f9; padding: 16px; border-radius: 8px; margin: 20px 0;">
      <p><strong>Login:</strong> ${login}</p>
      <p><strong>Senha temporária:</strong> ${temporaryPassword}</p>
      <p style="color: #dc2626; font-size: 0.9em;">⏱ Esta senha expira em 24 horas. Você será solicitado a alterá-la no primeiro acesso.</p>
    </div>
    <p><a href="${link}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Acessar plataforma</a></p>
    <p>Após o primeiro login, conclua o cadastro da sua empresa.</p>
    <p style="color: #64748b; font-size: 0.85em; margin-top: 30px;">Este é um email automático. Em caso de dúvidas, entre em contato com a equipe comercial.</p>
  </div>
</body>
</html>`;

  const text = `Bem-vindo ao IMPETUS!\n\nLogin: ${login}\nSenha temporária: ${temporaryPassword}\n\nLink: ${link}\n\nA senha expira em 24h. Altere no primeiro acesso.`;

  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    try {
      const nodemailer = require('nodemailer');
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS || process.env.SMTP_PASSWORD
        }
      });
      await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to,
        subject: `[IMPETUS] Acesso ativado - ${companyName || 'Plataforma'}`,
        text,
        html
      });
      return { sent: true };
    } catch (err) {
      console.error('[EMAIL_SEND_ERROR]', err.message);
      console.warn('[EMAIL_FALLBACK]', {
        to_domain: emailRecipientDomain(to),
        user_hash: safeHash(login || to || 'unknown'),
        reason: err.message || 'send_failed'
      });
      return { sent: false, fallback: true };
    }
  }

  console.warn('[EMAIL_NOT_CONFIGURED]', {
    to_domain: emailRecipientDomain(to),
    user_hash: safeHash(login || to || 'unknown'),
    reason: 'smtp_not_configured'
  });
  return { sent: false, fallback: true };
}

/**
 * Envia email de notificação de inadimplência (Dia 3 do bloqueio progressivo)
 */
async function sendOverdueNotificationEmail(opts) {
  const { to, companyName, daysOverdue = 3, gracePeriodDays = 10, dueDate } = opts;

  const baseUrl = (process.env.FRONTEND_URL || process.env.BASE_URL || 'https://app.impetus.com.br').replace(/\/$/, '');
  const daysLeft = Math.max(0, gracePeriodDays - daysOverdue);

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Assinatura em Atraso - IMPETUS</title></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #dc2626;">⚠️ Assinatura em Atraso</h2>
    <p>Olá!</p>
    <p>A assinatura do <strong>${companyName || 'sua empresa'}</strong> no Impetus Comunica IA está em atraso há <strong>${daysOverdue} dias</strong>.</p>
    <p>Seu histórico e dados estão preservados. Você tem <strong>${daysLeft} dias</strong> para regularizar antes do bloqueio total do acesso.</p>
    <p>Após a confirmação do pagamento, o acesso será liberado automaticamente.</p>
    <p><a href="${baseUrl}/subscription-expired" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Ver detalhes e contato</a></p>
    <p style="color: #64748b; font-size: 0.85em; margin-top: 30px;">Entre em contato com nosso financeiro para regularizar ou tirar dúvidas.</p>
  </div>
</body>
</html>`;

  const text = `Assinatura em atraso - ${companyName}\n\nSua assinatura está em atraso há ${daysOverdue} dias. Você tem ${daysLeft} dias para regularizar.\n\nAcesse: ${baseUrl}/subscription-expired`;

  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    try {
      const nodemailer = require('nodemailer');
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS || process.env.SMTP_PASSWORD }
      });
      await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to,
        subject: `[IMPETUS] Assinatura em atraso - ${companyName || 'Regularize seu pagamento'}`,
        text,
        html
      });
      return true;
    } catch (err) {
      console.error('[OVERDUE_EMAIL_ERROR]', err.message);
      return false;
    }
  }
  return false;
}


async function sendPasswordResetEmail({ to, name, resetUrl }) {
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Redefinir Senha - IMPETUS</title></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #2563eb;">Redefinição de Senha</h2>
    <p>Olá, ${name || 'usuário'}!</p>
    <p>Recebemos uma solicitação para redefinir sua senha. Clique no botão abaixo:</p>
    <p style="margin: 30px 0;">
      <a href="${resetUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-size: 16px;">Redefinir minha senha</a>
    </p>
    <p style="color: #dc2626;">⏱ Este link expira em 1 hora.</p>
    <p>Se você não solicitou isso, ignore este email — sua senha permanece a mesma.</p>
    <p style="font-size: 0.85em; color: #64748b; margin-top: 20px;">Ou copie este link: ${resetUrl}</p>
  </div>
</body>
</html>`;

  const text = `Redefinição de senha\n\nAcesse: ${resetUrl}\n\nEste link expira em 1 hora.`;

  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    try {
      const nodemailer = require('nodemailer');
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS || process.env.SMTP_PASSWORD }
      });
      await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to,
        subject: '[IMPETUS] Redefinição de senha',
        text,
        html
      });
      return { sent: true };
    } catch (err) {
      console.error('[RESET_EMAIL_ERROR]', err.message);
      return { sent: false };
    }
  }
  console.warn('[RESET_EMAIL_NO_SMTP]', {
    to_domain: emailRecipientDomain(to),
    user_hash: safeHash(to || 'unknown'),
    reason: 'smtp_not_configured'
  });
  return { sent: false, resetUrl };
}

/**
 * Primeiro acesso do administrador da empresa (painel master criou o tenant).
 * Sem senha em texto — só link com token (tabela password_reset_tokens).
 */
async function sendTenantAdminActivationEmail({
  to,
  name,
  companyName,
  activateUrl,
  validHours = 24
}) {
  const h = validHours || 24;
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Acesso inicial - IMPETUS</title></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #2563eb;">Seu acesso inicial ao IMPETUS</h2>
    <p>Olá, ${name || 'Administrador(a)'}!</p>
    <p>A empresa <strong>${companyName || 'sua organização'}</strong> foi cadastrada na plataforma IMPETUS.</p>
    <p>Você foi definido(a) como <strong>administrador</strong> da conta nesta plataforma. Utilize o mesmo e-mail abaixo para entrar após criar sua senha:</p>
    <div style="background: #f1f5f9; padding: 14px 16px; border-radius: 8px; margin: 16px 0;">
      <p style="margin:0;"><strong>E-mail de acesso:</strong> ${to}</p>
    </div>
    <p>Clique no botão para <strong>criar sua senha</strong> (não compartilhe este link):</p>
    <p style="margin: 28px 0;">
      <a href="${activateUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-size: 16px;">Criar minha senha</a>
    </p>
    <p style="color: #dc2626;">⏱ Este link expira em <strong>${h} horas</strong>.</p>
    <p>Depois de definir a senha, faça login na plataforma e poderá cadastrar os demais utilizadores da empresa.</p>
    <p style="font-size: 0.85em; color: #64748b; margin-top: 24px;">Se você não reconhece este cadastro, ignore este e-mail.</p>
  </div>
</body>
</html>`;

  const text = `IMPETUS — Acesso inicial\n\nEmpresa: ${companyName}\nE-mail de login: ${to}\n\nCrie sua senha (válido ${h}h): ${activateUrl}\n`;

  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    try {
      const nodemailer = require('nodemailer');
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_SECURE === 'true',
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS || process.env.SMTP_PASSWORD }
      });
      await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to,
        subject: `[IMPETUS] Acesso inicial — ${companyName || 'sua empresa'}`,
        text,
        html
      });
      return { sent: true };
    } catch (err) {
      console.error('[TENANT_ACTIVATION_EMAIL_ERROR]', err.message);
      return { sent: false };
    }
  }
  console.warn('[TENANT_ACTIVATION_NO_SMTP]', {
    to_domain: emailRecipientDomain(to),
    user_hash: safeHash(to || 'unknown'),
    reason: 'smtp_not_configured'
  });
  return { sent: false };
}

module.exports = {
  generateSecurePassword,
  sendActivationEmail,
  sendOverdueNotificationEmail,
  sendPasswordResetEmail,
  sendTenantAdminActivationEmail
};
