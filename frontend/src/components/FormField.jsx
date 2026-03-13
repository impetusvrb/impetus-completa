import React from 'react';

export function InputField({ label, name, value, onChange, type = 'text', placeholder, required, disabled, ...props }) {
  return (
    <div className="form-field">
      {label && <label className="form-label">{label}{required && ' *'}</label>}
      <input
        type={type}
        name={name}
        value={value ?? ''}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        className="form-input"
        {...props}
      />
    </div>
  );
}

export function SelectField({ label, name, value, onChange, options = [], placeholder, required, disabled, ...props }) {
  return (
    <div className="form-field">
      {label && <label className="form-label">{label}{required && ' *'}</label>}
      <select name={name} value={value ?? ''} onChange={onChange} required={required} disabled={disabled} className="form-input" {...props}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

export function TextAreaField({ label, name, value, onChange, rows = 4, placeholder, required, disabled, ...props }) {
  return (
    <div className="form-field">
      {label && <label className="form-label">{label}{required && ' *'}</label>}
      <textarea name={name} value={value ?? ''} onChange={onChange} rows={rows} placeholder={placeholder} required={required} disabled={disabled} className="form-textarea" {...props} />
    </div>
  );
}

export function CheckboxField({ label, name, checked, onChange, ...props }) {
  return (
    <div className="form-field form-field--checkbox">
      <label>
        <input type="checkbox" name={name} checked={checked ?? false} onChange={onChange} {...props} />
        {label}
      </label>
    </div>
  );
}
