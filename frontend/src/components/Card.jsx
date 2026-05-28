import React from 'react';

export default function Card({ children, className = '', elevated = false, compact = false, ...props }) {
  const classes = ['card', elevated ? 'card--elevated' : '', compact ? 'card--compact' : '', className].filter(Boolean).join(' ');
  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
}
