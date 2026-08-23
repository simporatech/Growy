/**
 * Real-time FX & Multicurrency Exchange Rates Service
 * Powered by Open ExchangeRate-API (https://open.er-api.com/v6/latest/USD)
 */

import { safeGetStorage, safeSetStorage } from '../utils/storage';
import { dbFetchExchangeRates, dbUpsertExchangeRates } from './supabaseService';

export const FX_API_URL = 'https://open.er-api.com/v6/latest/USD';
export const CACHE_KEY = 'growy_fx_rates_cache';
export const CACHE_DURATION_MS = 12 * 60 * 60 * 1000; // 12 hours

export const FALLBACK_RATES = {
  USD: 1,
  HNL: 24.80,
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

/**
 * Purges cached exchange rates from localStorage
 */
export function purgeExchangeRatesCache() {
  try {
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem('growy_exchange_rates_cache');
    console.log('🧹 [FX Service] Caché de tasas de cambio purgada.');
  } catch (e) {
    console.warn('Error purging FX cache:', e);
  }
}

/**
 * Fetches real-time market exchange rates with smart 12h caching in localStorage and Supabase.
 * @param {boolean} forceRefresh - If true, bypasses cache and fetches fresh rates from API
 * @returns {Promise<{rates: object, last_updated_at: string, last_fetch_date: string, timestamp: number}>}
 */
export async function fetchLiveExchangeRates(forceRefresh = false) {
  const todayStr = new Date().toISOString().split('T')[0];
  const now = Date.now();

  try {
    // 1. Check local storage cache if not forced
    if (!forceRefresh) {
      const cached = safeGetStorage(CACHE_KEY, null);
      if (cached && cached.rates && cached.timestamp && (now - cached.timestamp < CACHE_DURATION_MS)) {
        // Discard and purge if old stale HNL rate (< 24.0)
        if (cached.rates.HNL >= 24.0) {
          return cached;
        } else {
          purgeExchangeRatesCache();
        }
      }

      // Check DB cached rates
      const dbCached = await dbFetchExchangeRates();
      if (dbCached && dbCached.rates && dbCached.lastFetchDate === todayStr && dbCached.rates.HNL >= 24.0) {
        return {
          rates: dbCached.rates,
          last_updated_at: dbCached.lastUpdatedAt || 'Hoy',
          last_fetch_date: dbCached.lastFetchDate || todayStr,
          timestamp: now
        };
      }
    } else {
      purgeExchangeRatesCache();
    }

    // 2. Fetch live rates from public API
    const res = await fetch('https://open.er-api.com/v6/latest/USD');
    if (!res.ok) throw new Error(`FX API Error: ${res.status}`);

    const data = await res.json();
    console.log('Tasa HNL recibida:', data?.rates?.HNL);
    if (data && data.rates) {
      const mergedRates = { ...FALLBACK_RATES, ...data.rates };
      const payload = {
        rates: mergedRates,
        last_updated_at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        last_fetch_date: todayStr,
        timestamp: now
      };

      safeSetStorage(CACHE_KEY, payload);
      await dbUpsertExchangeRates({
        rates: mergedRates,
        last_updated_at: payload.last_updated_at,
        last_fetch_date: todayStr
      });

      return payload;
    }
    throw new Error('Invalid FX payload');
  } catch (error) {
    console.error('Error fetching live FX rates:', error);

    // Fallback to cache if available and not stale
    const cached = safeGetStorage(CACHE_KEY, null);
    if (cached && cached.rates && cached.rates.HNL >= 24.0) {
      return cached;
    }

    return {
      rates: FALLBACK_RATES,
      last_updated_at: 'Hoy',
      last_fetch_date: todayStr,
      timestamp: now
    };
  }
}

/**
 * Pure mathematical cross-rate converter using USD pivot (rates[USD] = 1.0)
 * Conversion formula: (amount / rateFromUSD) * rateToUSD
 * 
 * @param {number|string} amount - Nominal original amount
 * @param {string} fromCurrency - Ej: 'USD', 'EUR', 'HNL', 'GTQ'
 * @param {string} toCurrency - Ej: 'HNL', 'USD', 'EUR'
 * @param {object} rates - Diccionario de tasas contra USD (rates[USD] = 1)
 * @returns {number} Converted amount in target currency
 */
export function convertCrossCurrency(amount, fromCurrency, toCurrency, rates = FALLBACK_RATES) {
  const num = Number(amount) || 0;
  if (!num || isNaN(num)) return 0;

  const from = (fromCurrency || 'USD').toUpperCase();
  const to = (toCurrency || 'USD').toUpperCase();

  if (from === to) return num;

  const safeRates = (rates && typeof rates === 'object') ? rates : FALLBACK_RATES;
  const rateFromUSD = Number(safeRates[from]) || Number(FALLBACK_RATES[from]) || 1;
  const rateToUSD = Number(safeRates[to]) || Number(FALLBACK_RATES[to]) || 1;

  if (!rateFromUSD || !rateToUSD) {
    console.warn(`Missing FX rate for ${from} or ${to}`);
    return num;
  }

  // Conversión triangular: (Monto / Tasa_Origen) * Tasa_Destino
  const amountInUSD = num / rateFromUSD;
  const convertedAmount = amountInUSD * rateToUSD;

  return convertedAmount;
}

/**
 * Obtiene la tasa unitaria entre dos monedas (1 From = X To)
 * @param {string} fromCurrency 
 * @param {string} toCurrency 
 * @param {object} rates 
 * @returns {number}
 */
export function getCrossRate(fromCurrency, toCurrency, rates = FALLBACK_RATES) {
  const from = (fromCurrency || 'USD').toUpperCase();
  const to = (toCurrency || 'USD').toUpperCase();

  if (from === to) return 1.0;

  const safeRates = (rates && typeof rates === 'object') ? rates : FALLBACK_RATES;
  const rateFromUSD = Number(safeRates[from]) || Number(FALLBACK_RATES[from]) || 1;
  const rateToUSD = Number(safeRates[to]) || Number(FALLBACK_RATES[to]) || 1;

  if (!rateFromUSD || !rateToUSD) return 1.0;

  return rateToUSD / rateFromUSD;
}
