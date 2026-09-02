import React from 'react';

/**
 * Standardized Growy Button Component (Mobile & Desktop)
 *
 * Typography & Sizing:
 * - sm: h-9 px-3 text-xs font-medium rounded-lg
 * - md (Standard PC/Mobile): h-11 px-4 text-sm font-semibold tracking-wide rounded-xl
 * - lg: h-12 px-6 text-base font-semibold tracking-wide rounded-xl
 *
 * Variants:
 * - primary: bg-[var(--accent)] text-[var(--accent-text)] with hover brightness & active scale
 * - secondary: bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10
 * - ghost: text-slate-400 hover:text-[var(--accent)] hover:bg-[var(--accent-muted)]
 * - icon: p-2.5 text-slate-400 hover:text-[var(--accent)] hover:bg-[var(--accent-muted)] rounded-xl
 * - danger: bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20
 * - danger-solid: bg-rose-500 hover:bg-rose-600 text-white font-semibold
 */
export const Button = React.forwardRef(({
  children,
  type = 'button',
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconPosition = 'left',
  isLoading = false,
  disabled = false,
  fullWidth = false,
  className = '',
  onClick,
  title,
  'aria-label': ariaLabel,
  ...rest
}, ref) => {
  const baseClasses = 'inline-flex items-center justify-center font-semibold select-none cursor-pointer transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none whitespace-nowrap';

  const sizeClasses = {
    sm: 'h-9 px-3 text-xs font-medium rounded-lg gap-1.5',
    md: 'h-11 px-4 text-sm font-semibold tracking-wide rounded-xl gap-2',
    lg: 'h-12 px-6 text-base font-semibold tracking-wide rounded-xl gap-2.5',
    icon_sm: 'w-9 h-9 p-0 text-xs rounded-lg',
    icon_md: 'w-11 h-11 p-0 text-sm rounded-xl',
    icon_lg: 'w-12 h-12 p-0 text-base rounded-xl'
  };

  const variantClasses = {
    primary: 'bg-[var(--accent,#97F2CC)] text-[var(--accent-text,#091E15)] hover:brightness-105 shadow-md shadow-[var(--accent,#97F2CC)]/15 border border-transparent',
    secondary: 'bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 shadow-sm',
    ghost: 'text-slate-400 hover:text-[var(--accent,#97F2CC)] hover:bg-[var(--accent-muted,rgba(151,242,204,0.15))] bg-transparent border border-transparent',
    icon: 'text-slate-400 hover:text-[var(--accent,#97F2CC)] hover:bg-[var(--accent-muted,rgba(151,242,204,0.15))] bg-transparent border border-transparent',
    danger: 'bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 shadow-sm',
    'danger-solid': 'bg-rose-500 hover:bg-rose-600 text-white font-semibold shadow-md shadow-rose-500/20 border border-transparent'
  };

  const resolvedSize = variant === 'icon' ? (size === 'sm' ? 'icon_sm' : size === 'lg' ? 'icon_lg' : 'icon_md') : size;
  const currentSizeClass = sizeClasses[resolvedSize] || sizeClasses.md;
  const currentVariantClass = variantClasses[variant] || variantClasses.primary;
  const widthClass = fullWidth ? 'w-full' : '';

  return (
    <button
      ref={ref}
      type={type}
      onClick={onClick}
      disabled={disabled || isLoading}
      title={title}
      aria-label={ariaLabel || title}
      className={`${baseClasses} ${currentSizeClass} ${currentVariantClass} ${widthClass} ${className}`}
      {...rest}
    >
      {isLoading ? (
        <span className="inline-flex items-center justify-center gap-2 whitespace-nowrap">
          <svg className="animate-spin h-4 w-4 shrink-0 text-current opacity-80" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          {children && <span>{children}</span>}
        </span>
      ) : (
        <span className="inline-flex items-center justify-center gap-2 whitespace-nowrap">
          {Icon && iconPosition === 'left' && (
            <Icon className={`shrink-0 ${size === 'sm' ? 'w-3.5 h-3.5' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4'}`} />
          )}
          {children && <span>{children}</span>}
          {Icon && iconPosition === 'right' && (
            <Icon className={`shrink-0 ${size === 'sm' ? 'w-3.5 h-3.5' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4'}`} />
          )}
        </span>
      )}
    </button>
  );
});

export const UiButton = Button;
export default Button;
