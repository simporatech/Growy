import React, { useState, useMemo, useEffect } from 'react';
import { 
  User, 
  Languages, 
  Palette, 
  Download, 
  RotateCcw, 
  Check, 
  ShieldAlert, 
  Coins, 
  RefreshCw, 
  ArrowLeftRight, 
  Trash2, 
  Lock, 
  Eye, 
  EyeOff, 
  LogOut, 
  CheckCircle2, 
  ShieldCheck, 
  Moon,
  Database
} from 'lucide-react';
import Button from './Button';
import { useSettings, THEMES } from '../context/SettingsContext';
import { useFinance } from '../context/FinanceContext';
import { FALLBACK_EXCHANGE_RATES, AVAILABLE_CURRENCIES, getCrossRate, convertCrossCurrency } from '../utils/currency';
import ConfirmDeleteModal from './ConfirmDeleteModal';
import DeleteAccountModal from './DeleteAccountModal';
import CustomSelect from './CustomSelect';
import { dbDeleteUser, dbChangeUserPassword } from '../services/supabaseService';
import { getActiveSessionUserId, setActiveSessionUserId } from '../utils/userStorage';

export default function SettingsModule({ onLogout }) {
  const { 
    currentUser,
    updateUserProfile,
    language, setLanguage,
    theme: currentTheme, setTheme,
    baseCurrency, setBaseCurrency,
    exchangeRates, lastUpdated, isFetchingRates, refreshExchangeRates,
    exportBackup, resetAllData, t 
  } = useSettings();

  const financeData = useFinance();
  const { consolidateOldHistory } = financeData;

  const [activeTab, setActiveTab] = useState('general'); // 'general' | 'appearance' | 'dataSecurity'

  // Profile Edit State
  const [displayName, setDisplayName] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState({ type: '', text: '' });

  useEffect(() => {
    if (currentUser) {
      setDisplayName(currentUser.fullName || currentUser.username || '');
    }
  }, [currentUser]);

  const handleSaveProfile = async (e) => {
    if (e) e.preventDefault();
    setProfileMsg({ type: '', text: '' });

    const cleanName = displayName.trim();
    if (cleanName.length < 2) {
      setProfileMsg({ 
        type: 'error', 
        text: t('settings.minNameLength', {}, 'El nombre debe tener al menos 2 caracteres.') 
      });
      return;
    }

    setIsSavingProfile(true);
    try {
      const res = await updateUserProfile({ fullName: cleanName });
      if (res && res.success) {
        setProfileMsg({ 
          type: 'success', 
          text: t('settings.profileUpdated', {}, '¡Perfil actualizado con éxito!') 
        });
      } else {
        setProfileMsg({ 
          type: 'error', 
          text: t('settings.profileError', {}, 'Error al actualizar el perfil. Inténtalo de nuevo.') 
        });
      }
    } catch {
      setProfileMsg({ 
        type: 'error', 
        text: t('settings.profileError', {}, 'Error al actualizar el perfil. Inténtalo de nuevo.') 
      });
    } finally {
      setIsSavingProfile(false);
      setTimeout(() => setProfileMsg({ type: '', text: '' }), 4000);
    }
  };

  // Modals State
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isConsolidateModalOpen, setIsConsolidateModalOpen] = useState(false);
  const [isDeleteAccountModalOpen, setIsDeleteAccountModalOpen] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [isConsolidating, setIsConsolidating] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  // Password Change State
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [isChangingPwd, setIsChangingPwd] = useState(false);
  const [pwdMessage, setPwdMessage] = useState({ type: '', text: '' });

  // Password policy checks
  const pwdHasLength = newPwd.length >= 8;
  const pwdHasUpper = /[A-Z]/.test(newPwd);
  const pwdHasLower = /[a-z]/.test(newPwd);
  const pwdHasDigitOrSpecial = /[\d\W]/.test(newPwd);
  const pwdIsValid = pwdHasLength && pwdHasUpper && pwdHasLower && pwdHasDigitOrSpecial;
  const pwdMatch = newPwd === confirmPwd && confirmPwd.length > 0;

  const handleChangePassword = async () => {
    setPwdMessage({ type: '', text: '' });
    if (!currentPwd.trim()) {
      setPwdMessage({ type: 'error', text: t('settings.enterCurrentPassword', {}, 'Ingresa tu contraseña actual') });
      return;
    }
    if (!pwdIsValid) {
      setPwdMessage({ type: 'error', text: t('settings.passwordPolicyError', {}, 'La nueva contraseña no cumple los requisitos de seguridad') });
      return;
    }
    if (!pwdMatch) {
      setPwdMessage({ type: 'error', text: t('settings.passwordMismatch', {}, 'Las contraseñas no coinciden') });
      return;
    }

    const activeUserId = getActiveSessionUserId();
    if (!activeUserId) return;

    setIsChangingPwd(true);
    try {
      const res = await dbChangeUserPassword(activeUserId, currentPwd, newPwd);
      if (res.success) {
        setPwdMessage({ type: 'success', text: t('settings.passwordUpdated', {}, '¡Contraseña actualizada correctamente!') });
        setCurrentPwd('');
        setNewPwd('');
        setConfirmPwd('');
      } else if (res.error === 'INVALID_CURRENT_PASSWORD') {
        setPwdMessage({ type: 'error', text: t('settings.wrongCurrentPassword', {}, 'La contraseña actual es incorrecta') });
      } else {
        setPwdMessage({ type: 'error', text: t('settings.passwordError', {}, 'Error al actualizar la contraseña') });
      }
    } catch {
      setPwdMessage({ type: 'error', text: t('settings.passwordError', {}, 'Error al actualizar la contraseña') });
    } finally {
      setIsChangingPwd(false);
      setTimeout(() => setPwdMessage({ type: '', text: '' }), 5000);
    }
  };

  // Live Exchange Rate Calculator State
  const [calcAmount, setCalcAmount] = useState('1');
  const [calcFromCurrency, setCalcFromCurrency] = useState('USD');
  const [calcToCurrency, setCalcToCurrency] = useState('HNL');

  const safeRates = exchangeRates || FALLBACK_EXCHANGE_RATES;

  const currencyOptions = useMemo(() => {
    return AVAILABLE_CURRENCIES.map(c => ({
      value: c.code,
      label: `${c.flag || '🌐'} ${c.code} (${c.symbol}) - ${c.label.includes(' - ') ? c.label.split(' - ')[1] : c.label}`
    }));
  }, []);

  const { unitRateFormatted, calcResultFormatted } = useMemo(() => {
    const amt = Number(calcAmount) || 0;
    const unitRate = getCrossRate(calcFromCurrency, calcToCurrency, safeRates);
    const totalResult = convertCrossCurrency(amt, calcFromCurrency, calcToCurrency, safeRates);

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
      const res = await dbDeleteUser(activeUserId);

      if (!res || !res.success) {
        console.error('❌ Error de Supabase al borrar usuario:', res?.error);
        alert(language === 'es' ? `Error al eliminar cuenta: ${res?.error || 'Error desconocido'}` : `Error deleting account: ${res?.error || 'Unknown error'}`);
        setIsDeletingAccount(false);
        return;
      }

      setActiveSessionUserId(null);
      window.location.href = '/';
    } catch (err) {
      console.error('❌ Error inesperado al eliminar la cuenta:', err);
      alert(language === 'es' ? 'Error al intentar eliminar la cuenta' : 'Error attempting to delete account');
    } finally {
      setIsDeletingAccount(false);
      setIsDeleteAccountModalOpen(false);
    }
  };

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    } else {
      setActiveSessionUserId(null);
      window.location.href = '/';
    }
  };

  const tabsConfig = [
    { id: 'general', label: t('settings.tabs.general', {}, 'General / Perfil'), icon: User },
    { id: 'appearance', label: t('settings.tabs.appearance', {}, 'Apariencia'), icon: Palette },
    { id: 'dataSecurity', label: t('settings.tabs.dataSecurity', {}, 'Datos y Seguridad'), icon: Database }
  ];

  return (
    <div className="w-full space-y-4 md:space-y-6 animate-fadeIn pb-32 md:pb-6">
      
      {/* Standardized View Header */}
      <header className="flex items-center justify-between gap-3 w-full relative z-30">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white leading-tight">
            {t('settings.title', {}, 'Configuración del Sistema')}
          </h1>
          <p className="text-xs md:text-sm text-slate-400 font-normal mt-0.5">
            {t('settings.subtitle', {}, 'Personaliza la apariencia, temas dinámicos, perfil, idioma y respalda tu información')}
          </p>
        </div>
      </header>

      {statusMessage && (
        <div className="p-3.5 sm:p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold animate-fadeIn flex items-center gap-2">
          <Check className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* NAVIGATION TABS BAR (Horizontal Responsive Scroll) */}
      <div className="flex items-center gap-1.5 sm:gap-2 p-1.5 rounded-2xl bg-[#141E22]/70 border border-white/[0.08] backdrop-blur-xl overflow-x-auto no-scrollbar shadow-inner relative z-30">
        {tabsConfig.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`h-11 sm:h-12 px-4 sm:px-5 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2.5 transition-all cursor-pointer shrink-0 ${
                isActive
                  ? 'bg-[var(--accent,#97F2CC)] text-[var(--accent-text,#091E15)] shadow-md shadow-[var(--accent,#97F2CC)]/15 scale-[1.01]'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT 1: GENERAL / PERFIL */}
      {activeTab === 'general' && (
        <div className="space-y-4 md:space-y-6 animate-fadeIn">
          
          {/* USER PROFILE CARD */}
          <div className="p-5 sm:p-7 rounded-3xl bg-[#141E22]/70 border border-white/[0.08] backdrop-blur-xl shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] space-y-5">
            <div className="flex items-center gap-3 border-b border-white/5 pb-4">
              <div className="w-10 h-10 rounded-xl bg-[var(--accent-muted,rgba(151,242,204,0.15))] border border-[var(--accent,#97F2CC)]/30 flex items-center justify-center text-[var(--accent,#97F2CC)] shrink-0 font-bold">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">{t('settings.profileTitle', {}, 'Perfil de Usuario')}</h3>
                <p className="text-xs text-slate-300 font-medium">{t('settings.profileSubtitle', {}, 'Gestiona tu nombre visible y datos personales de cuenta')}</p>
              </div>
            </div>

            {profileMsg.text && (
              <div className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 animate-fadeIn ${
                profileMsg.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300' : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
              }`}>
                {profileMsg.type === 'success' ? <Check className="w-4 h-4 shrink-0 text-emerald-400" /> : <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />}
                <span>{profileMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Display Name Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 block">
                    {t('settings.displayName', {}, 'Nombre de Usuario (Display Name)')} *
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder={t('settings.displayNamePlaceholder', {}, 'Tu Nombre Completo')}
                    required
                    minLength={2}
                    className="w-full h-11 px-4 bg-[#162226] border border-white/10 rounded-xl text-sm font-semibold text-white outline-none focus:border-[var(--accent,#97F2CC)] transition-colors shadow-inner"
                  />
                </div>

                {/* Email Address (Read-only + Verified Badge) */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                    <span>{t('settings.email', {}, 'Correo Electrónico')}</span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                      <ShieldCheck className="w-3 h-3" />
                      {t('settings.verifiedBadge', {}, 'Verificado')}
                    </span>
                  </label>
                  <input
                    type="email"
                    value={currentUser?.email || 'usuario@growy.app'}
                    disabled
                    className="w-full h-11 px-4 bg-white/[0.03] border border-white/5 rounded-xl text-sm font-medium text-slate-400 cursor-not-allowed opacity-80"
                  />
                </div>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  icon={CheckCircle2}
                  isLoading={isSavingProfile}
                  disabled={isSavingProfile || displayName.trim().length < 2}
                >
                  <span>{isSavingProfile ? t('settings.savingProfile', {}, 'Guardando...') : t('settings.saveProfile', {}, 'Guardar Cambios')}</span>
                </Button>
              </div>
            </form>
          </div>

          {/* LANGUAGE & BASE CURRENCY ROW */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 items-stretch relative z-20">
            
            {/* IDIOMA DEL SISTEMA */}
            <div className="p-5 sm:p-7 rounded-3xl bg-[#141E22]/70 border border-white/[0.08] backdrop-blur-xl h-full flex flex-col justify-between space-y-4 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)]">
              <div className="flex items-center gap-3 border-b border-white/5 pb-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--accent-muted,rgba(151,242,204,0.15))] border border-[var(--accent,#97F2CC)]/30 flex items-center justify-center text-[var(--accent,#97F2CC)] shrink-0 font-bold">
                  <Languages className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">{t('settings.languageTitle', {}, 'Idioma del Sistema')}</h3>
                  <p className="text-xs text-slate-300 font-medium">{t('settings.languageSubtitle', {}, 'Detección automática e internacionalización')}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setLanguage('es')}
                  className={`h-14 px-4 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                    language === 'es'
                      ? 'bg-[var(--accent-muted,rgba(151,242,204,0.15))] border-[var(--accent,#97F2CC)] text-white shadow-md'
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
                  {language === 'es' && <Check className="w-4 h-4 text-[var(--accent,#97F2CC)] shrink-0" />}
                </button>

                <button
                  type="button"
                  onClick={() => setLanguage('en')}
                  className={`h-14 px-4 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                    language === 'en'
                      ? 'bg-[var(--accent-muted,rgba(151,242,204,0.15))] border-[var(--accent,#97F2CC)] text-white shadow-md'
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
                  {language === 'en' && <Check className="w-4 h-4 text-[var(--accent,#97F2CC)] shrink-0" />}
                </button>
              </div>
            </div>

            {/* MONEDA BASE DEL SISTEMA */}
            <div className="p-5 sm:p-7 rounded-3xl bg-[#141E22]/70 border border-white/[0.08] backdrop-blur-xl h-full flex flex-col justify-between space-y-4 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] relative z-30">
              <div className="flex items-center gap-3 border-b border-white/5 pb-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--accent-muted,rgba(151,242,204,0.15))] border border-[var(--accent,#97F2CC)]/30 flex items-center justify-center text-[var(--accent,#97F2CC)] shrink-0 font-bold">
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

          {/* LIVE EXCHANGE RATES CALCULATOR */}
          <div className="p-5 sm:p-7 rounded-3xl bg-[#141E22]/70 border border-white/[0.08] backdrop-blur-xl space-y-4 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] relative z-30">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--accent-muted,rgba(151,242,204,0.15))] border border-[var(--accent,#97F2CC)]/30 flex items-center justify-center text-[var(--accent,#97F2CC)] shrink-0 font-bold">
                  <RefreshCw className={`w-5 h-5 ${isFetchingRates ? 'animate-spin' : ''}`} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {t('settings.calculatorTitle', {}, 'Conversor de Divisas en Vivo')}
                  </h3>
                  <p className="text-xs text-slate-300 font-medium">
                    {t('settings.exchangeRatesSub', { currency: baseCurrency }, `Base: 1 ${baseCurrency} • Actualizado hoy`)}
                  </p>
                </div>
              </div>

              <Button
                type="button"
                variant="secondary"
                size="sm"
                icon={RefreshCw}
                onClick={refreshExchangeRates}
                isLoading={isFetchingRates}
              >
                <span>{t('settings.refreshRates', {}, 'Actualizar Tasas')}</span>
              </Button>
            </div>

            {/* Interactive Calculator Layout */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center bg-[#162226] p-4 sm:p-5 rounded-2xl border border-white/5">
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
                  className="w-full h-11 px-3.5 bg-[#1E2D32] border border-white/10 rounded-xl text-sm font-bold text-white focus:outline-none focus:border-[var(--accent,#97F2CC)]"
                  placeholder="1.00"
                />
              </div>

              <div className="md:col-span-4 space-y-1 relative z-20">
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  {language === 'es' ? 'De (Moneda Origen)' : 'From (Source)'}
                </label>
                <CustomSelect
                  value={calcFromCurrency}
                  onChange={setCalcFromCurrency}
                  options={currencyOptions}
                  placeholder={language === 'es' ? 'De...' : 'From...'}
                />
              </div>

              <div className="md:col-span-1 flex items-center justify-center pt-2 md:pt-5">
                <button
                  type="button"
                  onClick={() => {
                    setCalcFromCurrency(calcToCurrency);
                    setCalcToCurrency(calcFromCurrency);
                  }}
                  className="w-10 h-10 rounded-xl bg-white/5 hover:bg-[var(--accent-muted,rgba(151,242,204,0.15))] border border-white/10 text-[var(--accent,#97F2CC)] flex items-center justify-center transition-all cursor-pointer"
                  title={language === 'es' ? 'Intercambiar Divisas' : 'Swap Currencies'}
                  aria-label={language === 'es' ? 'Intercambiar Divisas' : 'Swap Currencies'}
                >
                  <ArrowLeftRight className="w-4 h-4" />
                </button>
              </div>

              <div className="md:col-span-4 space-y-1 relative z-20">
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  {language === 'es' ? 'A (Moneda Destino)' : 'To (Target)'}
                </label>
                <CustomSelect
                  value={calcToCurrency}
                  onChange={setCalcToCurrency}
                  options={currencyOptions}
                  placeholder={language === 'es' ? 'A...' : 'To...'}
                />
              </div>

              <div className="md:col-span-12 pt-3 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-2">
                <div className="text-left">
                  <span className="text-xs text-slate-400 block font-medium">
                    1 {calcFromCurrency} = {unitRateFormatted} {calcToCurrency}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xl sm:text-2xl font-extrabold text-[var(--accent,#97F2CC)] tracking-tight tabular-nums">
                    {calcAmount || '0'} {calcFromCurrency} = {calcResultFormatted} {calcToCurrency}
                  </span>
                </div>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* TAB CONTENT 2: APARIENCIA */}
      {activeTab === 'appearance' && (
        <div className="space-y-4 md:space-y-6 animate-fadeIn">
          
          {/* COLOR PALETTE PRESETS */}
          <div className="p-5 sm:p-7 rounded-3xl bg-[#141E22]/70 border border-white/[0.08] backdrop-blur-xl shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] space-y-5">
            <div className="flex items-center gap-3 border-b border-white/5 pb-4">
              <div className="w-10 h-10 rounded-xl bg-[var(--accent-muted,rgba(151,242,204,0.15))] border border-[var(--accent,#97F2CC)]/30 flex items-center justify-center text-[var(--accent,#97F2CC)] shrink-0 font-bold">
                <Palette className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">{t('settings.themesTitle', {}, 'Paleta de Colores Dinámica')}</h3>
                <p className="text-xs text-slate-300 font-medium">{t('settings.themesSubtitle', {}, 'Selecciona la identidad cromática del sistema')}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
              {(THEMES || []).map((themeItem) => {
                const isActive = currentTheme === themeItem.id;
                return (
                  <button
                    key={themeItem.id}
                    type="button"
                    onClick={() => setTheme(themeItem.id)}
                    className={`h-16 p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isActive
                        ? 'border-[var(--accent,#97F2CC)] bg-[var(--accent-muted,rgba(151,242,204,0.15))] shadow-xl scale-[1.02]'
                        : 'border-white/10 bg-[#161B22] hover:bg-white/[0.05] hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white uppercase tracking-wider">{themeItem.id}</span>
                      {isActive && <Check className="w-4 h-4 text-[var(--accent,#97F2CC)] shrink-0" />}
                    </div>

                    <div className="flex items-center justify-between gap-1.5 p-1 rounded-lg bg-black/40 border border-white/10">
                      <div 
                        className="w-4 h-4 rounded-md border border-white/20 shadow-sm shrink-0"
                        style={{ backgroundColor: themeItem.accentColor }}
                        title={language === 'es' ? 'Color primario de acento' : 'Primary accent color'}
                      />
                      <div 
                        className="w-4 h-4 rounded-md border border-white/20 shadow-sm flex-1"
                        style={{ backgroundColor: themeItem.bgColor }}
                        title={language === 'es' ? 'Fondo base' : 'Base background'}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* THEME MODE: DARK MINIMALIST */}
          <div className="p-5 sm:p-7 rounded-3xl bg-[#141E22]/70 border border-white/[0.08] backdrop-blur-xl shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] space-y-4">
            <div className="flex items-center gap-3 border-b border-white/5 pb-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--accent-muted,rgba(151,242,204,0.15))] border border-[var(--accent,#97F2CC)]/30 flex items-center justify-center text-[var(--accent,#97F2CC)] shrink-0 font-bold">
                <Moon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">{t('settings.themeModeTitle', {}, 'Modo de Tema')}</h3>
                <p className="text-xs text-slate-300 font-medium">{t('settings.themeModeSubtitle', {}, 'Interfaz optimizada de alto contraste para máxima concentración')}</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#162226] border border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-black border border-white/20 flex items-center justify-center text-xs font-bold text-white">
                  OLED
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">{t('settings.themeDarkMinimalist', {}, 'Oscuro Minimalista (OLED Black)')}</h4>
                  <p className="text-xs text-slate-400 font-medium">{t('settings.activeTheme', {}, 'Activo')} • #090C10</p>
                </div>
              </div>

              <div className="px-3 py-1 rounded-full bg-[var(--accent-muted,rgba(151,242,204,0.15))] border border-[var(--accent,#97F2CC)]/30 text-[var(--accent,#97F2CC)] text-xs font-bold flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" />
                <span>{t('settings.activeTheme', {}, 'Activo')}</span>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* TAB CONTENT 3: DATOS Y SEGURIDAD */}
      {activeTab === 'dataSecurity' && (
        <div className="space-y-4 md:space-y-6 animate-fadeIn">
          
          {/* PASSWORD SECURITY CARD */}
          <div className="p-5 sm:p-7 rounded-3xl bg-[#141E22]/70 border border-white/[0.08] backdrop-blur-xl shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] space-y-4">
            <div className="flex items-center gap-3 border-b border-white/5 pb-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0 font-bold">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">{t('settings.securityTitle', {}, 'Seguridad de la Cuenta')}</h3>
                <p className="text-xs text-slate-300 font-medium">{t('settings.securitySubtitle', {}, 'Actualiza tu contraseña de acceso')}</p>
              </div>
            </div>

            {pwdMessage.text && (
              <div className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
                pwdMessage.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300' : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
              }`}>
                <Check className="w-4 h-4 shrink-0" />
                <span>{pwdMessage.text}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  {t('settings.currentPassword', {}, 'Contraseña Actual')}
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPwd ? 'text' : 'password'}
                    value={currentPwd}
                    onChange={(e) => setCurrentPwd(e.target.value)}
                    className="w-full h-11 px-3.5 pr-10 form-input bg-[#161B22] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[var(--accent,#97F2CC)] transition-colors"
                    placeholder="••••••••"
                  />
                  <button type="button" onClick={() => setShowCurrentPwd(!showCurrentPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                    {showCurrentPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  {t('settings.newPassword', {}, 'Nueva Contraseña')}
                </label>
                <div className="relative">
                  <input
                    type={showNewPwd ? 'text' : 'password'}
                    value={newPwd}
                    onChange={(e) => setNewPwd(e.target.value)}
                    className="w-full h-11 px-3.5 pr-10 form-input bg-[#161B22] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[var(--accent,#97F2CC)] transition-colors"
                    placeholder="••••••••"
                  />
                  <button type="button" onClick={() => setShowNewPwd(!showNewPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                    {showNewPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  {t('settings.confirmNewPassword', {}, 'Confirmar Nueva Contraseña')}
                </label>
                <input
                  type="password"
                  value={confirmPwd}
                  onChange={(e) => setConfirmPwd(e.target.value)}
                  className={`w-full h-11 px-3.5 form-input bg-[#161B22] border rounded-xl text-sm text-white focus:outline-none transition-colors ${
                    confirmPwd && !pwdMatch ? 'border-rose-500/50 focus:border-rose-500' : 'border-white/10 focus:border-[var(--accent,#97F2CC)]'
                  }`}
                  placeholder="••••••••"
                />
              </div>
            </div>

            {newPwd.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                <div className={`text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border ${pwdHasLength ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-white/5 border-white/10 text-slate-400'}`}>
                  ✓ 8+ {t('settings.characters', {}, 'Caracteres')}
                </div>
                <div className={`text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border ${pwdHasUpper ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-white/5 border-white/10 text-slate-400'}`}>
                  ✓ {t('settings.uppercase', {}, 'Mayúscula')}
                </div>
                <div className={`text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border ${pwdHasLower ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-white/5 border-white/10 text-slate-400'}`}>
                  ✓ {t('settings.lowercase', {}, 'Minúscula')}
                </div>
                <div className={`text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border ${pwdHasDigitOrSpecial ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-white/5 border-white/10 text-slate-400'}`}>
                  ✓ {t('settings.digitOrSpecial', {}, 'Número/Especial')}
                </div>
              </div>
            )}

            <Button
              type="button"
              variant="primary"
              size="md"
              icon={Lock}
              onClick={handleChangePassword}
              disabled={isChangingPwd || !pwdIsValid || !pwdMatch || !currentPwd.trim()}
              isLoading={isChangingPwd}
            >
              <span>{isChangingPwd ? (language === 'es' ? 'Actualizando...' : 'Updating...') : t('settings.updatePassword', {}, 'Actualizar Contraseña')}</span>
            </Button>
          </div>

          {/* DATA MANAGEMENT & BACKUPS */}
          <div className="p-5 sm:p-7 rounded-3xl bg-[#141E22]/70 border border-white/[0.08] backdrop-blur-xl shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] space-y-4">
            <div className="flex items-center gap-3 border-b border-white/5 pb-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--accent-muted,rgba(151,242,204,0.15))] border border-[var(--accent,#97F2CC)]/30 flex items-center justify-center text-[var(--accent,#97F2CC)] shrink-0 font-bold">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">{t('settings.dataTitle', {}, 'Gestión de Datos y Respaldos')}</h3>
                <p className="text-xs text-slate-300 font-medium">{t('settings.dataSubtitle', {}, 'Exporta copias de respaldo o administra tu historial')}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Export JSON Backup */}
              <button
                type="button"
                onClick={() => exportBackup(financeData)}
                className="h-12 px-4 rounded-xl bg-[#162226] border border-white/10 hover:border-white/20 hover:bg-white/[0.05] text-white font-bold text-xs flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-sm active:scale-[0.98]"
              >
                <Download className="w-4 h-4 text-[var(--accent,#97F2CC)]" />
                <span>{t('settings.exportBackup', {}, 'Exportar Respaldo JSON')}</span>
              </button>

              {/* Consolidate Historical Data (>1 Year) */}
              <button
                type="button"
                onClick={() => setIsConsolidateModalOpen(true)}
                disabled={isConsolidating}
                className="h-12 px-4 rounded-xl bg-[#162226] border border-amber-500/30 hover:border-amber-400 hover:bg-amber-500/10 text-amber-300 font-bold text-xs flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-sm disabled:opacity-50 active:scale-[0.98]"
              >
                <RefreshCw className={`w-4 h-4 text-amber-400 ${isConsolidating ? 'animate-spin' : ''}`} />
                <span>{isConsolidating ? 'Consolidando...' : (language === 'es' ? 'Optimizar Historial (>1 Año)' : 'Optimize History (>1 Year)')}</span>
              </button>
            </div>
          </div>

          {/* DANGER ZONE (ZONA DE PELIGRO) */}
          <div className="p-5 sm:p-7 rounded-3xl bg-[#141E22]/70 border border-rose-500/20 backdrop-blur-xl shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] space-y-4">
            <div className="flex items-center gap-3 border-b border-rose-500/15 pb-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0 font-bold">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-rose-400">{t('settings.dangerZoneTitle', {}, 'Zona de Peligro')}</h3>
                <p className="text-xs text-slate-400 font-medium">{t('settings.dangerZoneSubtitle', {}, 'Acciones irreversibles sobre tus datos y cuenta')}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {/* Reset All Data */}
              <button
                type="button"
                onClick={() => setIsResetModalOpen(true)}
                className="h-12 px-4 rounded-xl bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 text-amber-300 font-bold text-xs flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-sm active:scale-[0.98]"
              >
                <RotateCcw className="w-4 h-4 text-amber-400" />
                <span>{t('settings.resetData', {}, 'Reiniciar Datos del Sistema')}</span>
              </button>

              {/* Log Out */}
              <button
                type="button"
                onClick={handleLogout}
                className="h-12 px-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-slate-200 font-bold text-xs flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-sm active:scale-[0.98]"
              >
                <LogOut className="w-4 h-4 text-slate-300" />
                <span>{t('settings.logoutBtn', {}, 'Cerrar Sesión')}</span>
              </button>

              {/* Delete Account */}
              <button
                type="button"
                onClick={() => setIsDeleteAccountModalOpen(true)}
                className="h-12 px-4 rounded-xl bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/20 text-rose-400 font-bold text-xs flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-sm active:scale-[0.98]"
              >
                <Trash2 className="w-4 h-4 text-rose-400" />
                <span>{t('settings.deleteAccountBtn', {}, 'Eliminar Cuenta Permanentemente')}</span>
              </button>
            </div>
          </div>

        </div>
      )}

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
