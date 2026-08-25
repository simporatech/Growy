import React, { useState, useEffect } from 'react';
import { Percent } from 'lucide-react';
import Button from './Button';
import CustomSelect from './CustomSelect';
import CustomDatePicker from './CustomDatePicker';
import ModalWrapper from './ModalWrapper';
import FormField from './FormField';
import { useSettings } from '../context/SettingsContext';
import { formatDateISO, parseNumeric } from '../utils/formatters';
import { getCurrencySymbol, AVAILABLE_CURRENCIES } from '../utils/currency';

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
      iconBgColor="bg-[var(--accent-muted,rgba(151,242,204,0.15))]"
      iconBorderColor="border-[var(--accent,#97F2CC)]/30"
      iconTextColor="text-[var(--accent,#97F2CC)]"
      error={error}
    >
      <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
        
        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto overscroll-contain custom-scrollbar px-6 py-4 space-y-4">
          
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
        </div>

        {/* Sticky Action Footer */}
        <div className="modal-footer sticky bottom-0 z-20 bg-transparent px-6 py-4 border-t border-white/[0.06] flex gap-3 shrink-0 pb-safe sm:pb-4">
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={onClose}
            className="flex-1"
          >
            {t('common.cancel', {}, 'Cancelar')}
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="md"
            className="flex-1"
          >
            {loanToEdit ? t('modals.loan.updateBtn', {}, 'Actualizar Saldo') : t('modals.loan.saveBtn', {}, 'Guardar Saldo')}
          </Button>
        </div>

      </form>
    </ModalWrapper>
  );
}
