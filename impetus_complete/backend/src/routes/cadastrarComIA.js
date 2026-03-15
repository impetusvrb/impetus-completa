/**
 * CADASTRAR COM IA
 * Módulo para cadastro de informações do setor usando IA
 * Aceita: texto, imagens, documentos, áudio (transcrito)
 * Usa Gemini para imagens, Claude/ChatGPT para texto
 */
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { requireAuth } = require('../middleware/auth');
const db = require('../db');
const geminiService = require('../services/geminiService');
const mediaProcessor = require('../services/mediaProcessorService');
const ai = require('../services/ai');

const UPLOAD_DIR = path.join(__dirname, '../../../../uploads/cadastrar-ia');
const MAX_FILE_MB = 15;
const ALLOWED_EXT = ['.pdf', '.doc', '.docx', '.png', '.jpg', '.jpeg', '.mp3', '.m4a', '.wav'];

function ensureDir() {
  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    ensureDir();
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => cb(null, uuidv4() + path.extname(file.originalname || ''))
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_MB * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = (path.extname(file.originalname || '') || '').toLowerCase();
    cb(null, ALLOWED_EXT.includes(ext));
  }
});

async function extractPdfText(filePath) {
  try {
    const pdfParse = require('pdf-parse');
    const buf = fs.readFileSync(filePath);
    const data = await pdfParse(buf);
    return (data.text || '').slice(0, 15000);
  } catch {
    return null;
  }
}

async function extractDocText(filePath) {
  try {
    const mammoth = require('mammoth');
    const result = await mammoth.extractRawText({ path: filePath });
    return (result.value || '').slice(0, 15000);
  } catch {
    return null;
  }
}

/**
 * POST /api/cadastrar-com-ia
 * Cadastra informação via texto, imagem ou arquivo
 */
router.post('/', requireAuth, upload.single('file'), async (req, res) => {
  try {
    const companyId = req.user?.company_id;
    const userId = req.user?.id;
    if (!companyId) return res.status(400).json({ ok: false, error: 'Empresa não definida' });

    const { texto, sector, equipamento } = req.body;
    let categoria = 'outro';
    let dadosExtraidos = {};
    let resumo = '';
    let conteudoOriginal = texto || '';
    let sourceType = 'texto';
    let filePath = null;

    if (req.file) {
      filePath = path.join(UPLOAD_DIR, req.file.filename);
      const ext = path.extname(req.file.originalname || '').toLowerCase();

      if (['.png', '.jpg', '.jpeg'].includes(ext) && geminiService.isAvailable()) {
        sourceType = 'imagem';
        const buf = fs.readFileSync(filePath);
        const b64 = buf.toString('base64');
        const result = await geminiService.extractStructuredFromImage(
          `data:image/jpeg;base64,${b64}`,
          texto
        );
        if (result) {
          categoria = result.category || 'outro';
          dadosExtraidos = result.extracted_data || {};
          resumo = result.summary || '';
        }
      } else if (['.mp3', '.m4a', '.wav'].includes(ext)) {
        sourceType = 'audio';
        const trans = await mediaProcessor.transcribeAudio(filePath, { language: 'pt' });
        conteudoOriginal = trans.text || '(transcrição não disponível)';
        if (conteudoOriginal && ai.chatCompletion) {
          const interpreted = await ai.chatCompletion(
            `Extraia dados estruturados deste texto de cadastro industrial. Retorne JSON: { "categoria": "equipamento|custo|processo|material|fornecedor|documentacao|outro", "dados": {}, "resumo": "" }. Texto: ${conteudoOriginal.slice(0, 3000)}`,
            { max_tokens: 400 }
          );
          const match = (interpreted || '').match(/\{[\s\S]*\}/);
          if (match) {
            try {
              const parsed = JSON.parse(match[0]);
              categoria = parsed.categoria || 'outro';
              dadosExtraidos = parsed.dados || {};
              resumo = parsed.resumo || '';
            } catch (_) {}
          }
        }
      } else if (['.pdf', '.doc', '.docx'].includes(ext)) {
        sourceType = 'documento';
        let extracted = null;
        if (ext === '.pdf') extracted = await extractPdfText(filePath);
        else extracted = await extractDocText(filePath);
        conteudoOriginal = extracted || '(não foi possível extrair texto)';
        if (conteudoOriginal && ai.chatCompletion) {
          const interpreted = await ai.chatCompletion(
            `Extraia dados estruturados deste documento. Retorne JSON: { "categoria": "equipamento|custo|processo|material|fornecedor|documentacao|outro", "dados": {}, "resumo": "" }. Conteúdo: ${conteudoOriginal.slice(0, 4000)}`,
            { max_tokens: 400 }
          );
          const match = (interpreted || '').match(/\{[\s\S]*\}/);
          if (match) {
            try {
              const parsed = JSON.parse(match[0]);
              categoria = parsed.categoria || 'outro';
              dadosExtraidos = parsed.dados || {};
              resumo = parsed.resumo || '';
            } catch (_) {}
          }
        }
      }
    } else if (texto) {
      if (ai.chatCompletion) {
        const interpreted = await ai.chatCompletion(
          `Extraia dados estruturados. Retorne JSON: { "categoria": "equipamento|custo|processo|material|fornecedor|documentacao|outro", "dados": {}, "resumo": "" }. Texto: ${(texto || '').slice(0, 2000)}`,
          { max_tokens: 400 }
        );
        const match = (interpreted || '').match(/\{[\s\S]*\}/);
        if (match) {
          try {
            const parsed = JSON.parse(match[0]);
            categoria = parsed.categoria || 'outro';
            dadosExtraidos = parsed.dados || {};
            resumo = parsed.resumo || '';
          } catch (_) {}
        }
      }
    } else {
      return res.status(400).json({ ok: false, error: 'texto ou arquivo obrigatório' });
    }

    await db.query(
      `INSERT INTO company_operation_memory (
        company_id, user_id, categoria, conteudo_original, dados_extraidos, resumo,
        source_type, file_path, sector, equipamento
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        companyId,
        userId,
        categoria,
        conteudoOriginal.slice(0, 10000),
        JSON.stringify(dadosExtraidos),
        (resumo || '').slice(0, 1000),
        sourceType,
        filePath ? `/uploads/cadastrar-ia/${path.basename(filePath)}` : null,
        sector || null,
        equipamento || null
      ]
    );

    res.json({
      ok: true,
      message: 'Informação cadastrada com sucesso',
      categoria,
      resumo: resumo || 'Cadastrado'
    });
  } catch (err) {
    console.error('[CADASTRAR_IA]', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * GET /api/cadastrar-com-ia
 * Lista itens cadastrados da empresa
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const companyId = req.user?.company_id;
    if (!companyId) return res.status(400).json({ ok: false, error: 'Empresa não definida' });

    const { categoria, limit = 50 } = req.query;
    let sql = `
      SELECT id, categoria, resumo, source_type, sector, equipamento, created_at
      FROM company_operation_memory
      WHERE company_id = $1
    `;
    const params = [companyId];
    if (categoria) {
      sql += ' AND categoria = $2';
      params.push(categoria);
    }
    sql += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1);
    params.push(parseInt(limit, 10) || 50);

    const r = await db.query(sql, params);
    res.json({ ok: true, items: r.rows });
  } catch (err) {
    console.error('[CADASTRAR_IA_LIST]', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
