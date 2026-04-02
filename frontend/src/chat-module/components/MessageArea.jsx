import React, { useEffect, useRef } from 'react';
import { File } from 'lucide-react';
import impetusIaAvatar from '../../assets/impetus-ia-avatar.png';
const AI_ID='00000000-0000-0000-0000-000000000001';
const API_BASE = (() => {
  const api = import.meta.env.VITE_API_URL || '/api';
  if (api.startsWith('http')) return api.replace(/\/api\/?$/, '');
  if (typeof window !== 'undefined' && window.location.port === '3000') {
    return `${window.location.protocol}//${window.location.hostname}:4000`;
  }
  if (typeof window !== 'undefined') return window.location.origin;
  return '';
})();
function initials(n){ return n?n.split(' ').slice(0,2).map(x=>x[0]).join('').toUpperCase():'?'; }
function fmtTime(d){ return d?new Date(d).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}):''; }
function toAbs(url){
  if(!url) return null;
  const abs = url.startsWith('http') ? url : (API_BASE + url);
  try { return encodeURI(abs); } catch { return abs; }
}
function AvatarOrInitial({ src, fallbackText }){
  const [broken, setBroken] = React.useState(false);
  if(!src || broken) return <span>{fallbackText}</span>;
  return <img src={src} alt="" style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:'50%'}} onError={()=>setBroken(true)} />;
}
function Attachment({msg}){
  const url=toAbs(msg.file_url);
  if(msg.message_type==='image') return <a href={url} target="_blank" rel="noreferrer"><img src={url} alt={msg.file_name||'img'} className="msg-img"/></a>;
  if(msg.message_type==='video') return <video src={url} controls className="msg-video"/>;
  if(msg.message_type==='audio') return <audio src={url} controls className="msg-audio"/>;
  return <a href={url} target="_blank" rel="noreferrer" className="msg-file"><File size={14}/> {msg.file_name||'arquivo'}</a>;
}
function TypingIndicator({users}){
  if(!users||!users.length) return null;
  return <div className="typing-indicator"><span className="typing-dots"><span/><span/><span/></span><span>{users.map(u=>u.userName).join(', ')} {users.length===1?'está':'estão'} digitando...</span></div>;
}
export default function MessageArea({messages,currentUserId,loading,hasMore,onLoadMore,typingUsers}){
  const bottomRef=useRef(null); const containerRef=useRef(null);
  useEffect(()=>{ bottomRef.current&&bottomRef.current.scrollIntoView({behavior:'smooth'}); },[messages.length]);
  function onScroll(){ if(containerRef.current&&containerRef.current.scrollTop===0&&hasMore&&!loading) onLoadMore(); }
  return (<div className="msg-area" ref={containerRef} onScroll={onScroll}>
    {loading&&<div className="msg-loading">Carregando...</div>}
    {!hasMore&&messages.length>0&&<div className="msg-start">Início da conversa</div>}
    {messages.length===0&&!loading&&<div className="msg-empty">Nenhuma mensagem. Diga olá!</div>}
    {messages.map((msg,idx)=>{
      const isOwn=msg.sender_id===currentUserId; const isAI=msg.sender_id===AI_ID||msg.message_type==='ai';
      const name=msg.sender&&msg.sender.name||'Usuário';
      const showAvatar=!isOwn&&(idx===0||messages[idx-1].sender_id!==msg.sender_id);
      const avatarUrl = !isAI ? toAbs(msg.sender?.avatar_url) : null;
      return (<div key={msg.id} className={'msg-row'+(isOwn?' own':'')+(isAI?' ai':'')}>
        {!isOwn&&(
          <div className={'msg-avatar'+(showAvatar?'':' invisible')}>
            {isAI ? (
              <img src={impetusIaAvatar} alt="" style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:'50%'}}/>
            ) : (
              <AvatarOrInitial src={avatarUrl} fallbackText={initials(name)} />
            )}
          </div>
        )}
        <div className="msg-bubble-wrap">
          {!isOwn&&showAvatar&&<span className="msg-sender-name">{name}</span>}
          <div className={'msg-bubble'+(isOwn?' own':'')+(isAI?' ai-bubble':'')}>
            {msg.file_url?<Attachment msg={msg}/>:<p>{msg.content}</p>}
            <span className="msg-time">{fmtTime(msg.created_at)}</span>
          </div>
        </div>
      </div>);
    })}
    <TypingIndicator users={typingUsers}/>
    <div ref={bottomRef}/>
  </div>);
}
