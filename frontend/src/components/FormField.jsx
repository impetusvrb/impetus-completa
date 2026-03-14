/**
 * FORM FIELD COMPONENTS
 * Componentes de formulário reutilizáveis
 */

import React from 'react';
import './FormField.css';

/**
 * INPUT FIELD
 */
export function InputField({
  label,
  name,
  type = 'text',
  value,
  onChange,
  placeholder,
  required = false,
  disabled = false,
  error,
  helperText,
  icon: Icon
}) {
  return (
    <div className="form-field">
      {label && (
        <label htmlFor={name} className="form-label">
          {label}
          {required && <span className="required">*</span>}
        </label>
      )}
      <div className="input-wrapper">
        {Icon && (
          <div className="input-icon">
            <Icon size={18} />
          </div>
        )}
        <input
          id={name}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          className={`form-input ${error ? 'error' : ''} ${Icon ? 'with-icon' : ''}`}
        />
      </div>
      {error && <span className="form-error">{error}</span>}
      {helperText && !error && <span className="form-helper">{helperText}</span>}
    </div>
  );
}

/**
 * SELECT FIELD
 */
export function SelectField({
  label,
  name,
  value,
  onChange,
  options = [],
  placeholder = 'Selecione...',
  required = false,
  disabled = false,
  error,
  helperText
}) {
  return (
    <div className="form-field">
      {label && (
        <label htmlFor={name} className="form-label">
          {label}
          {required && <span className="required">*</span>}
        </label>
      )}
      <select
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        disabled={disabled}
        className={`form-select ${error ? 'error' : ''}`}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <span className="form-error">{error}</span>}
      {helperText && !error && <span className="form-helper">{helperText}</span>}
    </div>
  );
}

/**
 * TEXTAREA FIELD
 */
export function TextAreaField({
  label,
  name,
  value,
  onChange,
  placeholder,
  required = false,
  disabled = false,
  error,
  helperText,
  rows = 4
}) {
  return (
    <div className="form-field">
      {label && (
        <label htmlFor={name} className="form-label">
          {label}
          {required && <span className="required">*</span>}
        </label>
      )}
      <textarea
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        rows={rows}
        className={`form-textarea ${error ? 'error' : ''}`}
      />
      {error && <span className="form-error">{error}</span>}
      {helperText && !error && <span className="form-helper">{helperText}</span>}
    </div>
  );
}

/**
 * CHECKBOX FIELD
 */
export function CheckboxField({
  label,
  name,
  checked,
  onChange,
  disabled = false,
  helperText
}) {
  return (
    <div className="form-field form-checkbox">
      <label className="checkbox-label">
        <input
          type="checkbox"
          name={name}
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          className="checkbox-input"
        />
        <span className="checkbox-text">{label}</span>
      </label>
      {helperText && <span className="form-helper">{helperText}</span>}
    </div>
  );
}

/**
 * FILE UPLOAD FIELD
 */
export function FileUploadField({
  label,
  name,
  onChange,
  accept,
  required = false,
  disabled = false,
  error,
  helperText,
  multiple = false
}) {
  return (
    <div className="form-field">
      {label && (
        <label htmlFor={name} className="form-label">
          {label}
          {required && <span className="required">*</span>}
        </label>
      )}
      <input
        id={name}
        name={name}
        type="file"
        onChange={onChange}
        accept={accept}
        required={required}
        disabled={disabled}
        multiple={multiple}
        className="form-file"
      />
      {error && <span className="form-error">{error}</span>}
      {helperText && !error && <span className="form-helper">{helperText}</span>}
    </div>
  );
}
