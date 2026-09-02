import React, { useState, useEffect, useMemo } from 'react';
import { PlusCircle, Wallet, ArrowDownLeft, ArrowUpRight, Sparkles, AlertCircle } from 'lucide-react';
import Button from './Button';
import CustomSelect from './CustomSelect';
import CustomDatePicker from './CustomDatePicker';
import ModalWrapper from './ModalWrapper';
import FormField from './FormField';
import { useSettings } from '../context/SettingsContext';
import { formatCurrency, parseNumeric, formatDateISO } from '../utils/formatters';
import { getCurrencySymbol } from '../utils/currency';
import { calculateDebtRemaining } from '../services/debtsService';

/**
 * DebtPaymentModal (Modal de Registro de Abonos)
 */
export default function DebtPaymentModal({ 
  isOpen, 
  onClose, 
  onConfirmPayment, 
  debt,
  payments = [],
  accounts = [] 
}) {
  const { t, baseCurrency } = useSettings();

  const [amount, setAmount] = useState('');
  const [accountId, setAccountId] = useState('');
  const [paymentDate, setPaymentDate] = useState(formatDateISO());
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const calculations = useMemo(() => {
    return calculateDebtRemaining(debt, payments);
  }, [debt, payments]);

  const debtType = (debt?.type || '').toLowerCase();
  const isPayable = debtType === 'payable' || debtType === 'debt' || !debtType;
  const debtCurr = debt?.currency || baseCurrency || 'USD';
  const currencySymbol = getCurrencySymbol(debtCurr);

  const safeAccounts = useMemo(() => {
    const list = Array.isArray(accounts) ? accounts.filter(Boolean) : [];
    return [...list].sort((a, b) => 
      (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' })
    );
  }, [accounts]);

  useEffect(() => {
    if (!isOpen || !debt) return;

    if (safeAccounts.length > 0) {
      const matchingAcc = safeAccounts.find(a => (a?.currency || '').toUpperCase() === debtCurr.toUpperCase()) || safeAccounts[0];
      setAccountId(matchingAcc?.id || '');
    } else {
      setAccountId('');
    }

    setAmount('');
    setPaymentDate(formatDateISO());
    setNotes('');
    setError('');
    setIsSubmitting(false);
  }, [isOpen, debt, safeAccounts, debtCurr]);

  if (!isOpen || !debt) return null;

  const accountSelectOptions = safeAccounts.map(acc => ({
    value: acc.id,
    name: acc.name,
    emoji: acc.emoji || '🏦',
    currency: acc.currency || 'USD',
    extra: `- Balance: ${formatCurrency(acc.balance, acc.currency || 'USD')}`,
    label: acc.name
  }));

  const handlePayAll = () => {
    setAmount(calculations.remainingAmount.toFixed(2));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const numAmount = parseNumeric(amount, -1);
    if (numAmount <= 0) {
      setError(t('debts.invalidAmountError', {}, 'Ingresa un monto de abono válido mayor a 0'));
      return;
    }

    if (numAmount > calculations.remainingAmount + 0.001) {
      setError(t('debts.amountExceedsRemainingError', {}, `El abono no puede ser mayor al saldo restante (${formatCurrency(calculations.remainingAmount, debtCurr)})`));
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirmPayment({
        debt,
        amount: numAmount,
        paymentDate,
        accountId: accountId || null,
        notes: notes.trim()
      });
      onClose();
    } catch (err) {
      console.error('Error procesando abono:', err);
      setError(err.message || 'Error al procesar el abono');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalWrapper
      isOpen={isOpen}
      onClose={onClose}
      title={isPayable ? t('debts.payDebtTitle', {}, 'Abonar a Deuda') : t('debts.collectDebtTitle', {}, 'Registrar Cobro / Abono')}
      subtitle={isPayable ? t('debts.payDebtSubtitle', {}, 'Registra un pago y reduce el saldo pendiente') : t('debts.collectDebtSubtitle', {}, 'Registra un cobro recibido y actualiza el saldo a favor')}
      icon={PlusCircle}
      iconBgColor="bg-[var(--accent-muted,rgba(151,242,204,0.15))]"
      iconBorderColor="border-[var(--accent,#97F2CC)]/30"
      iconTextColor="text-[var(--accent,#97F2CC)]"
      error={error}
    >
      <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
        
        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto overscroll-contain custom-scrollbar px-6 py-4 space-y-4">
          
          {/* 1. Header Balance Summary Breakdown */}
          <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 space-y-3 shadow-inner">
            <div className="flex items-center justify-between gap-2 border-b border-white/5 pb-2.5">
              <span className="text-xs font-semibold text-slate-300">
                {debt.concept || debt.description || 'Saldo Pendiente'}
              </span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-md flex items-center gap-1.5 ${
                isPayable ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isPayable ? 'bg-rose-400' : 'bg-emerald-400'}`} />
                <span>{isPayable ? t('debts.payableBadge', {}, 'Por Pagar') : t('debts.receivableBadge', {}, 'Por Cobrar')}</span>
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 rounded-xl bg-black/20">
                <span className="text-[10px] text-slate-400 block uppercase font-medium">{t('debts.originalAmount', {}, 'Original')}</span>
                <span className="text-xs font-bold text-white tabular-nums">
                  {formatCurrency(calculations.originalAmount, debtCurr)}
                </span>
              </div>

              <div className="p-2 rounded-xl bg-black/20">
                <span className="text-[10px] text-slate-400 block uppercase font-medium">{t('debts.totalPaid', {}, 'Abonado')}</span>
                <span className="text-xs font-bold text-emerald-400 tabular-nums">
                  {formatCurrency(calculations.totalPaid, debtCurr)}
                </span>
              </div>

              <div className="p-2 rounded-xl bg-[var(--accent-muted,rgba(151,242,204,0.12))] border border-[var(--accent,#97F2CC)]/30">
                <span className="text-[10px] text-[var(--accent,#97F2CC)] block uppercase font-bold">{t('debts.remaining', {}, 'Restante')}</span>
                <span className="text-xs font-extrabold text-[var(--accent,#97F2CC)] tabular-nums">
                  {formatCurrency(calculations.remainingAmount, debtCurr)}
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                <span>{t('debts.progress', {}, 'Progreso de liquidación')}</span>
                <span className="font-bold text-white">{calculations.progressPercentage}%</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div 
                  className="h-full bg-[var(--accent,#97F2CC)] rounded-full transition-all duration-300"
                  style={{ width: `${calculations.progressPercentage}%` }}
                />
              </div>
            </div>
          </div>

          {/* 2. Amount Input with Quick "Pay All" button */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 block">
                {t('debts.amountToPay', {}, 'Monto a Abonar')} *
              </label>
              <button
                type="button"
                onClick={handlePayAll}
                className="text-[11px] font-bold text-[var(--accent,#97F2CC)] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Sparkles className="w-3 h-3" />
                <span>{t('debts.payAllBtn', {}, 'Abonar Todo el Saldo')}</span>
              </button>
            </div>

            <FormField
              prefix={currencySymbol}
              type="number"
              step="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>

          {/* 3. Account Select */}
          <FormField label={isPayable ? t('debts.payingAccount', {}, 'Cuenta Pagadora (De donde sale el dinero)') : t('debts.destinationAccount', {}, 'Cuenta Destino (A donde ingresa el dinero)')}>
            <CustomSelect
              options={accountSelectOptions}
              value={accountId}
              onChange={setAccountId}
              placeholder={safeAccounts.length > 0 ? t('debts.selectAccount', {}, 'Selecciona cuenta') : t('debts.noAccounts', {}, 'Sin cuentas')}
            />
          </FormField>

          {/* 4. Payment Date */}
          <FormField label={t('debts.paymentDate', {}, 'Fecha del Abono')}>
            <CustomDatePicker
              value={paymentDate}
              onChange={setPaymentDate}
            />
          </FormField>

          {/* 5. Notes / Observaciones */}
          <FormField label={t('debts.notesLabel', {}, 'Notas u Observaciones (Opcional)')}>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('debts.notesPlaceholder', {}, 'Ej. Transferencia bancaria, depósito en ventanilla...')}
              className="w-full h-11 px-4 bg-white/[0.04] border border-white/10 rounded-xl text-sm font-medium text-white focus:outline-none focus:border-[var(--accent,#97F2CC)] transition-all"
            />
          </FormField>

        </div>

        {/* Sticky Action Footer */}
        <div className="modal-footer sticky bottom-0 z-20 bg-transparent px-6 py-4 border-t border-white/[0.06] flex gap-3 shrink-0 pb-safe sm:pb-4">
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1"
          >
            {t('common.cancel', {}, 'Cancelar')}
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={isSubmitting}
            className="flex-1"
          >
            {isSubmitting ? t('common.saving', {}, 'Guardando...') : (isPayable ? t('debts.confirmPayBtn', {}, 'Registrar Abono') : t('debts.confirmCollectBtn', {}, 'Registrar Cobro'))}
          </Button>
        </div>

      </form>
    </ModalWrapper>
  );
}
