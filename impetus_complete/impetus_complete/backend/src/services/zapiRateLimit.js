/**
 * Rate limit para Z-API - 20 msg/min por instância
 * Delay aleatório 2-5s para respostas automáticas
 */

const RATE_LIMIT_MSGS_PER_MIN = 20;
const rateLimitMap = new Map();

function checkRateLimit(instanceId) {
  const key = `zapi_${instanceId}`;
  const now = Date.now();
  const windowStart = now - 60000;
  let entries = rateLimitMap.get(key) || [];
  entries = entries.filter(t => t > windowStart);
  if (entries.length >= RATE_LIMIT_MSGS_PER_MIN) return false;
  entries.push(now);
  rateLimitMap.set(key, entries);
  return true;
}

function getRandomDelayMs() {
  return 2000 + Math.floor(Math.random() * 3000);
}

module.exports = { checkRateLimit, getRandomDelayMs, RATE_LIMIT_MSGS_PER_MIN };
