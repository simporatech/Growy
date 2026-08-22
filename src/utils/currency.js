import { safeGetStorage, safeSetStorage } from './storage';
import { dbFetchExchangeRates, dbUpsertExchangeRates } from '../services/supabaseService';

export const BASE_CURRENCY_KEY = 'growy_base_currency';
export const EXCHANGE_RATES_CACHE_KEY = 'growy_exchange_rates_cache';

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

export const FALLBACK_EXCHANGE_RATES = {
  USD: 1,
  HNL: 25.50,
  EUR: 0.92,
  GBP: 0.79,
  MXN: 18.20,
  GTQ: 7.75,
  COP: 4050.00,
  CAD: 1.36,
  BRL: 5.45,
  ARS: 940.00,
  CLP: 930.00,
  PEN: 3.75,
  CRC: 520.00,
  DOP: 59.50,
  JPY: 155.00,
  CHF: 0.89,
  AUD: 1.50,
  CNY: 7.25,
  INR: 83.50,
  KRW: 1380.00
};

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
 * Format currency amount with decoupled symbol mapping by currency code
 */
export const formatCurrency = (amount, currency = null, globalCurrency = 'USD') => {
  const num = Number(amount) || 0;
  const targetCurrency = currency || globalCurrency || 'USD';
  const symbol = CURRENCY_SYMBOLS[targetCurrency] || '$';

  const formattedNum = new Intl.NumberFormat('es-HN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num);

  return targetCurrency === 'EUR' 
    ? `${formattedNum} ${symbol}` 
    : `${symbol} ${formattedNum}`;
};

/**
 * Fetch daily exchange rates from Supabase DB or API (https://open.er-api.com/v6/latest/USD)
 * and cache with 24-hour / daily validation.
 */
export const fetchExchangeRates = async (force = false) => {
  const todayStr = new Date().toISOString().split('T')[0];

  if (!force) {
    const dbCached = await dbFetchExchangeRates();
    if (dbCached && dbCached.lastFetchDate === todayStr && dbCached.rates) {
      return dbCached;
    }
  }

  const cached = safeGetStorage(EXCHANGE_RATES_CACHE_KEY, null);
  if (!force && cached && cached.last_fetch_date === todayStr && cached.rates) {
    return cached;
  }

  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD');
    if (res.ok) {
      const data = await res.json();
      if (data && data.rates) {
        const mergedRates = { ...FALLBACK_EXCHANGE_RATES, ...data.rates };
        const payload = {
          last_fetch_date: todayStr,
          last_updated_at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          rates: mergedRates
        };
        safeSetStorage(EXCHANGE_RATES_CACHE_KEY, payload);
        await dbUpsertExchangeRates(payload);
        return payload;
      }
    }
  } catch (e) {
    console.warn('Network error or API offline. Using cached or fallback rates:', e);
  }

  if (cached && cached.rates) {
    return cached;
  }

  return {
    last_fetch_date: todayStr,
    last_updated_at: 'Hoy',
    rates: FALLBACK_EXCHANGE_RATES
  };
};

/**
 * Core mathematical currency conversion function
 * Converts nominal amount from a source currency to a target currency.
 * If currencies match, factor is 1.0 (no multiplication or division).
 * 
 * @param {number|string} amount - Nominal original amount
 * @param {string} fromCurrency - Original currency (e.g. 'HNL', 'USD', 'EUR')
 * @param {string} toCurrency - Target currency (e.g. 'USD', 'HNL', 'EUR')
 * @param {number|null} exchangeRateToUsd - Historical exchange rate snapshot (1 USD = X fromCurrency units)
 * @param {object} liveRates - Active exchange rates map pegged to USD
 * @returns {number} Converted amount in target currency
 */
export const convertCurrency = (amount, fromCurrency = 'USD', toCurrency = 'USD', exchangeRateToUsd = null, liveRates = FALLBACK_EXCHANGE_RATES) => {
  const num = Number(amount) || 0;
  const from = fromCurrency || 'USD';
  const to = toCurrency || 'USD';

  // Strict Rule: Same currency -> Factor = 1.0
  if (!from || !to || from === to) {
    return num;
  }

  const safeRates = (liveRates && typeof liveRates === 'object') ? liveRates : FALLBACK_EXCHANGE_RATES;
  
  // Rate from USD to 'fromCurrency' (1 USD = X 'fromCurrency' units)
  const fromRate = Number(exchangeRateToUsd) || Number(safeRates[from]) || Number(FALLBACK_EXCHANGE_RATES[from]) || 1;
  // Rate from USD to 'toCurrency' (1 USD = Y 'toCurrency' units)
  const toRate = Number(safeRates[to]) || Number(FALLBACK_EXCHANGE_RATES[to]) || 1;

  // Convert: fromCurrency -> USD Pivot -> toCurrency
  const amountInUSD = num / fromRate;
  const amountInTarget = amountInUSD * toRate;

  return amountInTarget;
};

/**
 * Pure dynamic presentation function for converting any transaction to the active global display currency
 * @param {object} tx - Transaction object
 * @param {string} globalCurrency - Active global base currency (e.g. 'USD', 'HNL')
 * @param {object} liveRates - Active exchange rates
 * @returns {number}
 */
export const formatToGlobal = (tx, globalCurrency = 'USD', liveRates = FALLBACK_EXCHANGE_RATES) => {
  if (!tx) return 0;
  const amount = Number(tx.amount) || 0;
  const txCurrency = tx.currency || 'USD';

  // Strict Rule: If transaction is already in globalCurrency, return original amount directly
  if (txCurrency === globalCurrency) {
    return amount;
  }

  const snapshotRate = tx.exchangeRateToUsd ?? tx.exchange_rate_to_usd ?? tx.exchangeRateAtTransaction ?? tx.exchange_rate_at_transaction;
  return convertCurrency(amount, txCurrency, globalCurrency, snapshotRate, liveRates);
};

/**
 * Conversion function strictly for consolidated account balances / net wealth calculation.
 */
export const convertToGlobal = (amount, accountCurrency = 'USD', globalCurrency = 'USD', rates = FALLBACK_EXCHANGE_RATES) => {
  return convertCurrency(amount, accountCurrency, globalCurrency, null, rates);
};
