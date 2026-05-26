import React from 'react';

export default function LoadingSkeleton({ width = '100%', height = 12, radius = 8, className = '' }) {
  return (
    <div className={className} style={{ width, height, borderRadius: radius, background: 'linear-gradient(90deg, rgba(255,255,255,0.02), rgba(255,255,255,0.04), rgba(255,255,255,0.02))' }} />
  );
}
