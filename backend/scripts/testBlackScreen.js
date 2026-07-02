const jwt = require('jsonwebtoken');
const { chromium } = require('/tmp/node_modules/playwright');
const { JWT_SECRET, JWT_ALGORITHMS } = require('../src/middleware/auth');
const db = require('../src/db');

(async () => {
  const email = process.argv[2] || 'marcos.almeida@empresa.com.br';
  const path = process.argv[3] || '/app';

  const r = await db.query(
    `SELECT u.*, cr.name as company_role_name FROM users u
     LEFT JOIN company_roles cr ON cr.id=u.company_role_id
     WHERE u.email=$1 LIMIT 1`,
    [email]
  );
  const u = r.rows[0];
  if (!u) throw new Error('user not found: ' + email);

  const token = jwt.sign(
    { id: u.id, email: u.email, name: u.name, role: u.role, company_id: u.company_id },
    JWT_SECRET,
    { expiresIn: '8h', algorithm: (JWT_ALGORITHMS && JWT_ALGORITHMS[0]) || 'HS256' }
  );
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 8);
  await db.query(
    'INSERT INTO sessions (user_id, token, expires_at) VALUES ($1, $2, $3)',
    [u.id, token, expiresAt]
  );
  const userPayload = {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    company_id: u.company_id,
    dashboard_profile: u.dashboard_profile,
    functional_area: u.functional_area,
    job_title: u.job_title,
    company_role_id: u.company_role_id,
    company_role_name: u.company_role_name
  };

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const errors = [];
  const failed = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => {
    errors.push('PAGEERROR: ' + err.message);
  });
  page.on('requestfailed', (req) => {
    failed.push(req.url() + ' :: ' + (req.failure() && req.failure().errorText));
  });

  await page.goto('http://127.0.0.1:3000/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(({ token, user }) => {
    localStorage.setItem('impetus_token', token);
    localStorage.setItem('impetus_user', JSON.stringify(user));
  }, { token, user: userPayload });

  try {
    await page.goto('http://127.0.0.1:3000' + path, { waitUntil: 'networkidle', timeout: 45000 });
  } catch (e) {
    errors.push('NAV: ' + e.message);
  }
  await page.waitForTimeout(5000);

  const state = await page.evaluate(() => {
    const root = document.getElementById('root');
    return {
      childCount: root ? root.childElementCount : 0,
      textLen: (root && root.innerText ? root.innerText : '').trim().length,
      sample: (root && root.innerText ? root.innerText : '').trim().slice(0, 500),
      hasSidebar: !!document.querySelector('.sidebar'),
      hasContent: !!document.querySelector('.content'),
      hasLoader: !!document.querySelector('.page-loader'),
      hasErrorBoundary: !!document.querySelector('.error-boundary'),
      path: location.pathname
    };
  });

  console.log(JSON.stringify({ path, email, state, errors, failed: failed.slice(0, 20) }, null, 2));
  await browser.close();
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
