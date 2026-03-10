import React, { useState, useRef } from 'react';
import { Send, Paperclip, Mic, MicOff, X, File, Image } from 'lucide-react';
import chatApi from '../services/chatApi';
export default function MessageInput({conversationId, onSend, onTyping, onStopTyping, disabled}){
  const [text,setText]=useState('');
  const [recording,setRecording]=useState(false);
  const [uploading,setUploading]=useState(false);
  const [preview,setPreview]=useState(null);
  const fileRef=useRef(null); const mediaRef=useRef(null); const chunks=useRef([]); const timer=useRef(null);
  function onChange(e){ setText(e.target.value); onTyping&&onTyping(); clearTimeout(timer.current); timer.current=setTimeout(()=>onStopTyping&&onStopTyping(),2000); }
  function onKey(e){ if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); send(); } }
  function send(){ const c=text.trim(); if(!c||disabled) return; setText(''); onStopTyping&&onStopTyping(); onSend&&onSend({type:'text',content:c}); }
  function onFile(e){ const f=e.target.files&&e.target.files[0]; if(f){ setPreview(f); e.target.value=''; } }
  async function sendFile(){ if(!preview||uploading) return; setUploading(true); try{ await chatApi.uploadFile(conversationId,preview); setPreview(null); }catch(e){ console.error(e); }finally{ setUploading(false); } }
  async function toggleRec(){
    if(recording){ mediaRef.current&&mediaRef.current.stop(); setRecording(false); return; }
    try{
      const stream=await navigator.mediaDevices.getUserMedia({audio:true});
      const rec=new MediaRecorder(stream); chunks.current=[];
      rec.ondataavailable=e=>chunks.current.push(e.data);
      rec.onstop=()=>{ stream.getTracks().forEach(t=>t.stop()); setPreview(new File(chunks.current,'audio_'+Date.now()+'.webm',{type:'audio/webm'})); };
      rec.start(); mediaRef.current=rec; setRecording(true);
    }catch(e){ alert('Erro ao acessar microfone'); }
  }
  return (<div className="msg-input-wrap">
    {preview&&(<div className="msg-preview">
      {preview.type.startsWith('image/')?<Image size={14}/>:preview.type.startsWith('audio/')?<Mic size={14}/>:<File size={14}/>}
      <span className="msg-preview__name">{preview.name}</span>
      {preview.type.startsWith('image/')&&<img src={URL.createObjectURL(preview)} alt="preview" className="msg-preview__img"/>}
      {preview.type.startsWith('audio/')&&<audio src={URL.createObjectURL(preview)} controls className="msg-preview__audio"/>}
      <div className="msg-preview__actions">
        <button className="btn-icon" onClick={()=>setPreview(null)}><X size={14}/></button>
        <button className="btn-primary btn-sm" onClick={sendFile} disabled={uploading}>{uploading?'Enviando...':'Enviar'}</button>
      </div>
    </div>)}
    {!preview&&(<div className="msg-input-row">
      <button className="btn-icon" onClick={()=>fileRef.current&&fileRef.current.click()}><Paperclip size={18}/></button>
      <input ref={fileRef} type="file" accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt" onChange={onFile} hidden/>
      <textarea className="msg-input-textarea" placeholder="Mensagem... (@ImpetusIA para IA)" value={text} onChange={onChange} onKeyDown={onKey} rows={1} disabled={disabled}/>
      <button className={'btn-icon'+(recording?' recording':'')} onClick={toggleRec}>{recording?<MicOff size={18}/>:<Mic size={18}/>}</button>
      <button className="btn-send" onClick={send} disabled={!text.trim()||disabled}><Send size={18}/></button>
    </div>)}
  </div>);
}
