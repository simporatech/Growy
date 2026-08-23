import React, { useState, useEffect, useMemo } from 'react';
import { RefreshCw, AlertCircle } from 'lucide-react';
import CustomSelect from './CustomSelect';
import ModalWrapper from './ModalWrapper';
import FormField from './FormField';
import { useSettings } from '../context/SettingsContext';
import { parseNumeric } from '../utils/formatters';
import { getCurrencySymbol } from '../utils/currency';

export default function SubscriptionModal({ 
  isOpen, 
  onClose, 
  onSave, 
  subscriptionToEdit,
  accounts = [],
  categories = [] 
}) {
  const { t } = useSettings();

  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('🍿');
  const [amount, setAmount] = useState('');
  const [accountId, setAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [billingDay, setBillingDay] = useState(5);
  const [frequency, setFrequency] = useState('monthly');
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState('');

  const frequencyOptions = useMemo(() => [
    { value: 'monthly', label: t('subscriptions.monthly', {}, 'Mensual') },
    { value: 'yearly', label: t('subscriptions.yearly', {}, 'Anual') }
  ], [t]);

  const safeAccounts = Array.isArray(accounts) ? accounts.filter(Boolean) : [];
  const safeCategories = Array.isArray(categories) ? categories.filter(c => c && c.type === 'expense') : [];

  useEffect(() => {
    if (!isOpen) return;

    if (subscriptionToEdit) {
      setName(subscriptionToEdit.name || '');
      setEmoji(subscriptionToEdit.emoji || '🍿');
      setAmount(subscriptionToEdit.amount !== undefined ? subscriptionToEdit.amount.toString() : '');
      setAccountId(subscriptionToEdit.accountId || (safeAccounts[0]?.id || ''));
      setCategoryId(subscriptionToEdit.categoryId || (safeCategories[0]?.id || ''));
      setBillingDay(subscriptionToEdit.billingDay || 5);
      setFrequency(subscriptionToEdit.frequency || 'monthly');
      setIsActive(subscriptionToEdit.isActive !== undefined ? subscriptionToEdit.isActive : true);
    } else {
      setName('');
      setEmoji('🍿');
      setAmount('');
      setAccountId(safeAccounts[0]?.id || '');
      setCategoryId(safeCategories[0]?.id || '');
      setBillingDay(5);
      setFrequency('monthly');
      setIsActive(true);
    }
    setError('');
  }, [subscriptionToEdit, isOpen]);

  if (!isOpen) return null;

  const selectedAccount = safeAccounts.find(a => a.id === accountId) || safeAccounts[0] || null;
  const currencyCode = selectedAccount?.currency || 'USD';
  const currencySymbol = getCurrencySymbol(currencyCode);

  const accountSelectOptions = safeAccounts.map(acc => ({
    value: acc.id,
    label: `${acc.emoji || '💳'} ${acc.name} (${getCurrencySymbol(acc.currency)} ${acc.currency || 'USD'})`
  }));

  const categorySelectOptions = safeCategories.map(cat => ({
    value: cat.id,
    label: `${cat.emoji || '🏷️'} ${cat.name}`
  }));

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (safeAccounts.length === 0) {
      setError(t('modals.transaction.noAccountsAlertDesc', {}, 'Debes crear al menos una cuenta.'));
      return;
    }

    if (!name.trim()) {
      setError(t('modals.subscription.nameError', {}, 'Ingresa el nombre del servicio'));
      return;
    }

    const numAmount = parseNumeric(amount, -1);
    if (numAmount <= 0) {
      setError(t('modals.subscription.invalidAmountError', {}, 'Ingresa un monto válido mayor a 0'));
      return;
    }

    if (!accountId) {
      setError(t('modals.subscription.selectAccountError', {}, 'Selecciona la cuenta pagadora'));
      return;
    }

    if (!categoryId) {
      setError(t('modals.subscription.selectCategoryError', {}, 'Selecciona una categoría de gasto'));
      return;
    }

    const dayNum = parseInt(billingDay, 10);
    if (isNaN(dayNum) || dayNum < 1 || dayNum > 31) {
      setError(t('modals.subscription.invalidDayError', {}, 'Ingresa un día de corte válido (1 a 31)'));
      return;
    }

    onSave({
      id: subscriptionToEdit ? subscriptionToEdit.id : undefined,
      name: name.trim(),
      emoji: emoji.trim() || '🍿',
      amount: numAmount,
      currency: currencyCode,
      accountId,
      categoryId,
      billingDay: dayNum,
      frequency,
      isActive,
      lastProcessedDate: subscriptionToEdit ? subscriptionToEdit.lastProcessedDate : undefined
    });

    onClose();
  };

  return (
    <ModalWrapper
      isOpen={isOpen}
      onClose={onClose}
      title={subscriptionToEdit ? t('modals.subscription.editTitle', {}, 'Editar Suscripción') : t('modals.subscription.newTitle', {}, 'Nueva Suscripción')}
      subtitle={t('modals.subscription.subtitle', {}, 'Gestión de pagos recurrentes y debitado automático')}
      icon={RefreshCw}
      iconBgColor="bg-[#AEEDD0]/15"
      iconBorderColor="border-[#AEEDD0]/30"
      iconTextColor="text-[#AEEDD0]"
      error={error}
    >
      {safeAccounts.length === 0 && (
        <div className="mb-4 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs font-medium space-y-2">
          <div className="flex items-center gap-2 font-bold text-amber-300">
            <AlertCircle className="w-4 h-4" />
            <span>{t('modals.transaction.noAccountsAlert', {}, 'No hay cuentas disponibles')}</span>
          </div>
          <p>{t('modals.transaction.noAccountsAlertDesc', {}, 'Debes crear al menos una cuenta para asociar esta suscripción.')}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
        
        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto overscroll-contain custom-scrollbar p-5 sm:p-7 space-y-4">
          {/* Nombre & Emoji Tile */}
          <div className="flex items-start gap-3">
            <div>
              <label className="whitespace-nowrap text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5 block">
                Emoji
              </label>
              <input
                type="text"
                maxLength={4}
                value={emoji}
                onChange={(e) => {
                  const val = Array.from(e.target.value).pop() || '';
                  setEmoji(val);
                }}
                placeholder="🍿"
                className="w-11 h-11 rounded-xl growy-glass-input text-xl text-center font-bold flex items-center justify-center shrink-0 cursor-pointer placeholder:opacity-25 placeholder:grayscale caret-[#AEEDD0] transition-all"
                title="Emoji"
              />
            </div>

            <div className="flex-1">
              <FormField
                label={t('modals.subscription.name', {}, 'Nombre del Servicio')}
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('modals.subscription.namePlaceholder', {}, 'Ej. Netflix, Spotify, Gimnasio, iCloud')}
              />
            </div>
          </div>

          {/* Row 1: Paying Account & Expense Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label={t('modals.subscription.account', {}, 'Cuenta Pagadora')}>
              <CustomSelect
                options={accountSelectOptions}
                value={accountId}
                onChange={setAccountId}
                placeholder={safeAccounts.length > 0 ? t('placeholders.selectAccount', {}, 'Seleccionar cuenta') : t('placeholders.noAccounts', {}, 'No hay cuentas disponibles')}
              />
            </FormField>

            <FormField label={t('modals.subscription.category', {}, 'Categoría de Gasto')}>
              <CustomSelect
                options={categorySelectOptions}
                value={categoryId}
                onChange={setCategoryId}
                placeholder={safeCategories.length > 0 ? t('placeholders.selectCategory', {}, 'Seleccionar categoría') : t('placeholders.noCategories', {}, 'No hay categorías disponibles')}
              />
            </FormField>
          </div>

          {/* Row 2: Amount & Billing Day */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              label={t('modals.subscription.amount', {}, 'Monto')}
              prefix={currencySymbol}
              type="number"
              step="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />

            <FormField
              label={t('modals.subscription.billingDay', {}, 'Día de Corte (1-31)')}
              type="number"
              min="1"
              max="31"
              required
              value={billingDay}
              onChange={(e) => setBillingDay(e.target.value)}
              placeholder="Día"
            />
          </div>

          {/* Row 3: Frequency */}
          <FormField label={t('modals.subscription.frequency', {}, 'Frecuencia')}>
            <CustomSelect
              options={frequencyOptions}
              value={frequency}
              onChange={setFrequency}
            />
          </FormField>

          {/* Active Switch Toggle Card */}
          <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/10">
            <div className="space-y-0.5 min-w-0 flex-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-300 block">
                {t('modals.subscription.isActive', {}, 'Suscripción Activa')}
              </span>
              <p className="text-xs text-slate-400 leading-normal">
                {t('modals.subscription.isActiveDesc', {}, 'El cobro se debitará automáticamente en su día de corte')}
              </p>
            </div>

            <div className="shrink-0">
              <div 
                onClick={() => setIsActive(!isActive)}
                className={`w-12 h-6.5 rounded-full p-1 transition-all cursor-pointer flex items-center ${
                  isActive ? 'bg-[#AEEDD0] justify-end' : 'bg-[#1E2D32] border border-[#AEEDD0]/30 justify-start'
                }`}
              >
                <div className={`w-4.5 h-4.5 rounded-full shadow-md transition-all ${
                  isActive ? 'bg-[#1E2D32]' : 'bg-[#8EA7A8]'
                }`} />
              </div>
            </div>
          </div>
        </div>

        {/* Fixed Footer */}
        <div className="shrink-0 z-10 bg-[#111C20] p-4 border-t border-white/10 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-xl bg-slate-800/60 hover:bg-slate-700/60 text-slate-300 font-semibold border border-white/10 transition-colors cursor-pointer"
          >
            {t('common.cancel', {}, 'Cancelar')}
          </button>
          <button
            type="submit"
            disabled={safeAccounts.length === 0 || safeCategories.length === 0}
            className={`flex-1 py-3 px-4 rounded-xl btn-primary-mint font-bold hover:brightness-105 active:scale-[0.98] transition-all cursor-pointer shadow-md ${
              safeAccounts.length === 0 || safeCategories.length === 0 ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {subscriptionToEdit 
              ? t('modals.subscription.updateBtn', {}, 'Actualizar Suscripción') 
              : t('modals.subscription.saveBtn', {}, 'Guardar Suscripción')}
          </button>
        </div>

      </form>
    </ModalWrapper>
  );
}
