# OCR para PDFs escaneados

O IMPETUS usa **fallback OCR** quando o `pdf-parse` não consegue extrair texto suficiente de um PDF (por exemplo, PDFs escaneados).

## Ativação

No `.env`:

```env
OCR_ENABLED=true
```

## Dependências

### Pacotes npm

```bash
cd backend
npm install tesseract.js pdf2pic
```

### Software de sistema (para pdf2pic)

O `pdf2pic` converte PDF em imagens para o Tesseract processar. É necessário ter **GraphicsMagick** ou **ImageMagick** instalado:

- **Windows (winget):** `winget install ImageMagick.ImageMagick` ou [download manual](https://imagemagick.org/script/download.php)
- **Linux:** `sudo apt install graphicsmagick` ou `sudo apt install imagemagick`
- **macOS:** `brew install graphicsmagick` ou `brew install imagemagick`

### Tesseract.js

O `tesseract.js` usa o modelo de reconhecimento em português + inglês (`por+eng`) e roda em JavaScript puro, sem instalação adicional do Tesseract no sistema.

## Fluxo

1. Upload de manual PDF → `extractTextFromFile()`
2. Tenta `pdf-parse` primeiro
3. Se o texto extraído for curto ou vazio (< 20 caracteres), usa `extractTextViaOCR()`
4. OCR: converte páginas PDF em PNG → Tesseract reconhece texto → junta trechos

## Observações

- OCR é mais lento que `pdf-parse`; use apenas quando necessário
- A qualidade depende da nitidez do PDF escaneado
- Arquivos temporários (imagens de página) são removidos após processamento
