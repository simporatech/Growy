import React, { useState, useEffect } from 'react';
import { CheckCircle } from 'lucide-react';
import CustomSelect from './CustomSelect';
import CustomDatePicker from './CustomDatePicker';
import ModalWrapper from './ModalWrapper';
import FormField from './FormField';
import { useSettings } from '../context/SettingsContext';
import { formatCurrency, parseNumeric, formatDateISO } from '../utils/formatters';
import { getCurrencySymbol } from '../utils/currency';

export default function PayLoanModal({ 
  isOpen, 
  onClose, 
  onConfirmPay, 
  loan, 
  accounts = [] 
}) {
  const { t } = useSettings();

  const [accountId, setAccountId] = useState('');
  const [paymentDate, setPaymentDate] = useState(formatDateISO());
  const [customDebitAmount, setCustomDebitAmount] = useState('');
  const [keepRecord, setKeepRecord] = useState(false);
  const [error, setError] = useState('');

  const safeAccounts = Array.isArray(accounts) ? accounts.filter(Boolean) : [];

  useEffect(() => {
    if (!isOpen || !loan) return;

    if (safeAccounts.length > 0) {
      setAccountId(safeAccounts[0].id);
    } else {
      setAccountId('');
    }

    setPaymentDate(formatDateISO());
    setCustomDebitAmount(loan.amount !== undefined ? Math.abs(loan.amount).toString() : '');
    setKeepRecord(false);
    setError('');
  }, [isOpen, loan]);

  if (!isOpen || !loan) return null;

  const selectedAccount = safeAccounts.find(a => a.id === accountId) || safeAccounts[0] || null;
  const loanCurr = loan.currency || 'USD';
  const accCurr = selectedAccount?.currency || 'USD';
  const accSymbol = selectedAccount?.currencySymbol || getCurrencySymbol(accCurr);
  const isMultiCurrency = loanCurr !== accCurr;

  const accountSelectOptions = safeAccounts.map(acc => ({
    value: acc.id,
    label: `${acc.emoji || '🏦'} ${acc.name} (${getCurrencySymbol(acc.currency)} ${acc.currency || 'USD'}) - Balance: ${formatCurrency(acc.balance, acc.currency || 'USD')}`
  }));

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!accountId) {
      setError(t('modals.payLoan.account', {}, 'Selecciona la cuenta pagadora'));
      return;
    }

    const numDebit = parseNumeric(customDebitAmount, -1);
    if (numDebit <= 0) {
      setError(t('modals.transaction.amount', {}, 'Ingresa un monto válido a debitar mayor a 0'));
      return;
    }

    onConfirmPay(loan.id, accountId, numDebit, keepRecord, paymentDate);
  };

  return (
    <ModalWrapper
      isOpen={isOpen}
      onClose={onClose}
      title={t('modals.payLoan.title', {}, 'Pagar Saldo Pendiente')}
      subtitle={t('modals.payLoan.subtitle', {}, 'Liquidar deuda y conciliar cuenta')}
      icon={CheckCircle}
      iconBgColor="bg-emerald-500/15"
      iconBorderColor="border-emerald-500/30"
      iconTextColor="text-emerald-400"
      error={error}
    >
      <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
        
        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto overscroll-contain custom-scrollbar px-6 py-4 space-y-4">
          
          {/* Concept & Balance Summary Tile */}
          <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-300 font-semibold uppercase block mb-0.5">{t('modals.payLoan.concept', {}, 'Concepto de Saldo')}</span>
              <h4 className="text-sm font-bold text-white truncate max-w-[200px] sm:max-w-[260px]">{loan.description || loan.concept}</h4>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-300 font-semibold uppercase block mb-0.5">{t('modals.payLoan.debtRegistered', {}, 'Deuda Registrada')}</span>
              <div className="text-base font-bold text-amber-400 tabular-nums">
                {formatCurrency(loan.amount, loan.currency || 'USD')}
              </div>
            </div>
          </div>

          <FormField label={t('modals.payLoan.account', {}, 'Cuenta Afectada (Pagadora)')}>
            <CustomSelect
              options={accountSelectOptions}
              value={accountId}
              onChange={setAccountId}
              placeholder={safeAccounts.length > 0 ? "Selecciona cuenta" : "No hay cuentas disponibles"}
            />
          </FormField>

          <FormField label={t('modals.payLoan.paymentDate', {}, 'Fecha de Pago')}>
            <CustomDatePicker
              value={paymentDate}
              onChange={setPaymentDate}
            />
          </FormField>

          {isMultiCurrency && (
            <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-200 text-xs font-medium">
              {t('modals.payLoan.multiCurrencyAlert', { loanCurr, accCurr }, `La deuda está en ${loanCurr} pero pagarás desde ${accCurr}.`)}
            </div>
          )}

          <FormField
            label={t('modals.payLoan.debitAmountLabel', { accCurr }, `Monto exacto debitado (en ${accCurr})`)}
            prefix={accSymbol}
            type="number"
            step="0.01"
            required
            value={customDebitAmount}
            onChange={(e) => setCustomDebitAmount(e.target.value)}
            placeholder="0.00"
          />

          {/* Keep Record Option Tile */}
          <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-white block">{t('modals.payLoan.keepRecord', {}, 'Conservar registro en Deudas Pendientes')}</span>
              <span className="text-xs text-slate-300 font-medium block mt-0.5">
                {keepRecord 
                  ? t('modals.payLoan.keepRecordStatusPaid', {}, 'El registro se marcará como Pagado y se guardará en el historial.')
                  : t('modals.payLoan.keepRecordStatusRemove', {}, 'Se registrará el gasto y el saldo se eliminará de la lista.')}
              </span>
            </div>

            <div 
              onClick={() => setKeepRecord(!keepRecord)}
              className={`w-12 h-6.5 rounded-full p-1 transition-all cursor-pointer flex items-center shrink-0 ${
                keepRecord ? 'bg-[#AEEDD0] justify-end' : 'bg-[#1E2D32] border border-[#AEEDD0]/30 justify-start'
              }`}
            >
              <div className={`w-4.5 h-4.5 rounded-full shadow-md transition-all ${
                keepRecord ? 'bg-[#1E2D32]' : 'bg-[#8EA7A8]'
              }`} />
            </div>
          </div>
        </div>

        {/* Sticky Action Footer */}
        <div className="sticky bottom-0 z-20 bg-[#111C20]/95 backdrop-blur-md px-6 py-4 border-t border-white/10 flex gap-3 shrink-0 pb-safe sm:pb-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-xl bg-slate-800/60 hover:bg-slate-700/60 text-slate-300 font-semibold border border-white/10 transition-colors cursor-pointer"
          >
            {t('common.cancel', {}, 'Cancelar')}
          </button>
          <button
            type="submit"
            disabled={safeAccounts.length === 0}
            className={`flex-1 py-3 px-4 rounded-xl btn-primary-mint font-bold hover:brightness-105 active:scale-[0.98] transition-all cursor-pointer shadow-md ${
              safeAccounts.length === 0 ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {t('modals.payLoan.payBtn', {}, 'Pagar Ahora')}
          </button>
        </div>
      </form>
    </ModalWrapper>
  );
}
