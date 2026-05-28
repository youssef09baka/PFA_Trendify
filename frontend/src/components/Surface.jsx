import React from 'react';
import Card from './Card';

// Surface: lightweight wrapper around Card for semantic surfaces
export default function Surface({ children, className = '', ...props }) {
  return (
    <Card className={className} {...props}>{children}</Card>
  );
}
