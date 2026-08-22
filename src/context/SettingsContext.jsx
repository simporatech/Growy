import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { safeGetStorage, safeSetStorage, safeRemoveStorage } from '../utils/storage';
import { translations } from '../i18n/translations';
import { 
  BASE_CURRENCY_KEY, 
  SUPPORTED_CURRENCIES, 
  FALLBACK_EXCHANGE_RATES,
  fetchExchangeRates, 
  convertCurrency as convertCurrencyUtil,
  formatToGlobal as formatToGlobalUtil,
  convertToGlobal as convertToGlobalUtil, 
  formatCurrency as formatCurrencyUtil,
  getCurrencySymbol,
  detectUserLocaleAndCurrency
} from '../utils/currency';

const LANGUAGE_KEY = 'growy_language_preference';
const THEME_KEY = 'growy_theme_preference';
const GLASS_KEY = 'growy_glass_intensity';

export const THEMES = [
  { id: 'mint', nameKey: 'settings.themeMint', accentColor: '#AEEDD0', bgColor: '#1E2D32' },
  { id: 'cyan', nameKey: 'settings.themeCyan', accentColor: '#38BDF8', bgColor: '#0F172A' },
  { id: 'purple', nameKey: 'settings.themePurple', accentColor: '#C084FC', bgColor: '#1E1B4B' },
  { id: 'emerald', nameKey: 'settings.themeEmerald', accentColor: '#34D399', bgColor: '#064E3B' },
  { id: 'coral', nameKey: 'settings.themeCoral', accentColor: '#FB7185', bgColor: '#1C1917' }
];

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const [isAutoLanguage, setIsAutoLanguage] = useState(true);
  const [language, setLanguageState] = useState('es');
  const [theme, setThemeState] = useState('mint');
  const [glassIntensity, setGlassIntensityState] = useState('high');
  const [baseCurrency, setBaseCurrencyState] = useState(() => safeGetStorage(BASE_CURRENCY_KEY, 'USD'));
  const [exchangeRates, setExchangeRates] = useState(FALLBACK_EXCHANGE_RATES);
  const [lastUpdated, setLastUpdated] = useState('Hoy');
  const [isFetchingRates, setIsFetchingRates] = useState(false);

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

  // Initialize Settings & Daily Exchange Rates (24h Cache) with Smart Detection
  useEffect(() => {
    try {
      const detected = detectUserLocaleAndCurrency();

      const savedLang = safeGetStorage(LANGUAGE_KEY, null);
      if (savedLang && (savedLang === 'es' || savedLang === 'en')) {
        setLanguageState(savedLang);
        setIsAutoLanguage(false);
      } else {
        setLanguageState(detected.language);
        setIsAutoLanguage(true);
      }

      const savedTheme = safeGetStorage(THEME_KEY, 'mint');
      if (THEMES.some(t => t.id === savedTheme)) {
        setThemeState(savedTheme);
      } else {
        setThemeState('mint');
      }

      const savedGlass = safeGetStorage(GLASS_KEY, 'high');
      setGlassIntensityState(savedGlass === 'light' ? 'light' : 'high');

      const savedCurr = safeGetStorage(BASE_CURRENCY_KEY, null);
      if (savedCurr && SUPPORTED_CURRENCIES.some(c => c.code === savedCurr)) {
        setBaseCurrencyState(savedCurr);
      } else {
        setBaseCurrencyState(detected.currency);
        safeSetStorage(BASE_CURRENCY_KEY, detected.currency);
      }

      loadExchangeRates(false);
    } catch (e) {
      console.error('Error loading settings:', e);
    }
  }, [loadExchangeRates]);

  // Apply CSS Variables and Theme Class to <html> Root
  useEffect(() => {
    try {
      const root = document.documentElement;
      
      THEMES.forEach(t => root.classList.remove(`theme-${t.id}`));
      root.classList.remove('glass-high', 'glass-light');

      root.classList.add(`theme-${theme}`);
      root.classList.add(`glass-${glassIntensity}`);
    } catch (e) {
      console.error('Error applying theme:', e);
    }
  }, [theme, glassIntensity]);

  // Set Language
  const setLanguage = useCallback((newLang, isManual = true) => {
    setLanguageState(newLang);
    if (isManual) {
      setIsAutoLanguage(false);
      safeSetStorage(LANGUAGE_KEY, newLang);
    } else {
      setIsAutoLanguage(true);
      safeRemoveStorage(LANGUAGE_KEY);
    }
  }, []);

  // Set Theme
  const setTheme = useCallback((newTheme) => {
    setThemeState(newTheme);
    safeSetStorage(THEME_KEY, newTheme);
  }, []);

  // Set Glass Intensity
  const setGlassIntensity = useCallback((intensity) => {
    setGlassIntensityState(intensity);
    safeSetStorage(GLASS_KEY, intensity);
  }, []);

  // Set Base Currency
  const setBaseCurrency = useCallback((currencyCode) => {
    setBaseCurrencyState(currencyCode);
    safeSetStorage(BASE_CURRENCY_KEY, currencyCode);
  }, []);

  // Manual Refresh of Exchange Rates
  const refreshExchangeRates = useCallback(() => {
    return loadExchangeRates(true);
  }, [loadExchangeRates]);

  // Mathematical Dynamic Calculation to Global Currency for Transactions
  const formatToGlobal = useCallback((tx) => {
    return formatToGlobalUtil(tx, baseCurrency, exchangeRates);
  }, [baseCurrency, exchangeRates]);

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
          language: safeGetStorage(LANGUAGE_KEY, 'es'),
          glassIntensity: safeGetStorage(GLASS_KEY, 'high'),
          baseCurrency: safeGetStorage(BASE_CURRENCY_KEY, 'USD')
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
        LANGUAGE_KEY,
        THEME_KEY,
        GLASS_KEY,
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
    glassIntensity,
    setGlassIntensity,
    baseCurrency,
    setBaseCurrency,
    baseCurrencySymbol,
    exchangeRates,
    lastUpdated,
    isFetchingRates,
    refreshExchangeRates,
    formatToGlobal,
    convertCurrency,
    convertToGlobal,
    formatCurrency,
    t,
    exportBackup,
    resetAllData
  }), [
    language,
    setLanguage,
    isAutoLanguage,
    theme,
    setTheme,
    glassIntensity,
    setGlassIntensity,
    baseCurrency,
    setBaseCurrency,
    baseCurrencySymbol,
    exchangeRates,
    lastUpdated,
    isFetchingRates,
    refreshExchangeRates,
    formatToGlobal,
    convertCurrency,
    convertToGlobal,
    formatCurrency,
    t,
    exportBackup,
    resetAllData
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
