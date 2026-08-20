import React, { useState, useEffect } from 'react';
import { Percent } from 'lucide-react';
import CustomSelect from './CustomSelect';
import CustomDatePicker from './CustomDatePicker';
import ModalWrapper from './ModalWrapper';
import FormField from './FormField';
import { useSettings } from '../context/SettingsContext';
import { formatDateISO, parseNumeric } from '../utils/formatters';
import { getCurrencySymbol } from '../utils/currency';

import { AVAILABLE_CURRENCIES } from '../constants/currencies';

export default function LoanModal({ 
  isOpen, 
  onClose, 
  onSave, 
  loanToEdit,
  categories = [] 
}) {
  const { t } = useSettings();

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [categoryId, setCategoryId] = useState('');
  const [startDate, setStartDate] = useState(() => formatDateISO());
  const [dueDate, setDueDate] = useState('');
  const [error, setError] = useState('');

  const safeCategories = Array.isArray(categories) ? categories.filter(c => c && c.type === 'expense') : [];

  useEffect(() => {
    if (!isOpen) return;

    if (loanToEdit) {
      setDescription(loanToEdit.description || '');
      setAmount(loanToEdit.amount !== undefined ? loanToEdit.amount.toString() : '');
      setCurrency(loanToEdit.currency || 'USD');
      setCategoryId(loanToEdit.categoryId || (safeCategories[0]?.id || ''));
      setStartDate(loanToEdit.startDate || formatDateISO());
      setDueDate(loanToEdit.dueDate || '');
    } else {
      setDescription('');
      setAmount('');
      setCurrency('USD');
      setCategoryId(safeCategories[0]?.id || '');
      setStartDate(formatDateISO());
      setDueDate('');
    }
    setError('');
  }, [loanToEdit, isOpen]);

  if (!isOpen) return null;

  const currencySymbol = getCurrencySymbol(currency);

  const categorySelectOptions = safeCategories.map(cat => ({
    value: cat.id,
    label: `${cat.emoji || '🏷️'} ${cat.name}`
  }));

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!description.trim()) {
      setError(t('modals.loan.descError', {}, 'Ingresa el concepto del saldo pendiente'));
      return;
    }

    const numAmount = parseNumeric(amount, -1);
    if (numAmount <= 0) {
      setError(t('modals.loan.invalidAmountError', {}, 'Ingresa un monto pendiente válido mayor a 0'));
      return;
    }

    onSave({
      id: loanToEdit ? loanToEdit.id : undefined,
      description: description.trim(),
      amount: numAmount,
      currency,
      categoryId,
      startDate,
      dueDate: dueDate || null,
      status: loanToEdit ? loanToEdit.status : 'pending'
    });

    onClose();
  };

  return (
    <ModalWrapper
      isOpen={isOpen}
      onClose={onClose}
      title={loanToEdit ? t('modals.loan.editTitle', {}, 'Editar Saldo Pendiente') : t('modals.loan.newTitle', {}, 'Nuevo Saldo Pendiente')}
      subtitle={t('modals.loan.subtitle', {}, 'Registra compromisos financieros y cuentas por pagar')}
      icon={Percent}
      iconBgColor="bg-amber-500/15"
      iconBorderColor="border-amber-500/30"
      iconTextColor="text-amber-400"
      error={error}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        
        <FormField
          label={t('modals.loan.description', {}, 'Concepto del Saldo')}
          type="text"
          required
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t('modals.loan.descPlaceholder', {}, 'Ej. Préstamo personal, Tarjeta de Crédito')}
        />

        {/* Balanced 2-Column Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label={t('modals.loan.currency', {}, 'Moneda / Divisa')}>
            <CustomSelect
              options={AVAILABLE_CURRENCIES}
              value={currency}
              onChange={setCurrency}
            />
          </FormField>

          <FormField
            label={t('modals.loan.amount', {}, 'Monto Pendiente')}
            prefix={currencySymbol}
            type="number"
            step="0.01"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label={t('modals.loan.category', {}, 'Categoría Asociada')}>
            <CustomSelect
              options={categorySelectOptions}
              value={categoryId}
              onChange={setCategoryId}
              placeholder={safeCategories.length > 0 ? "Selecciona categoría" : "Sin categorías"}
            />
          </FormField>

          <FormField label={t('modals.loan.dueDate', {}, 'Fecha Límite de Pago')}>
            <CustomDatePicker
              value={dueDate}
              onChange={setDueDate}
            />
          </FormField>
        </div>

        {/* Standard 50/50 Footer */}
        <div className="flex items-center gap-3 pt-4 border-t border-white/5 w-full mt-6">
          <button
            type="button"
            onClick={onClose}
            className="w-1/2 h-11 rounded-xl bg-white/5 hover:bg-white/10 text-white font-semibold text-sm border border-white/10 active:scale-[0.98] transition-all flex items-center justify-center cursor-pointer"
          >
            {t('common.cancel', {}, 'Cancelar')}
          </button>
          <button
            type="submit"
            className="w-1/2 h-11 rounded-xl bg-[var(--color-primary,#AEEDD0)] hover:brightness-105 active:scale-[0.98] text-[#1E2D32] font-bold text-sm shadow-md shadow-[#AEEDD0]/10 transition-all flex items-center justify-center cursor-pointer"
          >
            {loanToEdit ? t('modals.loan.updateBtn', {}, 'Actualizar Saldo') : t('modals.loan.saveBtn', {}, 'Guardar Saldo')}
          </button>
        </div>

      </form>
    </ModalWrapper>
  );
}
