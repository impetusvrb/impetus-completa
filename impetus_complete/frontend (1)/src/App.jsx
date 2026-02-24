import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Proposals from './pages/Proposals';
import Diagnostic from './pages/Diagnostic';

export default function App(){
  return (<BrowserRouter><Routes>
    <Route path='/' element={<Login/>} />
    <Route path='/app' element={<Dashboard/>} />
    <Route path='/proposals' element={<Proposals/>} />
    <Route path='/diagnostic' element={<Diagnostic/>} />
  </Routes></BrowserRouter>);
}
