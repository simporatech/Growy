import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { safeGetStorage, safeSetStorage, safeRemoveStorage } from '../utils/storage';
import { translations } from '../i18n/translations';
import { supabase } from '../lib/supabaseClient';
import { getActiveSessionUserId } from '../utils/userStorage';
import { 
  BASE_CURRENCY_KEY, 
  SUPPORTED_CURRENCIES, 
  FALLBACK_EXCHANGE_RATES,
  fetchExchangeRates, 
  convertCurrency as convertCurrencyUtil,
  convertCrossCurrency as convertCrossCurrencyUtil,
  getCrossRate as getCrossRateUtil,
  formatToGlobal as formatToGlobalUtil,
  convertToGlobal as convertToGlobalUtil, 
  formatCurrency as formatCurrencyUtil,
  getCurrencySymbol
} from '../utils/currency';

export const GROWY_LANG_KEY = 'growy_lang';
export const LEGACY_LANG_KEY = 'growy_language_preference';
export const GROWY_BASE_CURRENCY_KEY = 'growy_base_currency';
export const THEME_KEY = 'growy_theme_preference';

export const THEME_PRESETS = {
  MINT: { 
    primary: '#97F2CC', 
    primaryHover: '#82E5BC',
    primaryRgb: '151, 242, 204', 
    primaryText: '#091E15', 
    muted: 'rgba(151, 242, 204, 0.15)',
    glow: 'rgba(151, 242, 204, 0.10)' 
  },
  CYAN: { 
    primary: '#38BDF8', 
    primaryHover: '#0ea5e9',
    primaryRgb: '56, 189, 248', 
    primaryText: '#082f49', 
    muted: 'rgba(56, 189, 248, 0.15)',
    glow: 'rgba(56, 189, 248, 0.10)' 
  },
  PURPLE: { 
    primary: '#C084FC', 
    primaryHover: '#a855f7',
    primaryRgb: '192, 132, 252', 
    primaryText: '#2e1065', 
    muted: 'rgba(192, 132, 252, 0.15)',
    glow: 'rgba(192, 132, 252, 0.10)' 
  },
  EMERALD: { 
    primary: '#34D399', 
    primaryHover: '#10b981',
    primaryRgb: '52, 211, 153', 
    primaryText: '#064e3b', 
    muted: 'rgba(52, 211, 153, 0.15)',
    glow: 'rgba(52, 211, 153, 0.10)' 
  },
  CORAL: { 
    primary: '#FB7185', 
    primaryHover: '#f43f5e',
    primaryRgb: '251, 113, 133', 
    primaryText: '#4c0519', 
    muted: 'rgba(251, 113, 133, 0.15)',
    glow: 'rgba(251, 113, 133, 0.10)' 
  }
};

export const THEMES = [
  { id: 'mint', nameKey: 'settings.themeMint', accentColor: '#97F2CC', bgColor: '#090C10' },
  { id: 'cyan', nameKey: 'settings.themeCyan', accentColor: '#38BDF8', bgColor: '#090C10' },
  { id: 'purple', nameKey: 'settings.themePurple', accentColor: '#C084FC', bgColor: '#090C10' },
  { id: 'emerald', nameKey: 'settings.themeEmerald', accentColor: '#34D399', bgColor: '#090C10' },
  { id: 'coral', nameKey: 'settings.themeCoral', accentColor: '#FB7185', bgColor: '#090C10' }
];

export const applyThemeTokens = (themeKey) => {
  try {
    const key = String(themeKey || 'MINT').toUpperCase();
    const theme = THEME_PRESETS[key] || THEME_PRESETS.MINT;
    const root = document.documentElement;

    const accent = theme.primary;
    const accentHover = theme.primaryHover || theme.primary;
    const accentRgb = theme.primaryRgb;
    const accentText = theme.primaryText || '#091E15';
    const accentMuted = theme.muted || `rgba(${accentRgb}, 0.15)`;
    const glow = theme.glow || `rgba(${accentRgb}, 0.10)`;

    root.style.setProperty('--bg-base', '#090C10');
    root.style.setProperty('--accent', accent);
    root.style.setProperty('--accent-hover', accentHover);
    root.style.setProperty('--accent-muted', accentMuted);
    root.style.setProperty('--accent-text', accentText);
    root.style.setProperty('--accent-rgb', accentRgb);

    // Backward compatibility aliases
    root.style.setProperty('--color-primary', accent);
    root.style.setProperty('--color-primary-hover', accentHover);
    root.style.setProperty('--color-primary-rgb', accentRgb);
    root.style.setProperty('--color-primary-text', accentText);
    root.style.setProperty('--color-glow', glow);
  } catch (e) {
    console.error('Error applying theme tokens:', e);
  }
};

const SettingsContext = createContext(null);

export function SettingsProvider({ children, userId = null }) {
  const [language, setLanguageState] = useState(() => {
    try {
      const savedLang = safeGetStorage(GROWY_LANG_KEY, null) || safeGetStorage(LEGACY_LANG_KEY, null);
      if (savedLang === 'es' || savedLang === 'en') return savedLang;
      const browserLang = (navigator.language || 'es').toLowerCase().startsWith('es') ? 'es' : 'en';
      return browserLang;
    } catch {
      return 'es';
    }
  });

  const [theme, setThemeState] = useState(() => {
    try {
      const savedTheme = safeGetStorage(THEME_KEY, 'mint');
      return THEMES.some(t => t.id === savedTheme) ? savedTheme : 'mint';
    } catch {
      return 'mint';
    }
  });

  const [baseCurrency, setBaseCurrencyState] = useState(() => {
    try {
      const savedCurr = safeGetStorage(GROWY_BASE_CURRENCY_KEY, null) || safeGetStorage(BASE_CURRENCY_KEY, null);
      if (savedCurr && SUPPORTED_CURRENCIES.some(c => c.code === savedCurr)) return savedCurr;
      return 'USD';
    } catch {
      return 'USD';
    }
  });

  const [exchangeRates, setExchangeRates] = useState(FALLBACK_EXCHANGE_RATES);
  const [lastUpdated, setLastUpdated] = useState('Hoy');
  const [isFetchingRates, setIsFetchingRates] = useState(false);
  const [isAutoLanguage, setIsAutoLanguage] = useState(false);

  const loadExchangeRates = useCallback(async (force = false) => {
    setIsFetchingRates(true);
    try {
      const res = await fetchExchangeRates(force);
      if (res && res.rates) {
        setExchangeRates(res.rates);
        if (res.last_updated_at) {
          setLastUpdated(res.last_updated_at);
        }
      }
    } catch (err) {
      console.warn('Using fallback exchange rates:', err);
    } finally {
      setIsFetchingRates(false);
    }
  }, []);

  // 1. JERARQUÍA DE INICIALIZACIÓN (AL INICIAR SESIÓN / MONTAR LA APP)
  useEffect(() => {
    const effectiveUserId = userId || getActiveSessionUserId();
    let isMounted = true;

    async function initSettingsHierarchy() {
      try {
        let settings = null;

        // 1. Obtener settings guardados del usuario en Supabase (si hay sesión)
        if (effectiveUserId) {
          const { data, error } = await supabase
            .from('user_settings')
            .select('language, base_currency, theme_color, sidebar_collapsed')
            .eq('user_id', effectiveUserId)
            .maybeSingle();

          if (error) {
            console.warn('⚠️ [Supabase DB] Error al consultar user_settings:', error.message);
          } else if (data) {
            settings = data;
          }
        }

        if (!isMounted) return;

        // 2. Determinar Idioma (Base de Datos > LocalStorage > Detección Navegador)
        const browserLang = (navigator.language || 'es').toLowerCase().startsWith('es') ? 'es' : 'en';
        const resolvedLanguage = settings?.language || 
          safeGetStorage(GROWY_LANG_KEY, null) || 
          safeGetStorage(LEGACY_LANG_KEY, null) || 
          browserLang;

        // 3. Determinar Moneda Base (Base de Datos > LocalStorage > Default USD)
        const resolvedCurrency = settings?.base_currency || 
          safeGetStorage(GROWY_BASE_CURRENCY_KEY, null) || 
          safeGetStorage(BASE_CURRENCY_KEY, null) || 
          'USD';

        // 4. Aplicar a i18n y estado global
        setLanguageState(resolvedLanguage);
        setBaseCurrencyState(resolvedCurrency);

        // Sincronizar en localStorage como respaldo offline
        safeSetStorage(GROWY_LANG_KEY, resolvedLanguage);
        safeSetStorage(LEGACY_LANG_KEY, resolvedLanguage);
        safeSetStorage(GROWY_BASE_CURRENCY_KEY, resolvedCurrency);
        safeSetStorage(BASE_CURRENCY_KEY, resolvedCurrency);

        // Sincronizar Tema si viene configurado en DB
        let resolvedTheme = safeGetStorage('growy_theme', null) || safeGetStorage(THEME_KEY, 'mint');
        if (settings?.theme_color) {
          const dbTheme = String(settings.theme_color).toLowerCase();
          resolvedTheme = THEMES.some(t => t.id === dbTheme) ? dbTheme : 'mint';
        }
        setThemeState(resolvedTheme);
        safeSetStorage('growy_theme', resolvedTheme);
        safeSetStorage(THEME_KEY, resolvedTheme);

        applyThemeTokens(resolvedTheme);
      } catch (err) {
        console.error('❌ Error en jerarquía de inicialización de settings:', err);
      } finally {
        if (isMounted) {
          loadExchangeRates(false);
        }
      }
    }

    initSettingsHierarchy();

    return () => {
      isMounted = false;
    };
  }, [userId, loadExchangeRates]);

  // Apply CSS Variables and Theme Class to <html> Root
  useEffect(() => {
    try {
      const root = document.documentElement;
      
      THEMES.forEach(t => root.classList.remove(`theme-${t.id}`));
      root.classList.add(`theme-${theme}`);

      applyThemeTokens(theme);
    } catch (e) {
      console.error('Error applying theme tokens:', e);
    }
  }, [theme]);

  // 2. GUARDADO REACTIVO AL CAMBIAR AJUSTES (SETTINGS VIEW)
  // General bulk updater
  const updateUserSettings = useCallback(async (newSettings) => {
    if (!newSettings) return;
    const effectiveUserId = userId || getActiveSessionUserId();

    if (newSettings.language) {
      setLanguageState(newSettings.language);
      safeSetStorage(GROWY_LANG_KEY, newSettings.language);
      safeSetStorage(LEGACY_LANG_KEY, newSettings.language);
    }
    if (newSettings.base_currency) {
      setBaseCurrencyState(newSettings.base_currency);
      safeSetStorage(GROWY_BASE_CURRENCY_KEY, newSettings.base_currency);
      safeSetStorage(BASE_CURRENCY_KEY, newSettings.base_currency);
    }
    if (newSettings.theme_color) {
      const dbTheme = String(newSettings.theme_color).toLowerCase();
      const resolved = THEMES.some(t => t.id === dbTheme) ? dbTheme : 'mint';
      setThemeState(resolved);
      safeSetStorage('growy_theme', resolved);
      safeSetStorage(THEME_KEY, resolved);
      applyThemeTokens(resolved);
    }

    if (effectiveUserId) {
      try {
        const payload = {
          user_id: effectiveUserId,
          updated_at: new Date().toISOString()
        };
        if (newSettings.language) payload.language = newSettings.language;
        if (newSettings.base_currency) payload.base_currency = newSettings.base_currency;
        if (newSettings.theme_color) payload.theme_color = newSettings.theme_color;
        if (newSettings.sidebar_collapsed !== undefined) payload.sidebar_collapsed = newSettings.sidebar_collapsed;

        await supabase
          .from('user_settings')
          .upsert(payload, { onConflict: 'user_id' });
        console.log('✅ [Supabase DB] Settings persistidos en user_settings:', payload);
      } catch (err) {
        console.error('❌ [Supabase DB Error] Error actualizando user_settings:', err);
      }
    }
  }, [userId]);

  // Set Language
  const setLanguage = useCallback(async (newLang) => {
    setLanguageState(newLang);
    safeSetStorage(GROWY_LANG_KEY, newLang);
    safeSetStorage(LEGACY_LANG_KEY, newLang);

    const effectiveUserId = userId || getActiveSessionUserId();
    if (effectiveUserId) {
      try {
        await supabase
          .from('user_settings')
          .upsert({
            user_id: effectiveUserId,
            language: newLang,
            base_currency: baseCurrency,
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id' });
        console.log('✅ [Supabase DB] Idioma persistido en user_settings:', newLang);
      } catch (err) {
        console.error('❌ [Supabase DB Error] Error al persistir idioma:', err);
      }
    }
  }, [userId, baseCurrency]);

  // Set Base Currency
  const setBaseCurrency = useCallback(async (newCurrency) => {
    setBaseCurrencyState(newCurrency);
    safeSetStorage(GROWY_BASE_CURRENCY_KEY, newCurrency);
    safeSetStorage(BASE_CURRENCY_KEY, newCurrency);

    const effectiveUserId = userId || getActiveSessionUserId();
    if (effectiveUserId) {
      try {
        await supabase
          .from('user_settings')
          .upsert({
            user_id: effectiveUserId,
            language: language,
            base_currency: newCurrency,
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id' });
        console.log('✅ [Supabase DB] Moneda base persistida en user_settings:', newCurrency);
      } catch (err) {
        console.error('❌ [Supabase DB Error] Error al persistir moneda base:', err);
      }
    }
  }, [userId, language]);

  // Set Theme
  const setTheme = useCallback(async (newTheme) => {
    const dbTheme = String(newTheme).toLowerCase();
    const resolvedTheme = THEMES.some(t => t.id === dbTheme) ? dbTheme : 'mint';
    setThemeState(resolvedTheme);
    safeSetStorage('growy_theme', resolvedTheme);
    safeSetStorage(THEME_KEY, resolvedTheme);
    applyThemeTokens(resolvedTheme);

    const effectiveUserId = userId || getActiveSessionUserId();
    if (effectiveUserId) {
      try {
        await supabase
          .from('user_settings')
          .upsert({
            user_id: effectiveUserId,
            theme_color: resolvedTheme,
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id' });
        console.log('✅ [Supabase DB] Tema persistido en user_settings:', resolvedTheme);
      } catch (err) {
        console.warn('⚠️ Error guardando tema en Supabase:', err);
      }
    }
  }, [userId]);

  // Manual Refresh of Exchange Rates
  const refreshExchangeRates = useCallback(async () => {
    setIsFetchingRates(true);
    try {
      localStorage.removeItem('growy_fx_rates_cache');
      localStorage.removeItem('growy_exchange_rates_cache');

      const res = await fetch('https://open.er-api.com/v6/latest/USD');
      if (!res.ok) throw new Error(`FX API Error: ${res.status}`);
      const data = await res.json();

      if (data && data.rates) {
        const mergedRates = { ...FALLBACK_EXCHANGE_RATES, ...data.rates };
        setExchangeRates(mergedRates);
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setLastUpdated(timeStr);
        safeSetStorage('growy_fx_rates_cache', {
          timestamp: Date.now(),
          rates: mergedRates,
          last_updated_at: timeStr,
          last_fetch_date: new Date().toISOString().split('T')[0]
        });
      }
    } catch (err) {
      console.error('Error fetching live FX rates:', err);
      await loadExchangeRates(true);
    } finally {
      setIsFetchingRates(false);
    }
  }, [loadExchangeRates]);

  // Mathematical Dynamic Calculation to Global Currency for Transactions
  const formatToGlobal = useCallback((tx) => {
    return formatToGlobalUtil(tx, baseCurrency, exchangeRates);
  }, [baseCurrency, exchangeRates]);

  // Mathematical Cross-Rate calculation (1 fromCurrency = X toCurrency)
  const getCrossRate = useCallback((fromCurrency, toCurrency) => {
    return getCrossRateUtil(fromCurrency, toCurrency, exchangeRates);
  }, [exchangeRates]);

  // Mathematical Cross-Currency conversion between any two currencies
  const convertCrossCurrency = useCallback((amount, fromCurrency, toCurrency) => {
    return convertCrossCurrencyUtil(amount, fromCurrency, toCurrency, exchangeRates);
  }, [exchangeRates]);

  // Mathematical Dynamic Conversion between any two currencies
  const convertCurrency = useCallback((amount, fromCurrency, toCurrency, exchangeRateToUsd = null) => {
    return convertCurrencyUtil(amount, fromCurrency, toCurrency, exchangeRateToUsd, exchangeRates);
  }, [exchangeRates]);

  // Mathematical Conversion ONLY for Net Wealth and Consolidated Account Balances
  const convertToGlobal = useCallback((amount, accountCurrency = 'USD') => {
    return convertToGlobalUtil(amount, accountCurrency, baseCurrency, exchangeRates);
  }, [baseCurrency, exchangeRates]);

  const baseCurrencySymbol = useMemo(() => {
    return getCurrencySymbol(baseCurrency);
  }, [baseCurrency]);

  // Decoupled Symbol Formatting: Defaults to baseCurrency, accepts native currency override
  const formatCurrency = useCallback((amount, currencyOverride = null) => {
    return formatCurrencyUtil(amount, currencyOverride, baseCurrency);
  }, [baseCurrency]);

  // Translation Function with Fallbacks & Interpolation
  const t = useCallback((path, replacements = {}, fallback = '') => {
    if (!path) return fallback;

    const keys = path.split('.');
    let current = translations[language] || translations['es'];

    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        let fallbackCurrent = translations['es'];
        for (const fKey of keys) {
          if (fallbackCurrent && typeof fallbackCurrent === 'object' && fKey in fallbackCurrent) {
            fallbackCurrent = fallbackCurrent[fKey];
          } else {
            return fallback || path;
          }
        }
        current = fallbackCurrent;
        break;
      }
    }

    if (typeof current !== 'string') {
      return fallback || path;
    }

    let result = current;
    Object.keys(replacements).forEach(key => {
      result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), replacements[key]);
    });

    return result;
  }, [language]);

  // Export Backup JSON from live state
  const exportBackup = useCallback((financeData = {}) => {
    try {
      const backupData = {
        app: 'Growy',
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        accounts: financeData.accounts || [],
        categories: financeData.categories || [],
        transactions: financeData.transactions || [],
        loans: financeData.loans || [],
        subscriptions: financeData.subscriptions || [],
        settings: {
          theme: safeGetStorage(THEME_KEY, 'mint'),
          language: safeGetStorage(GROWY_LANG_KEY, null) || safeGetStorage(LEGACY_LANG_KEY, 'es'),
          baseCurrency: safeGetStorage(GROWY_BASE_CURRENCY_KEY, null) || safeGetStorage(BASE_CURRENCY_KEY, 'USD')
        }
      };

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
      const downloadAnchor = document.createElement('a');
      const dateSuffix = new Date().toISOString().split('T')[0];
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `growy_backup_${dateSuffix}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (e) {
      console.error('Failed exporting backup:', e);
    }
  }, []);

  // Reset System Preferences & Session
  const resetAllData = useCallback(() => {
    try {
      const settingsKeys = [
        'growy_sidebar_collapsed',
        'growy_glass',
        'growy_glass_intensity',
        GROWY_LANG_KEY,
        LEGACY_LANG_KEY,
        THEME_KEY,
        GROWY_BASE_CURRENCY_KEY,
        BASE_CURRENCY_KEY
      ];
      settingsKeys.forEach(k => safeRemoveStorage(k));
      window.location.reload();
    } catch (e) {
      console.error('Failed resetting preferences:', e);
    }
  }, []);

  const value = useMemo(() => ({
    language,
    setLanguage,
    isAutoLanguage,
    theme,
    setTheme,
    baseCurrency,
    setBaseCurrency,
    baseCurrencySymbol,
    exchangeRates,
    lastUpdated,
    isFetchingRates,
    refreshExchangeRates,
    getCrossRate,
    convertCrossCurrency,
    formatToGlobal,
    convertCurrency,
    convertToGlobal,
    formatCurrency,
    t,
    exportBackup,
    resetAllData,
    updateUserSettings,
    applyThemeTokens,
    THEME_PRESETS,
    THEMES
  }), [
    language,
    setLanguage,
    isAutoLanguage,
    theme,
    setTheme,
    baseCurrency,
    setBaseCurrency,
    baseCurrencySymbol,
    exchangeRates,
    lastUpdated,
    isFetchingRates,
    refreshExchangeRates,
    getCrossRate,
    convertCrossCurrency,
    formatToGlobal,
    convertCurrency,
    convertToGlobal,
    formatCurrency,
    t,
    exportBackup,
    resetAllData,
    updateUserSettings
  ]);

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
