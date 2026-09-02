import React, { useMemo } from 'react';
import { Landmark, Plus, ArrowLeftRight } from 'lucide-react';
import DynamicIcon from '../DynamicIcon';
import { useSettings } from '../../context/SettingsContext';

export default function TopAccountsWidget({
  accounts = [],
  onNavigateTab,
  onCreateAccount,
  onTransfer,
  className = ''
}) {
  const { t, formatCurrency, convertToGlobal, baseCurrency } = useSettings();

  const topAccounts = useMemo(() => {
    const list = Array.isArray(accounts) ? accounts.filter(Boolean) : [];
    return [...list]
      .sort((a, b) => {
        if (convertToGlobal) {
          const globalB = convertToGlobal(Number(b.balance || 0), b.currency || baseCurrency);
          const globalA = convertToGlobal(Number(a.balance || 0), a.currency || baseCurrency);
          if (globalB !== globalA) return globalB - globalA;
        }
        return Number(b.balance || 0) - Number(a.amount || a.balance || 0);
      })
      .slice(0, 3);
  }, [accounts, convertToGlobal, baseCurrency]);

  return (
    <div className={`growy-glass growy-card-hover rounded-2xl p-4 sm:p-6 h-full flex flex-col justify-between space-y-4 overflow-hidden isolate transform-gpu-layer ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Landmark className="w-4 h-4 text-[var(--accent)]" />
          <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
            {t('dashboard.topAccounts', {}, 'Cuentas Principales')}
          </h2>
        </div>
        {onNavigateTab && (
          <button 
            onClick={() => onNavigateTab('accounts')}
            className="text-xs font-semibold text-[var(--accent)] hover:underline cursor-pointer"
          >
            {t('dashboard.viewAccounts', {}, 'Ver Cuentas')}
          </button>
        )}
      </div>

      <div className="space-y-3 flex-1">
        {topAccounts.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-300 space-y-2">
            <p>{t('dashboard.noAccounts', {}, 'No tienes cuentas registradas.')}</p>
            {onCreateAccount && (
              <button
                onClick={onCreateAccount}
                className="px-4 h-11 rounded-xl bg-[var(--accent)] text-[var(--accent-text)] font-semibold text-xs inline-flex items-center gap-1 shadow hover:brightness-105 active:scale-[0.98] transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> {t('dashboard.createAccount', {}, 'Crear Cuenta')}
              </button>
            )}
          </div>
        ) : (
          topAccounts.map((acc) => (
            <div 
              key={acc.id}
              onClick={() => onNavigateTab && onNavigateTab('accounts')}
              className="p-3 sm:p-3.5 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between hover:bg-white/[0.06] hover:border-[var(--accent)]/40 hover:scale-[1.005] active:scale-[0.995] transition-all cursor-pointer group"
              title={t('dashboard.viewAccounts', {}, 'Ver Cuentas')}
            >
              <div className="flex items-center gap-3 min-w-0 pr-2">
                <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-base shrink-0 group-hover:scale-110 transition-transform overflow-hidden">
                  <DynamicIcon value={acc.emoji || acc.icon || acc.logo} fallback="🏦" className="w-5 h-5 text-base" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-semibold text-white truncate max-w-[120px] group-hover:text-[var(--accent)] transition-colors">
                    {acc.name}
                  </h4>
                  <span className="text-[11px] text-slate-300 font-medium">
                    {acc.currency || 'USD'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-bold text-white tabular-nums">
                  {formatCurrency(acc.balance, acc.currency || 'USD')}
                </span>
                {onTransfer && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onTransfer(acc);
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-[var(--accent)] hover:bg-[var(--accent-muted)] active:scale-95 transition-all cursor-pointer"
                    title={t('dashboard.transferBetween', {}, 'Transferir entre cuentas')}
                  >
                    <ArrowLeftRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
