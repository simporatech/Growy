import React, { useState, useEffect } from 'react';
import { Tag } from 'lucide-react';
import Button from './Button';
import ModalWrapper from './ModalWrapper';
import FormField from './FormField';
import { useSettings } from '../context/SettingsContext';
import { parseNumeric } from '../utils/formatters';
import { getCurrencySymbol } from '../utils/currency';
import { PRESET_COLOR_DETAILS } from '../constants/colors';
import UniversalIconPicker from './UniversalIconPicker';

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
  const [color, setColor] = useState(categoryToEdit?.color || PRESET_COLOR_DETAILS[0].hex);
  const [targetAmount, setTargetAmount] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    if (categoryToEdit) {
      setType(categoryToEdit.type || 'expense');
      setName(categoryToEdit.name || '');
      setEmoji(categoryToEdit.emoji || '🏷️');
      setColor(categoryToEdit.color || PRESET_COLOR_DETAILS[0].hex);
      setTargetAmount(categoryToEdit.targetAmount !== undefined ? categoryToEdit.targetAmount.toString() : '');
    } else {
      setType(initialType || 'expense');
      setName('');
      setEmoji('🏷️');
      setColor(PRESET_COLOR_DETAILS[0].hex);
      setTargetAmount('');
    }
    setError('');
  }, [categoryToEdit, isOpen, initialType]);

  if (!isOpen) return null;

  const resolvedCurrencySymbol = getCurrencySymbol(baseCurrency || 'USD');

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
      currency: baseCurrency || 'USD',
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
            <UniversalIconPicker
              value={emoji}
              onChange={setEmoji}
              label={t('icon_picker.label', {}, 'ICONO / LOGO')}
            />

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
