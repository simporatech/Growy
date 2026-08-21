import React, { useState, useEffect } from 'react';
import { Wallet } from 'lucide-react';
import CustomSelect from './CustomSelect';
import ModalWrapper from './ModalWrapper';
import FormField from './FormField';
import { useSettings } from '../context/SettingsContext';
import { parseNumeric } from '../utils/formatters';
import { getCurrencySymbol } from '../utils/currency';

import { AVAILABLE_CURRENCIES } from '../constants/currencies';

export default function AccountModal({ 
  isOpen, 
  onClose, 
  onSave, 
  accountToEdit 
}) {
  const { t } = useSettings();

  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('💳');
  const [color, setColor] = useState('#AEEDD0');
  const [currency, setCurrency] = useState('USD');
  const [balance, setBalance] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    if (accountToEdit) {
      setName(accountToEdit.name || '');
      setEmoji(accountToEdit.emoji || '💳');
      setColor(accountToEdit.color || '#AEEDD0');
      setCurrency(accountToEdit.currency || 'USD');
      setBalance(accountToEdit.initialBalance !== undefined ? accountToEdit.initialBalance.toString() : accountToEdit.balance !== undefined ? accountToEdit.balance.toString() : '');
    } else {
      setName('');
      setEmoji('💳');
      setColor('#AEEDD0');
      setCurrency('USD');
      setBalance('');
    }
    setError('');
  }, [accountToEdit, isOpen]);

  if (!isOpen) return null;

  const currencySymbol = getCurrencySymbol(currency);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError(t('modals.account.nameError', {}, 'Ingresa el nombre de la cuenta'));
      return;
    }

    const numBalance = parseNumeric(balance, 0);

    onSave({
      id: accountToEdit ? accountToEdit.id : undefined,
      name: name.trim(),
      emoji: emoji.trim() || '💳',
      color,
      currency,
      currencySymbol,
      balance: numBalance
    });

    onClose();
  };

  return (
    <ModalWrapper
      isOpen={isOpen}
      onClose={onClose}
      title={accountToEdit ? t('modals.account.editTitle', {}, 'Editar Cuenta') : t('modals.account.newTitle', {}, 'Nueva Cuenta')}
      subtitle={accountToEdit ? t('modals.account.editSubtitle', {}, 'Modifica los detalles de tu cuenta') : t('modals.account.newSubtitle', {}, 'Agrega una nueva fuente de saldo')}
      icon={Wallet}
      iconBgColor="bg-[#AEEDD0]/15"
      iconBorderColor="border-[#AEEDD0]/30"
      iconTextColor="text-[#AEEDD0]"
      error={error}
    >
      <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
        
        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto overscroll-contain custom-scrollbar p-5 sm:p-7 space-y-4">
          <div className="flex items-start gap-3">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2 block">
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
                placeholder="🏦"
                className="w-11 h-11 rounded-xl growy-glass-input text-xl text-center font-bold flex items-center justify-center shrink-0 cursor-pointer placeholder:opacity-25 placeholder:grayscale caret-[#AEEDD0] transition-all"
                title="Emoji"
              />
            </div>

            <div className="flex-1">
              <FormField
                label={t('modals.account.name', {}, 'Nombre de la Cuenta')}
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('modals.account.namePlaceholder', {}, 'Ej. Cuenta Principal, Ahorros, Cartera')}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label={t('modals.account.color', {}, 'Color de Identificación')}>
              <div className="flex items-center gap-3 h-11 px-3 bg-[#162226] border border-white/10 rounded-xl">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-7 h-7 rounded-md border-0 bg-transparent cursor-pointer p-0"
                />
                <span className="text-xs font-mono font-bold text-slate-200 uppercase">{color}</span>
              </div>
            </FormField>

            <FormField label={t('modals.account.currency', {}, 'Moneda / Divisa')}>
              <CustomSelect
                options={AVAILABLE_CURRENCIES}
                value={currency}
                onChange={setCurrency}
              />
            </FormField>
          </div>

          <FormField
            label={t('modals.account.balance', {}, 'Balance Actual')}
            prefix={currencySymbol}
            type="number"
            step="0.01"
            required
            value={balance}
            onChange={(e) => setBalance(e.target.value)}
            placeholder="0.00"
          />
        </div>

        {/* Fixed Footer */}
        <div className="shrink-0 p-4 border-t border-white/10 bg-[#0E171B] flex gap-3 z-10">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-xl border border-white/10 text-slate-300 font-medium hover:bg-white/5 transition-colors cursor-pointer"
          >
            {t('common.cancel', {}, 'Cancelar')}
          </button>
          <button
            type="submit"
            className="flex-1 py-3 px-4 rounded-xl bg-[#5EEAD4] text-[#0A1316] font-semibold hover:bg-[#2DD4BF] transition-colors cursor-pointer"
          >
            {accountToEdit ? t('modals.account.updateBtn', {}, 'Actualizar Cuenta') : t('modals.account.saveBtn', {}, 'Guardar Cuenta')}
          </button>
        </div>

      </form>
    </ModalWrapper>
  );
}
