import React from 'react';

export default function EmptyState({ icon = null, title = 'Rien ici', subtitle = '', action = null, className = '' }) {
  return (
    <div className={`empty-state ${className}`.trim()}>
      <div style={{ display: 'grid', gap: 10, alignItems: 'center', justifyItems: 'center' }}>
        {icon}
        <div style={{ fontWeight: 700, fontSize: '14px' }}>{title}</div>
        {subtitle ? <div style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>{subtitle}</div> : null}
        {action}
      </div>
    </div>
  );
}
