import React, { useState, useMemo, useCallback } from 'react';
import { Plus, RefreshCw, Edit2, Trash2, Search } from 'lucide-react';
import SubscriptionModal from './SubscriptionModal';
import ConfirmDeleteModal from './ConfirmDeleteModal';
import ExportDropdown from './ExportDropdown';
import { useFinance } from '../context/FinanceContext';
import { useSettings } from '../context/SettingsContext';
import { parseNumeric } from '../utils/formatters';

export default function SubscriptionsModule() {
  const { subscriptions, accounts, categories, addSubscription, updateSubscription, deleteSubscription, toggleSubscription } = useFinance();
  const { formatCurrency, t } = useSettings();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [subToEdit, setSubToEdit] = useState(null);
  const [subToDelete, setSubToDelete] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const safeSubsList = useMemo(() => Array.isArray(subscriptions) ? subscriptions.filter(Boolean) : [], [subscriptions]);
  const safeAccountsList = useMemo(() => Array.isArray(accounts) ? accounts.filter(Boolean) : [], [accounts]);
  const safeCategoriesList = useMemo(() => Array.isArray(categories) ? categories.filter(Boolean) : [], [categories]);

  // Sort subscriptions chronologically by billingDay (1 to 31)
  const sortedSubs = useMemo(() => {
    return [...safeSubsList].sort((a, b) => (parseNumeric(a.billingDay, 0)) - (parseNumeric(b.billingDay, 0)));
  }, [safeSubsList]);

  const filteredSubs = useMemo(() => {
    if (!searchTerm.trim()) return sortedSubs;
    const q = searchTerm.toLowerCase();
    return sortedSubs.filter(s =>
      (s.name || '').toLowerCase().includes(q)
    );
  }, [sortedSubs, searchTerm]);

  const subColumns = useMemo(() => [
    { label: t('modals.subscription.name', {}, 'Servicio'), accessor: (s) => s.name || '-' },
    { label: t('modals.subscription.billingDay', {}, 'Día de Corte'), accessor: (s) => `Día ${s.billingDay || 1}` },
    { label: t('modals.subscription.frequency', {}, 'Frecuencia'), accessor: (s) => s.frequency === 'yearly' ? 'Anual' : 'Mensual' },
    { label: t('modals.subscription.account', {}, 'Cuenta Pagadora'), accessor: (s) => safeAccountsList.find(a => a?.id === s.accountId)?.name || 'General' },
    { label: t('modals.subscription.amount', {}, 'Monto'), accessor: (s) => `${s.currency || 'USD'} ${Number(s.amount || 0).toFixed(2)}` },
    { label: 'Estado', accessor: (s) => s.isActive ? 'Activo' : 'Pausado' }
  ], [safeAccountsList, t]);

  // Calculate monthly total commitment
  const monthlyTotal = useMemo(() => {
    return safeSubsList
      .filter(s => s && s.isActive)
      .reduce((sum, s) => {
        const amt = parseNumeric(s.amount, 0);
        return sum + (s.frequency === 'yearly' ? amt / 12 : amt);
      }, 0);
  }, [safeSubsList]);

  const handleSaveSub = useCallback((subData) => {
    if (!subData) return;
    if (subToEdit) {
      updateSubscription(subData);
    } else {
      addSubscription(subData);
    }
    setSubToEdit(null);
  }, [subToEdit, updateSubscription, addSubscription]);

  const handleDeleteSub = useCallback(() => {
    if (!subToDelete) return;
    deleteSubscription(subToDelete.id);
    setSubToDelete(null);
  }, [subToDelete, deleteSubscription]);

  return (
    <div className="w-full space-y-6 animate-fadeIn">
      
      {/* Standardized Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full relative z-30">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
            {t('subscriptions.title', {}, 'Gestión de Suscripciones')}
          </h1>
          <p className="text-sm text-slate-300 mt-1 block font-normal flex items-center gap-2">
            <span className="tabular-nums">
              {t('subscriptions.estimatedMonthlyTotal', { amount: formatCurrency(monthlyTotal) }, `Total Mensual Estimado: ${formatCurrency(monthlyTotal)}`)}
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {/* Real-Time Search Bar */}
          <div className="relative flex-1 sm:w-60 min-w-[180px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('placeholders.search', {}, 'Buscar por nombre...')}
              className="w-full h-10 pl-9 pr-3 bg-[#131E22] border border-white/10 rounded-xl text-xs text-white placeholder:text-slate-500 outline-none focus:border-[#AEEDD0] shadow-inner transition-colors"
            />
          </div>

          <ExportDropdown
            data={filteredSubs}
            columns={subColumns}
            title={t('subscriptions.title', {}, 'Gestión de Suscripciones')}
            filename="suscripciones_growy"
          />

          <button
            onClick={() => {
              setSubToEdit(null);
              setIsModalOpen(true);
            }}
            className="h-10 px-4 text-xs font-bold rounded-xl bg-[#AEEDD0] text-[#1E2D32] hover:brightness-105 active:scale-[0.98] transition-all shadow-md shadow-[#AEEDD0]/10 flex items-center gap-2 shrink-0 cursor-pointer"
          >
            <Plus size={15} />
            <span>{t('subscriptions.newSubscription', {}, 'Nueva Suscripción')}</span>
          </button>
        </div>
      </header>

      {/* Chronological Timeline List */}
      <div className="w-full space-y-3 relative z-10">
        {filteredSubs.length === 0 ? (
          <div className="p-6 rounded-2xl bg-[#1E2D32]/60 border border-white/10 backdrop-blur-md text-center text-slate-300 space-y-3">
            <RefreshCw className="w-12 h-12 text-slate-400 mx-auto" />
            <h3 className="text-lg font-bold text-white tracking-tight">
              {safeSubsList.length === 0 ? t('subscriptions.noSubsTitle', {}, 'No tienes suscripciones activas') : 'Sin resultados de búsqueda'}
            </h3>
            <p className="text-sm text-slate-300 max-w-sm mx-auto font-normal">
              {safeSubsList.length === 0 ? t('subscriptions.noSubsDesc', {}, 'Agrega servicios como Netflix, Spotify o iCloud para gestionar tus cobros automáticos.') : 'Prueba con otro término de búsqueda.'}
            </p>
            {safeSubsList.length === 0 && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="h-11 px-5 rounded-xl btn-primary-mint font-bold text-sm inline-flex items-center gap-2 shadow cursor-pointer"
              >
                <Plus className="w-4 h-4" /> {t('subscriptions.newSubscription', {}, 'Nueva Suscripción')}
              </button>
            )}
          </div>
        ) : (
          filteredSubs.map((sub) => {
            const acc = safeAccountsList.find(a => a?.id === sub.accountId) || { name: 'Cuenta General', currencySymbol: '$' };
            const cat = safeCategoriesList.find(c => c?.id === sub.categoryId) || { name: 'General', emoji: '📌' };

            return (
              <div
                key={sub.id}
                className={`rounded-xl h-16 px-4 bg-[#162226] border flex items-center justify-between gap-4 transition-all group ${
                  sub.isActive ? 'border-white/10 hover:bg-white/[0.06]' : 'border-white/5 bg-white/[0.01] opacity-50'
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0 pr-2">
                  <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex flex-col items-center justify-center shrink-0">
                    <span className="text-xs uppercase font-bold text-[#AEEDD0]">{t('subscriptions.dayBadge', {}, 'Día')}</span>
                    <span className="text-xs font-extrabold text-white leading-none tabular-nums">{sub.billingDay || 1}</span>
                  </div>

                  <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-base shrink-0">
                    {sub.emoji || '🍿'}
                  </div>

                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-white group-hover:text-[var(--color-primary,#AEEDD0)] transition-colors truncate">
                      {sub.name}
                    </h4>
                    <p className="text-xs text-slate-300 font-medium truncate">
                      {acc?.name} • {cat?.name}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <div className="text-sm sm:text-base font-bold text-[var(--color-primary,#AEEDD0)] tabular-nums">
                      {formatCurrency(sub.amount, acc?.currency || sub.currency || 'USD')}
                    </div>
                    <span className="text-xs text-slate-300 font-semibold uppercase block">
                      {sub.frequency === 'yearly' ? t('subscriptions.yearly', {}, 'Anual') : t('subscriptions.monthly', {}, 'Mensual')}
                    </span>
                  </div>

                  {/* Custom Toggle Switch */}
                  <div
                    onClick={() => toggleSubscription(sub.id)}
                    className={`w-11 h-6 rounded-full p-0.5 transition-all cursor-pointer flex items-center ${
                      sub.isActive ? 'bg-[var(--color-primary,#AEEDD0)] justify-end' : 'bg-[#1E2D32] border border-white/20 justify-start'
                    }`}
                    title={sub.isActive ? 'Suscripción Activa (Click para pausar)' : 'Suscripción Pausada (Click para activar)'}
                  >
                    <div className={`w-5 h-5 rounded-full shadow-md transition-all ${
                      sub.isActive ? 'bg-[#1E2D32]' : 'bg-slate-400'
                    }`} />
                  </div>

                  <div className="flex items-center gap-1 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => {
                        setSubToEdit(sub);
                        setIsModalOpen(true);
                      }}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                      title={t('common.edit', {}, 'Editar')}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setSubToDelete(sub)}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      title={t('common.delete', {}, 'Eliminar')}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

              </div>
            );
          })
        )}
      </div>

      <SubscriptionModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSubToEdit(null);
        }}
        onSave={handleSaveSub}
        subscriptionToEdit={subToEdit}
        accounts={safeAccountsList}
        categories={safeCategoriesList}
      />

      <ConfirmDeleteModal
        isOpen={!!subToDelete}
        onClose={() => setSubToDelete(null)}
        onConfirm={handleDeleteSub}
        itemName={subToDelete?.name || 'suscripción'}
        itemType="suscripción"
      />

    </div>
  );
}
