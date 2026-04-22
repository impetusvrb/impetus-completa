import React, { useEffect, useRef, useState } from 'react';
import { File, MoreVertical } from 'lucide-react';
import impetusIaAvatar from '../../assets/impetus-ia-avatar.png';
import { useProtectedMediaSrc, toAbsoluteAssetUrl, isUploadsAssetUrl, fetchUploadAsBlobUrl } from '../../utils/protectedUploadMedia';
const AI_ID='00000000-0000-0000-0000-000000000001';
function initials(n){ return n?n.split(' ').slice(0,2).map(x=>x[0]).join('').toUpperCase():'?'; }
function fmtTime(d){ return d?new Date(d).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}):''; }
function AvatarOrInitial({ rawUrl, fallbackText }){
  const src = useProtectedMediaSrc(rawUrl || null);
  const [broken, setBroken] = React.useState(false);
  if(!rawUrl || !src || broken) return <span>{fallbackText}</span>;
  return <img src={src} alt="" style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:'50%'}} onError={()=>setBroken(true)} />;
}
function Attachment({msg}){
  const url = useProtectedMediaSrc(msg.file_url || null);
  async function openDownload(e) {
    if (!msg.file_url) return;
    e.preventDefault();
    try {
      if (isUploadsAssetUrl(msg.file_url)) {
        const abs = msg.file_url.startsWith('http') ? msg.file_url : toAbsoluteAssetUrl(msg.file_url);
        const blobUrl = await fetchUploadAsBlobUrl(abs);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = msg.file_name || 'arquivo';
        a.click();
        URL.revokeObjectURL(blobUrl);
      } else {
        const abs = msg.file_url.startsWith('http') ? msg.file_url : toAbsoluteAssetUrl(msg.file_url);
        window.open(abs, '_blank', 'noreferrer');
      }
    } catch {
      window.open(toAbsoluteAssetUrl(msg.file_url), '_blank', 'noreferrer');
    }
  }
  if (!url && msg.file_url) return <span className="msg-file"><File size={14}/> Carregando…</span>;
  if(msg.message_type==='image') return <a href={url} onClick={openDownload} target="_blank" rel="noreferrer"><img src={url} alt={msg.file_name||'img'} className="msg-img"/></a>;
  if(msg.message_type==='video') return <video src={url} controls className="msg-video"/>;
  if(msg.message_type==='audio') return <audio src={url} controls className="msg-audio"/>;
  return <a href={url} onClick={openDownload} target="_blank" rel="noreferrer" className="msg-file"><File size={14}/> {msg.file_name||'arquivo'}</a>;
}
function TypingIndicator({users}){
  if(!users||!users.length) return null;
  return <div className="typing-indicator"><span className="typing-dots"><span/><span/><span/></span><span>{users.map(u=>u.userName).join(', ')} {users.length===1?'está':'estão'} digitando...</span></div>;
}
export default function MessageArea({messages,currentUserId,loading,hasMore,onLoadMore,typingUsers,onDeleteMessage}){
  const bottomRef=useRef(null); const containerRef=useRef(null);
  const [menuMsgId,setMenuMsgId]=useState(null);
  useEffect(()=>{ bottomRef.current&&bottomRef.current.scrollIntoView({behavior:'smooth'}); },[messages.length]);
  useEffect(()=>{
    if(menuMsgId==null) return;
    const close=()=>setMenuMsgId(null);
    const t=setTimeout(()=>document.addEventListener('click',close),0);
    return ()=>{ clearTimeout(t); document.removeEventListener('click',close); };
  },[menuMsgId]);
  function onScroll(){ if(containerRef.current&&containerRef.current.scrollTop===0&&hasMore&&!loading) onLoadMore(); }
  return (<div className="msg-area" ref={containerRef} onScroll={onScroll}>
    {loading&&<div className="msg-loading">Carregando...</div>}
    {!hasMore&&messages.length>0&&<div className="msg-start">Início da conversa</div>}
    {messages.length===0&&!loading&&<div className="msg-empty">Nenhuma mensagem. Diga olá!</div>}
    {messages.map((msg,idx)=>{
      const isOwn=msg.sender_id===currentUserId; const isAI=msg.sender_id===AI_ID||msg.message_type==='ai';
      const name=msg.sender&&msg.sender.name||'Usuário';
      const showAvatar=!isOwn&&(idx===0||messages[idx-1].sender_id!==msg.sender_id);
      const avatarRaw = !isAI ? msg.sender?.avatar_url : null;
      const deletedEveryone = !!msg.deleted_for_everyone_at;
      const showMenu = onDeleteMessage && currentUserId && !deletedEveryone;
      const canDeleteEveryone = isOwn && showMenu;
      return (<div key={msg.id} className={'msg-row'+(isOwn?' own':'')+(isAI?' ai':'')}>
        {!isOwn&&(
          <div className={'msg-avatar'+(showAvatar?'':' invisible')}>
            {isAI ? (
              <img src={impetusIaAvatar} alt="" style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:'50%'}}/>
            ) : (
              <AvatarOrInitial rawUrl={avatarRaw} fallbackText={initials(name)} />
            )}
          </div>
        )}
        <div className={'msg-bubble-wrap'+(menuMsgId===msg.id?' msg-bubble-wrap--menu':'')}>
          {!isOwn&&showAvatar&&<span className="msg-sender-name">{name}</span>}
          <div className={'msg-bubble-row'+(isOwn?' own':'')}>
            <div className={'msg-bubble'+(isOwn?' own':'')+(isAI?' ai-bubble':'')}>
              {deletedEveryone ? (
                <p className="msg-deleted">Mensagem apagada</p>
              ) : msg.file_url ? (
                <Attachment msg={msg}/>
              ) : (
                <p>{msg.content}</p>
              )}
              <span className="msg-time">{fmtTime(msg.created_at)}</span>
            </div>
            {showMenu&&(
              <button
                type="button"
                className="msg-msg-menu-btn"
                aria-label="Opções da mensagem"
                onClick={(e)=>{ e.stopPropagation(); setMenuMsgId(menuMsgId===msg.id?null:msg.id); }}
              >
                <MoreVertical size={16}/>
              </button>
            )}
          </div>
          {menuMsgId===msg.id&&showMenu&&(
            <div className="msg-actions-popover" onClick={(e)=>e.stopPropagation()} role="menu">
              <button type="button" role="menuitem" onClick={()=>{ onDeleteMessage(msg,'me'); setMenuMsgId(null); }}>Apagar para mim</button>
              {canDeleteEveryone&&(
                <button type="button" role="menuitem" className="danger" onClick={()=>{
                  if(window.confirm('Apagar esta mensagem para todos na conversa?')){ onDeleteMessage(msg,'everyone'); setMenuMsgId(null); }
                }}>Apagar para todos</button>
              )}
            </div>
          )}
        </div>
      </div>);
    })}
    <TypingIndicator users={typingUsers}/>
    <div ref={bottomRef}/>
  </div>);
}
