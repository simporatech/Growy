import { safeGetStorage, safeSetStorage } from './storage';
import { dbFetchExchangeRates, dbUpsertExchangeRates } from '../services/supabaseService';
import { 
  fetchLiveExchangeRates, 
  convertCrossCurrency, 
  getCrossRate, 
  purgeExchangeRatesCache,
  FALLBACK_RATES 
} from '../services/currencyService';

export { fetchLiveExchangeRates, convertCrossCurrency, getCrossRate, purgeExchangeRatesCache };

export const BASE_CURRENCY_KEY = 'growy_base_currency';
export const EXCHANGE_RATES_CACHE_KEY = 'growy_fx_rates_cache';

export const CURRENCY_MAP = {
  USD: { symbol: '$', name: 'Dólar Estadounidense', nameEn: 'US Dollar', code: 'USD', flag: '🇺🇸' },
  HNL: { symbol: 'L.', name: 'Lempira Hondureña', nameEn: 'Honduran Lempira', code: 'HNL', flag: '🇭🇳' },
  EUR: { symbol: '€', name: 'Euro', nameEn: 'Euro', code: 'EUR', flag: '🇪🇺' },
  GBP: { symbol: '£', name: 'Libra Esterlina', nameEn: 'British Pound', code: 'GBP', flag: '🇬🇧' },
  MXN: { symbol: '$', name: 'Peso Mexicano', nameEn: 'Mexican Peso', code: 'MXN', flag: '🇲🇽' },
  GTQ: { symbol: 'Q', name: 'Quetzal Guatemalteco', nameEn: 'Guatemalan Quetzal', code: 'GTQ', flag: '🇬🇹' },
  COP: { symbol: '$', name: 'Peso Colombiano', nameEn: 'Colombian Peso', code: 'COP', flag: '🇨🇴' },
  CAD: { symbol: 'CA$', name: 'Dólar Canadiense', nameEn: 'Canadian Dollar', code: 'CAD', flag: '🇨🇦' },
  BRL: { symbol: 'R$', name: 'Real Brasileño', nameEn: 'Brazilian Real', code: 'BRL', flag: '🇧🇷' },
  ARS: { symbol: '$', name: 'Peso Argentino', nameEn: 'Argentine Peso', code: 'ARS', flag: '🇦🇷' },
  CLP: { symbol: '$', name: 'Peso Chileno', nameEn: 'Chilean Peso', code: 'CLP', flag: '🇨🇱' },
  PEN: { symbol: 'S/', name: 'Sol Peruano', nameEn: 'Peruvian Sol', code: 'PEN', flag: '🇵🇪' },
  CRC: { symbol: '₡', name: 'Colón Costarricense', nameEn: 'Costa Rican Colón', code: 'CRC', flag: '🇨🇷' },
  DOP: { symbol: 'RD$', name: 'Peso Dominicano', nameEn: 'Dominican Peso', code: 'DOP', flag: '🇩🇴' },
  JPY: { symbol: '¥', name: 'Yen Japonés', nameEn: 'Japanese Yen', code: 'JPY', flag: '🇯🇵' },
  CHF: { symbol: 'CHF', name: 'Franco Suizo', nameEn: 'Swiss Franc', code: 'CHF', flag: '🇨🇭' },
  AUD: { symbol: 'A$', name: 'Dólar Australiano', nameEn: 'Australian Dollar', code: 'AUD', flag: '🇦🇺' },
  CNY: { symbol: '¥', name: 'Yuan Chino', nameEn: 'Chinese Yuan', code: 'CNY', flag: '🇨🇳' },
  INR: { symbol: '₹', name: 'Rupia India', nameEn: 'Indian Rupee', code: 'INR', flag: '🇮🇳' },
  KRW: { symbol: '₩', name: 'Won Surcoreano', nameEn: 'South Korean Won', code: 'KRW', flag: '🇰🇷' }
};

export const CURRENCY_SYMBOLS = Object.keys(CURRENCY_MAP).reduce((acc, code) => {
  acc[code] = CURRENCY_MAP[code].symbol;
  return acc;
}, {});

export const AVAILABLE_CURRENCIES = Object.keys(CURRENCY_MAP).map(code => ({
  value: code,
  label: `${CURRENCY_MAP[code].symbol} ${code} - ${CURRENCY_MAP[code].nameEn}`,
  symbol: CURRENCY_MAP[code].symbol,
  code,
  flag: CURRENCY_MAP[code].flag
}));

export const SUPPORTED_CURRENCIES = Object.keys(CURRENCY_MAP).map(code => ({
  code,
  symbol: CURRENCY_MAP[code].symbol,
  label: `${code} (${CURRENCY_MAP[code].symbol}) - ${CURRENCY_MAP[code].name}`,
  labelEn: `${code} (${CURRENCY_MAP[code].symbol}) - ${CURRENCY_MAP[code].nameEn}`,
  flag: CURRENCY_MAP[code].flag
}));

export const FALLBACK_EXCHANGE_RATES = FALLBACK_RATES;

export const getCurrencySymbol = (currencyCode = 'USD') => {
  return CURRENCY_SYMBOLS[currencyCode] || '$';
};

/**
 * Smart detection of browser language ('es' vs 'en') and currency by TimeZone
 */
export const detectUserLocaleAndCurrency = () => {
  const browserLang = (navigator.language || (navigator.languages && navigator.languages[0]) || 'es').toLowerCase();
  const detectedLang = browserLang.startsWith('es') ? 'es' : 'en';

  let detectedCurrency = 'USD';
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    if (tz.includes('Tegucigalpa')) detectedCurrency = 'HNL';
    else if (tz.startsWith('Europe/London')) detectedCurrency = 'GBP';
    else if (tz.startsWith('Europe/')) detectedCurrency = 'EUR';
    else if (tz.includes('Mexico') || tz.includes('Cancun') || tz.includes('Merida') || tz.includes('Monterrey') || tz.includes('Tijuana')) detectedCurrency = 'MXN';
    else if (tz.includes('Guatemala')) detectedCurrency = 'GTQ';
    else if (tz.includes('Bogota')) detectedCurrency = 'COP';
    else if (tz.includes('Costa_Rica')) detectedCurrency = 'CRC';
    else if (tz.includes('Santo_Domingo')) detectedCurrency = 'DOP';
    else if (tz.includes('Argentina') || tz.includes('Buenos_Aires')) detectedCurrency = 'ARS';
    else if (tz.includes('Santiago')) detectedCurrency = 'CLP';
    else if (tz.includes('Lima')) detectedCurrency = 'PEN';
    else if (tz.includes('Sao_Paulo')) detectedCurrency = 'BRL';
    else if (tz.includes('Toronto') || tz.includes('Vancouver')) detectedCurrency = 'CAD';
    else if (tz.includes('Tokyo')) detectedCurrency = 'JPY';
    else if (tz.includes('Zurich')) detectedCurrency = 'CHF';
    else if (tz.includes('Sydney') || tz.includes('Melbourne')) detectedCurrency = 'AUD';
    else if (tz.includes('Shanghai')) detectedCurrency = 'CNY';
    else if (tz.includes('Kolkata')) detectedCurrency = 'INR';
    else if (tz.includes('Seoul')) detectedCurrency = 'KRW';
  } catch (e) {
    console.warn('Could not detect timezone currency:', e);
  }

  return { language: detectedLang, currency: detectedCurrency };
};

/**
 * Format currency amount with decoupled symbol mapping by currency code or symbol
 */
export const formatCurrency = (amount, currency = null, globalCurrency = 'USD') => {
  const num = Number(amount) || 0;
  let targetCurrency = currency || globalCurrency || 'USD';
  
  // Check if targetCurrency is a recognized currency code
  let symbol = CURRENCY_SYMBOLS[targetCurrency];
  
  if (!symbol) {
    // If targetCurrency is not directly in CURRENCY_SYMBOLS, match against code case-insensitively or find by symbol
    const upperCode = typeof targetCurrency === 'string' ? targetCurrency.toUpperCase() : '';
    if (CURRENCY_SYMBOLS[upperCode]) {
      symbol = CURRENCY_SYMBOLS[upperCode];
      targetCurrency = upperCode;
    } else {
      const matchedCode = Object.keys(CURRENCY_MAP).find(
        code => CURRENCY_MAP[code].symbol === targetCurrency || code.toLowerCase() === String(targetCurrency).toLowerCase()
      );
      if (matchedCode) {
        symbol = CURRENCY_MAP[matchedCode].symbol;
        targetCurrency = matchedCode;
      } else if (typeof targetCurrency === 'string' && (targetCurrency.includes('$') || targetCurrency.includes('L.') || targetCurrency.includes('€') || targetCurrency.includes('£'))) {
        symbol = targetCurrency;
      } else {
        symbol = CURRENCY_SYMBOLS[globalCurrency] || '$';
      }
    }
  }

  const formattedNum = new Intl.NumberFormat('es-HN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num);

  return targetCurrency === 'EUR' 
    ? `${formattedNum} ${symbol}` 
    : `${symbol} ${formattedNum}`;
};

/**
 * Fetch daily exchange rates using currencyService with smart caching.
 */
export const fetchExchangeRates = async (force = false) => {
  return fetchLiveExchangeRates(force);
};

/**
 * Core mathematical currency conversion function
 * Converts nominal amount from a source currency to a target currency.
 * If currencies match, factor is 1.0 (no multiplication or division).
 * 
 * @param {number|string} amount - Nominal original amount
 * @param {string} fromCurrency - Original currency (e.g. 'HNL', 'USD', 'EUR')
 * @param {string} toCurrency - Target currency (e.g. 'USD', 'HNL', 'EUR')
 * @param {number|null} exchangeRateToUsd - Historical exchange rate snapshot
 * @param {object} liveRates - Active exchange rates map pegged to USD
 * @returns {number} Converted amount in target currency
 */
export const convertCurrency = (amount, fromCurrency = 'USD', toCurrency = 'USD', exchangeRateToUsd = null, liveRates = FALLBACK_EXCHANGE_RATES) => {
  return convertCrossCurrency(amount, fromCurrency, toCurrency, liveRates);
};

/**
 * Pure dynamic presentation function for converting any transaction to the active global display currency
 * @param {object} tx - Transaction object
 * @param {string} globalCurrency - Active global base currency (e.g. 'USD', 'HNL')
 * @param {object} liveRates - Active exchange rates
 * @returns {number} Converted amount in base global currency
 */
export const formatToGlobal = (tx, globalCurrency = 'USD', liveRates = FALLBACK_EXCHANGE_RATES) => {
  if (!tx) return 0;
  const amount = Number(tx.amount) || 0;
  const txCurrency = (tx.currency || 'USD').toUpperCase();
  const targetCurrency = (globalCurrency || 'USD').toUpperCase();

  // Strict Rule: If transaction is already in globalCurrency, return original amount directly
  if (txCurrency === targetCurrency) {
    return amount;
  }

  return convertCrossCurrency(amount, txCurrency, targetCurrency, liveRates);
};

/**
 * Conversion function strictly for consolidated account balances / net wealth calculation.
 */
export const convertToGlobal = (amount, accountCurrency = 'USD', globalCurrency = 'USD', rates = FALLBACK_EXCHANGE_RATES) => {
  return convertCrossCurrency(amount, accountCurrency, globalCurrency, rates);
};
