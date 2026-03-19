/**
 * IMPETUS - ManuIA 3D Vision - Assinatura digital em canvas
 */
import React, { useRef, useEffect, useState } from 'react';
import styles from '../styles/Vision3D.module.css';

export default function SignaturePad({ onSignatureChange, width = 400, height = 150 }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const hasDrawnRef = useRef(false);

  const getPoint = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const draw = (p) => {
    const canvas = canvasRef.current;
    if (!canvas || !p) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  };

  const startDrawing = (e) => {
    e.preventDefault();
    const p = getPoint(e);
    if (!p) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    setIsDrawing(true);
    hasDrawnRef.current = true;
  };

  const moveDrawing = (e) => {
    e.preventDefault();
    if (!isDrawing) return;
    draw(getPoint(e));
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    if (hasDrawnRef.current) exportSignature();
  };

  const exportSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const base64 = dataUrl.replace(/^data:image\/png;base64,/, '');
    onSignatureChange?.(base64);
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    hasDrawnRef.current = false;
    onSignatureChange?.(null);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
  }, []);

  return (
    <div className={styles.signaturePad}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className={styles.signaturePad__canvas}
        onMouseDown={startDrawing}
        onMouseMove={moveDrawing}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={moveDrawing}
        onTouchEnd={stopDrawing}
        style={{ touchAction: 'none' }}
      />
      <div className={styles.signaturePad__actions}>
        <button type="button" className={styles.captureBtn} onClick={clear}>
          Limpar
        </button>
      </div>
    </div>
  );
}
