import React from 'react';
import { Trash2, Scale } from 'lucide-react';
import DynamicIcon from './DynamicIcon';
import { formatLoanDescription } from '../utils/formatters';

/**
 * Fila estandarizada del Libro Mayor de Transacciones (TransactionRow).
 * Renderiza el badge neutro de cuenta virtual ("Saldos Pendientes" / "Pending Balances")
 * con icono de balanza cuando type === 'transfer' y account_id o destination_account_id es null.
 */
export default function TransactionRow({
  tx,
  dateStr = '',
  accounts = [],
  categories = [],
  onEdit,
  onDelete,
  formatCurrency,
  t,
  isEs = true
}) {
  if (!tx) return null;

  const sourceAccId = tx?.accountId || tx?.account_id || null;
  const destAccId = tx?.targetAccountId || tx?.destinationAccountId || tx?.destination_account_id || null;

  const sourceAcc = accounts.find(a => a && a.id === sourceAccId) || null;
  const destAcc = accounts.find(a => a && a.id === destAccId) || null;
  const cat = categories.find(c => c && c.id === (tx?.categoryId || tx?.category_id)) || null;

  const isIncome = tx?.type === 'income';
  const isExpense = tx?.type === 'expense';
  const isTransfer = tx?.type === 'transfer';

  const isSourceVirtual = isTransfer && !sourceAcc;
  const isDestVirtual = isTransfer && !destAcc;
  const isVirtualTransfer = isTransfer && (isSourceVirtual || isDestVirtual);

  const virtualAccountLabel = t(
    'debts.virtualAccountShort',
    {},
    isEs ? 'Saldos Pendientes' : 'Pending Balances'
  );

  const sourceAccName = sourceAcc
    ? sourceAcc.name
    : isSourceVirtual
      ? virtualAccountLabel
      : t('transactions.accountFilter', {}, isEs ? 'Cuenta' : 'Account');

  const destAccName = destAcc
    ? destAcc.name
    : isDestVirtual
      ? virtualAccountLabel
      : '';

  const catName = cat?.name || t('transactions.categoryFilter', {}, isEs ? 'General' : 'General');

  const emoji = isTransfer
    ? (isVirtualTransfer ? '⏳' : '🔁')
    : (cat?.emoji || (isIncome ? '💰' : '💸'));

  const rawDescription = tx?.description || catName || t('transactions.movement', {}, isEs ? 'Movimiento' : 'Transaction');
  const localizedDesc = formatLoanDescription(rawDescription, isEs);

  const txTitle = isVirtualTransfer
    ? localizedDesc
    : (isTransfer && destAccName ? (tx?.description ? localizedDesc : `${sourceAccName} ➔ ${destAccName}`) : localizedDesc);

  const displayDate = tx?.date || tx?.transactionDate || tx?.transaction_date || dateStr;
  const displayCurrency = tx?.currency || sourceAcc?.currency || destAcc?.currency || 'USD';

  return (
    <div
      onClick={() => onEdit && onEdit(tx)}
      className="p-3.5 sm:px-5 sm:py-3.5 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between gap-4 hover:bg-white/[0.06] transition-colors duration-200 group cursor-pointer"
    >
      {/* Col 1 (Izquierda): Icono + Concepto */}
      <div className="flex items-center gap-3.5 min-w-0 flex-1 sm:max-w-xs lg:max-w-sm">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 overflow-hidden ${
            isIncome
              ? 'bg-[var(--accent-muted,rgba(151,242,204,0.15))] text-[var(--accent,#97F2CC)] border border-[var(--accent,#97F2CC)]/20'
              : isExpense
                ? 'bg-rose-500/15 text-rose-400 border border-rose-500/20'
                : 'bg-sky-500/15 text-sky-400 border border-sky-500/20'
          }`}
        >
          <DynamicIcon value={emoji} fallback="💰" className="w-5 h-5 text-lg" />
        </div>

        <div className="min-w-0 flex-1">
          <h4 className="line-clamp-2 sm:truncate text-sm font-semibold text-white group-hover:text-slate-200 transition-colors">
            {txTitle}
          </h4>
          <p className="text-xs text-slate-300 font-medium sm:hidden truncate mt-0.5">
            {isTransfer
              ? `${sourceAccName} ➔ ${destAccName}`
              : `${sourceAccName} • ${catName}`}
          </p>
        </div>
      </div>

      {/* Col 2 (Centro-Izquierda): Badge de Cuenta y Categoría / Destino (Desktop) */}
      <div className="hidden sm:flex items-center gap-2 min-w-0 flex-1">
        {isSourceVirtual ? (
          <span
            className="text-slate-300 bg-slate-800/60 border border-slate-700/60 rounded-lg px-2.5 py-1 text-xs font-medium truncate max-w-[165px] inline-flex items-center gap-1.5 shrink-0"
            title={virtualAccountLabel}
          >
            <Scale className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{virtualAccountLabel}</span>
          </span>
        ) : (
          <span
            className="text-xs font-medium text-slate-300 px-2.5 py-1 rounded-lg bg-white/5 border border-white/5 truncate max-w-[140px]"
            title={sourceAccName}
          >
            🏦 {sourceAccName}
          </span>
        )}

        {isTransfer ? (
          <>
            <span className="text-slate-500 text-xs font-bold shrink-0">➔</span>
            {isDestVirtual ? (
              <span
                className="text-slate-300 bg-slate-800/60 border border-slate-700/60 rounded-lg px-2.5 py-1 text-xs font-medium truncate max-w-[165px] inline-flex items-center gap-1.5 shrink-0"
                title={virtualAccountLabel}
              >
                <Scale className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{virtualAccountLabel}</span>
              </span>
            ) : destAcc ? (
              <span
                className="text-xs font-medium text-slate-300 px-2.5 py-1 rounded-lg bg-white/5 border border-white/5 truncate max-w-[140px]"
                title={destAcc.name}
              >
                🏦 {destAcc.name}
              </span>
            ) : null}
          </>
        ) : (
          <span
            className="text-xs font-medium text-slate-300 px-2.5 py-1 rounded-lg bg-white/5 border border-white/5 truncate max-w-[140px]"
            title={catName}
          >
            🏷️ {catName}
          </span>
        )}
      </div>

      {/* Col 3 (Centro-Derecha): Fecha legible (Desktop) */}
      <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-400 font-medium shrink-0 w-28">
        <span>🕒 {displayDate}</span>
      </div>

      {/* Col 4 (Derecha): Monto formateado grande + Botón eliminar */}
      <div className="flex items-center gap-3 shrink-0">
        <div
          className={`text-base font-bold tabular-nums ${
            isIncome ? 'text-[var(--accent,#97F2CC)]' : isExpense ? 'text-rose-400' : 'text-sky-400'
          }`}
        >
          {isIncome ? '+ ' : isExpense ? '- ' : ''}
          {formatCurrency ? formatCurrency(tx?.amount, displayCurrency) : `${tx?.amount}`}
        </div>

        <div className="flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onDelete) onDelete(tx);
            }}
            className="p-1.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
            title={t('common.delete', {}, 'Eliminar')}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
