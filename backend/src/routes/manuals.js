const express = require('express');
const multer = require('multer');
const router = express.Router();
const db = require('../db');
const manualsService = require('../services/manuals');
const upload = multer({ dest: '/tmp/uploads' });

router.post('/upload', upload.single('file'), async (req, res) => {
  try{
    const { originalname, path } = req.file;
    const { title } = req.body;
    const text = await manualsService.extractTextFromFile(path);
    const r = await db.query('INSERT INTO manuals(title, filename, content_text) VALUES($1,$2,$3) RETURNING id', [title||originalname, originalname, text]);
    const manualId = r.rows[0].id;
    await manualsService.chunkAndEmbedManual(manualId, text);
    res.json({ ok:true, manualId });
  }catch(err){ console.error(err); res.status(500).json({ ok:false, error: err.message }); }
});

module.exports = router;
