import React, { useState, useEffect } from 'react';
import { Wallet } from 'lucide-react';
import Button from './Button';
import CustomSelect from './CustomSelect';
import ModalWrapper from './ModalWrapper';
import FormField from './FormField';
import { useSettings } from '../context/SettingsContext';
import { parseNumeric } from '../utils/formatters';
import { getCurrencySymbol, AVAILABLE_CURRENCIES } from '../utils/currency';
import { PRESET_COLOR_DETAILS } from '../constants/colors';
import UniversalIconPicker from './UniversalIconPicker';

export default function AccountModal({ 
  isOpen, 
  onClose, 
  onSave, 
  accountToEdit 
}) {
  const { t, baseCurrency } = useSettings();

  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('💳');
  const [color, setColor] = useState(accountToEdit?.color || PRESET_COLOR_DETAILS[0].hex);
  const [currency, setCurrency] = useState(accountToEdit?.currency || baseCurrency || 'USD');
  const [initialBalance, setInitialBalance] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    if (accountToEdit) {
      setName(accountToEdit.name || '');
      setEmoji(accountToEdit.emoji || '💳');
      setColor(accountToEdit.color || PRESET_COLOR_DETAILS[0].hex);
      setCurrency(accountToEdit.currency || baseCurrency || 'USD');
      const rawInit = accountToEdit.initialBalance ?? accountToEdit.initial_balance ?? accountToEdit.balance;
      const initialVal = (rawInit !== undefined && rawInit !== null && rawInit !== '') ? String(rawInit) : '0';
      setInitialBalance(initialVal);
    } else {
      setName('');
      setEmoji('💳');
      setColor(PRESET_COLOR_DETAILS[0].hex);
      setCurrency(baseCurrency || 'USD');
      setInitialBalance('');
    }
    setError('');
  }, [accountToEdit, isOpen, baseCurrency]);

  if (!isOpen) return null;

  const currencySymbol = getCurrencySymbol(currency);
  const currentCalculatedBalance = Number(accountToEdit?.currentBalance ?? accountToEdit?.balance ?? 0);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError(t('modals.account.nameError', {}, 'Ingresa el nombre de la cuenta'));
      return;
    }

    const numInitialBalance = parseNumeric(initialBalance, 0);

    onSave({
      id: accountToEdit ? accountToEdit.id : undefined,
      name: name.trim(),
      emoji: emoji.trim() || '💳',
      color,
      currency,
      currencySymbol,
      initialBalance: numInitialBalance,
      initial_balance: numInitialBalance,
      balance: numInitialBalance
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
      iconBgColor="bg-[var(--accent-muted,rgba(151,242,204,0.15))]"
      iconBorderColor="border-[var(--accent,#97F2CC)]/30"
      iconTextColor="text-[var(--accent,#97F2CC)]"
      error={error}
    >
      <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
        
        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto overscroll-contain custom-scrollbar px-6 py-4 space-y-4">
          
          {/* Read-Only Current Balance Display Badge (When Editing Existing Account) */}
          {accountToEdit && (
            <div className="p-4 rounded-2xl bg-[#121721] border border-white/[0.08] flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                  {t('modals.account.currentBalanceBadge', {}, 'Saldo Actual Calculado')}
                </span>
                <span className="text-[11px] text-slate-400">
                  {t('modals.account.currentBalanceNote', {}, '(Saldo inicial + ingresos - gastos ± traspasos)')}
                </span>
              </div>
              <span className="text-base sm:text-lg font-black text-[var(--accent,#97F2CC)] tabular-nums">
                {currencySymbol} {currentCalculatedBalance.toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          )}

          <div className="flex items-start gap-3">
            <UniversalIconPicker
              value={emoji}
              onChange={setEmoji}
              label={t('modals.account.icon', {}, 'Icono / Logo')}
            />

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

          <div className="space-y-4">
            <FormField label={t('modals.account.color', {}, 'Color de Identificación')}>
              <div className="flex items-center gap-2 flex-wrap pt-1">
                {PRESET_COLOR_DETAILS.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => setColor(c.hex)}
                    className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl border-2 transition-all cursor-pointer hover:scale-110 active:scale-95 ${
                      color?.toUpperCase() === c.hex.toUpperCase() ? 'border-white shadow-lg scale-110 ring-2 ring-white/30' : 'border-white/10'
                    }`}
                    style={{ backgroundColor: c.hex }}
                    title={c.name}
                  />
                ))}
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

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              {t('modals.account.initialBalance', {}, 'Saldo Inicial')}
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--accent,#97F2CC)] font-bold text-sm pointer-events-none">
                {currencySymbol}
              </span>
              <input
                type="number"
                step="any"
                name="balance"
                value={initialBalance}
                onChange={(e) => setInitialBalance(e.target.value)}
                placeholder="0.00"
                required
                className="form-input w-full pl-10 pr-4 h-11 rounded-xl bg-[#121721] border border-white/[0.08] text-[#F1F5F9] font-semibold placeholder:text-slate-500 focus:border-[var(--accent,#97F2CC)] focus:ring-1 focus:ring-[var(--accent,#97F2CC)] focus:outline-none transition-all"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {t('modals.account.initialBalanceHelper', {}, 'Monto de apertura con el que comienza la cuenta')}
            </p>
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
            {accountToEdit ? t('modals.account.updateBtn', {}, 'Actualizar Cuenta') : t('modals.account.saveBtn', {}, 'Guardar Cuenta')}
          </Button>
        </div>

      </form>
    </ModalWrapper>
  );
}
