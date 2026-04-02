const express = require('express');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { requireAuth } = require('../middleware/auth');
const chatService = require('../services/chatService');

const router = express.Router();
router.use(requireAuth);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, path.join(__dirname, '../../../../uploads/chat')),
  filename: (_req, file, cb) => cb(null, `avatar-${uuidv4()}${path.extname(file.originalname || '.jpg')}`)
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = /image\/(jpeg|jpg|png)/i.test(file.mimetype || '');
    cb(ok ? null : new Error('Formato inválido. Use JPG ou PNG.'), ok);
  }
});

// Endpoint solicitado: PUT /api/usuarios/foto
router.put('/foto', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ ok: false, error: 'Arquivo obrigatório' });
    const fotoUrl = `/uploads/chat/${req.file.filename}`;
    const user = await chatService.updateUserProfilePhoto(req.user.id, fotoUrl);
    const io = req.app.get('io');
    if (io) io.to(`company:${req.user.company_id}`).emit('user_profile_updated', { userId: req.user.id, avatar_url: fotoUrl });
    res.json({ ok: true, foto_perfil: fotoUrl, avatar_url: fotoUrl, user });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message || 'Erro ao salvar foto' });
  }
});

module.exports = router;
