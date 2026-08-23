import { supabase } from '../lib/supabaseClient';
import { SEED_CATEGORIES, detectUserLanguage } from '../utils/defaultCategories';

/**
 * Validates whether a string is a standard PostgreSQL UUID (v4)
 */
export const isValidUuid = (id) => {
  return typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id.trim());
};

/**
 * Utility functions for key mapping between JS camelCase and DB snake_case with Schema Aliases
 */
export const toCamel = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(toCamel);
  const n = {};
  Object.keys(obj).forEach(k => {
    const camelKey = k.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    n[camelKey] = toCamel(obj[k]);
  });

  // Schema Field Aliases for Frontend UI Compatibility
  if (n.transactionDate && !n.date) {
    n.date = n.transactionDate;
  }
  if (n.concept && !n.description) {
    n.description = n.concept;
  }
  if (n.themeColor && !n.theme) {
    n.theme = n.themeColor;
  }
  if (n.status === 'settled') {
    n.status = 'paid';
  }
  if (n.exchangeRateToUsd !== undefined && n.exchangeRateAtTransaction === undefined) {
    n.exchangeRateAtTransaction = n.exchangeRateToUsd;
  }
  if (n.exchangeRateAtTransaction !== undefined && n.exchangeRateToUsd === undefined) {
    n.exchangeRateToUsd = n.exchangeRateAtTransaction;
  }
  if (n.destinationAccountId && !n.targetAccountId) {
    n.targetAccountId = n.destinationAccountId;
  }
  if (n.targetAccountId && !n.destinationAccountId) {
    n.destinationAccountId = n.targetAccountId;
  }
  if (n.initialBalance !== undefined && n.initial_balance === undefined) {
    n.initial_balance = n.initialBalance;
  }
  if (n.initial_balance !== undefined && n.initialBalance === undefined) {
    n.initialBalance = n.initial_balance;
  }
  if (n.targetAmount !== undefined && n.target_amount === undefined) {
    n.target_amount = n.targetAmount;
  }
  if (n.target_amount !== undefined && n.targetAmount === undefined) {
    n.targetAmount = n.target_amount;
  }
  return n;
};

export const toSnake = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(toSnake);
  const n = {};
  Object.keys(obj).forEach(k => {
    const snakeKey = k.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    n[snakeKey] = toSnake(obj[k]);
  });
  return n;
};

// --- DEFAULT CATEGORIES SEEDING BY LANGUAGE ---

export const seedUserCategories = async (userId, lang) => {
  const userLang = lang ? (lang.startsWith('es') ? 'es' : 'en') : detectUserLanguage();
  const defaults = SEED_CATEGORIES[userLang] || SEED_CATEGORIES.en;

  const payload = defaults.map((cat) => ({
    user_id: userId,
    type: cat.type,
    name: cat.name,
    emoji: cat.emoji || '📁',
    color: cat.color || '#AEEDD0',
    target_amount: Number(cat.targetAmount || cat.monthly_budget || 0)
  }));

  console.log(`📡 [Supabase DB] Sembrando categorías por defecto en idioma (${userLang}):`, payload);
  try {
    const { data, error } = await supabase
      .from('categories')
      .insert(payload)
      .select();

    if (error) {
      console.error('❌ [Supabase DB Error] Sembrado de categorías:', error);
      throw error;
    }
    console.log('✅ [Supabase DB] Categorías sembradas con éxito:', data);
    return toCamel(data);
  } catch (err) {
    console.error('⚠️ Exception en seedUserCategories:', err);
    return defaults.map((cat, idx) => ({ ...cat, id: `seed_${idx + 1}` }));
  }
};

// --- AUTH & USER SERVICES ---

export const checkUsernameAvailability = async (username) => {
  const cleanUsername = String(username || '').trim().toLowerCase();
  if (!cleanUsername) return false;

  console.log('🔍 [Supabase DB] Verificando disponibilidad de username:', cleanUsername);
  
  const { data, error } = await supabase
    .from('users')
    .select('id')
    .eq('username', cleanUsername);

  if (error) {
    console.error('❌ Error al verificar username en Supabase:', error);
    throw new Error('DATABASE_ERROR');
  }

  return (!data || data.length === 0);
};

export const checkEmailAvailability = async (email) => {
  const cleanEmail = String(email || '').trim().toLowerCase();
  if (!cleanEmail) return true;

  console.log('🔍 [Supabase DB] Verificando disponibilidad de email:', cleanEmail);
  
  const { data, error } = await supabase
    .from('users')
    .select('id')
    .eq('email', cleanEmail);

  if (error) {
    console.error('❌ Error al verificar email en Supabase:', error);
    throw new Error('DATABASE_ERROR');
  }

  return (!data || data.length === 0);
};

export const dbRegisterUser = async ({ username, fullName, email, password, language = 'es', baseCurrency = 'USD' }) => {
  const userId = 'usr_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
  const cleanUsername = username.trim().toLowerCase();

  console.log('📡 [Supabase DB] Intentando registrar usuario en Supabase:', { id: userId, username: cleanUsername, fullName, email });

  // 1. Insert into users table directly
  const { data: userData, error: userError } = await supabase
    .from('users')
    .insert([{
      id: userId,
      username: cleanUsername,
      full_name: fullName ? fullName.trim() : cleanUsername,
      email: email ? email.trim() : null,
      password: password ? password.trim() : null,
      has_completed_walkthrough: false
    }])
    .select();

  if (userError) {
    console.error('❌ [Supabase DB Error] Error al insertar usuario en tabla users:', userError);
    throw userError;
  }

  console.log('✅ [Supabase DB] Usuario creado con éxito en tabla users:', userData);

  // 2. Insert default user settings aligning to user_settings schema
  const { error: settingsError } = await supabase
    .from('user_settings')
    .insert([{
      user_id: userId,
      base_currency: baseCurrency,
      theme_color: 'MINT',
      language: language,
      sidebar_collapsed: false
    }]);

  if (settingsError) {
    console.error('⚠️ [Supabase DB Warning] Error al crear user_settings:', settingsError);
  } else {
    console.log('✅ [Supabase DB] Configuración inicial creada para usuario:', userId);
  }

  // 3. Seed default categories in Supabase (without manual IDs)
  await seedUserCategories(userId, language);

  return { success: true, user: toCamel(userData[0]) };
};

// --- USER SETTINGS SERVICES ---

export const dbFetchUserSettings = async (userId) => {
  if (!userId) return null;
  console.log('📡 [Supabase DB] Obteniendo user_settings para usuario:', userId);
  try {
    const { data, error } = await supabase
      .from('user_settings')
      .select('language, base_currency, theme_color, sidebar_collapsed')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.warn('⚠️ [Supabase DB] Error obteniendo user_settings:', error.message);
      return null;
    }
    return toCamel(data);
  } catch (err) {
    console.error('❌ [Supabase DB Exception] dbFetchUserSettings:', err);
    return null;
  }
};

export const dbUpsertUserSettings = async (userId, settings) => {
  if (!userId) return null;
  console.log('📡 [Supabase DB] Guardando user_settings para usuario:', userId, settings);
  try {
    const payload = {
      user_id: userId,
      ...toSnake(settings),
      updated_at: new Date().toISOString()
    };
    const { data, error } = await supabase
      .from('user_settings')
      .upsert([payload], { onConflict: 'user_id' })
      .select();

    if (error) {
      console.error('❌ [Supabase DB Error] dbUpsertUserSettings:', error);
      throw error;
    }
    return toCamel(data && data[0] ? data[0] : payload);
  } catch (err) {
    console.error('❌ [Supabase DB Exception] dbUpsertUserSettings:', err);
    return null;
  }
};

export const dbValidateUserLogin = async (identifier, password) => {
  if (!identifier) return null;
  const cleanId = String(identifier || '').trim().toLowerCase();
  const cleanPass = String(password || '').trim();

  console.log('🔍 Buscando usuario en Supabase:', cleanId);

  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .or(`username.eq.${cleanId},email.eq.${cleanId}`);

    if (error) {
      console.error('❌ Error de consulta en Supabase:', error);
      return null;
    }

    if (!users || users.length === 0) {
      console.warn('⚠️ Usuario no encontrado en Supabase DB:', cleanId);
      return null;
    }

    const user = users[0];

    // Direct password comparison with stored hash/text password
    if (user.password && user.password !== cleanPass) {
      console.warn('❌ Contraseña incorrecta para el usuario:', user.username);
      return null;
    }

    console.log('✅ Sesión iniciada con éxito para usuario en DB:', user.username);
    return toCamel(user);
  } catch (err) {
    console.error('❌ Error en dbValidateUserLogin:', err);
    return null;
  }
};

export const dbDeleteUser = async (userId) => {
  if (!userId) return { success: false, error: 'No user ID provided' };
  console.log('📡 [Supabase DB] Eliminando usuario de Supabase:', userId);

  try {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);

    if (error) {
      console.error('❌ [Supabase DB Error] dbDeleteUser:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ [Supabase DB] Usuario eliminado con éxito:', userId);
    return { success: true };
  } catch (err) {
    console.error('❌ [Supabase DB Exception] dbDeleteUser:', err);
    return { success: false, error: err.message };
  }
};

export const dbFetchUserById = async (userId) => {
  if (!userId) return null;
  console.log('📡 Buscando usuario en Supabase DB por id:', userId);

  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !data) {
      console.warn('⚠️ Usuario no encontrado en Supabase DB:', userId);
      return null;
    }
    return toCamel(data);
  } catch (err) {
    console.error('❌ Excepción al buscar usuario por ID:', err);
    return null;
  }
};

export const dbFetchUserByUsername = async (username) => {
  if (!username) return null;
  const clean = username.trim().toLowerCase();
  console.log('📡 [Supabase DB] Buscando usuario en Supabase por username:', clean);

  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', clean)
      .single();

    if (error || !data) {
      console.warn('⚠️ [Supabase DB] Usuario no encontrado o error:', error ? error.message : 'no data');
      return null;
    }

    console.log('✅ [Supabase DB] Usuario encontrado:', data);
    return toCamel(data);
  } catch (err) {
    console.error('❌ [Supabase DB Exception] dbFetchUserByUsername:', err.message);
    return null;
  }
};

export const dbUpdateWalkthrough = async (userId) => {
  console.log('📡 [Supabase DB] Actualizando walkthrough para usuario:', userId);
  try {
    const { error } = await supabase
      .from('users')
      .update({ has_completed_walkthrough: true })
      .eq('id', userId);

    if (error) console.error('❌ [Supabase DB Error] dbUpdateWalkthrough:', error.message);
    else console.log('✅ [Supabase DB] Walkthrough completado para usuario:', userId);
  } catch (err) {
    console.error('❌ [Supabase DB Exception] dbUpdateWalkthrough:', err.message);
  }
};

// --- ACCOUNTS SERVICES ---

export const dbFetchAccounts = async (userId) => {
  console.log('📡 [Supabase DB] Obteniendo cuentas para usuario:', userId);
  try {
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('user_id', userId);

    if (error || !data) {
      console.warn('⚠️ [Supabase DB] Error obteniendo cuentas:', error ? error.message : 'sin datos');
      return null;
    }
    console.log(`✅ [Supabase DB] Obtenidas ${data.length} cuentas para usuario:`, userId);
    return toCamel(data);
  } catch (err) {
    console.error('❌ [Supabase DB Exception] dbFetchAccounts:', err.message);
    return null;
  }
};

export const dbSaveAccount = async (userId, accountData) => {
  if (!userId) {
    console.error('❌ Error: No hay sesión de usuario activa para guardar la cuenta.');
    return null;
  }

  const rawValue = accountData.initialBalance ?? accountData.initial_balance ?? accountData.balance ?? 0;
  const numInitial = parseFloat(rawValue);
  const cleanBalance = isNaN(numInitial) ? 0 : numInitial;

  const isExisting = Boolean(accountData.id);
  const isUuid = isValidUuid(accountData.id);

  const baseData = {
    name: accountData.name ? accountData.name.trim() : 'Cuenta',
    currency: accountData.currency || 'USD',
    balance: cleanBalance,
    initial_balance: cleanBalance,
    emoji: accountData.emoji || '💳',
    color: accountData.color || '#AEEDD0',
    updated_at: new Date().toISOString()
  };

  console.log('📤 Enviando guardado de cuenta a Supabase DB:', { userId, isExisting, isUuid, id: accountData.id, baseData });

  try {
    let data, error;

    if (isExisting && isUuid) {
      const res = await supabase
        .from('accounts')
        .update(baseData)
        .eq('id', accountData.id)
        .eq('user_id', userId)
        .select();
      data = res.data;
      error = res.error;

      // Fallback if initial_balance column does not exist
      if (error && error.message && error.message.includes('initial_balance')) {
        console.warn('⚠️ Columna initial_balance no existe en accounts, reintentando update sin initial_balance...');
        const updateNoInit = { ...baseData };
        delete updateNoInit.initial_balance;
        const retryRes = await supabase
          .from('accounts')
          .update(updateNoInit)
          .eq('id', accountData.id)
          .eq('user_id', userId)
          .select();
        data = retryRes.data;
        error = retryRes.error;
      }
    } else {
      const insertPayload = {
        user_id: userId,
        ...baseData
      };
      if (accountData.id && isUuid) {
        insertPayload.id = accountData.id;
      }
      const res = await supabase
        .from('accounts')
        .insert([insertPayload])
        .select();
      data = res.data;
      error = res.error;

      // Fallback if initial_balance column does not exist
      if (error && error.message && error.message.includes('initial_balance')) {
        console.warn('⚠️ Columna initial_balance no existe en accounts, reintentando insert sin initial_balance...');
        const insertNoInit = { ...insertPayload };
        delete insertNoInit.initial_balance;
        const retryRes = await supabase
          .from('accounts')
          .insert([insertNoInit])
          .select();
        data = retryRes.data;
        error = retryRes.error;
      }
    }

    if (error) {
      console.error('❌ Error exacto de Supabase al guardar cuenta:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      throw error;
    }

    const savedRow = data && data[0] ? data[0] : { id: accountData.id, user_id: userId, ...baseData };
    console.log('✅ Account saved in DB:', savedRow);
    const camelSaved = toCamel(savedRow);
    camelSaved.balance = cleanBalance;
    camelSaved.initialBalance = cleanBalance;
    camelSaved.initial_balance = cleanBalance;
    return camelSaved;
  } catch (err) {
    console.error('❌ [Supabase DB Exception] dbSaveAccount:', err);
    return {
      id: accountData.id || `acc_${Date.now()}`,
      userId,
      name: baseData.name,
      currency: baseData.currency,
      balance: cleanBalance,
      initialBalance: cleanBalance,
      initial_balance: cleanBalance,
      emoji: baseData.emoji,
      color: baseData.color,
      updatedAt: baseData.updated_at
    };
  }
};

export const dbUpdateAccountBalance = async (accountId, newBalance) => {
  if (!accountId) return null;
  const numBalance = Number(newBalance || 0);
  try {
    const { data, error } = await supabase
      .from('accounts')
      .update({ balance: isNaN(numBalance) ? 0 : numBalance })
      .eq('id', accountId)
      .select();

    if (error) {
      console.error('❌ Error exacto de Supabase al actualizar balance de cuenta:', error);
      throw error;
    }
    return toCamel(data && data[0] ? data[0] : { id: accountId, balance: numBalance });
  } catch (err) {
    console.error('❌ [Supabase DB Exception] dbUpdateAccountBalance:', err);
    throw err;
  }
};

export const dbDeleteAccount = async (accountId) => {
  if (!accountId) return false;
  console.log('🗑️ Eliminando cuenta de Supabase DB:', accountId);
  try {
    const { error } = await supabase
      .from('accounts')
      .delete()
      .eq('id', accountId);

    if (error) {
      console.error('❌ Error exacto de Supabase al eliminar cuenta:', error);
      return false;
    }
    console.log('✅ Cuenta eliminada con éxito de Supabase DB:', accountId);
    return true;
  } catch (err) {
    console.error('❌ [Supabase DB Exception] dbDeleteAccount:', err);
    return false;
  }
};

// --- CATEGORIES SERVICES ---

export const dbFetchCategories = async (userId) => {
  console.log('📡 [Supabase DB] Obteniendo categorías para usuario:', userId);
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', userId);

    if (error || !data) return null;
    console.log(`✅ [Supabase DB] Obtenidas ${data.length} categorías para usuario:`, userId);
    return toCamel(data);
  } catch (err) {
    console.error('❌ [Supabase DB Exception] dbFetchCategories:', err.message);
    return null;
  }
};

export const dbSaveCategory = async (userId, categoryData) => {
  if (!userId) {
    console.error('❌ Error: No hay sesión de usuario activa para guardar la categoría.');
    return null;
  }

  const numTarget = parseFloat(categoryData.targetAmount || categoryData.monthlyBudget || 0);

  const payload = {
    user_id: userId,
    type: categoryData.type || 'expense',
    name: categoryData.name ? categoryData.name.trim() : 'Categoría',
    emoji: categoryData.emoji || '📁',
    color: categoryData.color || '#AEEDD0',
    currency: categoryData.currency || 'USD',
    target_amount: isNaN(numTarget) ? 0 : numTarget
  };

  // Only pass id when updating an existing UUID record from PostgreSQL
  if (categoryData.id && typeof categoryData.id === 'string' && !categoryData.id.startsWith('cat_') && !categoryData.id.startsWith('seed_')) {
    payload.id = categoryData.id;
  }

  console.log('🚀 [Supabase DB] Guardando categoría en Supabase DB:', payload);

  try {
    let query = payload.id 
      ? supabase.from('categories').upsert([payload]).select()
      : supabase.from('categories').insert([payload]).select();

    let { data, error } = await query;

    // Fallback if currency column does not exist in Postgres categories schema
    if (error && error.message && error.message.includes('currency')) {
      console.warn('⚠️ Columna currency no existe en categories, reintentando sin currency...');
      const fallbackPayload = { ...payload };
      delete fallbackPayload.currency;
      const fallbackQuery = fallbackPayload.id 
        ? supabase.from('categories').upsert([fallbackPayload]).select()
        : supabase.from('categories').insert([fallbackPayload]).select();
      const res = await fallbackQuery;
      data = res.data;
      error = res.error;
    }

    if (error) {
      console.error('❌ Error exacto de Supabase al guardar categoría:', error);
      throw error;
    }

    console.log('✅ Categoría guardada en DB:', data);
    return toCamel(data && data[0] ? data[0] : payload);
  } catch (err) {
    console.error('❌ [Supabase DB Exception] dbSaveCategory:', err);
    return null;
  }
};

export const dbDeleteCategory = async (categoryId) => {
  if (!categoryId) return false;
  console.log('🗑️ Eliminando categoría de Supabase DB:', categoryId);
  try {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', categoryId);

    if (error) {
      console.error('❌ Error exacto de Supabase al eliminar categoría:', error);
      return false;
    }
    console.log('✅ Categoría eliminada con éxito de Supabase DB:', categoryId);
    return true;
  } catch (err) {
    console.error('❌ [Supabase DB Exception] dbDeleteCategory:', err);
    return false;
  }
};

// --- TRANSACTIONS SERVICES ---

export const dbFetchTransactions = async (userId) => {
  console.log('📡 [Supabase DB] Obteniendo transacciones para usuario:', userId);
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('transaction_date', { ascending: false });

    if (error || !data) return null;
    console.log(`✅ [Supabase DB] Obtenidas ${data.length} transacciones para usuario:`, userId);
    return toCamel(data);
  } catch (err) {
    console.error('❌ [Supabase DB Exception] dbFetchTransactions:', err.message);
    return null;
  }
};

export const dbSaveTransaction = async (userId, txData) => {
  if (!userId) {
    console.error('❌ Error: No hay sesión de usuario activa para guardar la transacción.');
    throw new Error('No active user session');
  }

  const numAmount = parseFloat(txData.amount || 0);
  const cleanCurrency = (txData.currency || 'USD').toUpperCase();
  const cleanDate = txData.transactionDate || txData.date || new Date().toISOString().split('T')[0];
  const txType = txData.type || 'expense';

  const rawAccountId = txData.accountId || txData.account_id;
  const validAccountId = isValidUuid(rawAccountId) ? rawAccountId : null;

  const rawCategoryId = txData.categoryId || txData.category_id;
  const validCategoryId = isValidUuid(rawCategoryId) ? rawCategoryId : null;

  // Base payload with standard columns strictly existing in Supabase transactions table
  const payload = {
    user_id: userId,
    account_id: validAccountId,
    category_id: validCategoryId,
    type: txType,
    amount: isNaN(numAmount) ? 0 : numAmount,
    currency: cleanCurrency,
    description: txData.description ? txData.description.trim() : null,
    transaction_date: cleanDate
  };

  // Only include transfer-specific columns when transaction is actually a transfer
  if (txType === 'transfer') {
    const rawDestId = txData.destinationAccountId || txData.destination_account_id || txData.targetAccountId || txData.target_account_id;
    if (isValidUuid(rawDestId)) {
      payload.destination_account_id = rawDestId;
    }
    const numTargetAmount = parseFloat(txData.targetAmount || txData.target_amount || txData.amount || 0);
    if (!isNaN(numTargetAmount) && numTargetAmount > 0) {
      payload.target_amount = numTargetAmount;
    }
  }

  if (txData.exchangeRateToUsd || txData.exchangeRateAtTransaction) {
    payload.exchange_rate_to_usd = txData.exchangeRateToUsd || txData.exchangeRateAtTransaction;
  }

  // Only pass id when updating an existing UUID record from PostgreSQL
  if (txData.id && isValidUuid(txData.id)) {
    payload.id = txData.id;
  }

  console.log('🚀 [Supabase DB] Guardando transacción en Supabase DB:', payload);

  try {
    let currentPayload = { ...payload };
    let data = null;
    let error = null;

    // Retry loop that dynamically handles schema mismatch / missing optional columns
    for (let attempt = 0; attempt < 5; attempt++) {
      const query = currentPayload.id 
        ? supabase.from('transactions').upsert([currentPayload]).select()
        : supabase.from('transactions').insert([currentPayload]).select();

      const res = await query;
      data = res.data;
      error = res.error;

      if (!error) break;

      console.warn(`⚠️ [Supabase DB] Error guardando transacción (intento ${attempt + 1}):`, error.message);

      // Extract missing column name if schema cache error
      const colMatch = error.message.match(/Could not find the '([^']+)' column/i) ||
                       error.message.match(/column "([^"]+)" of relation/i) ||
                       error.message.match(/column ([a-zA-Z0-9_]+) does not exist/i);

      if (colMatch && colMatch[1] && currentPayload[colMatch[1]] !== undefined) {
        delete currentPayload[colMatch[1]];
        continue;
      }

      // Foreign key fallback on category_id
      if (error.message.includes('category_id') && currentPayload.category_id) {
        delete currentPayload.category_id;
        continue;
      }

      // Optional transfer columns fallback
      if (currentPayload.destination_account_id) {
        delete currentPayload.destination_account_id;
        continue;
      }
      if (currentPayload.target_amount) {
        delete currentPayload.target_amount;
        continue;
      }
      if (currentPayload.exchange_rate_to_usd) {
        delete currentPayload.exchange_rate_to_usd;
        continue;
      }

      break;
    }

    if (error) {
      console.error("SUPABASE ERROR:", error);
      throw error;
    }

    console.log('✅ Transacción guardada en DB:', data);
    return toCamel(data && data[0] ? data[0] : payload);
  } catch (err) {
    console.error("SUPABASE ERROR:", err);
    throw err;
  }
};

export const dbDeleteTransaction = async (txId) => {
  if (!txId) return false;
  console.log('🗑️ Eliminando transacción de Supabase DB:', txId);
  try {
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', txId);

    if (error) {
      console.error('❌ Error exacto de Supabase al eliminar transacción:', error);
      return false;
    }
    console.log('✅ Transacción eliminada con éxito de Supabase DB:', txId);
    return true;
  } catch (err) {
    console.error('❌ [Supabase DB Exception] dbDeleteTransaction:', err);
    return false;
  }
};

// --- PENDING DEBTS / LOANS SERVICES ---

export const dbFetchLoans = async (userId) => {
  console.log('📡 [Supabase DB] Obteniendo deudas/préstamos para usuario:', userId);
  try {
    const { data, error } = await supabase
      .from('pending_debts')
      .select('*')
      .eq('user_id', userId);

    if (error || !data) return null;
    console.log(`✅ [Supabase DB] Obtenidas ${data.length} deudas para usuario:`, userId);
    return toCamel(data);
  } catch (err) {
    console.error('❌ [Supabase DB Exception] dbFetchLoans:', err.message);
    return null;
  }
};

export const dbSaveLoan = async (userId, loanData) => {
  if (!userId) {
    console.error('❌ Error: No hay sesión de usuario activa para guardar la deuda.');
    return null;
  }

  const numAmount = parseFloat(loanData.amount || 0);
  const conceptText = (loanData.concept || loanData.description || 'Deuda/Préstamo').trim();
  const rawCategoryId = loanData.categoryId || loanData.category_id;
  const validCategoryId = isValidUuid(rawCategoryId) ? rawCategoryId : null;
  const statusVal = (loanData.status === 'paid' || loanData.status === 'settled') ? 'paid' : 'pending';

  const payload = {
    user_id: userId,
    category_id: validCategoryId,
    concept: conceptText,
    amount: isNaN(numAmount) ? 0 : numAmount,
    currency: loanData.currency || 'USD',
    start_date: loanData.startDate || loanData.start_date || new Date().toISOString().split('T')[0],
    due_date: loanData.dueDate || loanData.due_date || null,
    status: statusVal
  };

  // Only pass id when updating an existing UUID record from PostgreSQL
  if (loanData.id && isValidUuid(loanData.id)) {
    payload.id = loanData.id;
  }

  console.log('🚀 [Supabase DB] Guardando deuda/préstamo en Supabase DB:', payload);

  try {
    let currentPayload = { ...payload };
    let data = null;
    let error = null;

    for (let attempt = 0; attempt < 4; attempt++) {
      const query = currentPayload.id 
        ? supabase.from('pending_debts').upsert([currentPayload]).select()
        : supabase.from('pending_debts').insert([currentPayload]).select();

      const res = await query;
      data = res.data;
      error = res.error;

      if (!error) break;

      console.warn(`⚠️ [Supabase DB] Error guardando deuda (intento ${attempt + 1}):`, error.message);

      // If status check constraint failed on 'paid', try 'settled'
      if (error.message.includes('status') && currentPayload.status === 'paid') {
        currentPayload.status = 'settled';
        continue;
      }
      if (error.message.includes('category_id') && currentPayload.category_id) {
        delete currentPayload.category_id;
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
      console.error('❌ Error exacto de Supabase al guardar deuda/préstamo:', error);
      throw error;
    }

    console.log('✅ Deuda/Préstamo guardado en DB:', data);
    return toCamel(data && data[0] ? data[0] : payload);
  } catch (err) {
    console.error('❌ [Supabase DB Exception] dbSaveLoan:', err);
    return null;
  }
};

export const dbDeleteLoan = async (loanId) => {
  if (!loanId) return false;
  console.log('🗑️ Eliminando préstamo de Supabase DB:', loanId);
  try {
    const { error } = await supabase
      .from('pending_debts')
      .delete()
      .eq('id', loanId);

    if (error) {
      console.error('❌ Error exacto de Supabase al eliminar préstamo:', error);
      return false;
    }
    console.log('✅ Préstamo eliminado con éxito de Supabase DB:', loanId);
    return true;
  } catch (err) {
    console.error('❌ [Supabase DB Exception] dbDeleteLoan:', err);
    return false;
  }
};

// --- SUBSCRIPTIONS SERVICES & AUTO-DEBIT ENGINE ---

export const dbFetchSubscriptions = async (userId) => {
  console.log('📡 [Supabase DB] Obteniendo suscripciones para usuario:', userId);
  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId);

    if (error || !data) return null;
    console.log(`✅ [Supabase DB] Obtenidas ${data.length} suscripciones para usuario:`, userId);
    return toCamel(data);
  } catch (err) {
    console.error('❌ [Supabase DB Exception] dbFetchSubscriptions:', err.message);
    return null;
  }
};

export const dbSaveSubscription = async (userId, subData) => {
  if (!userId) {
    console.error('❌ Error: No hay sesión de usuario activa para guardar la suscripción.');
    return null;
  }

  const numAmount = parseFloat(subData.amount || 0);
  const numBillingDay = parseInt(subData.billingDay || 1, 10);

  const payload = {
    user_id: userId,
    account_id: subData.accountId || null,
    category_id: subData.categoryId || null,
    name: subData.name ? subData.name.trim() : 'Suscripción',
    emoji: subData.emoji || '🔁',
    amount: isNaN(numAmount) ? 0 : numAmount,
    billing_day: isNaN(numBillingDay) ? 1 : numBillingDay,
    frequency: subData.frequency || 'monthly',
    is_active: subData.isActive !== false
  };

  // Only pass id when updating an existing UUID record from PostgreSQL
  if (subData.id && typeof subData.id === 'string' && !subData.id.startsWith('sub_')) {
    payload.id = subData.id;
  }

  console.log('🚀 [Supabase DB] Guardando suscripción en Supabase DB:', payload);

  try {
    const query = payload.id 
      ? supabase.from('subscriptions').upsert([payload]).select()
      : supabase.from('subscriptions').insert([payload]).select();

    const { data, error } = await query;

    if (error) {
      console.error('❌ Error exacto de Supabase al guardar suscripción:', error);
      throw error;
    }

    console.log('✅ Suscripción guardada en DB:', data);
    return toCamel(data && data[0] ? data[0] : payload);
  } catch (err) {
    console.error('❌ [Supabase DB Exception] dbSaveSubscription:', err);
    return null;
  }
};

export const dbDeleteSubscription = async (subId) => {
  console.log('📡 [Supabase DB] Eliminando suscripción de Supabase:', subId);
  try {
    const { error } = await supabase
      .from('subscriptions')
      .delete()
      .eq('id', subId);

    if (error) console.error('❌ [Supabase DB Error] Al eliminar suscripción:', error.message);
    else console.log('✅ [Supabase DB] Suscripción eliminada con éxito:', subId);
  } catch (err) {
    console.error('❌ [Supabase DB Exception] dbDeleteSubscription:', err.message);
  }
};

/**
 * Auto-Debit Subscription Engine with Deduplication check against official schema
 */
export const processSubscriptionsCron = async (userId, currentAccounts = [], currentTx = []) => {
  try {
    const { data: subsData, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (error || !Array.isArray(subsData) || subsData.length === 0) {
      return { processed: [], newTx: [], updatedAccountsMap: {} };
    }

    const subs = toCamel(subsData);
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonthNum = String(today.getMonth() + 1).padStart(2, '0');
    const currentMonthStr = `${currentYear}-${currentMonthNum}`;
    const currentDay = today.getDate();

    let processedList = [];
    let generatedTx = [];
    let updatedAccountsMap = {};

    for (const sub of subs) {
      if (!sub || !sub.accountId || !sub.isActive) continue;

      const billingDay = Number(sub.billingDay) || 1;

      // Condition: current day >= billing day
      if (currentDay >= billingDay) {
        // Deduplication check in DB transactions table
        const { data: existingTx } = await supabase
          .from('transactions')
          .select('id')
          .eq('user_id', userId)
          .eq('account_id', sub.accountId)
          .ilike('description', `%[Auto-Debit] ${sub.name}%`)
          .gte('transaction_date', `${currentMonthStr}-01`);

        if (existingTx && existingTx.length > 0) {
          continue;
        }

        const billingDateStr = `${currentMonthStr}-${String(billingDay).padStart(2, '0')}`;
        const autoTxPayload = {
          user_id: userId,
          type: 'expense',
          transaction_date: billingDateStr,
          account_id: sub.accountId,
          category_id: sub.categoryId || null,
          amount: Math.abs(Number(sub.amount) || 0),
          description: `[Auto-Debit] ${sub.name}`
        };

        // Insert auto-debit transaction to DB (letting PostgreSQL generate UUID)
        const { data: insertedTx } = await supabase
          .from('transactions')
          .insert([autoTxPayload])
          .select();

        // Deduct from account balance in DB
        const accToUpdate = currentAccounts.find(a => a.id === sub.accountId);
        if (accToUpdate) {
          const newBal = (Number(accToUpdate.balance) || 0) - Math.abs(Number(sub.amount) || 0);
          await supabase
            .from('accounts')
            .update({ balance: newBal })
            .eq('id', sub.accountId);
          updatedAccountsMap[sub.accountId] = newBal;
        }

        processedList.push(sub);
        if (insertedTx && insertedTx[0]) {
          generatedTx.push(toCamel(insertedTx[0]));
        }
      }
    }

    return { processed: processedList, newTx: generatedTx, updatedAccountsMap };
  } catch (err) {
    console.warn('Error in processSubscriptionsCron:', err);
    return { processed: [], newTx: [], updatedAccountsMap: {} };
  }
};

// --- EXCHANGE RATES & FEEDBACK SERVICES ---

export const dbFetchExchangeRates = async () => {
  try {
    const { data, error } = await supabase
      .from('exchange_rates_cache')
      .select('*')
      .eq('id', 'latest')
      .single();

    if (error || !data) return null;
    return toCamel(data);
  } catch (err) {
    console.warn('Supabase DB fetch exchange rates fallback:', err.message);
    return null;
  }
};

export const dbUpsertExchangeRates = async (ratesPayload) => {
  try {
    const payload = {
      id: 'latest',
      last_fetch_date: ratesPayload.last_fetch_date,
      last_updated_at: ratesPayload.last_updated_at,
      rates: ratesPayload.rates
    };

    await supabase
      .from('exchange_rates_cache')
      .upsert([payload]);
  } catch (err) {
    console.warn('Supabase DB upsert exchange rates exception:', err.message);
  }
};

export const dbSubmitFeedback = async (feedbackData) => {
  console.log('📡 [Supabase DB] Enviando reporte de feedback a Supabase:', feedbackData);
  try {
    const { error } = await supabase
      .from('feedback')
      .insert([{
        type: feedbackData.type,
        priority: feedbackData.priority,
        subject: feedbackData.subject,
        message: feedbackData.message
      }]);

    if (error) {
      console.error('❌ [Supabase DB Error] Al enviar feedback:', error);
      throw error;
    }
    console.log('✅ [Supabase DB] Feedback enviado con éxito a Supabase');
    return true;
  } catch (err) {
    console.error('❌ [Supabase DB Exception] dbSubmitFeedback:', err.message);
    return false;
  }
};

/**
 * Consolidate transactions older than 365 days into annual summary rows
 */
export const consolidateOldTransactions = async (userId) => {
  try {
    const oneYearAgo = new Date();
    oneYearAgo.setDate(oneYearAgo.getDate() - 365);
    const cutoffDateStr = oneYearAgo.toISOString().split('T')[0];

    // Fetch transactions older than 365 days
    const { data: oldTxData, error: fetchErr } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .lt('transaction_date', cutoffDateStr);

    if (fetchErr || !Array.isArray(oldTxData) || oldTxData.length === 0) {
      return { success: true, count: 0, consolidatedGroups: 0 };
    }

    // Group transactions by account_id, category_id, type, currency, and year
    const groups = {};
    const idsToDelete = [];

    oldTxData.forEach((tx) => {
      idsToDelete.push(tx.id);
      const year = (tx.transaction_date || '').substring(0, 4) || '2025';
      const key = `${tx.account_id}_${tx.category_id || 'uncat'}_${tx.type}_${tx.currency || 'USD'}_${year}`;

      if (!groups[key]) {
        groups[key] = {
          user_id: userId,
          account_id: tx.account_id,
          category_id: tx.category_id || null,
          type: tx.type,
          currency: tx.currency || 'USD',
          year,
          totalAmount: 0,
          count: 0
        };
      }
      groups[key].totalAmount += Number(tx.amount) || 0;
      groups[key].count += 1;
    });

    // Create consolidated master transactions (letting DB generate UUIDs)
    const consolidatedPayload = Object.values(groups).map((g) => ({
      user_id: userId,
      type: g.type,
      transaction_date: `${g.year}-12-31`,
      account_id: g.account_id,
      category_id: g.category_id,
      amount: g.totalAmount,
      currency: g.currency,
      description: `[Consolidado Histórico] ${g.year}`
    }));

    // Insert master consolidated transactions
    const { error: insertErr } = await supabase
      .from('transactions')
      .insert(consolidatedPayload);

    if (insertErr) throw insertErr;

    // Delete individual old transactions
    const { error: deleteErr } = await supabase
      .from('transactions')
      .delete()
      .in('id', idsToDelete);

    if (deleteErr) console.warn('Warning deleting old transactions:', deleteErr.message);

    return { 
      success: true, 
      count: idsToDelete.length, 
      consolidatedGroups: consolidatedPayload.length 
    };
  } catch (err) {
    console.error('Error consolidating old transactions:', err);
    return { success: false, error: err.message };
  }
};

// --- PASSWORD CHANGE SERVICE ---

export const dbChangeUserPassword = async (userId, currentPassword, newPassword) => {
  if (!userId || !currentPassword || !newPassword) {
    return { success: false, error: 'Missing required fields' };
  }

  try {
    // 1. Fetch user to validate current password
    const { data: userData, error: fetchError } = await supabase
      .from('users')
      .select('id, password')
      .eq('id', userId)
      .single();

    if (fetchError || !userData) {
      return { success: false, error: 'User not found' };
    }

    // 2. Validate current password matches
    if (userData.password !== currentPassword) {
      return { success: false, error: 'INVALID_CURRENT_PASSWORD' };
    }

    // 3. Validate new password policy (8+ chars, upper, lower, digit/special)
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[\d\W]).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return { success: false, error: 'PASSWORD_POLICY_FAIL' };
    }

    // 4. Update password in DB
    const { error: updateError } = await supabase
      .from('users')
      .update({ password: newPassword })
      .eq('id', userId);

    if (updateError) {
      console.error('❌ Error updating password:', updateError);
      return { success: false, error: updateError.message };
    }

    return { success: true };
  } catch (err) {
    console.error('❌ Exception in dbChangeUserPassword:', err);
    return { success: false, error: err.message };
  }
};
