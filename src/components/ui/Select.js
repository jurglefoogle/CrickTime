import React from 'react';

/**
 * Select Component
 * Reference: www.context7.com for accessible select patterns
 */
const Select = ({ 
  label,
  id,
  options = [],
  error,
  className = '',
  placeholder = 'Select an option',
  ...props 
}) => {
  const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;
  
  return (
    <div className="input-group">
      {label && (
        <label htmlFor={selectId} className="input-label">
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={`select ${error ? 'input-error' : ''} ${className}`}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="input-error-text" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

export default Select;
