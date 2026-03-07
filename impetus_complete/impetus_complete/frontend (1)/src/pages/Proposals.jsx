import React, { useState, useEffect } from 'react';
import axios from 'axios';
export default function Proposals(){
  const [proposals, setProposals] = useState([]);
  useEffect(()=>{ fetchList(); },[]);
  async function fetchList(){ try{ const r = await axios.get('/api/proacao'); setProposals(r.data.proposals||[]); }catch(e){ console.error(e); } }
  return (<div style={{padding:20}}><h2>Propostas</h2><ul>{proposals.map(p=> <li key={p.id}>{p.reporter_name} - {p.location} - {p.status}</li>)}</ul></div>);
}
