/**
 * SERVIÇO DE EMAIL
 * Envio de emails para ativação comercial (fallback para log quando SMTP não configurado)
 */

const crypto = require('crypto');

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
      console.log('[EMAIL_FALLBACK] Dados para envio manual:', { to, login, temporaryPassword, link });
      return { sent: false, fallback: true };
    }
  }

  console.log('[EMAIL_NOT_CONFIGURED] Envio manual necessário:', { to, login, temporaryPassword, link });
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

module.exports = {
  generateSecurePassword,
  sendActivationEmail,
  sendOverdueNotificationEmail
};
