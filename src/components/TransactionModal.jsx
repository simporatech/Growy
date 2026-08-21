import React, { useState, useEffect } from 'react';
import { ArrowDownRight, ArrowUpRight, ArrowLeftRight, AlertCircle } from 'lucide-react';
import CustomSelect from './CustomSelect';
import CustomDatePicker from './CustomDatePicker';
import ModalWrapper from './ModalWrapper';
import FormField from './FormField';
import { useSettings } from '../context/SettingsContext';
import { formatDateISO, parseNumeric } from '../utils/formatters';
import { getCurrencySymbol } from '../utils/currency';

export default function TransactionModal({ 
  isOpen, 
  onClose, 
  onSave, 
  transactionToEdit,
  accounts = [],
  categories = [],
  initialType = 'expense'
}) {
  const { t } = useSettings();

  const [type, setType] = useState('expense');
  const [date, setDate] = useState(() => formatDateISO());
  const [accountId, setAccountId] = useState('');
  const [targetAccountId, setTargetAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  const safeAccounts = Array.isArray(accounts) ? accounts.filter(Boolean) : [];
  const safeCategories = Array.isArray(categories) ? categories.filter(Boolean) : [];

  const availableCategories = safeCategories.filter(c => c && c.type === type);

  useEffect(() => {
    if (!isOpen) return;

    if (transactionToEdit) {
      const editType = transactionToEdit.type || 'expense';
      setType(editType);
      setDate(transactionToEdit.date || formatDateISO());
      setAccountId(transactionToEdit.accountId || (safeAccounts[0]?.id || ''));
      setTargetAccountId(transactionToEdit.targetAccountId || (safeAccounts[1]?.id || safeAccounts[0]?.id || ''));
      setCategoryId(transactionToEdit.categoryId || '');
      setAmount(transactionToEdit.amount !== undefined ? Math.abs(transactionToEdit.amount).toString() : '');
      setTargetAmount(transactionToEdit.targetAmount !== undefined ? Math.abs(transactionToEdit.targetAmount).toString() : '');
      setDescription(transactionToEdit.description || '');
    } else {
      setType(initialType || 'expense');
      setDate(formatDateISO());
      if (safeAccounts.length > 0) {
        setAccountId(safeAccounts[0].id);
        setTargetAccountId(safeAccounts[1]?.id || safeAccounts[0].id);
      } else {
        setAccountId('');
        setTargetAccountId('');
      }
      const firstCat = safeCategories.find(c => c && c.type === (initialType || 'expense'));
      setCategoryId(firstCat ? firstCat.id : '');
      setAmount('');
      setTargetAmount('');
      setDescription('');
    }
    setError('');
  }, [transactionToEdit, isOpen, initialType]);

  if (!isOpen) return null;

  const sourceAccount = safeAccounts.find(a => a?.id === accountId) || safeAccounts[0] || null;
  const destAccount = safeAccounts.find(a => a?.id === targetAccountId) || safeAccounts[1] || safeAccounts[0] || null;

  const isMultiCurrencyTransfer = type === 'transfer' && sourceAccount && destAccount && (sourceAccount.currency !== destAccount.currency);

  const accountSelectOptions = safeAccounts.map(acc => ({
    value: acc.id,
    label: `${acc.emoji || '💳'} ${acc.name} (${getCurrencySymbol(acc.currency)} ${acc.currency || 'USD'})`
  }));

  const categorySelectOptions = availableCategories.map(cat => ({
    value: cat.id,
    label: `${cat.emoji || '🏷️'} ${cat.name}`
  }));

  const handleTypeChange = (newType) => {
    setType(newType);
    if (newType !== 'transfer') {
      const firstMatching = safeCategories.find(c => c && c.type === newType);
      setCategoryId(firstMatching ? firstMatching.id : '');
    } else {
      setCategoryId('');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (safeAccounts.length === 0) {
      setError(t('modals.transaction.noAccountsAlertDesc', {}, 'Debes tener al menos una cuenta registrada.'));
      return;
    }

    if (!accountId) {
      setError(t('modals.transaction.selectAccountError', {}, 'Selecciona una cuenta'));
      return;
    }

    if (type !== 'transfer' && !categoryId) {
      setError(t('modals.transaction.selectCategoryError', {}, 'Selecciona una categoría'));
      return;
    }

    if (type === 'transfer' && accountId === targetAccountId) {
      setError(t('modals.transaction.sameAccountError', {}, 'La cuenta origen y destino deben ser distintas'));
      return;
    }

    const numericAmount = parseNumeric(amount, -1);
    if (numericAmount <= 0) {
      setError(t('modals.transaction.invalidAmountError', {}, 'Ingresa un monto válido mayor a 0'));
      return;
    }

    let numericTargetAmount = numericAmount;
    if (isMultiCurrencyTransfer) {
      numericTargetAmount = parseNumeric(targetAmount, -1);
      if (numericTargetAmount <= 0) {
        setError(t('modals.transaction.targetAmountError', {}, 'Ingresa el monto a acreditar en la cuenta destino'));
        return;
      }
    }

    onSave({
      id: transactionToEdit ? transactionToEdit.id : undefined,
      type,
      date,
      accountId,
      targetAccountId: type === 'transfer' ? targetAccountId : null,
      categoryId: type !== 'transfer' ? categoryId : null,
      amount: numericAmount,
      targetAmount: isMultiCurrencyTransfer ? numericTargetAmount : numericAmount,
      description: (description || '').trim()
    });

    onClose();
  };

  const IconComponent = type === 'expense' ? ArrowDownRight : type === 'income' ? ArrowUpRight : ArrowLeftRight;
  const iconTextColor = type === 'expense' ? 'text-[#FF6B6B]' : type === 'income' ? 'text-[#AEEDD0]' : 'text-sky-400';

  const categoryLabelText = type === 'expense' 
    ? t('modals.transaction.category', { type: t('modals.transaction.typeExpense', {}, 'Gasto') }, 'Categoría de Gasto')
    : t('modals.transaction.category', { type: t('modals.transaction.typeIncome', {}, 'Ingreso') }, 'Categoría de Ingreso');

  return (
    <ModalWrapper
      isOpen={isOpen}
      onClose={onClose}
      title={transactionToEdit ? t('modals.transaction.editTitle', {}, 'Editar Movimiento') : t('modals.transaction.newTitle', {}, 'Nuevo Movimiento')}
      subtitle={t('modals.transaction.subtitle', {}, 'Registra un gasto, ingreso o transferencia')}
      icon={IconComponent}
      iconTextColor={iconTextColor}
      error={error}
    >
      {safeAccounts.length === 0 && (
        <div className="mb-4 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs font-medium space-y-2">
          <div className="flex items-center gap-2 font-bold text-amber-300">
            <AlertCircle className="w-4 h-4" />
            <span>{t('modals.transaction.noAccountsAlert', {}, 'No hay cuentas disponibles')}</span>
          </div>
          <p>{t('modals.transaction.noAccountsAlertDesc', {}, 'Debes crear al menos una cuenta para poder registrar movimientos.')}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
        
        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 sm:p-7 space-y-4">
          
          {/* Segmented Control */}
          <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-white/[0.04] border border-white/10">
            <button
              type="button"
              onClick={() => handleTypeChange('expense')}
              className={`h-11 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                type === 'expense'
                  ? 'bg-[#FF6B6B]/20 text-[#FF6B6B] border border-[#FF6B6B]/30 shadow-sm'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <ArrowDownRight className="w-3.5 h-3.5" />
              <span>{t('modals.transaction.typeExpense', {}, 'Gasto')}</span>
            </button>

            <button
              type="button"
              onClick={() => handleTypeChange('income')}
              className={`h-11 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                type === 'income'
                  ? 'bg-[var(--color-primary,#AEEDD0)]/20 text-[var(--color-primary,#AEEDD0)] border border-[var(--color-primary,#AEEDD0)]/30 shadow-sm'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>{t('modals.transaction.typeIncome', {}, 'Ingreso')}</span>
            </button>

            <button
              type="button"
              onClick={() => handleTypeChange('transfer')}
              className={`h-11 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                type === 'transfer'
                  ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30 shadow-sm'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              <span>{t('modals.transaction.typeTransfer', {}, 'Traspaso')}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label={t('modals.transaction.date', {}, 'Fecha del Movimiento')}>
              <CustomDatePicker
                value={date}
                onChange={setDate}
              />
            </FormField>

            <FormField 
              label={t('modals.transaction.amount', {}, 'Monto')}
              prefix={currencySymbol}
              type="number" 
              step="0.01" 
              required 
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>

          {type !== 'transfer' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField label={t('modals.transaction.account', {}, 'Cuenta')}>
                <CustomSelect
                  options={accountSelectOptions}
                  value={accountId}
                  onChange={setAccountId}
                  placeholder={safeAccounts.length > 0 ? t('placeholders.selectAccount', {}, 'Seleccionar cuenta') : t('placeholders.noAccounts', {}, 'No hay cuentas disponibles')}
                />
              </FormField>

              <FormField label={categoryLabelText}>
                <CustomSelect
                  options={categorySelectOptions}
                  value={categoryId}
                  onChange={setCategoryId}
                  placeholder={availableCategories.length > 0 ? t('placeholders.selectCategory', {}, 'Seleccionar categoría') : t('placeholders.noCategories', {}, 'No hay categorías disponibles')}
                />
              </FormField>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField label={t('modals.transaction.accountSource', {}, 'Cuenta Origen (Sale)')}>
                <CustomSelect
                  options={accountSelectOptions}
                  value={accountId}
                  onChange={setAccountId}
                  placeholder={safeAccounts.length > 0 ? t('placeholders.selectAccount', {}, 'Seleccionar cuenta') : t('placeholders.noAccounts', {}, 'No hay cuentas disponibles')}
                />
              </FormField>

              <FormField label={t('modals.transaction.accountTarget', {}, 'Cuenta Destino (Entra)')}>
                <CustomSelect
                  options={accountSelectOptions}
                  value={targetAccountId}
                  onChange={setTargetAccountId}
                  placeholder={safeAccounts.length > 0 ? t('placeholders.selectAccount', {}, 'Seleccionar cuenta') : t('placeholders.noAccounts', {}, 'No hay cuentas disponibles')}
                />
              </FormField>

              {isMultiCurrencyTransfer && (
                <div className="col-span-1 sm:col-span-2 pt-2 pb-2">
                  <div className="p-4 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-100 flex flex-col gap-3">
                    <p className="text-xs">
                      {t('modals.transaction.multiCurrencyDesc', {}, 'Estás transfiriendo entre cuentas con monedas distintas. Ingresa cuánto dinero se acreditará en la cuenta destino')} <strong>({targetAccountInfo.currency})</strong>.
                    </p>
                    <FormField
                      label={t('modals.transaction.targetAmountLabel', {}, 'Monto a acreditar en la cuenta destino')}
                      prefix={targetCurrencySymbol}
                      type="number"
                      step="0.01"
                      required
                      value={targetAmount}
                      onChange={(e) => setTargetAmount(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          <FormField
            label={t('modals.transaction.description', {}, 'Descripción / Notas')}
            type="text"
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('modals.transaction.descPlaceholder', {}, 'Ej. Almuerzo de trabajo, Pago de recibo')}
          />
        </div>

        {/* Fixed Footer */}
        <div className="flex-shrink-0 p-5 sm:p-7 border-t border-white/10 bg-[#111C20] flex items-center gap-3 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:pb-7">
          <button
            type="button"
            onClick={onClose}
            className="w-1/2 h-11 rounded-xl bg-white/5 hover:bg-white/10 text-white font-semibold text-sm border border-white/10 active:scale-[0.98] transition-all flex items-center justify-center cursor-pointer"
          >
            {t('common.cancel', {}, 'Cancelar')}
          </button>
          <button
            type="submit"
            disabled={safeAccounts.length === 0}
            className={`w-1/2 h-11 rounded-xl bg-[var(--color-primary,#AEEDD0)] hover:brightness-105 active:scale-[0.98] text-[#1E2D32] font-bold text-sm shadow-md shadow-[#AEEDD0]/10 transition-all flex items-center justify-center cursor-pointer ${
              safeAccounts.length === 0 ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {transactionToEdit 
              ? t('modals.transaction.updateBtn', {}, 'Actualizar Movimiento') 
              : t('modals.transaction.saveBtn', {}, 'Guardar Movimiento')}
          </button>
        </div>

      </form>
    </ModalWrapper>
  );
}
