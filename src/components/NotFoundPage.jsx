import React from 'react';
import { 
  Home, 
  ArrowLeft, 
  ArrowLeftRight, 
  Landmark, 
  Percent, 
  RefreshCw, 
  MessageSquarePlus, 
  Compass,
  ShieldCheck,
  Search
} from 'lucide-react';
import AmbientBackground from './AmbientBackground';
import { useSettings } from '../context/SettingsContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export default function NotFoundPage({ 
  onNavigateTab, 
  onGoHome,
  isLoggedIn = true,
  onOpenPrivacy
}) {
  const { t, language } = useSettings();
  const isEs = String(language || 'es').toLowerCase().startsWith('es');

  // Dynamic Document Title
  useDocumentTitle('not_found');

  const quickLinks = [
    {
      id: 'dashboard',
      label: t('notFound.navDashboard', {}, isEs ? 'Panel Principal' : 'Main Dashboard'),
      description: isEs ? 'Resumen de balance y flujo de caja' : 'Overview of balance & cashflow',
      icon: Home,
      color: 'text-[var(--accent,#97F2CC)]',
      borderHover: 'hover:border-[var(--accent,#97F2CC)]/40',
      bgIcon: 'bg-[var(--accent,#97F2CC)]/10'
    },
    {
      id: 'transactions',
      label: t('notFound.navTransactions', {}, isEs ? 'Transacciones' : 'Transactions'),
      description: isEs ? 'Historial completo de ingresos y gastos' : 'Complete income & expense history',
      icon: ArrowLeftRight,
      color: 'text-emerald-400',
      borderHover: 'hover:border-emerald-500/40',
      bgIcon: 'bg-emerald-500/10'
    },
    {
      id: 'accounts',
      label: t('notFound.navAccounts', {}, isEs ? 'Cuentas' : 'Accounts'),
      description: isEs ? 'Bancos, billeteras y tarjetas' : 'Banks, wallets & credit cards',
      icon: Landmark,
      color: 'text-sky-400',
      borderHover: 'hover:border-sky-500/40',
      bgIcon: 'bg-sky-500/10'
    },
    {
      id: 'loans',
      label: t('notFound.navDebts', {}, isEs ? 'Saldos Pendientes' : 'Pending Balances'),
      description: isEs ? 'Control de deudas y préstamos' : 'Debt and loan tracking',
      icon: Percent,
      color: 'text-amber-400',
      borderHover: 'hover:border-amber-500/40',
      bgIcon: 'bg-amber-500/10'
    },
    {
      id: 'subscriptions',
      label: t('notFound.navSubscriptions', {}, isEs ? 'Suscripciones' : 'Subscriptions'),
      description: isEs ? 'Servicios y pagos recurrentes' : 'Recurring monthly payments',
      icon: RefreshCw,
      color: 'text-violet-400',
      borderHover: 'hover:border-violet-500/40',
      bgIcon: 'bg-violet-500/10'
    },
    {
      id: 'feedback',
      label: t('notFound.navSupport', {}, isEs ? 'Reportar un Problema' : 'Report an Issue'),
      description: isEs ? 'Centro de ayuda y sugerencias' : 'Help center and suggestions',
      icon: MessageSquarePlus,
      color: 'text-rose-400',
      borderHover: 'hover:border-rose-500/40',
      bgIcon: 'bg-rose-500/10'
    }
  ];

  const handlePrimaryAction = () => {
    if (onNavigateTab) {
      onNavigateTab('dashboard');
    } else if (onGoHome) {
      onGoHome();
    } else if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  const handleQuickLink = (tabId) => {
    if (onNavigateTab) {
      onNavigateTab(tabId);
    } else if (onGoHome) {
      onGoHome();
    } else if (typeof window !== 'undefined') {
      window.location.href = `/${tabId}`;
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#090C10] relative flex flex-col justify-between overflow-x-hidden selection:bg-[var(--accent,#97F2CC)] selection:text-[var(--accent-text,#091E15)] text-white">
      {/* Dynamic Ambient Background Glow */}
      <AmbientBackground />

      {/* TOP HEADER */}
      <header className="relative z-20 p-4 sm:p-6 flex items-center justify-between max-w-6xl mx-auto w-full">
        <div 
          onClick={handlePrimaryAction}
          className="flex items-center gap-2.5 cursor-pointer group"
          title="Growy"
        >
          <div className="w-9 h-9 rounded-2xl bg-[var(--accent-muted,rgba(151,242,204,0.15))] border border-[var(--accent,#97F2CC)]/30 flex items-center justify-center p-2 shadow-lg group-hover:scale-105 transition-transform">
            <img src="/logos/Transparent.svg" alt="Growy - Finanzas Inteligentes" className="w-full h-full object-contain" />
          </div>
          <span className="text-sm font-black tracking-wider text-white group-hover:text-[var(--accent,#97F2CC)] transition-colors">
            GROWY
          </span>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
          <ShieldCheck className="w-3.5 h-3.5 text-[var(--accent,#97F2CC)]" />
          <span className="text-[11px] font-semibold text-slate-300">
            {t('modals.auth.encryptedConnection', {}, 'Conexión Encriptada 256-bit')}
          </span>
        </div>
      </header>

      {/* MAIN 404 CONTENT CONTAINER */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-8 max-w-4xl mx-auto w-full text-center">
        
        {/* Glow Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[var(--accent,#97F2CC)]/10 border border-[var(--accent,#97F2CC)]/30 text-[var(--accent,#97F2CC)] text-xs font-bold tracking-wide uppercase shadow-lg shadow-[var(--accent,#97F2CC)]/5 animate-pulse mb-4">
          <Compass className="w-3.5 h-3.5" />
          <span>{t('notFound.badge', {}, isEs ? 'Error 404 • Fuera de Ruta' : 'Error 404 • Out of Bounds')}</span>
        </div>

        {/* 404 Large Aesthetic Number */}
        <div className="relative select-none my-2">
          <span className="text-7xl sm:text-9xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white via-slate-200 to-slate-600 drop-shadow-[0_10px_30px_rgba(151,242,204,0.15)]">
            404
          </span>
          <div className="absolute inset-0 blur-3xl bg-[var(--accent,#97F2CC)]/15 -z-10 pointer-events-none rounded-full" />
        </div>

        {/* Headline & Description */}
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-2 max-w-xl">
          {t('notFound.headline', {}, isEs ? 'Esta página se desvió del presupuesto' : 'This page went off budget')}
        </h1>
        <p className="text-sm sm:text-base text-slate-400 max-w-lg mt-3 leading-relaxed font-normal">
          {t('notFound.description', {}, isEs ? 'El enlace o recurso al que intentas acceder no existe, ha sido reubicado o la dirección ingresada es incorrecta.' : 'The link or resource you are looking for does not exist, has been moved, or the URL entered is incorrect.')}
        </p>

        {/* Primary Return Button */}
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={handlePrimaryAction}
            className="h-11 px-6 rounded-xl bg-[var(--accent,#97F2CC)] text-black font-bold text-sm inline-flex items-center gap-2 shadow-lg shadow-[var(--accent,#97F2CC)]/20 hover:brightness-105 active:scale-95 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{isLoggedIn ? t('notFound.backDashboard', {}, isEs ? 'Volver al Panel' : 'Back to Dashboard') : t('notFound.backHome', {}, isEs ? 'Volver al Inicio' : 'Back to Home')}</span>
          </button>
        </div>

        {/* QUICK NAVIGATION RECOVERY GRID */}
        {isLoggedIn && (
          <div className="mt-12 w-full pt-8 border-t border-white/10 text-left">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 text-center">
              {t('notFound.quickLinksTitle', {}, isEs ? 'O navega directamente a estas secciones:' : 'Or navigate directly to these sections:')}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 w-full">
              {quickLinks.map((item) => {
                const IconComponent = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleQuickLink(item.id)}
                    className={`p-3 rounded-2xl bg-[#0D1117]/80 border border-white/10 ${item.borderHover} hover:bg-white/[0.04] transition-all flex items-start gap-3 text-left group cursor-pointer`}
                  >
                    <div className={`w-8 h-8 rounded-xl ${item.bgIcon} flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform`}>
                      <IconComponent className={`w-4 h-4 ${item.color}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-bold text-white group-hover:text-[var(--accent,#97F2CC)] transition-colors truncate">
                        {item.label}
                      </h4>
                      <p className="text-[11px] text-slate-400 font-normal truncate mt-0.5">
                        {item.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

      </main>

      {/* FOOTER */}
      <footer className="relative z-20 py-6 px-4 border-t border-white/5 bg-[#090C10]/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span>Growy &copy; {new Date().getFullYear()}</span>
            <span>•</span>
            <span>{t('footer.rights', {}, isEs ? 'Todos los derechos reservados.' : 'All rights reserved.')}</span>
          </div>

          <div className="flex items-center gap-4 text-xs font-medium">
            {onOpenPrivacy && (
              <button
                type="button"
                onClick={onOpenPrivacy}
                className="hover:text-[var(--accent,#97F2CC)] transition-colors underline cursor-pointer"
              >
                {t('footer.privacyPolicy', {}, isEs ? 'Política de Privacidad' : 'Privacy Policy')}
              </button>
            )}
            <span className="text-slate-600">•</span>
            <span className="text-slate-500">
              {t('footer.tagline', {}, isEs ? 'Ecosistema de Finanzas Personales Inteligentes' : 'Smart Personal Finance Ecosystem')}
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
