import { supabase } from '../lib/supabaseClient.js';
import { toCamel, isValidUuid } from './supabaseService.js';
import { formatCurrency } from '../utils/currency.js';
import { getLocalDateString } from '../utils/dateUtils.js';

/**
 * Service for handling debt payments (abonos) in Supabase DB
 * Table: debt_payments
 * Parent Table: pending_debts
 */

/**
 * Calculates dynamic remaining balance, total paid, settlement status and progress percentage.
 * Handles defensive parsing for null, undefined, strings, and both snake_case/camelCase schemas.
 * 
 * @param {Object} debt - The debt/loan object
 * @param {Array} payments - Array of debt payment records
 * @returns {Object} Calculation breakdown
 */
export const calculateDebtRemaining = (debt, payments = []) => {
  if (!debt || typeof debt !== 'object') {
    return {
      originalAmount: 0,
      totalPaid: 0,
      remainingAmount: 0,
      isSettled: true,
      progressPercentage: 0,
      paymentsCount: 0
    };
  }

  const safePayments = Array.isArray(payments) ? payments : [];
  const debtId = debt.id;

  // Filter payments associated with this specific debt
  const debtPayments = safePayments.filter((p) => {
    if (!p) return false;
    const pDebtId = p.debtId !== undefined ? p.debtId : p.debt_id;
    return String(pDebtId) === String(debtId);
  });

  // Calculate sum of payments
  const totalPaid = debtPayments.reduce((acc, p) => {
    const rawAmt = p.amount !== undefined ? p.amount : (p.paidAmount || 0);
    const amt = parseFloat(rawAmt);
    return acc + (isNaN(amt) ? 0 : Math.abs(amt));
  }, 0);

  const rawOriginalAmount = debt.amount !== undefined ? debt.amount : (debt.originalAmount || 0);
  const parsedOriginalAmount = parseFloat(rawOriginalAmount);
  const originalAmount = isNaN(parsedOriginalAmount) ? 0 : Math.max(0, parsedOriginalAmount);

  const remainingAmount = Math.max(0, parseFloat((originalAmount - totalPaid).toFixed(2)));
  const isSettled = remainingAmount <= 0.001 || debt.status === 'paid' || debt.status === 'settled';

  const progressPercentage = originalAmount > 0 
    ? Math.min(100, parseFloat(((totalPaid / originalAmount) * 100).toFixed(1)))
    : 0;

  return {
    originalAmount,
    totalPaid,
    remainingAmount,
    isSettled,
    progressPercentage,
    paymentsCount: debtPayments.length
  };
};

/**
 * Fetches all payments (abonos) for a specific debt, ordered newest to oldest.
 * 
 * @param {string} debtId - The ID (UUID or text) of the debt in pending_debts
 * @returns {Promise<Array|null>} Array of payments in camelCase format or null on error
 */
export const fetchDebtPayments = async (debtId) => {
  if (!debtId) return [];
  console.log('📡 [Supabase DB] Obteniendo abonos para la deuda:', debtId);

  try {
    const { data, error } = await supabase
      .from('debt_payments')
      .select('*')
      .eq('debt_id', debtId)
      .order('payment_date', { ascending: false });

    if (error) {
      // If payment_date column is named created_at or other variation, try fallback
      if (error.message.includes('column') || error.code === '42703') {
        const fallback = await supabase
          .from('debt_payments')
          .select('*')
          .eq('debt_id', debtId);
        if (!fallback.error && fallback.data) {
          return toCamel(fallback.data);
        }
      }
      console.warn('⚠️ [Supabase DB] Error obteniendo abonos de deuda:', error.message);
      return [];
    }

    console.log(`✅ [Supabase DB] Obtenidos ${data?.length || 0} abonos para deuda:`, debtId);
    return toCamel(data || []);
  } catch (err) {
    console.error('❌ [Supabase DB Exception] fetchDebtPayments:', err);
    return [];
  }
};

/**
 * Fetches all debt payments for a specific user to hydrate global debts state.
 * 
 * @param {string} userId - The user ID (TEXT format)
 * @returns {Promise<Array>} Array of all user payments in camelCase format
 */
export const fetchAllUserDebtPayments = async (userId) => {
  if (!userId) return [];
  console.log('📡 [Supabase DB] Obteniendo todos los abonos para usuario:', userId);

  try {
    const { data, error } = await supabase
      .from('debt_payments')
      .select('*')
      .eq('user_id', userId)
      .order('payment_date', { ascending: false });

    if (error) {
      if (error.message.includes('column') || error.code === '42703') {
        const fallback = await supabase
          .from('debt_payments')
          .select('*')
          .eq('user_id', userId);
        if (!fallback.error && fallback.data) {
          return toCamel(fallback.data);
        }
      }
      console.warn('⚠️ [Supabase DB] Error obteniendo historial de abonos del usuario:', error.message);
      return [];
    }

    console.log(`✅ [Supabase DB] Obtenidos ${data?.length || 0} abonos de usuario:`, userId);
    return toCamel(data || []);
  } catch (err) {
    console.error('❌ [Supabase DB Exception] fetchAllUserDebtPayments:', err);
    return [];
  }
};

/**
 * Adds a new debt payment (abono) to debt_payments table.
 * 
 * @param {Object} paymentData
 * @param {string} paymentData.debtId - Target debt UUID
 * @param {string} paymentData.userId - User ID
 * @param {number} paymentData.amount - Amount paid
 * @param {string} paymentData.paymentDate - Date of payment (YYYY-MM-DD)
 * @param {string} [paymentData.accountId] - Optional bank account ID used to pay
 * @param {string} [paymentData.transactionId] - Optional linked transaction ID
 * @param {string} [paymentData.notes] - Optional payment notes / description
 * @returns {Promise<Object|null>} Created payment object in camelCase or null on failure
 */
export const addDebtPayment = async ({
  debtId,
  userId,
  amount,
  paymentDate = getLocalDateString(),
  accountId = null,
  transactionId = null,
  notes = ''
}) => {
  if (!debtId || !userId) {
    console.error('❌ Error: debtId y userId son requeridos para registrar un abono.');
    return null;
  }

  const numAmount = parseFloat(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    console.error('❌ Error: El monto del abono debe ser un número positivo mayor a cero.');
    return null;
  }

  const payload = {
    debt_id: debtId,
    user_id: String(userId),
    amount: numAmount,
    payment_date: paymentDate || getLocalDateString(),
    account_id: isValidUuid(accountId) ? accountId : null,
    transaction_id: isValidUuid(transactionId) ? transactionId : null,
    notes: (notes || '').trim()
  };

  console.log('🚀 [Supabase DB] Insertando abono de deuda:', payload);

  try {
    let currentPayload = { ...payload };
    let data = null;
    let error = null;

    // Resilient retry loop to handle optional column schema differences in PostgreSQL
    for (let attempt = 0; attempt < 4; attempt++) {
      const res = await supabase
        .from('debt_payments')
        .insert([currentPayload])
        .select();

      data = res.data;
      error = res.error;

      if (!error) break;

      console.warn(`⚠️ [Supabase DB] Error insertando abono (intento ${attempt + 1}):`, error.message);

      // Check if optional columns are missing in user's Supabase schema
      if (error.message.includes('transaction_id') && currentPayload.transaction_id !== undefined) {
        delete currentPayload.transaction_id;
        continue;
      }
      if (error.message.includes('account_id') && currentPayload.account_id !== undefined) {
        delete currentPayload.account_id;
        continue;
      }
      if (error.message.includes('notes') && currentPayload.notes !== undefined) {
        delete currentPayload.notes;
        continue;
      }

      const colMatch = error.message.match(/Could not find the '([^']+)' column/i) ||
                       error.message.match(/column "([^"]+)" of relation/i);
      if (colMatch && colMatch[1] && currentPayload[colMatch[1]] !== undefined) {
        delete currentPayload[colMatch[1]];
        continue;
      }

      break;
    }

    if (error) {
      console.error('❌ Error exacto de Supabase al insertar abono:', error);
      throw error;
    }

    console.log('✅ Abono de deuda registrado con éxito:', data);
    return toCamel(data && data[0] ? data[0] : payload);
  } catch (err) {
    console.error('❌ [Supabase DB Exception] addDebtPayment:', err);
    return null;
  }
};

/**
 * Deletes a debt payment record by ID from debt_payments table.
 * 
 * @param {string} paymentId - Payment record ID
 * @returns {Promise<boolean>} True if deleted successfully, false otherwise
 */
export const deleteDebtPayment = async (paymentId) => {
  if (!paymentId) return false;
  console.log('🗑️ [Supabase DB] Eliminando abono de deuda:', paymentId);

  try {
    const { error } = await supabase
      .from('debt_payments')
      .delete()
      .eq('id', paymentId);

    if (error) {
      console.error('❌ Error exacto de Supabase al eliminar abono:', error);
      return false;
    }

    console.log('✅ Abono eliminado con éxito de Supabase DB:', paymentId);
    return true;
  } catch (err) {
    console.error('❌ [Supabase DB Exception] deleteDebtPayment:', err);
    return false;
  }
};

/**
 * Records the financial transfer transaction when lending money to someone (is_direct_loan = true, type = 'receivable')
 * Money leaves source_account_id without counting as an operating expense in budgets.
 * 
 * @param {Object} params
 * @param {string} params.userId
 * @param {string} params.sourceAccountId
 * @param {number} params.amount
 * @param {string} [params.currency]
 * @param {string} [params.concept]
 * @param {string} [params.startDate]
 * @returns {Promise<Object|null>} Created transaction record
 */
export const recordDirectLoanTransaction = async ({
  userId,
  sourceAccountId,
  amount,
  currency = 'USD',
  concept = '',
  startDate = getLocalDateString(),
  debtId = null,
  type = 'receivable',
  language = 'es',
  description = null
}) => {
  if (!userId || !sourceAccountId || !amount) {
    console.error('❌ Error: userId, sourceAccountId y amount son requeridos para registrar la transacción de préstamo directo.');
    return null;
  }

  const cleanDate = startDate ? (startDate.includes('T') ? startDate.split('T')[0] : startDate) : getLocalDateString();
  const numAmount = Number(amount) || 0;
  const debtConcept = (concept || 'Sin concepto').trim();
  const currencyCode = (currency || 'USD').toUpperCase();
  const createdDebtId = isValidUuid(debtId) ? debtId : null;
  const isPayableLoan = String(type || 'receivable').toLowerCase() === 'payable';

  const isEs = String(language || 'es').toLowerCase().startsWith('es');
  const defaultPrefix = isPayableLoan
    ? (isEs ? 'Préstamo recibido de' : 'Loan received from')
    : (isEs ? 'Préstamo a' : 'Loan to');
  const effectiveDescription = description || `${defaultPrefix}: ${debtConcept}`;

  const payload = isPayableLoan
    ? {
        user_id: String(userId),
        account_id: null,
        destination_account_id: sourceAccountId,
        category_id: null,
        type: 'transfer',
        amount: numAmount,
        target_amount: numAmount,
        destination_amount: numAmount,
        currency: currencyCode,
        description: effectiveDescription,
        transaction_date: cleanDate,
        exclude_from_budget: true
      }
    : {
        user_id: String(userId),
        account_id: sourceAccountId,
        destination_account_id: null,
        category_id: null,
        type: 'transfer',
        amount: numAmount,
        currency: currencyCode,
        description: effectiveDescription,
        transaction_date: cleanDate,
        exclude_from_budget: true
      };

  if (createdDebtId) {
    payload.debt_id = createdDebtId;
  }

  console.log('🚀 [Supabase DB] Ejecutando INSERT de préstamo en transactions:', payload);

  try {
    let currentPayload = { ...payload };
    let data = null;
    let error = null;

    for (let attempt = 0; attempt < 5; attempt++) {
      const res = await supabase
        .from('transactions')
        .insert([currentPayload])
        .select()
        .single();

      data = res.data;
      error = res.error;

      if (!error && data) break;

      console.warn(`⚠️ [Supabase DB] Error guardando transacción de préstamo (intento ${attempt + 1}):`, error?.message);

      if (error?.message?.includes('debt_id') && currentPayload.debt_id !== undefined) {
        delete currentPayload.debt_id;
        continue;
      }
      if (error?.message?.includes('exclude_from_budget') && currentPayload.exclude_from_budget !== undefined) {
        delete currentPayload.exclude_from_budget;
        continue;
      }
      if (error?.message?.includes('target_amount') && currentPayload.target_amount !== undefined) {
        delete currentPayload.target_amount;
        continue;
      }
      if (error?.message?.includes('destination_amount') && currentPayload.destination_amount !== undefined) {
        delete currentPayload.destination_amount;
        continue;
      }
      if (error?.message?.includes('account_id') && currentPayload.account_id === null) {
        delete currentPayload.account_id;
        continue;
      }
      break;
    }

    if (error) {
      console.error('❌ Error exacto de Supabase al insertar transacción de préstamo:', error);
    }

    const finalData = data || currentPayload;
    const result = toCamel(finalData);
    if (!result.id) result.id = `loan_tx_${Date.now()}`;
    if (!result.date) result.date = cleanDate;
    if (!result.transactionDate) result.transactionDate = cleanDate;
    if (isPayableLoan) {
      result.accountId = null;
      result.destinationAccountId = sourceAccountId;
    } else if (!result.accountId) {
      result.accountId = sourceAccountId;
    }
    if (createdDebtId && !result.debtId) result.debtId = createdDebtId;
    result.excludeFromBudget = true;
    result.exclude_from_budget = true;

    console.log('✅ Transacción de préstamo registrada exitosamente:', result);
    return result;
  } catch (err) {
    console.error('❌ [Supabase DB Exception] recordDirectLoanTransaction:', err);
    const fallback = toCamel(payload);
    if (!fallback.id) fallback.id = `loan_tx_${Date.now()}`;
    if (!fallback.date) fallback.date = cleanDate;
    if (!fallback.transactionDate) fallback.transactionDate = cleanDate;
    if (isPayableLoan) {
      fallback.accountId = null;
      fallback.destinationAccountId = sourceAccountId;
    } else if (!fallback.accountId) {
      fallback.accountId = sourceAccountId;
    }
    fallback.excludeFromBudget = true;
    fallback.exclude_from_budget = true;
    return fallback;
  }
};

/**
 * Registers an abono in debt_payments and creates the corresponding financial transaction
 * in transactions table according to the 4-Quadrant Accounting Matrix:
 * - CASO A ('receivable' + isDirectLoan = true): Recuperación de capital prestado -> 'transfer' (account_id: null -> destination_account_id: paymentAccountId, exclude_from_budget: true)
 * - CASO B ('receivable' + isDirectLoan = false): Cobro de servicio/factura/venta pendiente -> 'income' (account_id: paymentAccountId, category_id: debt.category_id, exclude_from_budget: false)
 * - CASO C ('payable' + isDirectLoan = true): Devolución de dinero prestado recibido -> 'transfer' (account_id: paymentAccountId -> destination_account_id: null, exclude_from_budget: true)
 * - CASO D ('payable' + isDirectLoan = false): Pago de deuda/servicio/tarjeta (gasto adeudado) -> 'expense' (account_id: paymentAccountId, category_id: debt.category_id, exclude_from_budget: false)
 * 
 * @param {Object} params
 * @param {Object} params.debt - Debt object
 * @param {string} params.userId - User ID
 * @param {number} params.amount - Payment amount
 * @param {string} [params.paymentDate] - Date of payment
 * @param {string} [params.accountId] - Bank account used
 * @param {string} [params.notes] - Optional payment note
 * @returns {Promise<{payment: Object|null, transaction: Object|null, isSettled: boolean}>}
 */
export const recordDebtPaymentWithTransaction = async ({
  debt,
  userId,
  amount,
  accountDebitAmount = null,
  accountAmount = null,
  accountCurrency: customAccountCurrency = null,
  paymentDate = getLocalDateString(),
  accountId = null,
  notes = '',
  accounts = []
}) => {
  if (!debt || !userId || !amount) {
    console.error('❌ Error: debt, userId y amount son requeridos.');
    return { payment: null, transaction: null, isSettled: false };
  }

  const numAmount = parseFloat(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    console.error('❌ Error: Monto inválido para el abono.');
    return { payment: null, transaction: null, isSettled: false };
  }

  const rawType = (debt.type || '').toLowerCase();
  const isReceivable = rawType === 'receivable' || rawType === 'loan';
  const debtType = isReceivable ? 'receivable' : 'payable';
  const isDirectLoan = Boolean(debt.is_direct_loan ?? debt.isDirectLoan ?? false);
  const debtConcept = debt.concept || debt.description || 'Deuda';
  const debtCurrency = (debt.currency || 'USD').toUpperCase();
  const rawCategoryId = debt.category_id || debt.categoryId || null;
  const validCategoryId = isValidUuid(rawCategoryId) ? rawCategoryId : null;
  const validDebtId = isValidUuid(debt.id) ? debt.id : null;

  // Determine selected account & account currency
  let selectedAccount = null;
  if (Array.isArray(accounts)) {
    selectedAccount = accounts.find(a => a && a.id === accountId) || null;
  }
  const accountCurrency = (customAccountCurrency || selectedAccount?.currency || debtCurrency).toUpperCase();
  const isDifferentCurrency = Boolean(accountId && accountCurrency !== debtCurrency);

  const rawDebit = accountDebitAmount ?? accountAmount;
  const numDebitAmount = (isDifferentCurrency && rawDebit !== null && rawDebit !== undefined && !isNaN(Number(rawDebit)) && Number(rawDebit) > 0)
    ? Number(rawDebit)
    : numAmount;

  const effectiveExchangeRate = numAmount > 0 ? (numDebitAmount / numAmount) : 1;

  let createdTx = null;

  // 1. Create linked financial transaction if accountId is provided (4-Quadrant Matrix)
  const paymentAccountId = accountId;
  if (paymentAccountId && isValidUuid(paymentAccountId)) {
    try {
      let transactionPayload = {};
      const fxSuffix = isDifferentCurrency ? ` (${numAmount} ${debtCurrency})` : '';

      if (debtType === 'receivable') {
        if (isDirectLoan) {
          // CASO A: Recuperación de capital prestado
          // Es transferencia: de cuenta virtual a la cuenta real del usuario.
          transactionPayload = {
            user_id: String(userId),
            type: 'transfer',
            account_id: null, // Cuenta virtual
            destination_account_id: paymentAccountId,
            category_id: null,
            debt_id: validDebtId,
            amount: numDebitAmount,
            target_amount: numDebitAmount,
            destination_amount: numDebitAmount,
            currency: accountCurrency,
            exchange_rate_at_transaction: effectiveExchangeRate,
            exclude_from_budget: true, // No cuenta como ingreso ordinario
            description: `Abono de préstamo recuperado: ${debtConcept}${fxSuffix}`.trim(),
            transaction_date: paymentDate
          };
        } else {
          // CASO B: Cobro de servicio/factura/venta pendiente
          // SÍ ES UN INGRESO OPERATIVO REAL
          transactionPayload = {
            user_id: String(userId),
            type: 'income',
            account_id: paymentAccountId,
            destination_account_id: null,
            category_id: validCategoryId, // Hereda la categoría de ingreso
            debt_id: validDebtId,
            amount: numDebitAmount,
            currency: accountCurrency,
            exchange_rate_at_transaction: effectiveExchangeRate,
            exclude_from_budget: false, // CRÍTICO: Suma al ingreso mensual y tasa de ahorro
            description: `Cobro recibido: ${debtConcept}${fxSuffix}`.trim(),
            transaction_date: paymentDate
          };
        }
      } else if (debtType === 'payable') {
        if (isDirectLoan) {
          // CASO C: Devolución de dinero que me prestaron físicamente
          // Es transferencia de salida hacia la cuenta virtual
          transactionPayload = {
            user_id: String(userId),
            type: 'transfer',
            account_id: paymentAccountId,
            destination_account_id: null,
            category_id: null,
            debt_id: validDebtId,
            amount: numDebitAmount,
            currency: accountCurrency,
            exchange_rate_at_transaction: effectiveExchangeRate,
            exclude_from_budget: true, // No es gasto del mes, es devolución de capital
            description: `Devolución de préstamo: ${debtConcept}${fxSuffix}`.trim(),
            transaction_date: paymentDate
          };
        } else {
          // CASO D: Pago de deuda/servicio/tarjeta (gasto adeudado)
          // SÍ ES UN GASTO OPERATIVO
          transactionPayload = {
            user_id: String(userId),
            type: 'expense',
            account_id: paymentAccountId,
            destination_account_id: null,
            category_id: validCategoryId,
            debt_id: validDebtId,
            amount: numDebitAmount,
            currency: accountCurrency,
            exchange_rate_at_transaction: effectiveExchangeRate,
            exclude_from_budget: false, // Suma a gastos del mes y burn rate
            description: `Abono a deuda: ${debtConcept}${fxSuffix}`.trim(),
            transaction_date: paymentDate
          };
        }
      }

      console.log('🚀 [Supabase DB] Creando transacción vinculada al abono (Matriz 4 Cuadrantes):', transactionPayload);

      let currentTxPayload = { ...transactionPayload };
      for (let attempt = 0; attempt < 5; attempt++) {
        const txRes = await supabase.from('transactions').insert([currentTxPayload]).select();
        if (!txRes.error) {
          const rawSavedTx = txRes.data && txRes.data[0] ? txRes.data[0] : currentTxPayload;
          createdTx = toCamel({
            ...transactionPayload,
            ...rawSavedTx
          });
          break;
        }

        console.warn(`⚠️ [Supabase DB] Error guardando transacción de abono (intento ${attempt + 1}):`, txRes.error.message);
        if (txRes.error.message.includes('exchange_rate_at_transaction') && currentTxPayload.exchange_rate_at_transaction !== undefined) {
          delete currentTxPayload.exchange_rate_at_transaction;
          continue;
        }
        if (txRes.error.message.includes('target_amount') && currentTxPayload.target_amount !== undefined) {
          delete currentTxPayload.target_amount;
          continue;
        }
        if (txRes.error.message.includes('destination_amount') && currentTxPayload.destination_amount !== undefined) {
          delete currentTxPayload.destination_amount;
          continue;
        }
        if (txRes.error.message.includes('debt_id') && currentTxPayload.debt_id !== undefined) {
          delete currentTxPayload.debt_id;
          continue;
        }
        if (txRes.error.message.includes('exclude_from_budget') && currentTxPayload.exclude_from_budget !== undefined) {
          delete currentTxPayload.exclude_from_budget;
          continue;
        }
        if (txRes.error.message.includes('account_id') && currentTxPayload.account_id === null) {
          delete currentTxPayload.account_id;
          continue;
        }
        const colMatch = txRes.error.message.match(/Could not find the '([^']+)' column/i) ||
                         txRes.error.message.match(/column "([^"]+)" of relation/i);
        if (colMatch && colMatch[1] && currentTxPayload[colMatch[1]] !== undefined) {
          delete currentTxPayload[colMatch[1]];
          continue;
        }
        break;
      }
    } catch (txErr) {
      console.error('❌ Error creando transacción contable para el abono:', txErr);
    }
  }

  // 2. Insert into debt_payments with linked transaction_id
  let auditNote = '';
  if (isDifferentCurrency) {
    const formattedDebt = formatCurrency(numAmount, debtCurrency);
    const formattedBankDebit = formatCurrency(numDebitAmount, accountCurrency);
    auditNote = `Abono de ${formattedDebt} liquidado con ${formattedBankDebit}`;
  }
  const finalNotes = [notes?.trim(), auditNote].filter(Boolean).join(' • ');

  const paymentRecord = await addDebtPayment({
    debtId: debt.id,
    userId,
    amount: numAmount,
    paymentDate,
    accountId,
    transactionId: createdTx?.id || null,
    notes: finalNotes
  });

  // 3. Fetch all payments to compute new remaining balance and update debt status if settled
  let isSettled = false;
  try {
    const allPayments = await fetchDebtPayments(debt.id);
    const calculations = calculateDebtRemaining(debt, allPayments);
    isSettled = calculations.isSettled;

    if (isSettled && debt.status !== 'paid' && debt.status !== 'settled') {
      console.log('🎉 [Supabase DB] Deuda completamente saldada. Actualizando estado a paid:', debt.id);
      await supabase
        .from('pending_debts')
        .update({ status: 'paid' })
        .eq('id', debt.id);
    }
  } catch (statusErr) {
    console.warn('⚠️ No se pudo verificar/actualizar estado paid de la deuda:', statusErr);
  }

  return {
    payment: paymentRecord,
    transaction: createdTx,
    isSettled
  };
};

/**
 * Deletes a debt payment and automatically deletes the associated transaction (cascade reversion)
 * so that bank account balance immediately restores to its previous state.
 * Also reverts debt status to 'pending' if it was marked as paid.
 * 
 * @param {string} paymentId - ID of payment in debt_payments
 * @param {Object} [cachedPayment] - Optional cached payment record if available
 * @returns {Promise<{success: boolean, deletedTransactionId: string|null, revertedStatus: string|null}>}
 */
export const deleteDebtPaymentWithReversion = async (paymentId, cachedPayment = null) => {
  if (!paymentId) return { success: false, deletedTransactionId: null, revertedStatus: null };
  console.log('🗑️ [Supabase DB] Eliminando abono con reversión contable:', paymentId);

  let targetPayment = cachedPayment;

  // 1. Fetch payment details if not provided to retrieve transaction_id and debt_id
  if (!targetPayment) {
    try {
      const { data } = await supabase
        .from('debt_payments')
        .select('*')
        .eq('id', paymentId)
        .single();
      if (data) {
        targetPayment = toCamel(data);
      }
    } catch (fetchErr) {
      console.warn('⚠️ No se pudo obtener detalle previo del abono:', fetchErr);
    }
  }

  const txIdToDelete = targetPayment?.transactionId || targetPayment?.transaction_id;
  const debtId = targetPayment?.debtId || targetPayment?.debt_id;

  // 2. Cascade delete linked transaction if it exists
  let deletedTxId = null;
  if (txIdToDelete && isValidUuid(txIdToDelete)) {
    try {
      console.log('🗑️ [Supabase DB] Eliminando transacción contable asociada:', txIdToDelete);
      const { error: txDelErr } = await supabase
        .from('transactions')
        .delete()
        .eq('id', txIdToDelete);
      if (!txDelErr) {
        deletedTxId = txIdToDelete;
      }
    } catch (txDelEx) {
      console.error('❌ Error eliminando transacción asociada:', txDelEx);
    }
  }

  // 3. Delete debt payment record
  const paymentDeleted = await deleteDebtPayment(paymentId);

  // 4. Check if debt should revert from 'paid' to 'pending'
  let revertedStatus = null;
  if (debtId) {
    try {
      const { data: debtData } = await supabase
        .from('pending_debts')
        .select('*')
        .eq('id', debtId)
        .single();

      if (debtData) {
        const remainingPayments = await fetchDebtPayments(debtId);
        const { isSettled } = calculateDebtRemaining(debtData, remainingPayments);

        if (!isSettled && (debtData.status === 'paid' || debtData.status === 'settled')) {
          console.log('🔄 [Supabase DB] Revirtiendo estado de deuda a pending:', debtId);
          await supabase
            .from('pending_debts')
            .update({ status: 'pending' })
            .eq('id', debtId);
          revertedStatus = 'pending';
        }
      }
    } catch (revertErr) {
      console.warn('⚠️ No se pudo evaluar reversión de estado en deuda:', revertErr);
    }
  }

  return {
    success: paymentDeleted,
    deletedTransactionId: deletedTxId,
    revertedStatus
  };
};

/**
 * Handles referential cleanup when a transaction is deleted:
 * - Checks if the transaction is linked to any debt_payments record (via transaction_id = txId or debt_id)
 * - Deletes the corresponding debt_payments record in Supabase
 * - Recalculates remaining balance for the affected debt and reverts status to 'pending' if it was marked 'paid'
 * 
 * @param {Object} params
 * @param {string} params.txId - ID of deleted transaction
 * @param {Array} [params.cachedPayments] - In-memory debt payments
 * @param {Array} [params.cachedLoans] - In-memory loans
 * @param {Array} [params.cachedTransactions] - In-memory transactions
 * @returns {Promise<{deletedPaymentId: string|null, debtId: string|null, revertedStatus: string|null}>}
 */
export const handleTransactionDeletedForDebts = async ({
  txId,
  cachedPayments = [],
  cachedLoans = [],
  cachedTransactions = []
}) => {
  if (!txId) return { deletedPaymentId: null, debtId: null, revertedStatus: null };

  console.log('🔍 [debtsService] Verificando vínculo de transacción eliminada con abonos de deuda:', txId);

  // 1. Find matching payment in cachedPayments or query Supabase
  let matchedPayment = (cachedPayments || []).find(p => {
    const pTxId = p.transactionId || p.transaction_id;
    return String(pTxId) === String(txId);
  });

  if (!matchedPayment) {
    try {
      const { data } = await supabase
        .from('debt_payments')
        .select('*')
        .eq('transaction_id', txId);
      if (data && data.length > 0) {
        matchedPayment = toCamel(data[0]);
      }
    } catch (err) {
      console.warn('⚠️ Error buscando abono por transaction_id:', err);
    }
  }

  // 2. Also check if transaction had a direct debt_id property
  const targetTx = (cachedTransactions || []).find(t => String(t.id) === String(txId));
  const directDebtId = targetTx?.debtId || targetTx?.debt_id;

  if (!matchedPayment && !directDebtId) {
    return { deletedPaymentId: null, debtId: null, revertedStatus: null };
  }

  let deletedPaymentId = null;
  const targetDebtId = matchedPayment?.debtId || matchedPayment?.debt_id || directDebtId;

  // 3. Delete matching payment record from debt_payments
  if (matchedPayment?.id) {
    try {
      console.log('🗑️ [debtsService] Eliminando abono huérfano vinculado a transacción:', matchedPayment.id);
      const { error } = await supabase
        .from('debt_payments')
        .delete()
        .eq('id', matchedPayment.id);
      if (!error) {
        deletedPaymentId = matchedPayment.id;
      }
    } catch (delErr) {
      console.error('❌ Error eliminando abono vinculado:', delErr);
    }
  }

  // 4. Recalculate debt status and revert to 'pending' if it was 'paid'
  let revertedStatus = null;
  if (targetDebtId) {
    try {
      let targetDebt = (cachedLoans || []).find(l => String(l.id) === String(targetDebtId));
      if (!targetDebt) {
        const { data: dbDebt } = await supabase
          .from('pending_debts')
          .select('*')
          .eq('id', targetDebtId)
          .single();
        if (dbDebt) targetDebt = toCamel(dbDebt);
      }

      if (targetDebt) {
        // Fetch all remaining payments for this debt
        const remainingPayments = (await fetchDebtPayments(targetDebtId)) || [];
        const { isSettled } = calculateDebtRemaining(targetDebt, remainingPayments);

        if (!isSettled && (targetDebt.status === 'paid' || targetDebt.status === 'settled')) {
          console.log('🔄 [debtsService] Deuda recupera saldo pendiente. Revirtiendo estado a pending:', targetDebtId);
          await supabase
            .from('pending_debts')
            .update({ status: 'pending' })
            .eq('id', targetDebtId);
          revertedStatus = 'pending';
        }
      }
    } catch (revertErr) {
      console.warn('⚠️ Error evaluando reversión de estado en deuda:', revertErr);
    }
  }

  return {
    deletedPaymentId,
    debtId: targetDebtId,
    revertedStatus
  };
};

