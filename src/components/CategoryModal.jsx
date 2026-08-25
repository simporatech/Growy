import React, { useState, useEffect } from 'react';
import { Tag } from 'lucide-react';
import Button from './Button';
import ModalWrapper from './ModalWrapper';
import FormField from './FormField';
import CustomSelect from './CustomSelect';
import { useSettings } from '../context/SettingsContext';
import { parseNumeric } from '../utils/formatters';
import { AVAILABLE_CURRENCIES, getCurrencySymbol } from '../utils/currency';

export default function CategoryModal({ 
  isOpen, 
  onClose, 
  onSave, 
  categoryToEdit,
  initialType = 'expense' 
}) {
  const { baseCurrency, t } = useSettings();

  const [type, setType] = useState('expense');
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('🏷️');
  const [color, setColor] = useState('#AEEDD0');
  const [currency, setCurrency] = useState('USD');
  const [targetAmount, setTargetAmount] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    if (categoryToEdit) {
      setType(categoryToEdit.type || 'expense');
      setName(categoryToEdit.name || '');
      setEmoji(categoryToEdit.emoji || '🏷️');
      setColor(categoryToEdit.color || '#AEEDD0');
      setCurrency(categoryToEdit.currency || 'USD');
      setTargetAmount(categoryToEdit.targetAmount !== undefined ? categoryToEdit.targetAmount.toString() : '');
    } else {
      setType(initialType || 'expense');
      setName('');
      setEmoji('🏷️');
      setColor(initialType === 'expense' ? '#FF6B6B' : '#AEEDD0');
      setCurrency(baseCurrency || 'USD');
      setTargetAmount('');
    }
    setError('');
  }, [categoryToEdit, isOpen, initialType, baseCurrency]);

  if (!isOpen) return null;

  const resolvedCurrencySymbol = getCurrencySymbol(currency);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError(t('modals.category.nameError', {}, 'Ingresa el nombre de la categoría'));
      return;
    }

    const numTarget = parseNumeric(targetAmount, 0);

    onSave({
      id: categoryToEdit ? categoryToEdit.id : undefined,
      name: name.trim(),
      emoji: emoji.trim() || '🏷️',
      color,
      type,
      currency,
      targetAmount: numTarget
    });

    onClose();
  };

  return (
    <ModalWrapper
      isOpen={isOpen}
      onClose={onClose}
      title={categoryToEdit ? t('modals.category.editTitle', {}, 'Editar Categoría') : t('modals.category.newTitle', {}, 'Nueva Categoría')}
      subtitle={type === 'expense' ? t('modals.category.expenseSubtitle', {}, 'Organiza y presupuesta tus gastos') : t('modals.category.incomeSubtitle', {}, 'Registra tus fuentes de ingresos')}
      icon={Tag}
      iconBgColor={type === 'expense' ? 'bg-[#FF6B6B]/15' : 'bg-[var(--accent-muted,rgba(151,242,204,0.15))]'}
      iconBorderColor={type === 'expense' ? 'border-[#FF6B6B]/30' : 'border-[var(--accent,#97F2CC)]/30'}
      iconTextColor={type === 'expense' ? 'text-[#FF6B6B]' : 'text-[var(--accent,#97F2CC)]'}
      error={error}
    >
      <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
        
        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto overscroll-contain custom-scrollbar px-6 py-4 space-y-4">
          {!initialType && (
            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-[#121721] border border-white/[0.08] mb-2">
              <button
                type="button"
                onClick={() => setType('expense')}
                className={`h-10 rounded-xl text-xs font-bold transition-all ${
                  type === 'expense'
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                {t('modals.transaction.typeExpense', {}, 'Gasto')}
              </button>
              <button
                type="button"
                onClick={() => setType('income')}
                className={`h-10 rounded-xl text-xs font-bold transition-all ${
                  type === 'income'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                {t('modals.transaction.typeIncome', {}, 'Ingreso')}
              </button>
            </div>
          )}

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
                placeholder="🏷️"
                className="w-11 h-11 rounded-xl form-input bg-[#121721] border border-white/[0.08] text-[#F1F5F9] text-xl text-center font-bold flex items-center justify-center shrink-0 cursor-pointer placeholder:opacity-25 placeholder:grayscale caret-[var(--accent,#97F2CC)] focus:outline-none focus:border-[var(--accent,#97F2CC)] focus:ring-1 focus:ring-[var(--accent,#97F2CC)] transition-all"
                title="Emoji"
              />
            </div>

            <div className="flex-1">
              <FormField
                label={t('modals.category.name', {}, 'Nombre de la Categoría')}
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('modals.category.namePlaceholder', {}, 'Ej. Alimentación, Salario, Transporte, SaaS')}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <FormField label={t('modals.account.color', {}, 'Color')}>
              <div className="flex items-center gap-3 h-11 px-3 bg-[#121721] border border-white/[0.08] rounded-xl">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-7 h-7 rounded-md border-0 bg-transparent cursor-pointer p-0"
                />
                <span className="text-xs font-mono font-bold text-slate-200 uppercase">{color}</span>
              </div>
            </FormField>

            <FormField label={t('modals.account.currency', {}, 'Divisa')}>
              <CustomSelect
                options={AVAILABLE_CURRENCIES}
                value={currency}
                onChange={setCurrency}
              />
            </FormField>

            <FormField
              label={type === 'expense' ? t('modals.category.expenseBudget', {}, 'Presupuesto') : t('modals.category.incomeGoal', {}, 'Meta')}
              prefix={resolvedCurrencySymbol}
              type="number"
              step="0.01"
              value={targetAmount}
              onChange={(e) => setTargetAmount(e.target.value)}
              placeholder="0.00"
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
          >
            {t('common.cancel', {}, 'Cancelar')}
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="md"
            className="flex-1"
          >
            {categoryToEdit ? t('modals.category.updateBtn', {}, 'Actualizar Categoría') : t('modals.category.saveBtn', {}, 'Guardar Categoría')}
          </Button>
        </div>

      </form>
    </ModalWrapper>
  );
}
