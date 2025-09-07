import React from 'react';

/**
 * Input Component
 * Reference: www.context7.com for form input accessibility
 */
const Input = ({ 
  label,
  id,
  error,
  multiline = false,
  className = '',
  ...props 
}) => {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
  const Component = multiline ? 'textarea' : 'input';
  
  return (
    <div className="input-group">
      {label && (
        <label htmlFor={inputId} className="input-label">
          {label}
        </label>
      )}
      <Component
        id={inputId}
        className={`input ${error ? 'input-error' : ''} ${className}`}
        rows={multiline ? 3 : undefined}
        {...props}
      />
      {error && (
        <p className="input-error-text" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

export default Input;
