import React, { useState, useMemo } from 'react';
import { AlertCircle, CalendarClock, ArrowRight, CheckCircle2, X } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { formatCurrency, parseNumeric, getDaysDifference } from '../utils/formatters';

export default function DebtDueBanner({ 
  loans = [], 
  onNavigateToDebts, 
  onPayDebt 
}) {
  const { t, language, baseCurrency } = useSettings();
  const [dismissedIds, setDismissedIds] = useState(new Set());

  const activeAlerts = useMemo(() => {
    const safeLoans = Array.isArray(loans) ? loans.filter(Boolean) : [];
    const pendingWithDue = safeLoans.filter(l => 
      (l.status === 'pending' || !l.status) && (l.dueDate || l.due_date)
    );

    const evaluated = [];

    for (const loan of pendingWithDue) {
      if (dismissedIds.has(loan.id)) continue;

      const dueDateStr = loan.dueDate || loan.due_date;
      if (!dueDateStr) continue;

      const diffDays = getDaysDifference(dueDateStr);
      if (diffDays === null) continue;

      const concept = loan.concept || loan.description || t('modals.loan.description', {}, 'Saldo Pendiente');
      const loanCurrency = loan.currency || baseCurrency || 'HNL';
      const formattedAmount = formatCurrency(parseNumeric(loan.amount, 0), loanCurrency);

      if (diffDays < 0) {
        const daysOverdue = Math.abs(diffDays);
        const daysLabel = daysOverdue === 1 ? t('debtAlerts.daysSingular', {}, 'día') : t('debtAlerts.daysPlural', {}, 'días');
        evaluated.push({
          loan,
          type: 'overdue',
          priority: 1,
          daysOverdue,
          message: t('debtAlerts.overdueDays', { concept, days: daysOverdue, daysLabel, formattedAmount }, `⚠️ "${concept}" venció hace ${daysOverdue} ${daysLabel} (${formattedAmount})`),
          badgeClass: 'bg-rose-500/15 border-rose-500/30 text-rose-300',
          containerClass: 'bg-rose-950/40 border-rose-500/40 text-rose-200 shadow-[0_0_20px_rgba(244,63,94,0.15)]',
          icon: AlertCircle
        });
      } else if (diffDays === 0) {
        evaluated.push({
          loan,
          type: 'today',
          priority: 2,
          message: t('debtAlerts.dueToday', { concept, formattedAmount }, `📅 "${concept}" vence hoy (${formattedAmount})`),
          badgeClass: 'bg-amber-500/15 border-amber-500/30 text-amber-300',
          containerClass: 'bg-amber-950/40 border-amber-500/40 text-amber-200 shadow-[0_0_20px_rgba(245,158,11,0.15)]',
          icon: CalendarClock
        });
      } else if (diffDays === 1) {
        evaluated.push({
          loan,
          type: 'tomorrow',
          priority: 3,
          message: t('debtAlerts.dueTomorrow', { concept, formattedAmount }, `📅 "${concept}" vence mañana (${formattedAmount})`),
          badgeClass: 'bg-sky-500/15 border-sky-500/30 text-sky-300',
          containerClass: 'bg-sky-950/40 border-sky-500/40 text-sky-200 shadow-[0_0_20px_rgba(14,165,233,0.12)]',
          icon: CalendarClock
        });
      }
    }

    return evaluated.sort((a, b) => a.priority - b.priority);
  }, [loans, dismissedIds, t, baseCurrency]);

  if (activeAlerts.length === 0) return null;

  const handleDismiss = (e, loanId) => {
    e.stopPropagation();
    setDismissedIds(prev => new Set([...prev, loanId]));
  };

  return (
    <div className="w-full space-y-2.5 mb-4 animate-fadeIn">
      {activeAlerts.map(({ loan, type, message, containerClass, badgeClass, icon: Icon }) => (
        <div
          key={loan.id}
          onClick={() => {
            if (onNavigateToDebts) onNavigateToDebts(loan);
          }}
          className={`p-3 sm:p-3.5 rounded-2xl border backdrop-blur-xl flex items-center justify-between gap-3 transition-all hover:scale-[1.005] cursor-pointer group ${containerClass}`}
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${badgeClass}`}>
              <Icon className="w-4 h-4" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm font-bold tracking-tight leading-snug line-clamp-2">
                {message}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onPayDebt && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onPayDebt(loan);
                }}
                className="hidden sm:inline-flex items-center gap-1 py-1 px-3 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all active:scale-95"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{t('debtAlerts.payDebt', {}, 'Pagar')}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                if (onNavigateToDebts) onNavigateToDebts(loan);
              }}
              className="inline-flex items-center gap-1 py-1 px-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-all group-hover:bg-[var(--accent)] group-hover:text-[var(--accent-text)]"
            >
              <span className="hidden md:inline">{t('debtAlerts.viewDebts', {}, 'Ver Saldos')}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={(e) => handleDismiss(e, loan.id)}
              className="p-1 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
              title={t('debtAlerts.dismiss', {}, 'Ocultar')}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
