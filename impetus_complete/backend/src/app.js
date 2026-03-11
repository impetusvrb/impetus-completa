
app.get('/api/companies/me', requireAuth, requireCompanyActive, async (req, res) => {
  try {
    if (!req.user?.company_id) return res.status(404).json({ ok: false, error: 'Empresa não encontrada' });
    const r = await db.query('SELECT id, name, cnpj, plan_type, active, subscription_tier, subscription_status, created_at FROM companies WHERE id = $1', [req.user.company_id]);
    if (r.rows.length === 0) return res.status(404).json({ ok: false, error: 'Empresa não encontrada' });
    res.json({ ok: true, company: r.rows[0] });
  } catch (err) {
    res.status(500).json({ ok: false, error: 'Erro ao buscar empresa' });
  }
});

app.use('/api/lgpd', ...protected, lgpd);
app.use('/api/communications', ...protected, communications);
app.use('/api/app-communications', ...protected, require('./routes/appCommunications'));
app.use('/api/internal-chat', ...protected, internalChat);
app.use('/api/dashboard', ...protected, dashboard);
app.use('/api/manuals', ...protected, manuals);
app.use('/api/tasks', ...protected, tasks);
app.use('/api/proacao', ...protected, proacao);
app.use('/api/alerts', ...protected, proacaoAlerts);
app.use('/api/plc-alerts', ...protected, plcAlerts);
app.use('/api/diagnostic', ...protected, diagnostic);
app.use('/api/diagnostic/report', ...protected, diagReport);
app.use('/api/tpm', ...protected, tpm);

// Rotas de administração
app.use('/api/admin/users', ...protected, adminUsers);
app.use('/api/admin/departments', ...protected, adminDepartments);
app.use('/api/admin/logs', ...protected, adminLogs);
app.use('/api/admin/settings', ...protected, adminSettings);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    ok: false,
    error: 'Endpoint não encontrado',
    path: req.path
  });
});

// Error Handler padronizado
const { errorHandler } = require('./utils/errors');
app.use(errorHandler);

module.exports = app;
