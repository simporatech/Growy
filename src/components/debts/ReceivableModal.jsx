import React, { useState, useEffect, useMemo } from 'react';
import { HandCoins, Wallet, ArrowUpRight, Info, Calendar, FileText } from 'lucide-react';
import Button from '../Button';
import CustomSelect from '../CustomSelect';
import CustomDatePicker from '../CustomDatePicker';
import ModalWrapper from '../ModalWrapper';
import FormField from '../FormField';
import { useSettings } from '../../context/SettingsContext';
import { formatDateISO, parseNumeric, formatCurrency } from '../../utils/formatters';
import { getCurrencySymbol, getAvailableCurrencies } from '../../utils/currency';

/**
 * ReceivableModal (Modal Dedicado para Saldos a Favor / Préstamos Otorgados)
 * 
 * Enfoque minimalista y 100% contable para dinero por cobrar:
 * - Sin tabs de gasto/ingreso genéricos
 * - Concepto o persona deudora
 * - Monto y divisa (USD, HNL, etc.)
 * - Fecha estimada de cobro (vencimiento)
 * - Switch contable destacado: ¿Salió el dinero de una cuenta bancaria hoy?
 *   - Si activo: Selecciona cuenta origen y genera traspaso hacia Saldos Pendientes.
 *   - Si inactivo: Registra el derecho de cobro sin debitar bancos.
 * - Notas adicionales opcionales.
 */
export default function ReceivableModal({
  isOpen,
  onClose,
  onSave,
  debtToEdit = null,
  accounts = []
}) {
  const { t, baseCurrency, language } = useSettings();
  const isEs = String(language || 'es').toLowerCase().startsWith('es');

  const currencyOptions = useMemo(() => {
    return getAvailableCurrencies(language);
  }, [language]);

  // Form states
  const [concept, setConcept] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState(debtToEdit?.currency || baseCurrency || 'USD');
  const [startDate, setStartDate] = useState(() => formatDateISO());
  const [dueDate, setDueDate] = useState('');
  const [isDirectLoan, setIsDirectLoan] = useState(false);
  const [sourceAccountId, setSourceAccountId] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Safe sorted accounts
  const safeAccounts = useMemo(() => {
    const list = Array.isArray(accounts) ? accounts.filter(Boolean) : [];
    return [...list].sort((a, b) => 
      (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' })
    );
  }, [accounts]);

  // Sync state when modal opens or debtToEdit changes
  useEffect(() => {
    if (!isOpen) return;

    if (debtToEdit) {
      const isDirect = Boolean(debtToEdit.isDirectLoan || debtToEdit.is_direct_loan);
      setConcept(debtToEdit.concept || debtToEdit.description || '');
      setAmount(debtToEdit.amount !== undefined && debtToEdit.amount !== null ? debtToEdit.amount.toString() : '');
      setCurrency(debtToEdit.currency || baseCurrency || 'USD');
      setStartDate(debtToEdit.startDate || debtToEdit.start_date || formatDateISO());
      setDueDate(debtToEdit.dueDate || debtToEdit.due_date || '');
      setIsDirectLoan(isDirect);
      setSourceAccountId(debtToEdit.sourceAccountId || debtToEdit.source_account_id || (safeAccounts[0]?.id || ''));
      setNotes(debtToEdit.notes || '');
    } else {
      setConcept('');
      setAmount('');
      setCurrency(baseCurrency || 'USD');
      setStartDate(formatDateISO());
      setDueDate('');
      setIsDirectLoan(false);
      setSourceAccountId(safeAccounts[0]?.id || '');
      setNotes('');
    }
    setError('');
    setIsSubmitting(false);
  }, [debtToEdit, isOpen, baseCurrency, safeAccounts]);

  if (!isOpen) return null;

  const currencySymbol = getCurrencySymbol(currency);

  const accountSelectOptions = safeAccounts.map(acc => ({
    value: acc.id,
    name: acc.name,
    emoji: acc.emoji || '🏦',
    currency: acc.currency || 'USD',
    extra: `- ${formatCurrency(acc.balance, acc.currency || 'USD')}`,
    label: acc.name
  }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!concept.trim()) {
      setError(t('debts.receivable_modal.concept_error', {}, 'Ingresa la persona o concepto del saldo por cobrar'));
      return;
    }

    const numAmount = parseNumeric(amount, -1);
    if (numAmount <= 0) {
      setError(t('debts.receivable_modal.amount_error', {}, 'Ingresa un monto válido mayor a 0'));
      return;
    }

    if (isDirectLoan && !sourceAccountId) {
      setError(t('debts.receivable_modal.source_account_error', {}, 'Selecciona la cuenta de origen de donde salió el dinero'));
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        id: debtToEdit ? debtToEdit.id : undefined,
        concept: concept.trim(),
        description: concept.trim(),
        amount: numAmount,
        currency,
        categoryId: null, // Los préstamos y saldos por cobrar directos no distorsionan categorías de presupuesto
        startDate,
        dueDate: dueDate || null,
        type: 'receivable',
        emoji: debtToEdit?.emoji || debtToEdit?.icon || '👤',
        icon: debtToEdit?.icon || debtToEdit?.emoji || '👤',
        isDirectLoan,
        sourceAccountId: isDirectLoan ? sourceAccountId : null,
        notes: notes.trim(),
        status: debtToEdit ? debtToEdit.status : 'pending'
      };

      if (onSave) {
        await onSave(payload);
      }
      setIsSubmitting(false);
      onClose();
    } catch (err) {
      console.error('❌ Error al guardar saldo por cobrar:', err);
      setError(err?.message || 'Error al guardar el saldo.');
      setIsSubmitting(false);
    }
  };

  return (
    <ModalWrapper
      isOpen={isOpen}
      onClose={onClose}
      title={debtToEdit ? t('debts.receivable_modal.edit_title', {}, 'Editar Saldo Por Cobrar') : t('debts.receivable_modal.new_title', {}, 'Registrar Saldo Por Cobrar')}
      subtitle={t('debts.receivable_modal.subtitle', {}, 'Dinero que prestaste o servicios pendientes de cobro a tu favor')}
      icon={HandCoins}
      iconBgColor="bg-[var(--accent-muted,rgba(151,242,204,0.15))]"
      iconBorderColor="border-[var(--accent,#97F2CC)]/30"
      iconTextColor="text-[var(--accent,#97F2CC)]"
      error={error}
    >
      <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
        
        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto overscroll-contain custom-scrollbar px-6 py-4 space-y-4">
          
          {/* 1. Concepto o Persona Deudora */}
          <FormField
            label={t('debts.receivable_modal.concept_label', {}, 'Concepto o Persona Deudora') + ' *'}
            type="text"
            required
            value={concept}
            onChange={(e) => setConcept(e.target.value)}
            placeholder={t('debts.receivable_modal.concept_placeholder', {}, isEs ? 'Ej. Préstamo a Carlos, Cobro pendiente de diseño' : 'e.g. Loan to Charles, Freelance design fee')}
            autoFocus
          />

          {/* 2. Divisa y Monto */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <FormField label={t('debts.receivable_modal.currency_label', {}, 'Moneda / Divisa')}>
              <CustomSelect
                options={currencyOptions}
                value={currency}
                onChange={setCurrency}
              />
            </FormField>

            <FormField
              label={t('debts.receivable_modal.amount_label', {}, 'Monto a Cobrar') + ' *'}
              prefix={currencySymbol}
              type="number"
              step="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>

          {/* 3. Fechas: Inicio y Estimada de Cobro */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <FormField label={t('debts.receivable_modal.start_date_label', {}, 'Fecha de Inicio / Préstamo')}>
              <CustomDatePicker
                value={startDate}
                onChange={setStartDate}
              />
            </FormField>

            <FormField label={t('debts.receivable_modal.due_date_label', {}, 'Fecha Estimada de Cobro')}>
              <CustomDatePicker
                value={dueDate}
                onChange={setDueDate}
              />
            </FormField>
          </div>

          {/* 4. Switch Contable Destacado: ¿Salió el dinero de una cuenta hoy? */}
          <div className={`p-4 rounded-2xl border transition-all ${
            isDirectLoan 
              ? 'bg-[var(--accent)]/[0.04] border-[var(--accent)]/30 shadow-md' 
              : 'bg-white/[0.03] border-white/10 hover:border-white/20'
          }`}>
            <label className="flex items-center justify-between gap-3 cursor-pointer select-none">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                  isDirectLoan 
                    ? 'bg-[var(--accent)]/20 text-[var(--accent)] border border-[var(--accent)]/40' 
                    : 'bg-white/5 text-slate-400 border border-white/10'
                }`}>
                  <Wallet className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-white block leading-snug">
                    {t('debts.receivable_modal.direct_loan_switch', {}, '¿Salió este dinero de una de tus cuentas bancarias hoy?')}
                  </span>
                  <span className="text-[11px] text-slate-400 block font-normal mt-0.5">
                    {t('debts.receivable_modal.direct_loan_help', {}, 'Marca esta opción si entregaste o transferiste dinero real hoy')}
                  </span>
                </div>
              </div>

              <input
                type="checkbox"
                checked={isDirectLoan}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setIsDirectLoan(checked);
                  if (checked && !sourceAccountId && safeAccounts.length > 0) {
                    setSourceAccountId(safeAccounts[0].id);
                  }
                }}
                className="w-5 h-5 rounded border-white/20 bg-black/40 text-[var(--accent,#97F2CC)] focus:ring-[var(--accent,#97F2CC)]/50 accent-[var(--accent,#97F2CC)] cursor-pointer shrink-0"
              />
            </label>

            {/* Subsección si el dinero salió físicamente de una cuenta */}
            {isDirectLoan && (
              <div className="pt-3 mt-3 border-t border-white/10 space-y-3 animate-fadeIn">
                <FormField label={t('debts.receivable_modal.source_account_label', {}, '¿De qué cuenta salió el dinero?') + ' *'}>
                  <CustomSelect
                    options={accountSelectOptions}
                    value={sourceAccountId}
                    onChange={setSourceAccountId}
                    placeholder={safeAccounts.length > 0 ? t('debts.receivable_modal.select_account_placeholder', {}, 'Selecciona la cuenta de origen') : t('debts.noAccounts', {}, 'Sin cuentas')}
                  />
                </FormField>

                {/* Nota informativa contable */}
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-[var(--accent)]/10 border border-[var(--accent)]/20 text-xs text-slate-300">
                  <Info className="w-4 h-4 text-[var(--accent)] shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    {t('debts.receivable_modal.direct_loan_note', {}, 'Se creará una transferencia hacia Saldos Pendientes sin afectar tus gastos operativos ni tu tasa de ahorro.')}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* 5. Notas Adicionales (Opcional) */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span>{t('debts.receivable_modal.notes_label', {}, 'Notas Adicionales (Opcional)')}</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('debts.receivable_modal.notes_placeholder', {}, 'Agrega detalles o condiciones acordadas...')}
              rows={2}
              className="w-full p-3 rounded-xl bg-black/40 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-[var(--accent,#97F2CC)] transition-colors resize-none custom-scrollbar"
            />
          </div>

        </div>

        {/* Sticky Action Footer */}
        <div className="modal-footer sticky bottom-0 z-20 bg-transparent px-6 py-4 border-t border-white/[0.06] flex gap-3 shrink-0 pb-safe sm:pb-4">
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={onClose}
            className="flex-1"
            disabled={isSubmitting}
          >
            {t('debts.receivable_modal.cancel_button', {}, 'Cancelar')}
          </Button>

          <Button
            type="submit"
            variant="primary"
            size="md"
            className="flex-1"
            disabled={isSubmitting}
          >
            {debtToEdit 
              ? t('debts.receivable_modal.update_button', {}, 'Actualizar Saldo') 
              : isDirectLoan 
                ? t('debts.receivable_modal.submit_button_loan', {}, 'Registrar Préstamo Otorgado')
                : t('debts.receivable_modal.submit_button', {}, 'Guardar Saldo a Favor')}
          </Button>
        </div>

      </form>
    </ModalWrapper>
  );
}
