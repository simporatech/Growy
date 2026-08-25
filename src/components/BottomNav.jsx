import React from 'react';
import { LayoutDashboard, ArrowLeftRight, Plus, Landmark, Menu } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { useIsAnyModalOpen } from '../utils/modalManager';

export default function BottomNav({
  activeTab,
  setActiveTab,
  isMoreSheetOpen,
  setIsMoreSheetOpen,
  onOpenNewTx,
  isModalActive = false
}) {
  const { t } = useSettings();
  const isGlobalModalOpen = useIsAnyModalOpen();
  const isHidden = isGlobalModalOpen || isModalActive;

  return (
    <nav
      className={`fixed bottom-0 left-0 right-0 z-50 h-16 bg-[#131E22]/95 backdrop-blur-xl border-t border-white/10 px-2 pb-safe md:hidden shadow-[0_-8px_30px_rgba(0,0,0,0.6)] transition-all duration-300 ease-in-out ${
        isHidden ? 'translate-y-full opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'
      }`}
    >
      <div className="max-w-md mx-auto h-full grid grid-cols-5 items-center">
        {/* Item 1: Dashboard */}
        <button
          type="button"
          onClick={() => {
            setActiveTab('dashboard');
            setIsMoreSheetOpen(false);
          }}
          className={`flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
            activeTab === 'dashboard'
              ? 'text-[var(--accent)] font-semibold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <LayoutDashboard size={20} />
          <span className="text-[11px] font-medium leading-none">
            {t('nav.dashboard', {}, 'Panel')}
          </span>
        </button>

        {/* Item 2: Transactions */}
        <button
          type="button"
          onClick={() => {
            setActiveTab('transactions');
            setIsMoreSheetOpen(false);
          }}
          className={`flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
            activeTab === 'transactions'
              ? 'text-[var(--accent)] font-semibold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <ArrowLeftRight size={20} />
          <span className="text-[11px] font-medium leading-none">
            {t('nav.transactions', {}, 'Transacciones')}
          </span>
        </button>

        {/* Item 3: FAB Central - Registrar Movimiento */}
        <div className="flex flex-col items-center justify-center -mt-5">
          <button
            type="button"
            onClick={onOpenNewTx}
            className="w-12 h-12 rounded-full bg-[var(--accent)] text-[var(--accent-text)] shadow-lg shadow-[var(--accent)]/25 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform cursor-pointer"
            title={t('nav.fabTooltip', {}, 'Nuevo Movimiento')}
            aria-label={t('nav.fabTooltip', {}, 'Nuevo Movimiento')}
          >
            <Plus size={24} strokeWidth={2.5} />
          </button>
          <span className="text-[11px] font-semibold text-[var(--accent)] mt-1 leading-none tracking-tight">
            {t('nav.fabRecord', {}, 'Registrar')}
          </span>
        </div>

        {/* Item 4: Accounts */}
        <button
          type="button"
          onClick={() => {
            setActiveTab('accounts');
            setIsMoreSheetOpen(false);
          }}
          className={`flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
            activeTab === 'accounts'
              ? 'text-[var(--accent)] font-semibold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Landmark size={20} />
          <span className="text-[11px] font-medium leading-none">
            {t('nav.accounts', {}, 'Cuentas')}
          </span>
        </button>

        {/* Item 5: Más / Drawer */}
        <button
          type="button"
          onClick={() => setIsMoreSheetOpen(prev => !prev)}
          className={`flex flex-col items-center justify-center gap-1 transition-all cursor-pointer relative ${
            isMoreSheetOpen || ['loans', 'subscriptions', 'categories', 'settings', 'feedback', 'about'].includes(activeTab)
              ? 'text-[var(--accent)] font-semibold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <div className="relative">
            <Menu size={20} />
            {['loans', 'subscriptions', 'categories', 'settings', 'feedback', 'about'].includes(activeTab) && (
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse" />
            )}
          </div>
          <span className="text-[11px] font-medium leading-none">
            {t('nav.more', {}, 'Más')}
          </span>
        </button>
      </div>
    </nav>
  );
}
