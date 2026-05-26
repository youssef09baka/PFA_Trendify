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
  href,
  target,
  rel,
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
  const content = loading ? (
    <span style={{ opacity: 0.9 }}>Chargement…</span>
  ) : iconOnly ? (
    icon || null
  ) : (
    <>
      {icon ? <span style={{ display: 'inline-flex', marginRight: 8 }}>{icon}</span> : null}
      <span>{children}</span>
    </>
  );

  if (href) {
    return (
      <a
        href={!disabled ? href : undefined}
        target={target}
        rel={target === '_blank' ? rel || 'noreferrer noopener' : rel}
        className={cls}
        aria-disabled={disabled || loading}
        {...props}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      type={type}
      className={cls}
      onClick={onClick}
      disabled={disabled || loading}
      aria-busy={loading}
      {...props}
    >
      {content}
    </button>
  );
}
