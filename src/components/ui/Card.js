import React from 'react';

/**
 * Card Component - Modern minimalist design
 * Soft shadows with subtle contrast instead of gradient borders
 */
const Card = ({ children, className = '' }) => {
  return (
    <div className={`card ${className}`}>
      <div className="card-content">
        {children}
      </div>
    </div>
  );
};

export default Card;
