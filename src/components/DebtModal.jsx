import React, { useState, useEffect, useMemo } from 'react';
import { Percent, ArrowDownLeft, ArrowUpRight, Wallet } from 'lucide-react';
import Button from './Button';
import CustomSelect from './CustomSelect';
import CustomDatePicker from './CustomDatePicker';
import ModalWrapper from './ModalWrapper';
import FormField from './FormField';
import { useSettings } from '../context/SettingsContext';
import { formatDateISO, parseNumeric, formatCurrency } from '../utils/formatters';
import { getCurrencySymbol, getAvailableCurrencies } from '../utils/currency';

/**
 * DebtModal (Crear/Editar Saldo Por Pagar o Por Cobrar)
 * Implementa regla contable de exclusión de categorías en Préstamos Directos
 * y filtrado semántico estricto (Gastos para Por Pagar, Ingresos para Por Cobrar).
 */
export default function DebtModal({ 
  isOpen, 
  onClose, 
  onSave, 
  debtToEdit = null,
  loanToEdit = null,
  categories = [],
  accounts = [],
  initialType = 'payable'
}) {
  const currentItem = debtToEdit || loanToEdit;
  const { t, baseCurrency, language } = useSettings();

  const currencyOptions = useMemo(() => {
    return getAvailableCurrencies(language);
  }, [language]);

  // Form states
  const [debtType, setDebtType] = useState(() => initialType || 'payable'); // 'payable' | 'receivable'
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState(currentItem?.currency || baseCurrency || 'USD');
  const [categoryId, setCategoryId] = useState('');
  const [startDate, setStartDate] = useState(() => formatDateISO());
  const [dueDate, setDueDate] = useState('');
  const [isDirectLoan, setIsDirectLoan] = useState(false);
  const [sourceAccountId, setSourceAccountId] = useState('');
  const [error, setError] = useState('');

  // 1. Filtrado Condicional de Categorías según Tipo de Deuda:
  // - Por Pagar -> Únicamente categorías de tipo GASTO (type === 'expense')
  // - Por Cobrar (No Préstamo) -> Únicamente categorías de tipo INGRESO (type === 'income')
  const filteredCategories = useMemo(() => {
    const list = Array.isArray(categories) ? categories.filter(Boolean) : [];
    const targetType = debtType === 'payable' ? 'expense' : 'income';
    const matches = list.filter(c => (c.type || 'expense') === targetType);
    return [...matches].sort((a, b) => 
      (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' })
    );
  }, [categories, debtType]);

  const safeAccounts = useMemo(() => {
    const list = Array.isArray(accounts) ? accounts.filter(Boolean) : [];
    return [...list].sort((a, b) => 
      (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' })
    );
  }, [accounts]);

  useEffect(() => {
    if (!isOpen) return;

    if (currentItem) {
      const typeVal = (currentItem.type || '').toLowerCase();
      const isRec = typeVal === 'receivable';
      const isDirect = Boolean(currentItem.isDirectLoan || currentItem.is_direct_loan);

      setDebtType(isRec ? 'receivable' : 'payable');
      setDescription(currentItem.concept || currentItem.description || '');
      setAmount(currentItem.amount !== undefined ? currentItem.amount.toString() : '');
      setCurrency(currentItem.currency || baseCurrency || 'USD');
      setStartDate(currentItem.startDate || currentItem.start_date || formatDateISO());
      setDueDate(currentItem.dueDate || currentItem.due_date || '');
      setIsDirectLoan(isDirect);
      setSourceAccountId(currentItem.sourceAccountId || currentItem.source_account_id || (safeAccounts[0]?.id || ''));
      
      const rawCatId = currentItem.categoryId || currentItem.category_id;
      if (isDirect) {
        setCategoryId('');
      } else {
        setCategoryId(rawCatId || (filteredCategories[0]?.id || ''));
      }
    } else {
      const defaultType = initialType === 'receivable' ? 'receivable' : 'payable';
      setDebtType(defaultType);
      setDescription('');
      setAmount('');
      setCurrency(baseCurrency || 'USD');
      setCategoryId(filteredCategories[0]?.id || '');
      setStartDate(formatDateISO());
      setDueDate('');
      setIsDirectLoan(false);
      setSourceAccountId(safeAccounts[0]?.id || '');
    }
    setError('');
  }, [currentItem, isOpen, baseCurrency, safeAccounts, initialType]);

  if (!isOpen) return null;

  const currencySymbol = getCurrencySymbol(currency);

  const categorySelectOptions = filteredCategories.map(cat => ({
    value: cat.id,
    name: cat.name,
    emoji: cat.emoji || (debtType === 'payable' ? '💸' : '💰'),
    label: cat.name
  }));

  const accountSelectOptions = safeAccounts.map(acc => ({
    value: acc.id,
    name: acc.name,
    emoji: acc.emoji || '🏦',
    currency: acc.currency || 'USD',
    extra: `- ${formatCurrency(acc.balance, acc.currency || 'USD')}`,
    label: acc.name
  }));

  // Handle Type Switch
  const handleTypeChange = (newType) => {
    setDebtType(newType);
    if (newType === 'payable') {
      setIsDirectLoan(false);
      const expenseCats = (Array.isArray(categories) ? categories.filter(Boolean) : []).filter(c => (c.type || 'expense') === 'expense');
      setCategoryId(expenseCats[0]?.id || '');
    } else {
      const incomeCats = (Array.isArray(categories) ? categories.filter(Boolean) : []).filter(c => c.type === 'income');
      setCategoryId(isDirectLoan ? '' : (incomeCats[0]?.id || ''));
    }
  };

  // Handle Direct Loan Checkbox Toggle
  const handleDirectLoanToggle = (checked) => {
    setIsDirectLoan(checked);
    if (checked) {
      setCategoryId(''); // Regla contable: Préstamo directo no lleva categoría de ingreso ni gasto
      if (!sourceAccountId && safeAccounts.length > 0) {
        setSourceAccountId(safeAccounts[0].id);
      }
    } else {
      const incomeCats = (Array.isArray(categories) ? categories.filter(Boolean) : []).filter(c => c.type === 'income');
      setCategoryId(incomeCats[0]?.id || '');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!description.trim()) {
      setError(t('modals.loan.descError', {}, 'Ingresa el concepto del saldo pendiente'));
      return;
    }

    const numAmount = parseNumeric(amount, -1);
    if (numAmount <= 0) {
      setError(t('modals.loan.invalidAmountError', {}, 'Ingresa un monto válido mayor a 0'));
      return;
    }

    const isDirect = debtType === 'receivable' && isDirectLoan;

    if (isDirect && !sourceAccountId) {
      setError(t('debts.selectSourceAccountError', {}, 'Selecciona la cuenta de donde salió el dinero prestado'));
      return;
    }

    onSave({
      id: currentItem ? currentItem.id : undefined,
      concept: description.trim(),
      description: description.trim(),
      amount: numAmount,
      currency,
      categoryId: isDirect ? null : (categoryId || null),
      startDate,
      dueDate: dueDate || null,
      type: debtType,
      isDirectLoan: isDirect,
      sourceAccountId: isDirect ? sourceAccountId : null,
      status: currentItem ? currentItem.status : 'pending'
    });

    onClose();
  };

  const isDirectLoanActive = debtType === 'receivable' && isDirectLoan;

  return (
    <ModalWrapper
      isOpen={isOpen}
      onClose={onClose}
      title={currentItem ? t('modals.loan.editTitle', {}, 'Editar Saldo Pendiente') : t('modals.loan.newTitle', {}, 'Nuevo Saldo Pendiente')}
      subtitle={t('modals.loan.subtitle', {}, 'Registra compromisos financieros y cuentas por pagar o cobrar')}
      icon={Percent}
      iconBgColor="bg-[var(--accent-muted,rgba(151,242,204,0.15))]"
      iconBorderColor="border-[var(--accent,#97F2CC)]/30"
      iconTextColor="text-[var(--accent,#97F2CC)]"
      error={error}
    >
      <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
        
        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto overscroll-contain custom-scrollbar px-6 py-4 space-y-4">
          
          {/* 1. Selector de Tipo: Por Pagar vs Por Cobrar */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 block">
              {t('debts.typeLabel', {}, 'Tipo de Saldo')} *
            </label>
            <div className="grid grid-cols-2 gap-2.5 p-1 bg-black/30 rounded-2xl border border-white/10">
              <button
                type="button"
                onClick={() => handleTypeChange('payable')}
                className={`h-11 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  debtType === 'payable'
                    ? 'bg-rose-500/20 border border-rose-500/50 text-rose-300 shadow-md scale-[1.01]'
                    : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                <ArrowDownLeft className="w-4 h-4 text-rose-400 shrink-0" />
                <span className="truncate">{t('debts.payable', {}, 'Por Pagar (Deuda Mía)')}</span>
              </button>

              <button
                type="button"
                onClick={() => handleTypeChange('receivable')}
                className={`h-11 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  debtType === 'receivable'
                    ? 'bg-[var(--accent-muted,rgba(151,242,204,0.2))] border border-[var(--accent,#97F2CC)]/60 text-[var(--accent,#97F2CC)] shadow-md scale-[1.01]'
                    : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                <ArrowUpRight className="w-4 h-4 text-[var(--accent,#97F2CC)] shrink-0" />
                <span className="truncate">{t('debts.receivable', {}, 'Por Cobrar (A mi Favor)')}</span>
              </button>
            </div>
          </div>

          {/* 2. Switch Dinero Prestado (Exclusivo si es Por Cobrar) */}
          {debtType === 'receivable' && (
            <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 space-y-3 animate-fadeIn">
              <label className="flex items-center justify-between gap-3 cursor-pointer select-none">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[var(--accent-muted,rgba(151,242,204,0.15))] border border-[var(--accent,#97F2CC)]/30 flex items-center justify-center text-[var(--accent,#97F2CC)]">
                    <Wallet className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">
                      {t('debts.directLoanSwitch', {}, '¿Salió este dinero de una de tus cuentas hoy?')}
                    </span>
                    <span className="text-[11px] text-slate-400 block font-normal">
                      {t('debts.directLoanHelp', {}, 'Crea un traspaso contable para reducir el saldo de la cuenta sin alterar gastos del presupuesto')}
                    </span>
                  </div>
                </div>

                <input
                  type="checkbox"
                  checked={isDirectLoan}
                  onChange={(e) => handleDirectLoanToggle(e.target.checked)}
                  className="w-5 h-5 rounded border-white/20 bg-black/40 text-[var(--accent,#97F2CC)] focus:ring-[var(--accent,#97F2CC)]/50 accent-[var(--accent,#97F2CC)] cursor-pointer"
                />
              </label>

              {isDirectLoan && (
                <div className="pt-2 border-t border-white/5 animate-fadeIn">
                  <FormField label={t('debts.sourceAccount', {}, 'Cuenta Pagadora (De donde sale el dinero prestado)') + ' *'}>
                    <CustomSelect
                      options={accountSelectOptions}
                      value={sourceAccountId}
                      onChange={setSourceAccountId}
                      placeholder={safeAccounts.length > 0 ? t('debts.selectAccount', {}, 'Selecciona cuenta') : t('debts.noAccounts', {}, 'Sin cuentas')}
                    />
                  </FormField>
                </div>
              )}
            </div>
          )}

          {/* 3. Concepto / Descripción */}
          <FormField
            label={t('modals.loan.description', {}, 'Concepto o Nombre')}
            type="text"
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={
              debtType === 'payable' 
                ? t('debts.payablePlaceholder', {}, 'Ej. Préstamo Bancario, Tarjeta Visa, Deuda a Juan') 
                : isDirectLoan
                  ? t('debts.directLoanPlaceholder', {}, 'Ej. Dinero prestado a Carlos, Préstamo a familiar')
                  : t('debts.receivablePlaceholder', {}, 'Ej. Venta pendiente de cobro, Sueldo por cobrar')
            }
          />

          {/* 4. Divisa y Monto */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label={t('modals.loan.currency', {}, 'Moneda / Divisa')}>
              <CustomSelect
                options={currencyOptions}
                value={currency}
                onChange={setCurrency}
              />
            </FormField>

            <FormField
              label={t('modals.loan.amount', {}, 'Monto Total')}
              prefix={currencySymbol}
              type="number"
              step="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>

          {/* 5. Categoría y Fechas */}
          {isDirectLoanActive ? (
            /* Si es préstamo directo: SE OCULTA CATEGORÍA y solo se muestra Fecha Límite */
            <div className="animate-fadeIn">
              <FormField label={t('modals.loan.dueDate', {}, 'Fecha Límite / Vencimiento')}>
                <CustomDatePicker
                  value={dueDate}
                  onChange={setDueDate}
                />
              </FormField>
            </div>
          ) : (
            /* Si NO es préstamo directo: Muestra Categoría (Filtrada por Tipo) y Fecha Límite */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fadeIn">
              <FormField label={debtType === 'payable' ? t('debts.expenseCategoryLabel', {}, 'Categoría de Gasto Asociada') : t('debts.incomeCategoryLabel', {}, 'Categoría de Ingreso Asociada')}>
                <CustomSelect
                  options={categorySelectOptions}
                  value={categoryId}
                  onChange={setCategoryId}
                  placeholder={
                    filteredCategories.length > 0 
                      ? (debtType === 'payable' ? t('debts.selectExpenseCategory', {}, 'Selecciona categoría de gasto') : t('debts.selectIncomeCategory', {}, 'Selecciona categoría de ingreso'))
                      : (debtType === 'payable' ? t('debts.noExpenseCategories', {}, 'Sin categorías de gasto') : t('debts.noIncomeCategories', {}, 'Sin categorías de ingreso'))
                  }
                />
              </FormField>

              <FormField label={t('modals.loan.dueDate', {}, 'Fecha Límite / Vencimiento')}>
                <CustomDatePicker
                  value={dueDate}
                  onChange={setDueDate}
                />
              </FormField>
            </div>
          )}
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
            {currentItem ? t('modals.loan.updateBtn', {}, 'Actualizar Saldo') : t('modals.loan.saveBtn', {}, 'Guardar Saldo')}
          </Button>
        </div>

      </form>
    </ModalWrapper>
  );
}
