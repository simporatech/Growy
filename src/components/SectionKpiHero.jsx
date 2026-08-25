import React from 'react';

/**
 * Standardized KPI Hero Banner component for all main Growy views.
 * Displays prominent consolidated metrics converted to base currency with clean aesthetics.
 */
export default function SectionKpiHero({
  title,
  amount,
  currency,
  formattedAmount,
  secondaryLabel,
  secondaryValue,
  badgeText,
  badgeColor,
  icon: Icon,
  iconBgColor = 'bg-[var(--accent-muted,rgba(151,242,204,0.15))]',
  iconBorderColor = 'border-[var(--accent,#97F2CC)]/30',
  iconTextColor = 'text-[var(--accent,#97F2CC)]',
  children,
  className = '',
  isLoading = false
}) {
  return (
    <div className={`w-full p-4 sm:p-5 md:p-6 rounded-2xl md:rounded-3xl bg-[#141E22]/70 border border-white/[0.08] backdrop-blur-xl shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10 transition-all ${className}`}>
      
      {/* Primary KPI Section */}
      <div className="flex items-center gap-3.5 sm:gap-4 min-w-0 flex-1">
        {Icon && (
          <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl ${iconBgColor} border ${iconBorderColor} flex items-center justify-center ${iconTextColor} shrink-0 shadow-inner`}>
            <Icon className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
        )}
        
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] sm:text-xs font-semibold tracking-wider text-slate-400 uppercase block truncate">
              {title}
            </span>
            {badgeText && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border shrink-0 ${badgeColor || 'bg-[var(--accent-muted,rgba(151,242,204,0.15))] text-[var(--accent,#97F2CC)] border-[var(--accent,#97F2CC)]/30'}`}>
                {badgeText}
              </span>
            )}
          </div>
          
          {isLoading ? (
            <div className="h-8 sm:h-9 w-44 bg-white/5 rounded-lg animate-pulse my-1" />
          ) : (
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight tabular-nums block truncate">
                {formattedAmount || amount}
              </span>
              {currency && (
                <span className="text-xs sm:text-sm font-bold text-[var(--accent,#97F2CC)] uppercase tracking-wider">
                  {currency}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Secondary Details / Slot */}
      {(secondaryLabel || secondaryValue || children) && (
        <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 sm:border-l border-white/5 pt-3 sm:pt-0 sm:pl-5 shrink-0">
          {children ? (
            children
          ) : (
            <div className="text-left sm:text-right">
              {secondaryLabel && (
                <span className="text-xs text-slate-400 font-medium block">
                  {secondaryLabel}
                </span>
              )}
              {secondaryValue && (
                <span className="text-sm font-bold text-white tabular-nums block mt-0.5">
                  {secondaryValue}
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
