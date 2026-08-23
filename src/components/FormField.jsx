import React from 'react';

export default function FormField({
  label,
  error,
  helperText,
  prefix,
  className = '',
  children,
  ...props
}) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label className="whitespace-nowrap text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5 block">
          {label}
        </label>
      )}

      {children ? (
        children
      ) : (
        <div className="relative">
          {prefix && (
            <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-[var(--color-primary,#97F2CC)] font-bold text-sm pointer-events-none">
              {prefix}
            </span>
          )}
          <input
            className={`w-full h-11 ${prefix ? 'pl-9 pr-4' : 'px-4'} rounded-xl bg-[#121721] border border-white/[0.08] text-[#F1F5F9] placeholder:text-slate-500 text-sm font-medium transition-all focus:outline-none focus:border-[#97F2CC] focus:ring-1 focus:ring-[#97F2CC] ${
              error ? 'border-rose-500/50 focus:border-rose-500' : ''
            }`}
            {...props}
          />
        </div>
      )}

      {error && (
        <p className="text-[11px] font-medium text-rose-400 mt-1">{error}</p>
      )}
      {helperText && !error && (
        <p className="text-[11px] text-slate-400 mt-1">{helperText}</p>
      )}
    </div>
  );
}
