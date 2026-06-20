/**
 * Captura de mídia para Registro Inteligente — arquivo, foto (câmera) e áudio.
 */
import React, { useRef, useState } from 'react';
import { Paperclip, Camera, Mic, MicOff, X, File, Image } from 'lucide-react';
import './RegistroInteligenteMedia.css';

const ACCEPT =
  '.pdf,.doc,.docx,.png,.jpg,.jpeg,.webp,.mp3,.m4a,.wav,.webm,image/*,audio/*';

export default function RegistroInteligenteMedia({
  file,
  onFileChange,
  disabled = false,
  variant = 'page'
}) {
  const fileRef = useRef(null);
  const photoRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const [recording, setRecording] = useState(false);

  const prefix = variant === 'chat' ? 'rim-chat' : 'rim';

  const pickFile = (inputRef) => {
    if (!disabled && inputRef.current) inputRef.current.click();
  };

  const onPick = (e) => {
    const f = e.target.files?.[0] || null;
    onFileChange(f);
    e.target.value = '';
  };

  const stopRecording = () => {
    if (recorderRef.current && recording) {
      recorderRef.current.stop();
      setRecording(false);
    }
  };

  const toggleAudio = async () => {
    if (disabled) return;
    if (recording) {
      stopRecording();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (ev) => chunksRef.current.push(ev.data);
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        onFileChange(new File([blob], `audio_${Date.now()}.webm`, { type: 'audio/webm' }));
      };
      rec.start();
      recorderRef.current = rec;
      setRecording(true);
    } catch {
      alert('Não foi possível acessar o microfone. Verifique as permissões do navegador.');
    }
  };

  const clear = () => {
    stopRecording();
    onFileChange(null);
  };

  const previewUrl = file && file.type?.startsWith('image/') ? URL.createObjectURL(file) : null;

  return (
    <div className={`${prefix} ${variant === 'chat' ? `${prefix}--chat` : ''}`}>
      <span className={`${prefix}__label`}>Anexos (opcional)</span>
      <p className={`${prefix}__hint`}>Envie foto, documento ou grave áudio junto com o registro.</p>

      <div className={`${prefix}__actions`}>
        <button
          type="button"
          className={`${prefix}__btn`}
          onClick={() => pickFile(fileRef)}
          disabled={disabled || recording}
        >
          <Paperclip size={16} />
          Arquivo
        </button>
        <button
          type="button"
          className={`${prefix}__btn`}
          onClick={() => pickFile(photoRef)}
          disabled={disabled || recording}
        >
          <Camera size={16} />
          Tirar foto
        </button>
        <button
          type="button"
          className={`${prefix}__btn ${recording ? `${prefix}__btn--rec` : ''}`}
          onClick={toggleAudio}
          disabled={disabled}
        >
          {recording ? <MicOff size={16} /> : <Mic size={16} />}
          {recording ? 'Parar áudio' : 'Gravar áudio'}
        </button>
      </div>

      <input
        ref={fileRef}
        type="file"
        className={`${prefix}__input`}
        accept={ACCEPT}
        onChange={onPick}
        disabled={disabled}
      />
      <input
        ref={photoRef}
        type="file"
        className={`${prefix}__input`}
        accept="image/*"
        capture="environment"
        onChange={onPick}
        disabled={disabled}
      />

      {file ? (
        <div className={`${prefix}__preview`}>
          {file.type?.startsWith('image/') ? <Image size={14} /> : file.type?.startsWith('audio/') ? <Mic size={14} /> : <File size={14} />}
          <span className={`${prefix}__name`}>{file.name}</span>
          {previewUrl ? <img src={previewUrl} alt="" className={`${prefix}__thumb`} /> : null}
          {file.type?.startsWith('audio/') ? (
            <audio src={URL.createObjectURL(file)} controls className={`${prefix}__audio`} />
          ) : null}
          <button type="button" className={`${prefix}__remove`} onClick={clear} aria-label="Remover anexo">
            <X size={14} />
          </button>
        </div>
      ) : null}
    </div>
  );
}
