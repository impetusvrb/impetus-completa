import React from 'react';
import { Link } from 'react-router-dom';
export default function Dashboard(){ return (<div style={{padding:20}}><h2>Dashboard</h2><nav><Link to='/proposals'>Propostas</Link> | <Link to='/diagnostic'>Diagnóstico</Link></nav></div>); }
