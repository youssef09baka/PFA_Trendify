import React from 'react';

export default function Button({
  variant = 'primary',
  children,
  onClick,
  className = '',
  type = 'button',
  icon = null,
  iconOnly = false,
  loading = false,
  disabled = false,
  ...props
}) {
  const base = 'btn';
  let kind = '';
  switch (variant) {
    case 'primary': kind = 'btn-primary'; break;
    case 'ghost': kind = 'btn-ghost'; break;
    case 'destructive': kind = 'btn-destructive'; break;
    case 'secondary': kind = 'btn-secondary'; break;
    default: kind = 'btn-ghost';
  }

  const cls = `${base} ${kind} ${className}`.trim();

  return (
    <button
      type={type}
      className={cls}
      onClick={onClick}
      disabled={disabled || loading}
      aria-busy={loading}
      {...props}
    >
      {loading ? (
        <span style={{ opacity: 0.9 }}>Chargement…</span>
      ) : iconOnly ? (
        icon || null
      ) : (
        <>
          {icon ? <span style={{ display: 'inline-flex', marginRight: 8 }}>{icon}</span> : null}
          <span>{children}</span>
        </>
      )}
    </button>
  );
}
