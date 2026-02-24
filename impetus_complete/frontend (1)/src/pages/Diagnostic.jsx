import React, { useState } from 'react';
import axios from 'axios';
export default function Diagnostic(){
  const [text,setText]=useState(''); const [result,setResult]=useState(null); const [status,setStatus]=useState(null);
  async function submit(e){ e.preventDefault(); setStatus('validating'); try{ const v = await axios.post('/api/diagnostic/validate',{text}); if(!v.data.sufficient){ setResult({status:'need_more_info', questions:['Descreva quando, sintomas, anexos']}); setStatus('need_more_info'); return; } setStatus('running'); const r = await axios.post('/api/diagnostic',{text, reporter:'web-user'}); setResult(r.data.result); setStatus('done'); }catch(err){ setStatus('error'); setResult({ error: err.message }); } }
  return (<div style={{padding:20}}><h2>Diagnóstico</h2><form onSubmit={submit}><textarea value={text} onChange={e=>setText(e.target.value)} style={{width:'100%',height:140}}/></form><div>Status: {status}</div>{result && result.status==='ok' && <div><pre style={{whiteSpace:'pre-wrap'}}>{result.report}</pre><a href={`/api/diagnostic/report/${result.diagnostic_id}`} target='_blank'>Abrir relatório</a></div>}</div>)
}
