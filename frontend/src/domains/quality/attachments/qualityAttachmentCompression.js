/**
 * Compressão leve de imagem para evidência (canvas). EXIF não preservado (sanitização implícita).
 */
export async function compressImageFile(file, opts = {}) {
  const maxW = opts.maxWidth || 1600;
  const maxH = opts.maxHeight || 1600;
  const quality = opts.quality || 0.82;

  if (!file || !file.type?.startsWith('image/')) {
    return { blob: file, skipped: true };
  }

  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return { blob: file, skipped: true };

  let { width, height } = bitmap;
  const ratio = Math.min(1, maxW / width, maxH / height);
  width = Math.round(width * ratio);
  height = Math.round(height * ratio);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return { blob: file, skipped: true };
  ctx.drawImage(bitmap, 0, 0, width, height);

  const blob = await new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b || file), 'image/jpeg', quality);
  });

  return {
    blob: blob || file,
    width,
    height,
    thumb: await canvasToThumb(canvas)
  };
}

async function canvasToThumb(sourceCanvas) {
  const t = document.createElement('canvas');
  const max = 240;
  let w = sourceCanvas.width;
  let h = sourceCanvas.height;
  const r = Math.min(1, max / w, max / h);
  w = Math.round(w * r);
  h = Math.round(h * r);
  t.width = w;
  t.height = h;
  const c = t.getContext('2d');
  if (!c) return null;
  c.drawImage(sourceCanvas, 0, 0, w, h);
  return new Promise((resolve) => {
    t.toBlob((b) => resolve(b), 'image/jpeg', 0.72);
  });
}
