import React from 'react';
import IndustrialSearchBar from '../../../../../presentation/industrial-module/IndustrialSearchBar.jsx';

/**
 * OPM-002A Reference Module — pesquisa industrial incremental.
 */
export default function InventorySearch({
  value,
  onChange,
  disabled = false,
  placeholder = 'Pesquisar código, SKU, produto, descrição, lote, série, endereço, armazém…'
}) {
  return (
    <IndustrialSearchBar
      value={value}
      onChange={onChange}
      disabled={disabled}
      placeholder={placeholder}
    />
  );
}
