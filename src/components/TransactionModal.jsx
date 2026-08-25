import React, { useState, useEffect } from 'react';
import { ArrowDownRight, ArrowUpRight, ArrowLeftRight, AlertCircle } from 'lucide-react';
import Button from './Button';
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const safeAccounts = Array.isArray(accounts) ? accounts.filter(Boolean) : [];
  const safeCategories = Array.isArray(categories) ? categories.filter(Boolean) : [];

  const availableCategories = safeCategories.filter(c => c && c.type === type);

  useEffect(() => {
    if (!isOpen) return;

    if (transactionToEdit) {
      const editType = transactionToEdit?.type || 'expense';
      setType(editType);
      setDate(transactionToEdit?.date || transactionToEdit?.transaction_date || transactionToEdit?.transactionDate || formatDateISO());
      
      const rawAccId = transactionToEdit?.accountId || transactionToEdit?.account_id || transactionToEdit?.account?.id;
      const initialAccId = rawAccId || (safeAccounts[0]?.id || '');
      setAccountId(initialAccId);

      const rawTargetAccId = transactionToEdit?.targetAccountId || transactionToEdit?.target_account_id || transactionToEdit?.destinationAccountId || transactionToEdit?.destination_account_id || transactionToEdit?.targetAccount?.id;
      const fallbackTarget = safeAccounts.find(a => a?.id !== initialAccId)?.id || (safeAccounts[1]?.id || safeAccounts[0]?.id || '');
      setTargetAccountId(rawTargetAccId || fallbackTarget);

      const rawCatId = transactionToEdit?.categoryId || transactionToEdit?.category_id || transactionToEdit?.category?.id || '';
      setCategoryId(rawCatId);

      const rawAmount = transactionToEdit?.amount ?? 0;
      const parsedAmount = parseNumeric(rawAmount, 0);
      setAmount(parsedAmount > 0 ? parsedAmount.toString() : (rawAmount !== undefined && rawAmount !== null ? String(Math.abs(Number(rawAmount) || 0)) : ''));

      const rawTargetAmount = transactionToEdit?.targetAmount ?? transactionToEdit?.target_amount;
      if (rawTargetAmount !== undefined && rawTargetAmount !== null && rawTargetAmount !== '') {
        const parsedTarget = parseNumeric(rawTargetAmount, 0);
        setTargetAmount(parsedTarget > 0 ? parsedTarget.toString() : '');
      } else {
        setTargetAmount('');
      }

      setDescription(transactionToEdit?.description || transactionToEdit?.desc || transactionToEdit?.notes || '');
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
    setIsSubmitting(false);
  }, [transactionToEdit, isOpen, initialType]);

  if (!isOpen) return null;

  const activeAccountId = accountId || safeAccounts[0]?.id || '';
  const activeTargetAccountId = targetAccountId || (safeAccounts.find(a => a?.id !== activeAccountId)?.id || safeAccounts[0]?.id || '');
  const activeCategoryId = categoryId || (availableCategories[0]?.id || '');

  const sourceAccount = safeAccounts.find(a => a?.id === activeAccountId) || safeAccounts[0] || null;
  const destAccount = safeAccounts.find(a => a?.id === activeTargetAccountId) || safeAccounts[1] || safeAccounts[0] || null;

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

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setError('');

    if (safeAccounts.length === 0) {
      setError(t('modals.transaction.noAccountsAlertDesc', {}, 'Debes tener al menos una cuenta registrada.'));
      return;
    }

    const selectedAccountId = activeAccountId;
    if (!selectedAccountId) {
      setError(t('modals.transaction.selectAccountError', {}, 'Selecciona una cuenta válida'));
      return;
    }

    if (type !== 'transfer' && !activeCategoryId) {
      setError(t('modals.transaction.selectCategoryError', {}, 'Selecciona una categoría'));
      return;
    }

    if (type === 'transfer' && selectedAccountId === activeTargetAccountId) {
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

    const payload = {
      id: transactionToEdit ? (transactionToEdit.id || transactionToEdit._id) : undefined,
      type,
      date: date || formatDateISO(),
      accountId: selectedAccountId,
      targetAccountId: type === 'transfer' ? activeTargetAccountId : null,
      categoryId: type !== 'transfer' ? activeCategoryId : null,
      amount: numericAmount,
      targetAmount: isMultiCurrencyTransfer ? numericTargetAmount : numericAmount,
      currency: sourceAccount?.currency || 'USD',
      description: (description || '').trim()
    };

    setIsSubmitting(true);
    try {
      if (onSave) {
        await onSave(payload);
      }
      setIsSubmitting(false);
      onClose();
    } catch (err) {
      console.error("SUPABASE ERROR / TRANSACTION SAVE ERROR:", err);
      setError(err?.message || t('modals.transaction.saveError', {}, 'Error al guardar la transacción. Inténtalo de nuevo.'));
      setIsSubmitting(false);
    }
  };

  const IconComponent = type === 'expense' ? ArrowDownRight : type === 'income' ? ArrowUpRight : ArrowLeftRight;
  const iconTextColor = type === 'expense' ? 'text-rose-400' : 'text-[var(--accent,#97F2CC)]';
  const iconBgColor = type === 'expense' ? 'bg-rose-500/15' : 'bg-[var(--accent-muted,rgba(151,242,204,0.15))]';
  const iconBorderColor = type === 'expense' ? 'border-rose-500/30' : 'border-[var(--accent,#97F2CC)]/30';

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
      iconBgColor={iconBgColor}
      iconBorderColor={iconBorderColor}
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
        <div className="flex-1 overflow-y-auto overscroll-contain custom-scrollbar px-6 py-4 space-y-4">
          
          {/* Segmented Control */}
          <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-[#121721] border border-white/[0.08]">
            <button
              type="button"
              onClick={() => handleTypeChange('expense')}
              className={`h-11 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                type === 'expense'
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 shadow-sm'
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
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-sm'
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
              <span>{t('modals.transaction.typeTransfer', {}, 'Transferencia')}</span>
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
              prefix={getCurrencySymbol(sourceAccount?.currency)}
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
                  placeholder={safeAccounts.length > 0 ? t('placeholders.selectAccount', {}, 'Seleccionar Cuenta') : t('placeholders.noAccounts', {}, 'No Hay Cuentas Disponibles')}
                />
              </FormField>

              <FormField label={categoryLabelText}>
                <CustomSelect
                  options={categorySelectOptions}
                  value={categoryId}
                  onChange={setCategoryId}
                  placeholder={availableCategories.length > 0 ? t('placeholders.selectCategory', {}, 'Seleccionar Categoría') : t('placeholders.noCategories', {}, 'No Hay Categorías Disponibles')}
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
                  placeholder={safeAccounts.length > 0 ? t('placeholders.selectAccount', {}, 'Seleccionar Cuenta') : t('placeholders.noAccounts', {}, 'No Hay Cuentas Disponibles')}
                />
              </FormField>

              <FormField label={t('modals.transaction.accountTarget', {}, 'Cuenta Destino (Entra)')}>
                <CustomSelect
                  options={accountSelectOptions}
                  value={targetAccountId}
                  onChange={setTargetAccountId}
                  placeholder={safeAccounts.length > 0 ? t('placeholders.selectAccount', {}, 'Seleccionar Cuenta') : t('placeholders.noAccounts', {}, 'No Hay Cuentas Disponibles')}
                />
              </FormField>

              {isMultiCurrencyTransfer && (
                <div className="col-span-1 sm:col-span-2 pt-2 pb-2">
                  <div className="p-4 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-100 flex flex-col gap-3">
                    <p className="text-xs">
                      {t('modals.transaction.multiCurrencyDesc', {}, 'Estás transfiriendo entre cuentas con monedas distintas. Ingresa cuánto dinero se acreditará en la cuenta destino')} <strong>({destAccount?.currency || 'USD'})</strong>.
                    </p>
                    <FormField
                      label={t('modals.transaction.targetAmountLabel', {}, 'Monto a Acreditar en Destino')}
                      prefix={getCurrencySymbol(destAccount?.currency)}
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
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('modals.transaction.descPlaceholder', {}, 'Ej. Almuerzo de trabajo, Pago de recibo')}
          />
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
            isLoading={isSubmitting}
            disabled={isSubmitting || safeAccounts.length === 0}
            className="flex-1"
          >
            <span>
              {transactionToEdit 
                ? t('modals.transaction.updateBtn', {}, 'Actualizar Movimiento') 
                : t('modals.transaction.saveBtn', {}, 'Guardar Movimiento')}
            </span>
          </Button>
        </div>

      </form>
    </ModalWrapper>
  );
}
