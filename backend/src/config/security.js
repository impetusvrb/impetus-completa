/**
 * Origens CORS / CSP — variável ALLOWED_ORIGINS (lista separada por vírgulas).
 */
function parseAllowedOrigins() {
  const raw = process.env.ALLOWED_ORIGINS || '';
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Origens extra para diretivas CSP (script-src / connect-src), ex.: CDN do frontend. */
function parseCspExtraConnect() {
  const raw = process.env.CSP_CONNECT_SRC_EXTRA || '';
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function buildCorsOptions() {
  const allowed = parseAllowedOrigins();
  const isProd = process.env.NODE_ENV === 'production';

  return {
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
      'X-Webhook-Secret',
      'X-Impetus-Webhook-Secret',
      'X-Hub-Signature-256',
      'X-Integration-Token'
    ],
    exposedHeaders: [
      'Content-Type',
      'X-TTS-Engine',
      'X-TTS-Voice-Google',
      'X-TTS-Template',
      'Cache-Control'
    ],
    origin(origin, cb) {
      if (!origin) return cb(null, true);
      if (allowed.length === 0) {
        if (isProd) {
          console.warn(
            '[CORS] ALLOWED_ORIGINS não definido em produção — pedidos com Origin serão recusados.'
          );
          return cb(null, false);
        }
        return cb(null, true);
      }
      if (allowed.includes(origin)) return cb(null, true);
      return cb(null, false);
    }
  };
}

function buildHelmetOptions() {
  const allowed = parseAllowedOrigins();
  const extraConnect = parseCspExtraConnect();
  /* unsafe-inline: SPAs (Vite/React) e respostas HTML com bootstrap; reduz superfície combinando com demais diretivas. */
  const scriptSrc = ["'self'", "'unsafe-inline'"];
  const connectSrc = [
    "'self'",
    'https://api.openai.com',
    'https://*.openai.com',
    'https://api.anthropic.com',
    'https://*.anthropic.com',
    'wss:',
    'https:',
    ...extraConnect
  ];
  for (const o of allowed) {
    try {
      const u = new URL(o);
      if (u.origin && u.origin !== 'null') {
        scriptSrc.push(u.origin);
        connectSrc.push(u.origin);
      }
    } catch {
      /* ignore */
    }
  }

  return {
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc,
        styleSrc: ["'self'", "'unsafe-inline'"],
        connectSrc,
        imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
        fontSrc: ["'self'", 'https:', 'data:'],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"]
      }
    },
    crossOriginEmbedderPolicy: false
  };
}

module.exports = {
  parseAllowedOrigins,
  parseCspExtraConnect,
  buildCorsOptions,
  buildHelmetOptions
};
