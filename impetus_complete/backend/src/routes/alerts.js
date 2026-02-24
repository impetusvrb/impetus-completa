const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', async (req,res)=>{
  const r = await db.query('SELECT * FROM alerts ORDER BY created_at DESC LIMIT 200');
  res.json({ ok:true, alerts: r.rows });
});

module.exports = router;
