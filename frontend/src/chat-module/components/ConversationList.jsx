import React, { useState } from 'react';
import { Search, Plus, Users, Bot, X } from 'lucide-react';
import chatApi from '../services/chatApi';
function initials(n) { return n ? n.split(' ').slice(0,2).map(x=>x[0]).join('').toUpperCase() : '?'; }
function fmtTime(d) { if(!d) return ''; const dt=new Date(d),now=new Date(),df=now-dt; if(df<86400000) return dt.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}); return dt.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'}); }
function convName(c,uid) { if(c.type==='group') return c.name||'Grupo'; const o=c.participants&&c.participants.find(p=>p.id!==uid); return o&&(o.name||o.email)||'Conversa'; }
export default function ConversationList({ conversations, activeId, onSelect, currentUserId, onlineUsers, onRefresh }) {
  const [search,setSearch]=useState('');
  const [showNew,setShowNew]=useState(false);
  const [users,setUsers]=useState([]);
  const [groupMode,setGroupMode]=useState(false);
  const [groupName,setGroupName]=useState('');
  const [sel,setSel]=useState([]);
  const filtered=conversations.filter(c=>convName(c,currentUserId).toLowerCase().includes(search.toLowerCase()));
  async function openNew(){ setShowNew(true); const {data}=await chatApi.getUsers(); setUsers(data); }
  async function startPrivate(uid){ const {data}=await chatApi.createPrivateConversation(uid); if(onRefresh) await onRefresh(); onSelect(data.id); setShowNew(false); }
  async function startGroup(){ if(!groupName.trim()||!sel.length) return; const {data}=await chatApi.createGroup(groupName.trim(),sel); if(onRefresh) await onRefresh(); onSelect(data.id); setShowNew(false); setGroupMode(false); setGroupName(''); setSel([]); }
  function toggleSel(uid){ setSel(p=>p.includes(uid)?p.filter(x=>x!==uid):[...p,uid]); }
  return (<div className="conv-list">
    <div className="conv-list__header"><span className="conv-list__title">Mensagens</span><button className="conv-list__new-btn" onClick={openNew}><Plus size={18}/></button></div>
    <div className="conv-list__search"><Search size={14}/><input placeholder="Buscar..." value={search} onChange={e=>setSearch(e.target.value)}/></div>
    <div className="conv-list__items">
      <div className={'conv-item conv-item--ai'+(activeId==='impetus-ia'?' active':'')} onClick={()=>onSelect('impetus-ia')}>
        <div className="conv-item__avatar conv-item__avatar--ai"><Bot size={18}/></div>
        <div className="conv-item__info"><div className="conv-item__name">Impetus IA</div><div className="conv-item__preview">Assistente inteligente</div></div>
        <div className="conv-item__meta"><span className="conv-item__ai-dot"/></div>
      </div>
      {filtered.length===0&&<div className="conv-list__empty">Nenhuma conversa</div>}
      {filtered.map(c=>{
        const nm=convName(c,currentUserId); const lm=c.last_message; const unread=parseInt(c.unread_count||0);
        const otherId=c.participants&&c.participants.find(p=>p.id!==currentUserId)&&c.participants.find(p=>p.id!==currentUserId).id;
        const online=otherId&&onlineUsers&&onlineUsers.has(otherId);
        return (<div key={c.id} className={'conv-item'+(activeId===c.id?' active':'')} onClick={()=>onSelect(c.id)}>
          <div className="conv-item__avatar">{c.type==='group'?<Users size={18}/>:<span>{initials(nm)}</span>}{online&&<span className="conv-item__online-dot"/>}</div>
          <div className="conv-item__info"><div className="conv-item__name">{nm}</div>{lm&&<div className="conv-item__preview">{lm.message_type==='text'||lm.message_type==='ai'?(lm.content||'').slice(0,40):'📎 '+lm.message_type}</div>}</div>
          <div className="conv-item__meta">{lm&&<span className="conv-item__time">{fmtTime(lm.created_at)}</span>}{unread>0&&<span className="conv-item__badge">{unread>99?'99+':unread}</span>}</div>
        </div>);
      })}
    </div>
    {showNew&&(<div className="modal-overlay" onClick={()=>setShowNew(false)}><div className="modal-box" onClick={e=>e.stopPropagation()}>
      <div className="modal-box__header"><span>{groupMode?'Criar Grupo':'Nova Conversa'}</span><button className="btn-icon" onClick={()=>setShowNew(false)}><X size={16}/></button></div>
      {!groupMode?(<><button className="btn-secondary mb-2" onClick={()=>setGroupMode(true)}><Users size={14}/> Criar Grupo</button>
        <div className="modal-user-list">{users.map(u=>(<div key={u.id} className="modal-user-item" onClick={()=>startPrivate(u.id)}><div className="modal-user-avatar">{initials(u.name)}</div><div><div className="modal-user-name">{u.name}</div><div className="modal-user-role">{u.role}</div></div></div>))}</div></>
      ):(<><input className="modal-input" placeholder="Nome do grupo" value={groupName} onChange={e=>setGroupName(e.target.value)}/>
        <div className="modal-user-list">{users.map(u=>(<div key={u.id} className={'modal-user-item'+(sel.includes(u.id)?' selected':'')} onClick={()=>toggleSel(u.id)}><div className="modal-user-avatar">{initials(u.name)}</div><div className="modal-user-name">{u.name}</div>{sel.includes(u.id)&&<span className="modal-check">✓</span>}</div>))}</div>
        <div className="modal-actions"><button className="btn-secondary" onClick={()=>setGroupMode(false)}>Voltar</button><button className="btn-primary" onClick={startGroup} disabled={!groupName.trim()||!sel.length}>Criar</button></div></>)}
    </div></div>)}
  </div>);
}
