import React from 'react';
import { Trash2 } from 'lucide-react';
import DynamicIcon from '../DynamicIcon';

/**
 * Tarjeta de Cuenta Bancaria con geometría de caja 100% estable en hover.
 * Evita transformaciones (translateY / scale) o cambios de border-width sobre el hitbox
 * para eliminar cualquier bucle de parpadeo (hover flicker loop) en los bordes.
 */
export default function AccountCard({
  account,
  onEdit,
  onDelete,
  formatCurrency,
  t
}) {
  if (!account) return null;

  const bgGradient = account.color
    ? `linear-gradient(135deg, ${account.color}25 0%, rgba(15, 23, 42, 0.85) 100%)`
    : 'linear-gradient(135deg, rgba(174, 237, 208, 0.15) 0%, rgba(15, 23, 42, 0.85) 100%)';

  return (
    <div
      onClick={() => onEdit && onEdit(account)}
      className="relative rounded-2xl bg-slate-900/60 border border-slate-800/80 p-5 sm:p-6 transition-colors duration-200 hover:border-slate-700/80 hover:bg-slate-900/90 hover:shadow-2xl overflow-hidden flex flex-col justify-between min-h-[175px] sm:min-h-[200px] shadow-xl group cursor-pointer"
      style={{ backgroundImage: bgGradient }}
    >
      {/* Subtle hover highlight overlay (pointer-events-none so hitbox never shifts) */}
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-white/[0.03]"
        aria-hidden="true"
      />

      {/* Top Bar: Bank Brand & EMV Chip */}
      <div className="flex items-start justify-between relative z-10">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 pr-2">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-lg sm:text-xl border border-white/10 shadow-inner shrink-0 overflow-hidden">
            <DynamicIcon value={account.emoji} fallback="💳" className="w-5 h-5 sm:w-6 sm:h-6 text-lg sm:text-xl" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-bold text-white tracking-tight truncate">
              {account.name}
            </h3>
            <span className="text-xs font-semibold text-slate-300 tracking-widest uppercase block mt-0.5">
              {account.currency || 'USD'}
            </span>
          </div>
        </div>

        {/* Simulation EMV Chip */}
        <div className="w-8 sm:w-9 h-6 sm:h-7 rounded-md bg-amber-400/20 border border-amber-300/30 flex items-center justify-center opacity-80 shrink-0">
          <div className="w-5 sm:w-6 h-3.5 sm:h-4 border border-amber-300/40 rounded-sm grid grid-cols-2 gap-0.5 p-0.5">
            <div className="bg-amber-300/30 rounded-xs" />
            <div className="bg-amber-300/30 rounded-xs" />
          </div>
        </div>
      </div>

      {/* Middle Balance Amount */}
      <div className="relative z-10 my-auto py-2">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-wider text-slate-300 font-semibold block mb-0.5">
            {t('accounts.availableBalance', {}, 'Balance Disponible')}
          </span>
          <span className="text-[11px] text-slate-400 font-medium tabular-nums">
            {t('accounts.initial_balance_label', {}, t('modals.account.initialBalance', {}, 'Inicial'))}: {formatCurrency(account.initialBalance ?? account.balance ?? 0, account.currency)}
          </span>
        </div>
        <div className="text-xl sm:text-3xl font-extrabold text-white tracking-tight tabular-nums truncate">
          {formatCurrency(account.balance, account.currency)}
        </div>
      </div>

      {/* Bottom Footer Bar: Account Actions */}
      <div className="flex items-center justify-between pt-2.5 sm:pt-3 border-t border-white/10 relative z-10">
        <span className="text-xs text-slate-300 font-medium tabular-nums">
          **** **** {account.id ? account.id.slice(-4) : '8888'}
        </span>

        <div className="flex items-center gap-1 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onDelete) onDelete(account);
            }}
            className="p-1.5 rounded-xl text-slate-300 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
            title={t('common.delete', {}, 'Eliminar')}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
