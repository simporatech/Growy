import React, { useState, useMemo } from 'react';
import { Settings as SettingsIcon, Languages, Palette, Sparkles, Download, RotateCcw, Check, ShieldAlert, Coins, RefreshCw, ArrowLeftRight, Trash2 } from 'lucide-react';
import { useSettings, THEMES } from '../context/SettingsContext';
import { useFinance } from '../context/FinanceContext';
import { SUPPORTED_CURRENCIES, FALLBACK_EXCHANGE_RATES, CURRENCY_MAP, AVAILABLE_CURRENCIES } from '../utils/currency';
import ConfirmDeleteModal from './ConfirmDeleteModal';
import DeleteAccountModal from './DeleteAccountModal';
import CustomSelect from './CustomSelect';
import { dbDeleteUser } from '../services/supabaseService';
import { supabase } from '../lib/supabaseClient';
import { getActiveSessionUserId, setActiveSessionUserId } from '../utils/userStorage';

export default function SettingsModule() {
  const { 
    language, setLanguage,
    theme: currentTheme, setTheme,
    glassIntensity, setGlassIntensity,
    baseCurrency, setBaseCurrency,
    exchangeRates, lastUpdated, isFetchingRates, refreshExchangeRates,
    exportBackup, resetAllData, t 
  } = useSettings();

  const financeData = useFinance();
  const { consolidateOldHistory } = financeData;

  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isConsolidateModalOpen, setIsConsolidateModalOpen] = useState(false);
  const [isDeleteAccountModalOpen, setIsDeleteAccountModalOpen] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [isConsolidating, setIsConsolidating] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  // Live Exchange Rate Calculator State
  const [calcAmount, setCalcAmount] = useState('1');
  const [calcFromCurrency, setCalcFromCurrency] = useState('USD');
  const [calcToCurrency, setCalcToCurrency] = useState('HNL');

  const safeRates = exchangeRates || FALLBACK_EXCHANGE_RATES;

// Options formatted for CustomSelect using full AVAILABLE_CURRENCIES catalog
  const currencyOptions = useMemo(() => {
    return AVAILABLE_CURRENCIES.map(c => ({
      value: c.code,
      label: `${c.flag || '🌐'} ${c.code} (${c.symbol}) - ${c.label.includes(' - ') ? c.label.split(' - ')[1] : c.label}`
    }));
  }, []);

  // Calculation Logic
  const { unitRateFormatted, calcResultFormatted } = useMemo(() => {
    const amt = Number(calcAmount) || 0;
    const rateFrom = Number(safeRates[calcFromCurrency]) || 1;
    const rateTo = Number(safeRates[calcToCurrency]) || 1;

    const unitRate = rateTo / rateFrom;
    const totalResult = amt * unitRate;

    let unitStr = unitRate.toFixed(2);
    if (unitRate < 1 && unitRate >= 0.0001) {
      unitStr = unitRate.toFixed(4);
    } else if (unitRate < 100 && unitRate >= 1) {
      unitStr = unitRate.toFixed(3);
    }

    const totalStr = new Intl.NumberFormat(language === 'es' ? 'es-HN' : 'en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(totalResult);

    return { unitRateFormatted: unitStr, calcResultFormatted: totalStr };
  }, [calcAmount, calcFromCurrency, calcToCurrency, safeRates, language]);

  const handleResetConfirm = () => {
    resetAllData();
    setIsResetModalOpen(false);
    setStatusMessage(language === 'es' ? 'Datos restablecidos con éxito.' : 'Data reset successfully.');
    setTimeout(() => setStatusMessage(''), 3500);
  };

  const handleConsolidateConfirm = async () => {
    setIsConsolidating(true);
    setIsConsolidateModalOpen(false);
    try {
      const res = await consolidateOldHistory();
      if (res && res.success) {
        if (res.count > 0) {
          setStatusMessage(language === 'es' 
            ? `Se consolidaron ${res.count} transacciones antiguas en ${res.consolidatedGroups} registros anuales.` 
            : `Consolidated ${res.count} old transactions into ${res.consolidatedGroups} annual records.`);
        } else {
          setStatusMessage(language === 'es' 
            ? 'No se encontraron transacciones con más de 1 año de antigüedad para consolidar.' 
            : 'No transactions older than 1 year were found to consolidate.');
        }
      } else {
        setStatusMessage(language === 'es' ? 'Ocurrió un error al consolidar el historial.' : 'Error consolidating historical data.');
      }
    } catch (e) {
      console.error(e);
      setStatusMessage(language === 'es' ? 'Error al consolidar historial.' : 'Error consolidating history.');
    } finally {
      setIsConsolidating(false);
      setTimeout(() => setStatusMessage(''), 4500);
    }
  };

  const handleDeleteAccountConfirm = async () => {
    const activeUserId = getActiveSessionUserId();

    if (!activeUserId) {
      console.error('❌ No hay usuario activo para eliminar');
      return;
    }

    setIsDeletingAccount(true);

    try {
      console.log('🗑️ Intentando eliminar usuario de Supabase:', activeUserId);

      const res = await dbDeleteUser(activeUserId);

      if (!res || !res.success) {
        console.error('❌ Error de Supabase al borrar usuario:', res?.error);
        alert(language === 'es' ? `Error al eliminar cuenta: ${res?.error || 'Error desconocido'}` : `Error deleting account: ${res?.error || 'Unknown error'}`);
        setIsDeletingAccount(false);
        return;
      }

      console.log('✅ Usuario eliminado exitosamente de la base de datos');

      // 1. Limpiar sesión token
      setActiveSessionUserId(null);

      // 2. Redirigir limpiamente a la pantalla de inicio
      window.location.href = '/';
    } catch (err) {
      console.error('❌ Error inesperado al eliminar la cuenta:', err);
      alert(language === 'es' ? 'Error al intentar eliminar la cuenta' : 'Error attempting to delete account');
    } finally {
      setIsDeletingAccount(false);
      setIsDeleteAccountModalOpen(false);
    }
  };

  return (
    <div className="w-full space-y-4 md:space-y-6 animate-fadeIn pb-8">
      
      {/* Standardized View Header */}
      <header className="flex items-center justify-between gap-3 w-full relative z-30">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white">
            {t('settings.title', {}, 'Configuración del Sistema')}
          </h1>
          <p className="text-xs md:text-sm text-slate-400 font-normal mt-0.5">
            {t('settings.subtitle', {}, 'Personaliza apariencia, temas, moneda y respaldos')}
          </p>
        </div>
      </header>

      {statusMessage && (
        <div className="p-3.5 sm:p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold animate-fadeIn flex items-center gap-2">
          <Check className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* FILA 1: PREFERENCIAS DE SISTEMA (Grid 2 Columnas) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-5 items-stretch relative z-20">
        
        {/* 1. IDIOMA DEL SISTEMA */}
        <div className="p-4 md:p-6 rounded-2xl md:rounded-3xl bg-[#141E22]/70 border border-white/[0.08] backdrop-blur-xl h-full flex flex-col justify-between space-y-4 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)]">
          <div className="flex items-center gap-3 border-b border-white/5 pb-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--color-primary,#AEEDD0)]/15 border border-[var(--color-primary,#AEEDD0)]/30 flex items-center justify-center text-[var(--color-primary,#AEEDD0)] shrink-0 font-bold">
              <Languages className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">{t('settings.languageTitle', {}, 'Idioma del Sistema')}</h3>
              <p className="text-xs text-slate-300 font-medium">{t('settings.languageSubtitle', {}, 'Detección automática e i18n')}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setLanguage('es')}
              className={`h-14 px-4 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                language === 'es'
                  ? 'bg-[var(--color-primary,#AEEDD0)]/15 border-[var(--color-primary,#AEEDD0)] text-white shadow-md'
                  : 'bg-[#162226] border-white/10 text-slate-300 hover:text-white hover:bg-white/[0.05]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="text-lg">🇪🇸</span>
                <div className="text-left">
                  <h4 className="text-xs font-bold text-white">{t('settings.langSpanish', {}, 'Español')}</h4>
                  <span className="text-[10px] text-slate-300 block">Predeterminado ES</span>
                </div>
              </div>
              {language === 'es' && <Check className="w-4 h-4 text-[var(--color-primary,#AEEDD0)] shrink-0" />}
            </button>

            <button
              type="button"
              onClick={() => setLanguage('en')}
              className={`h-14 px-4 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                language === 'en'
                  ? 'bg-[var(--color-primary,#AEEDD0)]/15 border-[var(--color-primary,#AEEDD0)] text-white shadow-md'
                  : 'bg-[#162226] border-white/10 text-slate-300 hover:text-white hover:bg-white/[0.05]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="text-lg">🇺🇸</span>
                <div className="text-left">
                  <h4 className="text-xs font-bold text-white">{t('settings.langEnglish', {}, 'English')}</h4>
                  <span className="text-[10px] text-slate-300 block">Default EN</span>
                </div>
              </div>
              {language === 'en' && <Check className="w-4 h-4 text-[var(--color-primary,#AEEDD0)] shrink-0" />}
            </button>
          </div>
        </div>

        {/* 2. MONEDA BASE DEL SISTEMA (CUSTOM SEARCHABLE SELECTOR) */}
        <div className="p-6 sm:p-7 rounded-3xl bg-[#141E22]/70 border border-white/[0.08] backdrop-blur-xl h-full flex flex-col justify-between space-y-4 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] relative z-30">
          <div className="flex items-center gap-3 border-b border-white/5 pb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 font-bold">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">{t('settings.baseCurrencyTitle', {}, 'Moneda Global del Sistema')}</h3>
              <p className="text-xs text-slate-300 font-medium">{t('settings.baseCurrencySubtitle', {}, 'Conversión automática de balances consolidados')}</p>
            </div>
          </div>

          <div className="relative">
            <CustomSelect
              value={baseCurrency}
              onChange={setBaseCurrency}
              options={currencyOptions}
              placeholder={language === 'es' ? "Selecciona moneda base..." : "Select base currency..."}
            />
          </div>
        </div>
      </div>

      {/* FILA 2: CONVERSOR INTERACTIVO Y CALCULADORA DE TASAS (LIVE EXCHANGE RATES CALCULATOR) */}
      <div className="p-6 sm:p-7 rounded-3xl bg-[#141E22]/70 border border-white/[0.08] backdrop-blur-xl space-y-4 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] relative z-30">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0 font-bold">
              <RefreshCw className={`w-5 h-5 ${isFetchingRates ? 'animate-spin' : ''}`} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {t('settings.exchangeRatesTitle', {}, 'Calculadora Rápida de Tasas de Cambio (Live Converter)')}
              </h3>
              <p className="text-xs text-slate-300 font-medium">
                {t('settings.exchangeRatesSub', { currency: baseCurrency }, `Actualizado ${lastUpdated} • Tasas de mercado en vivo`)}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={refreshExchangeRates}
            disabled={isFetchingRates}
            className="h-10 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-white font-semibold text-xs flex items-center justify-center gap-2 border border-white/10 transition-all cursor-pointer disabled:opacity-50 shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#AEEDD0] ${isFetchingRates ? 'animate-spin' : ''}`} />
            <span>{t('settings.refreshRates', {}, 'Actualizar tasas')}</span>
          </button>
        </div>

        {/* Interactive Calculator Layout */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center bg-[#162226] p-4 sm:p-5 rounded-2xl border border-white/5">
          {/* Amount Input */}
          <div className="md:col-span-3 space-y-1">
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              {language === 'es' ? 'Monto a Convertir' : 'Amount to Convert'}
            </label>
            <input
              type="number"
              min="0"
              step="any"
              value={calcAmount}
              onChange={(e) => setCalcAmount(e.target.value)}
              className="w-full h-11 px-3.5 bg-[#1E2D32] border border-white/10 rounded-xl text-sm font-bold text-white focus:outline-none focus:border-[#AEEDD0]"
              placeholder="1.00"
            />
          </div>

          {/* From Currency Dropdown */}
          <div className="md:col-span-4 space-y-1 relative z-20">
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              {language === 'es' ? 'De (Moneda Origen)' : 'From (Source)'}
            </label>
            <CustomSelect
              value={calcFromCurrency}
              onChange={setCalcFromCurrency}
              options={currencyOptions}
              placeholder="From..."
            />
          </div>

          {/* Swap Button */}
          <div className="md:col-span-1 flex items-center justify-center pt-2 md:pt-5">
            <button
              type="button"
              onClick={() => {
                setCalcFromCurrency(calcToCurrency);
                setCalcToCurrency(calcFromCurrency);
              }}
              className="w-10 h-10 rounded-xl bg-white/5 hover:bg-[#AEEDD0]/20 border border-white/10 text-[#AEEDD0] flex items-center justify-center transition-all cursor-pointer"
              title={language === 'es' ? 'Intercambiar divisas' : 'Swap currencies'}
            >
              <ArrowLeftRight className="w-4 h-4" />
            </button>
          </div>

          {/* To Currency Dropdown */}
          <div className="md:col-span-4 space-y-1 relative z-20">
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              {language === 'es' ? 'A (Moneda Destino)' : 'To (Target)'}
            </label>
            <CustomSelect
              value={calcToCurrency}
              onChange={setCalcToCurrency}
              options={currencyOptions}
              placeholder="To..."
            />
          </div>

          {/* Real-time Calculation Result */}
          <div className="md:col-span-12 pt-3 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="text-left">
              <span className="text-xs text-slate-400 block font-medium">
                1 {calcFromCurrency} = {unitRateFormatted} {calcToCurrency}
              </span>
            </div>
            <div className="text-right">
              <span className="text-xl sm:text-2xl font-extrabold text-[#AEEDD0] tracking-tight tabular-nums">
                {calcAmount || '0'} {calcFromCurrency} = {calcResultFormatted} {calcToCurrency}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* FILA 3: ESTÉTICA Y APARIENCIA (Grid 2 Columnas) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        
        {/* 1. INTENSIDAD DE BLUR (GLASSMORPHISM) */}
        <div className="p-6 sm:p-7 rounded-3xl bg-[#141E22]/70 border border-white/[0.08] backdrop-blur-xl h-full flex flex-col justify-between space-y-4 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)]">
          <div className="flex items-center gap-3 border-b border-white/5 pb-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0 font-bold">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">{t('settings.glassTitle', {}, 'Efectos de Vidrio (Glassmorphism)')}</h3>
              <p className="text-xs text-slate-300 font-medium">{t('settings.glassSubtitle', {}, 'Intensidad de desenfoque de fondo')}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { id: 'light', label: t('settings.glassLight', {}, 'Suave'), blur: '8px' },
              { id: 'high', label: t('settings.glassHigh', {}, 'Profundo'), blur: '24px' }
            ].map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => setGlassIntensity(g.id)}
                className={`h-16 px-4 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                  glassIntensity === g.id
                    ? 'bg-sky-500/20 border-sky-400 text-sky-300 font-bold shadow-md'
                    : 'bg-[#162226] border-white/10 text-slate-300 hover:text-white hover:bg-white/[0.05]'
                }`}
              >
                <div className="text-left">
                  <span className="text-xs font-bold text-white block">{g.label}</span>
                  <span className="text-[10px] text-slate-300 font-medium">{g.blur} blur</span>
                </div>
                {glassIntensity === g.id && <Check className="w-4 h-4 text-sky-400 shrink-0" />}
              </button>
            ))}
          </div>
        </div>

        {/* 2. TEMAS Y PALETA DE COLORES DINÁMICA */}
        <div className="p-6 sm:p-7 rounded-3xl bg-[#141E22]/70 border border-white/[0.08] backdrop-blur-xl h-full flex flex-col justify-between space-y-4 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)]">
          <div className="flex items-center gap-3 border-b border-white/5 pb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 font-bold">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">{t('settings.themesTitle', {}, 'Paleta de Colores Dinámica')}</h3>
              <p className="text-xs text-slate-300 font-medium">{t('settings.themesSubtitle', {}, 'Selecciona la identidad cromática del sistema')}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {(THEMES || []).map((themeItem) => {
              const isActive = currentTheme === themeItem.id;
              return (
                <button
                  key={themeItem.id}
                  type="button"
                  onClick={() => setTheme(themeItem.id)}
                  className={`h-14 p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    isActive
                      ? 'border-white/40 bg-white/[0.08] shadow-xl scale-[1.02]'
                      : 'border-white/10 bg-[#162226] hover:bg-white/[0.05] hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white truncate">{themeItem.id.toUpperCase()}</span>
                    {isActive && <Check className="w-4 h-4 text-white shrink-0" />}
                  </div>

                  <div className="flex items-center justify-between gap-1.5 p-1 rounded-lg bg-black/40 border border-white/10">
                    <div 
                      className="w-3.5 h-3.5 rounded-md border border-white/20 shadow-sm shrink-0"
                      style={{ backgroundColor: themeItem.accentColor }}
                      title="Color primario de acento"
                    />
                    <div 
                      className="w-3.5 h-3.5 rounded-md border border-white/20 shadow-sm flex-1"
                      style={{ backgroundColor: themeItem.bgColor }}
                      title="Fondo base"
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

      </div>

      {/* FILA 4: GESTIÓN DE DATOS Y DEPURACIÓN (FULL WIDTH & DANGER ZONE) */}
      <div className="p-6 sm:p-7 rounded-3xl bg-[#141E22]/70 border border-white/[0.08] backdrop-blur-xl space-y-4 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)]">
        <div className="flex items-center gap-3 border-b border-white/5 pb-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 font-bold">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">{t('settings.dataTitle', {}, 'Gestión de Datos y Respaldos')}</h3>
            <p className="text-xs text-slate-300 font-medium">{t('settings.dataSubtitle', {}, 'Exporta respaldos JSON, optimiza historial antiguo o restablece información')}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Export JSON Backup */}
          <button
            type="button"
            onClick={() => exportBackup(financeData)}
            className="h-12 px-4 rounded-xl bg-[#162226] border border-white/10 hover:border-white/20 hover:bg-white/[0.05] text-white font-bold text-xs flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-sm"
          >
            <Download className="w-4 h-4 text-[#AEEDD0]" />
            <span>{t('settings.exportBackup', {}, 'Exportar Respaldos JSON')}</span>
          </button>

          {/* Consolidate Historical Data (>1 Year) */}
          <button
            type="button"
            onClick={() => setIsConsolidateModalOpen(true)}
            disabled={isConsolidating}
            className="h-12 px-4 rounded-xl bg-[#162226] border border-amber-500/30 hover:border-amber-400 hover:bg-amber-500/10 text-amber-300 font-bold text-xs flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 text-amber-400 ${isConsolidating ? 'animate-spin' : ''}`} />
            <span>{isConsolidating ? 'Consolidando...' : (language === 'es' ? 'Optimizar Historial (>1 Año)' : 'Optimize History (>1 Year)')}</span>
          </button>

          {/* Reset All Data */}
          <button
            type="button"
            onClick={() => setIsResetModalOpen(true)}
            className="h-12 px-4 rounded-xl bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 text-amber-300 font-bold text-xs flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-sm"
          >
            <RotateCcw className="w-4 h-4 text-amber-400" />
            <span>{t('settings.resetData', {}, 'Restablecer Todos los Datos')}</span>
          </button>

          {/* Delete Account (Danger Zone Red Button) */}
          <button
            type="button"
            onClick={() => setIsDeleteAccountModalOpen(true)}
            className="h-12 px-4 rounded-xl bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 text-rose-400 font-bold text-xs flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-sm"
          >
            <Trash2 className="w-4 h-4 text-rose-400" />
            <span>{language === 'es' ? 'Eliminar Cuenta' : 'Delete Account'}</span>
          </button>
        </div>
      </div>

      {/* Confirmation Modals */}
      <ConfirmDeleteModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        onConfirm={handleResetConfirm}
        title={t('modals.resetDataTitle', {}, language === 'es' ? '¿Restablecer Todos los Datos?' : 'Reset All Data?')}
        message={t('modals.resetDataMessage', {}, language === 'es' ? '¿Estás seguro de que deseas restablecer todos los datos del sistema? Se eliminarán cuentas, transacciones y suscripciones.' : 'Are you sure you want to reset all system data? Accounts, transactions, and subscriptions will be cleared.')}
        confirmText={t('modals.confirm', {}, language === 'es' ? 'Confirmar' : 'Confirm')}
      />

      <ConfirmDeleteModal
        isOpen={isConsolidateModalOpen}
        onClose={() => setIsConsolidateModalOpen(false)}
        onConfirm={handleConsolidateConfirm}
        title={t('modals.optimizeHistoryTitle', {}, language === 'es' ? '¿Consolidar Historial Antiguo?' : 'Optimize Old History?')}
        message={t('modals.optimizeHistoryMessage', {}, language === 'es' ? '¿Estás seguro de que deseas consolidar las transacciones individuales con más de 365 días de antigüedad en un registro anual resumido? Esta acción no se puede deshacer.' : 'Are you sure you want to consolidate individual transactions older than 365 days into a summarized annual record? This action cannot be undone.')}
        confirmText={t('modals.confirm', {}, language === 'es' ? 'Consolidar' : 'Optimize')}
      />

      <DeleteAccountModal
        isOpen={isDeleteAccountModalOpen}
        onClose={() => setIsDeleteAccountModalOpen(false)}
        onConfirmDelete={handleDeleteAccountConfirm}
        isDeleting={isDeletingAccount}
      />

    </div>
  );
}
