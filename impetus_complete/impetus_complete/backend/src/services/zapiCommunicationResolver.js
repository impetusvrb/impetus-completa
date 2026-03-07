/**
 * RESOLVEDOR DE COMUNICAÇÕES Z-API
 * Vincula remetente ao usuário cadastrado, extrai nome, valida whitelist
 */
const db = require('../db');

function normalizePhone(phone) {
  if (!phone || typeof phone !== 'string') return '';
  // Extrair número do JID (5531999999999@c.us) ou formato bruto
  const cleaned = String(phone).replace(/\D/g, '');
  return cleaned.length >= 10 ? cleaned.slice(-11) : cleaned;
}

/**
 * Resolve sender_id e sender_name a partir do payload Z-API
 * @param {string} companyId - UUID da empresa
 * @param {string} rawSender - phone, from ou sender do payload (pode ser JID)
 * @param {object} body - payload completo do webhook
 * @returns {{ sender_id?, sender_name, sender_phone, sender_whatsapp }}
 */
async function resolveSender(companyId, rawSender, body = {}) {
  const senderPhone = normalizePhone(rawSender);
  const senderWhatsapp = String(rawSender || '').trim() || null;

  // Extrair nome do payload (formatos comuns Z-API)
  let senderName = body.message?.senderName
    || body.senderName
    || body.message?.sender
    || body.fromName
    || null;
  if (senderName && typeof senderName !== 'string') senderName = String(senderName);

  let senderId = null;

  // Buscar usuário por whatsapp_number ou phone
  if (senderPhone.length >= 10) {
    const r = await db.query(`
      SELECT id, name
      FROM users
      WHERE company_id = $1 AND active = true AND deleted_at IS NULL
        AND (
          REPLACE(REPLACE(REPLACE(COALESCE(whatsapp_number, ''), ' ', ''), '-', ''), '+', '') LIKE $2
          OR REPLACE(REPLACE(REPLACE(COALESCE(phone, ''), ' ', ''), '-', ''), '+', '') LIKE $2
          OR $3 LIKE '%' || RIGHT(REPLACE(REPLACE(COALESCE(whatsapp_number, ''), ' ', ''), '-', ''), 11)
        )
      LIMIT 1
    `, [companyId, `%${senderPhone.slice(-11)}`, senderPhone]);
    if (r.rows.length > 0) {
      senderId = r.rows[0].id;
      if (!senderName) senderName = r.rows[0].name;
    }

    // Fallback: whatsapp_contacts em companies.config
    if (!senderId) {
      const config = await db.query(`
        SELECT config->'whatsapp_contacts' as contacts FROM companies WHERE id = $1
      `, [companyId]);
      const contacts = config.rows[0]?.contacts || [];
      const match = contacts.find(c => {
        const cp = normalizePhone(c.phone);
        return cp && (cp === senderPhone || cp.endsWith(senderPhone.slice(-11)) || senderPhone.endsWith(cp.slice(-11)));
      });
      if (match) senderName = senderName || match.name;
    }
  }

  return {
    sender_id: senderId,
    sender_name: senderName || senderPhone || 'Contato WhatsApp',
    sender_phone: senderPhone || senderWhatsapp,
    sender_whatsapp: senderWhatsapp || senderPhone
  };
}

/**
 * Verifica se número está autorizado (users ou whatsapp_contacts)
 * Usado quando WHITELIST_STRICT=true
 */
async function isAuthorizedSender(companyId, senderPhone) {
  if (!senderPhone || senderPhone.length < 10) return false;
  const norm = normalizePhone(senderPhone);

  const [user, config] = await Promise.all([
    db.query(`
      SELECT 1 FROM users
      WHERE company_id = $1 AND active = true AND deleted_at IS NULL
        AND (REPLACE(REPLACE(COALESCE(whatsapp_number,''), ' ', ''), '-', '') LIKE $2
             OR REPLACE(REPLACE(COALESCE(phone,''), ' ', ''), '-', '') LIKE $2)
      LIMIT 1
    `, [companyId, `%${norm.slice(-11)}`]),
    db.query(`SELECT config->'whatsapp_contacts' as contacts FROM companies WHERE id = $1`, [companyId])
  ]);

  if (user.rows.length > 0) return true;
  const contacts = config.rows[0]?.contacts || [];
  return contacts.some(c => {
    const cp = normalizePhone(c.phone);
    return cp && (cp === norm || cp.endsWith(norm.slice(-11)));
  });
}

/**
 * Registra primeiro contato. Retorna isFirst=true apenas na primeira vez que o número contacta.
 */
async function recordFirstContactIfNeeded(companyId, senderPhone) {
  const norm = normalizePhone(senderPhone);
  if (norm.length < 10) return { isFirst: false };

  try {
    const existing = await db.query(
      'SELECT 1 FROM whatsapp_first_contact WHERE company_id = $1 AND phone_normalized = $2',
      [companyId, norm]
    );
    if (existing.rows.length > 0) return { isFirst: false };

    await db.query(`
      INSERT INTO whatsapp_first_contact (company_id, phone_normalized, notice_version)
      VALUES ($1, $2, '1.0')
      ON CONFLICT (company_id, phone_normalized) DO NOTHING
    `, [companyId, norm]);
    return { isFirst: true };
  } catch (err) {
    if (err.code === '23505') return { isFirst: false };
    console.warn('[ZAPI_RESOLVER] recordFirstContact:', err.message);
    return { isFirst: false };
  }
}

module.exports = {
  resolveSender,
  isAuthorizedSender,
  recordFirstContactIfNeeded,
  normalizePhone
};
