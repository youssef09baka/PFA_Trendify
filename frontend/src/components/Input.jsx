import React from 'react';

const Input = React.forwardRef(function Input(props, ref) {
  const {
    id,
    label,
    type = 'text',
    value,
    onChange,
    placeholder,
    icon,
    name,
    required,
    error,
    helper,
    disabled = false,
    className = '',
    ...rest
  } = props;

  const inputId = id || name;
  const describedBy = error ? `${inputId}-error` : helper ? `${inputId}-helper` : undefined;
  const inputClassName = ['input-field', icon ? 'input-field--icon' : '', disabled ? 'input-field--disabled' : '']
    .filter(Boolean)
    .join(' ');

  return (
    <div className={`input-control ${className}`.trim()}>
      {label ? (
        <label htmlFor={inputId} className="input-label">
          {label}
        </label>
      ) : null}

      <div className="input-wrapper">
        {icon ? <div className="input-icon">{icon}</div> : null}

        <input
          id={inputId}
          name={name}
          ref={ref}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          className={inputClassName}
          {...rest}
        />
      </div>

      {error ? (
        <div id={`${inputId}-error`} className="input-error">
          {error}
        </div>
      ) : helper ? (
        <div id={`${inputId}-helper`} className="input-helper">
          {helper}
        </div>
      ) : null}
    </div>
  );
});

export default Input;
