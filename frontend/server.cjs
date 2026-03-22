/**
 * Servidor estático opcional na porta 3000 (express.static).
 * Uso: npm run serve:static
 *
 * O fluxo principal do frontend é `npm run dev` (Vite), que também usa a
 * porta 3000 por padrão e serve public/* na raiz.
 *
 * Fonte canônica do avatar: public/avatar-impetus.html (+ .mp4 no mesmo public/).
 */

const express = require('express');
const path = require('path');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const publicDir = path.join(__dirname, 'public');

app.use((req, res, next) => {
  if (req.path.endsWith('.html')) {
    res.setHeader('Cache-Control', 'no-store');
  }
  next();
});

app.use(express.static(publicDir));

app.listen(PORT, () => {
  console.log(`[static] ${publicDir}`);
  console.log(`[static] http://localhost:${PORT}/avatar-impetus.html`);
});
