import React, { useState, useEffect } from 'react';
import { Tag } from 'lucide-react';
import ModalWrapper from './ModalWrapper';
import FormField from './FormField';
import { useSettings } from '../context/SettingsContext';
import { parseNumeric } from '../utils/formatters';
import { getCurrencySymbol } from '../utils/currency';

export default function CategoryModal({ 
  isOpen, 
  onClose, 
  onSave, 
  categoryToEdit,
  initialType = 'expense' 
}) {
  const { baseCurrency, baseCurrencySymbol, t } = useSettings();
  const resolvedCurrencySymbol = baseCurrencySymbol || getCurrencySymbol(baseCurrency);

  const [type, setType] = useState('expense');
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('🏷️');
  const [color, setColor] = useState('#AEEDD0');
  const [targetAmount, setTargetAmount] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    if (categoryToEdit) {
      setType(categoryToEdit.type || 'expense');
      setName(categoryToEdit.name || '');
      setEmoji(categoryToEdit.emoji || '🏷️');
      setColor(categoryToEdit.color || '#AEEDD0');
      setTargetAmount(categoryToEdit.targetAmount !== undefined ? categoryToEdit.targetAmount.toString() : '');
    } else {
      setType(initialType || 'expense');
      setName('');
      setEmoji('🏷️');
      setColor(initialType === 'expense' ? '#FF6B6B' : '#AEEDD0');
      setTargetAmount('');
    }
    setError('');
  }, [categoryToEdit, isOpen, initialType]);

  if (!isOpen) return null;

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
      iconBgColor={type === 'expense' ? 'bg-[#FF6B6B]/15' : 'bg-[#AEEDD0]/15'}
      iconBorderColor={type === 'expense' ? 'border-[#FF6B6B]/30' : 'border-[#AEEDD0]/30'}
      iconTextColor={type === 'expense' ? 'text-[#FF6B6B]' : 'text-[#AEEDD0]'}
      error={error}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        
        {/* Segmented Type Selector */}
        {!categoryToEdit && (
          <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-white/[0.04] border border-white/10">
            <button
              type="button"
              onClick={() => {
                setType('expense');
                if (color === '#AEEDD0') setColor('#FF6B6B');
              }}
              className={`h-11 rounded-xl text-xs font-bold transition-all ${
                type === 'expense'
                  ? 'bg-[#FF6B6B]/20 text-[#FF6B6B] border border-[#FF6B6B]/30 shadow-sm'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              {t('modals.transaction.typeExpense', {}, 'Gasto')}
            </button>

            <button
              type="button"
              onClick={() => {
                setType('income');
                if (color === '#FF6B6B') setColor('#AEEDD0');
              }}
              className={`h-11 rounded-xl text-xs font-bold transition-all ${
                type === 'income'
                  ? 'bg-[var(--color-primary,#AEEDD0)]/20 text-[var(--color-primary,#AEEDD0)] border border-[var(--color-primary,#AEEDD0)]/30 shadow-sm'
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
              className="w-11 h-11 rounded-xl growy-glass-input text-xl text-center font-bold flex items-center justify-center shrink-0 cursor-pointer placeholder:opacity-25 placeholder:grayscale caret-[#AEEDD0] transition-all"
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
              placeholder={t('modals.category.namePlaceholder', {}, 'Ej. Supermercado, Alquiler, Salario')}
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

          <FormField
            label={type === 'expense' ? t('modals.category.expenseBudget', {}, 'Presupuesto Mensual') : t('modals.category.incomeGoal', {}, 'Meta Mensual')}
            prefix={resolvedCurrencySymbol}
            type="number"
            step="0.01"
            value={targetAmount}
            onChange={(e) => setTargetAmount(e.target.value)}
            placeholder="0.00"
          />
        </div>

        {/* Sticky Action Footer */}
        <div className="flex items-center gap-3 pt-4 sm:pt-4 border-t border-white/5 w-full mt-6 sticky bottom-0 bg-[#131E22] pb-4 sm:pb-0 -mx-5 px-5 sm:mx-0 sm:px-0 z-40">
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
            {categoryToEdit ? t('modals.category.updateBtn', {}, 'Actualizar Categoría') : t('modals.category.saveBtn', {}, 'Guardar Categoría')}
          </button>
        </div>

      </form>
    </ModalWrapper>
  );
}
