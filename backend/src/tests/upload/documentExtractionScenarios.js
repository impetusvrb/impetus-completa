'use strict';

/**
 * Regressão — extração documental unificada (chat multimodal / registro inteligente).
 * node backend/src/tests/upload/documentExtractionScenarios.js
 */

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const documentTextExtractor = require('../../services/documentTextExtractorService');
const multimodalChatService = require('../../services/multimodalChatService');

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'impetus-doc-extract-'));

function writeTmp(name, content) {
  const p = path.join(TMP, name);
  fs.writeFileSync(p, content);
  return p;
}

async function testTxt() {
  const p = writeTmp('sample.txt', 'IMPETUS_TEST_MARKER: resumo operacional da linha 3 com OEE 87%.');
  const r = await documentTextExtractor.extractFromPath(p, 'sample.txt');
  assert.strictEqual(r.ok, true, 'txt should extract');
  assert.ok(r.text.includes('IMPETUS_TEST_MARKER'), 'txt content missing');
  console.log('  ✓ TXT');
}

async function testXlsx() {
  const XLSX = require('xlsx');
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([
    ['Máquina', 'OEE'],
    ['Linha 3', 0.87]
  ]);
  XLSX.utils.book_append_sheet(wb, ws, 'Produção');
  const p = path.join(TMP, 'sample.xlsx');
  XLSX.writeFile(wb, p);
  const r = await documentTextExtractor.extractFromPath(p, 'sample.xlsx');
  assert.strictEqual(r.ok, true, 'xlsx should extract');
  assert.ok(r.text.includes('Linha 3'), 'xlsx content missing');
  console.log('  ✓ XLSX');
}

async function testPptx() {
  const JSZip = require('jszip');
  const zip = new JSZip();
  const slideXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld><p:spTree><p:sp><p:txBody><a:p><a:r><a:t>Slide IMPETUS PPTX Marker</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld>
</p:sld>`;
  zip.file('[Content_Types].xml', '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"></Types>');
  zip.file('ppt/slides/slide1.xml', slideXml);
  const buf = await zip.generateAsync({ type: 'nodebuffer' });
  const p = path.join(TMP, 'sample.pptx');
  fs.writeFileSync(p, buf);
  const r = await documentTextExtractor.extractFromPath(p, 'sample.pptx');
  assert.strictEqual(r.ok, true, 'pptx should extract');
  assert.ok(r.text.includes('IMPETUS PPTX Marker'), 'pptx content missing');
  console.log('  ✓ PPTX');
}

function testIsUsableRejectsPlaceholders() {
  assert.strictEqual(documentTextExtractor.isUsableExtractedText(''), false);
  assert.strictEqual(
    documentTextExtractor.isUsableExtractedText('[Documento .pptx anexado — extração de texto limitada]'),
    false
  );
  assert.strictEqual(documentTextExtractor.isUsableExtractedText('Conteúdo real com mais de doze chars.'), true);
  console.log('  ✓ isUsableExtractedText');
}

function testBuildDocumentSystemBlock() {
  const block = multimodalChatService.buildDocumentSystemBlock({
    originalName: 'relatorio.pdf',
    extractedText: 'Dados de produção da semana 12 com meta atingida.',
    extractor: 'pdf-parse'
  });
  assert.ok(block.includes('DOCUMENTO ANEXADO'), 'system block header');
  assert.ok(block.includes('produção da semana 12'), 'system block body');
  console.log('  ✓ buildDocumentSystemBlock');
}

async function testProcessUploadedFileTxt() {
  const p = writeTmp('upload-flow.txt', 'Fluxo upload multimodal IMPETUS documento anexado teste.');
  const processed = await multimodalChatService.processUploadedFile(p, 'upload-flow.txt', 1);
  assert.strictEqual(processed.type, 'document');
  assert.strictEqual(processed.extractionOk, true);
  assert.ok(processed.extractedText.includes('upload multimodal'));
  console.log('  ✓ processUploadedFile');
}

async function main() {
  console.log('[documentExtractionScenarios]');
  testIsUsableRejectsPlaceholders();
  testBuildDocumentSystemBlock();
  await testTxt();
  await testXlsx();
  await testPptx();
  await testProcessUploadedFileTxt();
  console.log('[documentExtractionScenarios] OK');
}

main()
  .catch((err) => {
    console.error('[documentExtractionScenarios] FAIL', err);
    process.exit(1);
  })
  .finally(() => {
    try {
      fs.rmSync(TMP, { recursive: true, force: true });
    } catch (_e) {
      /* noop */
    }
  });
