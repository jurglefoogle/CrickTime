import React from 'react';

/**
 * Button Component - Modern minimalist design
 * Uses blue accent color for primary actions
 */
const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'normal',
  special = null,
  disabled = false,
  className = '',
  ...props 
}) => {
  const getButtonClasses = () => {
    let classes = 'btn';
    
    // Special button types (timer buttons)
    if (special === 'start') {
      classes += ' btn-start';
    } else if (special === 'stop') {
      classes += ' btn-stop';
    } else {
      // Standard variants
      switch (variant) {
        case 'secondary':
          classes += ' btn-secondary';
          break;
        case 'success':
          classes += ' btn-success';
          break;
        case 'warning':
          classes += ' btn-warning';
          break;
        default:
          classes += ' btn-primary';
      }
    }
    
    // Size variations
    switch (size) {
      case 'small':
        classes += ' btn-small';
        break;
      case 'large':
        classes += ' btn-large';
        break;
      default:
        // normal size is default
    }
    
    // Disabled state
    if (disabled) {
      classes += ' opacity-50 cursor-not-allowed';
    }
    
    return `${classes} ${className}`;
  };

  return (
    <button className={getButtonClasses()} disabled={disabled} {...props}>
      {children}
    </button>
  );
};

export default Button;
