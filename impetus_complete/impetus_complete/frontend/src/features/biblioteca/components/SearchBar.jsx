import React from 'react';
import { Search } from 'lucide-react';
import './SearchBar.css';

export default function SearchBar({ value, onChange, placeholder = 'Buscar arquivos...' }) {
  return (
    <div className="biblioteca-searchbar">
      <Search size={20} className="biblioteca-searchbar__icon" />
      <input
        type="search"
        className="biblioteca-searchbar__input"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}
