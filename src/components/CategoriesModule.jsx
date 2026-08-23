import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Plus, Tag, Trash2, ArrowDownRight, ArrowUpRight, Search } from 'lucide-react';
import CategoryModal from './CategoryModal';
import ConfirmDeleteModal from './ConfirmDeleteModal';
import ExportDropdown from './ExportDropdown';
import Pagination from './Pagination';
import { useFinance } from '../context/FinanceContext';
import { useSettings } from '../context/SettingsContext';
import { parseNumeric } from '../utils/formatters';
import { convertToGlobal } from '../utils/currency';

export default function CategoriesModule() {
  const { accounts, categories, transactions, addCategory, updateCategory, deleteCategory } = useFinance();
  const { baseCurrency, formatCurrency, language, t, formatToGlobal, convertToGlobal } = useSettings();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState(null);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [initialType, setInitialType] = useState('expense');
  const [activeTabType, setActiveTabType] = useState('expense');
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const safeAccountsList = useMemo(() => Array.isArray(accounts) ? accounts.filter(Boolean) : [], [accounts]);
  const safeCategoriesList = useMemo(() => Array.isArray(categories) ? categories.filter(Boolean) : [], [categories]);
  const safeTxList = useMemo(() => Array.isArray(transactions) ? transactions.filter(Boolean) : [], [transactions]);

  // Account Currency Lookup Map
  const accountCurrencyMap = useMemo(() => {
    return safeAccountsList.reduce((map, acc) => {
      if (acc?.id) map[acc.id] = acc.currency || 'USD';
      return map;
    }, {});
  }, [safeAccountsList]);

  const today = useMemo(() => new Date(), []);
  const currentMonthKey = useMemo(() => `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`, [today]);
  const daysInMonth = useMemo(() => new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate(), [today]);
  const remainingDays = useMemo(() => Math.max(1, daysInMonth - today.getDate()), [daysInMonth, today]);

  const currentMonthTx = useMemo(() => {
    return safeTxList.filter(t => t?.date && t.date.startsWith(currentMonthKey));
  }, [safeTxList, currentMonthKey]);

  const categoriesWithSpent = useMemo(() => {
    return safeCategoriesList.map(cat => {
      if (!cat) return null;
      const catId = cat.id;
      const catType = cat.type || 'expense';

      const executed = currentMonthTx
        .filter(t => t && (t.categoryId === catId || t.category_id === catId) && t.type === catType)
        .reduce((sum, t) => sum + Math.abs(formatToGlobal(t)), 0);

      const rawTarget = cat.targetAmount !== undefined ? cat.targetAmount : (cat.target_amount !== undefined ? cat.target_amount : cat.monthly_budget);
      const numTarget = parseNumeric(rawTarget, 0);
      const target = (!cat.currency || cat.currency === baseCurrency)
        ? numTarget
        : convertToGlobal(numTarget, cat.currency);

      const percentage = target > 0 ? Math.min(100, Math.round((executed / target) * 100)) : 0;
      return { ...cat, executed, target, percentage };
    }).filter(Boolean);
  }, [safeCategoriesList, currentMonthTx, formatToGlobal, convertToGlobal, baseCurrency]);

  const filteredCategories = useMemo(() => {
    return categoriesWithSpent.filter(c => {
      if (!c) return false;
      if (c.type !== activeTabType) return false;
      if (searchTerm && searchTerm.trim()) {
        return (c.name || '').toLowerCase().includes(searchTerm.toLowerCase());
      }
      return true;
    });
  }, [categoriesWithSpent, activeTabType, searchTerm]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, activeTabType]);

  const paginatedCategories = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredCategories.slice(start, start + pageSize);
  }, [filteredCategories, currentPage, pageSize]);

  const categoryColumns = useMemo(() => [
    { label: t('modals.category.name', {}, 'Categoría'), accessor: (c) => c?.name || '-' },
    { label: t('modals.category.type', {}, 'Tipo'), accessor: (c) => c?.type === 'expense' ? t('modals.transaction.typeExpense', {}, 'Gasto') : t('modals.transaction.typeIncome', {}, 'Ingreso') },
    { label: t('categories.budgetOrGoal', {}, 'Presupuesto / Meta'), accessor: (c) => parseNumeric(c?.target, 0).toFixed(2) },
    { label: t('categories.executedMonth', {}, 'Ejecutado Mes'), accessor: (c) => parseNumeric(c?.executed, 0).toFixed(2) },
    { label: t('categories.consumptionPct', {}, 'Consumo %'), accessor: (c) => `${c?.percentage || 0}%` }
  ], [t]);

  // Expense Budget Calculations (converted to Base Currency)
  const totalTargetExpense = useMemo(() => {
    return safeCategoriesList
      .filter(c => c && c.type === 'expense')
      .reduce((sum, c) => {
        const rawTarget = c.targetAmount !== undefined ? c.targetAmount : (c.target_amount !== undefined ? c.target_amount : c.monthly_budget);
        const numTarget = parseNumeric(rawTarget, 0);
        const target = (!c.currency || c.currency === baseCurrency)
          ? numTarget
          : convertToGlobal(numTarget, c.currency);
        return sum + target;
      }, 0);
  }, [safeCategoriesList, convertToGlobal, baseCurrency]);

  const totalExecutedExpense = useMemo(() => {
    return currentMonthTx
      .filter(t => t && t.type === 'expense')
      .reduce((sum, t) => sum + Math.abs(formatToGlobal(t)), 0);
  }, [currentMonthTx, formatToGlobal]);

  const remainingBudget = useMemo(() => totalTargetExpense - totalExecutedExpense, [totalTargetExpense, totalExecutedExpense]);
  const globalPercentage = useMemo(() => {
    return totalTargetExpense > 0 
      ? Math.round((totalExecutedExpense / totalTargetExpense) * 100) 
      : 0;
  }, [totalExecutedExpense, totalTargetExpense]);

  const suggestedDailyLimit = useMemo(() => remainingDays > 0 ? Math.max(0, remainingBudget / remainingDays) : 0, [remainingDays, remainingBudget]);

  // Income Goal Calculations (converted to Base Currency)
  const totalTargetIncome = useMemo(() => {
    return safeCategoriesList
      .filter(c => c && c.type === 'income')
      .reduce((sum, c) => {
        const rawTarget = c.targetAmount !== undefined ? c.targetAmount : (c.target_amount !== undefined ? c.target_amount : c.monthly_budget);
        const numTarget = parseNumeric(rawTarget, 0);
        const target = (!c.currency || c.currency === baseCurrency)
          ? numTarget
          : convertToGlobal(numTarget, c.currency);
        return sum + target;
      }, 0);
  }, [safeCategoriesList, convertToGlobal, baseCurrency]);

  const totalIncomeMonth = useMemo(() => {
    return currentMonthTx
      .filter(t => t && t.type === 'income')
      .reduce((sum, t) => sum + Math.abs(formatToGlobal(t)), 0);
  }, [currentMonthTx, formatToGlobal]);

  const remainingIncomeGoal = useMemo(() => Math.max(0, totalTargetIncome - totalIncomeMonth), [totalTargetIncome, totalIncomeMonth]);
  const incomeGoalPercentage = useMemo(() => {
    return totalTargetIncome > 0
      ? Math.round((totalIncomeMonth / totalTargetIncome) * 100)
      : 0;
  }, [totalIncomeMonth, totalTargetIncome]);

  const suggestedDailyIncome = useMemo(() => remainingDays > 0 ? Math.max(0, remainingIncomeGoal / remainingDays) : 0, [remainingDays, remainingIncomeGoal]);

  const projectedSurplus = useMemo(() => Math.max(0, totalIncomeMonth - totalExecutedExpense), [totalIncomeMonth, totalExecutedExpense]);
  const projectedSavingsPct = useMemo(() => totalIncomeMonth > 0 ? Math.round((projectedSurplus / totalIncomeMonth) * 100) : 0, [projectedSurplus, totalIncomeMonth]);

  // Status Badges
  const generalStatus = useMemo(() => {
    if (globalPercentage >= 90) {
      return { label: t('categories.statusExceeded', {}, 'Excedido 🚨'), badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/30' };
    }
    if (globalPercentage >= 70) {
      return { label: t('categories.statusWarning', {}, 'Atención ⚠️'), badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/30' };
    }
    return { label: t('categories.statusOnTrack', {}, 'En meta 🔥'), badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' };
  }, [globalPercentage, t]);

  const incomeGoalStatus = useMemo(() => {
    if (incomeGoalPercentage >= 100) {
      return { 
        label: t('categories.goalStatusAchieved', {}, 'Meta cumplida 🚀'), 
        badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' 
      };
    }
    if (incomeGoalPercentage >= 50) {
      return { 
        label: t('categories.goalStatusOnTrack', {}, 'En camino 🎯'), 
        badgeClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' 
      };
    }
    return { 
      label: t('categories.goalStatusNeedsPush', {}, 'Requiere impulso ⚡'), 
      badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/30' 
    };
  }, [incomeGoalPercentage, t]);

  const handleSaveCategory = useCallback((categoryData) => {
    if (!categoryData) return;
    if (categoryToEdit) {
      updateCategory(categoryData);
    } else {
      addCategory(categoryData);
    }
    setCategoryToEdit(null);
  }, [categoryToEdit, updateCategory, addCategory]);

  const handleDeleteCategory = useCallback(() => {
    if (!categoryToDelete) return;
    deleteCategory(categoryToDelete.id);
    setCategoryToDelete(null);
  }, [categoryToDelete, deleteCategory]);

  const categorySummary = useMemo(() => ({
    totalRecords: filteredCategories.length,
    consolidatedTotal: activeTabType === 'expense'
      ? `${formatCurrency(totalTargetExpense, baseCurrency)} (Límite)`
      : `${formatCurrency(totalTargetIncome, baseCurrency)} (Meta)`,
    baseCurrency
  }), [filteredCategories.length, activeTabType, totalTargetExpense, totalTargetIncome, baseCurrency, formatCurrency]);

  return (
    <div 
      className="w-full min-w-full box-border categories-container space-y-4 md:space-y-6 animate-fadeIn pb-32 md:pb-6"
      style={{ scrollbarGutter: 'stable', boxSizing: 'border-box', width: '100%' }}
    >
      
      {/* Standardized Header */}
      <header className="flex items-center justify-between gap-2.5 w-full relative z-30">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white leading-tight truncate">
            {t('categories.title', {}, 'Categorías y Presupuestos')}
          </h1>
          <p className="text-xs md:text-sm text-slate-400 mt-0.5 block font-normal truncate">
            {t('categories.subtitle', {}, 'Límites mensuales para gastos y metas')}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden sm:block">
            <ExportDropdown
              data={filteredCategories}
              columns={categoryColumns}
              title={t('categories.title', {}, 'Categorías y Presupuestos')}
              filename="categorias_growy"
              summary={categorySummary}
            />
          </div>

          <button
            onClick={() => {
              setCategoryToEdit(null);
              setInitialType(activeTabType);
              setIsModalOpen(true);
            }}
            className="h-11 md:h-10 px-3.5 sm:px-4 text-xs font-bold rounded-xl bg-[#AEEDD0] text-[#1E2D32] hover:brightness-105 active:scale-[0.98] transition-all shadow-md shadow-[#AEEDD0]/10 flex items-center gap-1.5 shrink-0 whitespace-nowrap cursor-pointer"
          >
            <Plus size={15} className="shrink-0" />
            <span className="hidden sm:inline">
              {activeTabType === 'expense'
                ? t('categories.newBudget', {}, 'Nuevo Presupuesto')
                : t('categories.newGoal', {}, 'Nueva Meta')
              }
            </span>
          </button>
        </div>
      </header>

      {/* Toolbar: Search and Mobile Export */}
      <div className="flex items-center gap-2 w-full relative z-20">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t('placeholders.search', {}, 'Buscar por nombre...')}
            className="w-full h-11 pl-9 pr-3 bg-[#131E22] border border-white/10 rounded-xl text-xs text-white placeholder:text-slate-500 outline-none focus:border-[#AEEDD0] shadow-inner transition-colors"
          />
        </div>
        <div className="sm:hidden shrink-0">
          <ExportDropdown
            data={filteredCategories}
            columns={categoryColumns}
            title={t('categories.title', {}, 'Categorías y Presupuestos')}
            filename="categorias_growy"
            summary={categorySummary}
          />
        </div>
      </div>

      {/* Hero Banner: Dynamic Bimodal (Expense vs Income Goals) */}
      <div className="w-full bg-[#141E22]/70 border border-white/10 rounded-2xl p-4 sm:p-6 mb-4 sm:mb-6 backdrop-blur-md relative z-10 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] transition-all duration-300 ease-in-out">
        
        {activeTabType === 'expense' ? (
          /* MODO A: PRESUPUESTO DE GASTOS */
          <>
            {/* Fila 1: Resumen Principal y Barra de Progreso */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-center pb-4 sm:pb-6 border-b border-white/10">
              {/* Gasto actual vs Límite */}
              <div className="lg:col-span-4">
                <span className="text-xs font-semibold tracking-wider text-[#AEEDD0] uppercase block">
                  {t('categories.globalBudgetLabel', {}, language === 'es' ? 'PRESUPUESTO GLOBAL MENSUAL' : 'GLOBAL MONTHLY BUDGET')}
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl sm:text-3xl font-bold text-white tabular-nums tracking-tight">
                    {formatCurrency(totalExecutedExpense)}
                  </span>
                  <span className="text-xs sm:text-sm font-normal text-slate-300">
                    / {formatCurrency(totalTargetExpense)}
                  </span>
                </div>
              </div>

              {/* Restante Disponible */}
              <div className="lg:col-span-3">
                <span className="text-xs font-semibold tracking-wider text-slate-300 uppercase block">
                  {t('categories.remainingAvailable', {}, 'Restante disponible')}
                </span>
                <span className={`text-xl sm:text-2xl font-bold tabular-nums tracking-tight mt-1 block ${remainingBudget >= 0 ? 'text-[#AEEDD0]' : 'text-rose-400'}`}>
                  {formatCurrency(remainingBudget)}
                </span>
              </div>

              {/* Barra de Progreso y Porcentaje */}
              <div className="lg:col-span-5 space-y-1.5 sm:space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-slate-300 uppercase tracking-wider">
                    {t('categories.budgetConsumption', {}, 'Consumo')}
                  </span>
                  <span className="text-white tabular-nums font-bold">
                    {globalPercentage.toFixed(0)}%
                  </span>
                </div>
                <div className="w-full bg-black/40 rounded-full h-2.5 sm:h-3 p-0.5 border border-white/10 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-[#AEEDD0] to-emerald-400 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(globalPercentage, 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Fila 2: Métricas Secundarias (2x2 Grid en mobile) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-6 pt-3.5 sm:pt-5">
              {/* Superávit / Meta */}
              <div>
                <span className="text-xs font-semibold tracking-wider text-slate-300 uppercase block">
                  {t('categories.surplusMeta', {}, 'SUPERÁVIT / META')}
                </span>
                <p className="text-lg font-bold text-white tabular-nums mt-1">
                  {formatCurrency(projectedSurplus)}
                </p>
                <span className="text-xs font-medium text-emerald-400 mt-0.5 block">
                  {projectedSavingsPct}% {t('categories.projectedSavings', {}, 'ahorro est.')}
                </span>
              </div>

              {/* Días Restantes */}
              <div>
                <span className="text-xs font-semibold tracking-wider text-slate-300 uppercase block">
                  {t('categories.cycleDaysLeft', {}, 'DÍAS RESTANTES')}
                </span>
                <p className="text-lg font-bold text-white tabular-nums mt-1 flex items-center gap-1.5">
                  <span className="text-sm">🕒</span> {remainingDays === 1 ? (language === 'es' ? '1 Día' : '1 Day') : `${remainingDays} ${language === 'es' ? 'Días' : 'Days'}`}
                </p>
                <span className="text-xs text-slate-300 mt-0.5 block">
                  {t('categories.cycleEndNotice', {}, 'cierre de mes')}
                </span>
              </div>

              {/* Gasto Diario Sugerido */}
              <div>
                <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase block">
                  {t('categories.suggestedDailyBurn', {}, 'GASTO DIARIO SUGERIDO')}
                </span>
                <p className="text-lg font-bold text-[#AEEDD0] tabular-nums mt-1">
                  {formatCurrency(suggestedDailyLimit)} / {t('common.day', {}, 'día')}
                </p>
                <span className="text-xs text-slate-400 mt-0.5 block">
                  {t('categories.forRemainingDays', {}, 'para no exceder')}
                </span>
              </div>

              {/* Estado General */}
              <div>
                <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase block mb-1.5">
                  {t('categories.generalStatus', {}, 'ESTADO GENERAL')}
                </span>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shadow-sm ${generalStatus.badgeClass}`}>
                  {generalStatus.label}
                </span>
              </div>
            </div>
          </>
        ) : (
          /* MODO B: METAS DE INGRESO (INCOME GOALS) */
          <>
            {/* Fila 1: Resumen Principal de Ingresos y Progreso */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-center pb-4 sm:pb-6 border-b border-white/10">
              {/* Recaudado vs Meta Total */}
              <div className="lg:col-span-4">
                <span className="text-[10px] sm:text-xs font-semibold tracking-wider text-cyan-400 uppercase block">
                  {t('categories.globalIncomeGoalLabel', {}, language === 'es' ? 'META GLOBAL DE INGRESOS' : 'GLOBAL INCOME GOAL')}
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl sm:text-3xl font-bold text-white tabular-nums tracking-tight">
                    {formatCurrency(totalIncomeMonth)}
                  </span>
                  <span className="text-xs sm:text-sm font-normal text-slate-400">
                    / {formatCurrency(totalTargetIncome)}
                  </span>
                </div>
              </div>

              {/* Faltante para la Meta */}
              <div className="lg:col-span-3">
                <span className="text-[10px] sm:text-xs font-semibold tracking-wider text-slate-400 uppercase block">
                  {t('categories.remainingToGoal', {}, 'Faltante para la Meta')}
                </span>
                <span className="text-xl sm:text-2xl font-bold text-cyan-400 tabular-nums tracking-tight mt-1 block">
                  {formatCurrency(remainingIncomeGoal)}
                </span>
              </div>

              {/* Barra de Progreso y Porcentaje de Meta */}
              <div className="lg:col-span-5 space-y-1.5 sm:space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-slate-300 uppercase tracking-wider">
                    {t('categories.goalProgress', {}, 'Progreso')}
                  </span>
                  <span className="text-white tabular-nums font-bold">
                    {incomeGoalPercentage.toFixed(0)}%
                  </span>
                </div>
                <div className="w-full bg-black/40 rounded-full h-2.5 sm:h-3 p-0.5 border border-white/10 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-cyan-400 to-[#AEEDD0] h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(incomeGoalPercentage, 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Fila 2: Métricas Secundarias para Ingresos (2x2 en mobile) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-6 pt-3.5 sm:pt-5">
              {/* Proyección de Cumplimiento */}
              <div>
                <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase block">
                  {t('categories.complianceProjection', {}, 'PROYECCIÓN')}
                </span>
                <p className="text-base sm:text-lg font-bold text-white tabular-nums mt-1">
                  {incomeGoalPercentage}%
                </p>
                <span className="text-[11px] sm:text-xs font-medium text-cyan-400 mt-0.5 block">
                  {t('categories.completedOfGoal', {}, 'de la meta')}
                </span>
              </div>

              {/* Días Restantes */}
              <div>
                <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase block">
                  {t('categories.cycleDaysLeft', {}, 'DÍAS RESTANTES')}
                </span>
                <p className="text-base sm:text-lg font-bold text-white tabular-nums mt-1 flex items-center gap-1.5">
                  <span className="text-xs sm:text-sm">🕒</span> {remainingDays === 1 ? (language === 'es' ? '1 Día' : '1 Day') : `${remainingDays} ${language === 'es' ? 'Días' : 'Days'}`}
                </p>
                <span className="text-[11px] sm:text-xs text-slate-400 mt-0.5 block">
                  {t('categories.cycleEndNotice', {}, 'cierre de mes')}
                </span>
              </div>

              {/* Ingreso Diario Sugerido */}
              <div>
                <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase block">
                  {t('categories.suggestedDailyIncome', {}, 'INGRESO DIARIO')}
                </span>
                <p className="text-base sm:text-lg font-bold text-cyan-400 tabular-nums mt-1">
                  {formatCurrency(suggestedDailyIncome)} / {t('common.day', {}, 'día')}
                </p>
                <span className="text-[11px] sm:text-xs text-slate-400 mt-0.5 block">
                  {t('categories.toReachGoal', {}, 'para meta')}
                </span>
              </div>

              {/* Estado de Meta */}
              <div>
                <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase block mb-1">
                  {t('categories.goalStatus', {}, 'ESTADO')}
                </span>
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border shadow-sm ${incomeGoalStatus.badgeClass}`}>
                  {incomeGoalStatus.label}
                </span>
              </div>
            </div>
          </>
        )}

      </div>

      {/* Segmented Tab Filter: Gastos vs Ingresos (Locked symmetric width without layout shift) */}
      <div className="flex items-center justify-between gap-3 relative z-10 w-full min-w-full box-border">
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-white/[0.03] border border-white/5 w-full sm:w-auto overflow-hidden">
          <button
            onClick={() => setActiveTabType('expense')}
            className={`flex-1 sm:flex-initial h-11 px-5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTabType === 'expense'
                ? 'bg-[#FF6B6B]/20 text-[#FF6B6B] border border-[#FF6B6B]/30 font-bold shadow'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <ArrowDownRight className="w-3.5 h-3.5 text-[#FF6B6B]" />
            <span>{t('categories.expenseCategories', {}, 'Categorías de Gasto')}</span>
          </button>

          <button
            onClick={() => setActiveTabType('income')}
            className={`flex-1 sm:flex-initial h-11 px-5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTabType === 'income'
                ? 'bg-[var(--color-primary,#AEEDD0)]/20 text-[var(--color-primary,#AEEDD0)] border border-[var(--color-primary,#AEEDD0)]/30 font-bold shadow'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5 text-[var(--color-primary,#AEEDD0)]" />
            <span>{t('categories.incomeCategories', {}, 'Categorías de Ingreso')}</span>
          </button>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="w-full min-w-full box-border relative z-10">
        {filteredCategories.length === 0 ? (
          <div className="p-6 rounded-2xl bg-[#1E2D32]/60 border border-white/10 backdrop-blur-md text-center text-slate-300 space-y-3">
            <Tag className="w-12 h-12 text-slate-400 mx-auto" />
            <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">{t('categories.noCategoriesTitle', {}, 'Sin categorías registradas')}</h3>
            <p className="text-xs sm:text-sm text-slate-400 max-w-sm mx-auto font-normal">
              {t('categories.noCategoriesDesc', {}, 'Agrega categorías para presupuestar tus compras y agrupar tus transacciones.')}
            </p>
            <button
              onClick={() => {
                setInitialType(activeTabType);
                setIsModalOpen(true);
              }}
              className="h-11 px-5 rounded-xl btn-primary-mint font-bold text-sm inline-flex items-center gap-2 shadow cursor-pointer"
            >
              <Plus className="w-4 h-4" /> {t('categories.newCategory', {}, 'Nueva Categoría')}
            </button>
          </div>
        ) : (
          <div 
            className="categories-grid grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6 w-full min-w-full box-border"
            style={{ boxSizing: 'border-box', width: '100%' }}
          >
            {paginatedCategories.map((cat) => {
              if (!cat) return null;
              const isExpense = cat.type === 'expense';
              const catPercentage = parseNumeric(cat.percentage, 0);
              const barColor = isExpense
                ? catPercentage >= 90 ? '#FF6B6B' : catPercentage >= 75 ? '#F59E0B' : (cat.color || 'var(--color-primary, #AEEDD0)')
                : (cat.color || 'var(--color-primary, #AEEDD0)');

              return (
                <div
                  key={cat.id || Math.random()}
                  onClick={() => {
                    setCategoryToEdit(cat);
                    setIsModalOpen(true);
                  }}
                  className="p-5 rounded-xl bg-[#162226] border border-white/10 h-full flex flex-col justify-between space-y-4 relative overflow-hidden group shadow-lg cursor-pointer hover:bg-white/[0.04] transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                      <div 
                        className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl shrink-0 border border-white/10"
                        style={{ backgroundColor: `${cat.color || '#AEEDD0'}20` }}
                      >
                        {cat.emoji || '🏷️'}
                      </div>

                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-white group-hover:text-[var(--color-primary,#AEEDD0)] transition-colors truncate">
                          {cat.name || 'Sin nombre'}
                        </h4>
                        <span className="text-xs text-slate-300 font-semibold uppercase block tabular-nums">
                          {isExpense ? t('categories.budgetLimit', {}, 'Presupuesto') : t('categories.goalLimit', {}, 'Meta')}: {formatCurrency(parseNumeric(cat.target, 0))}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setCategoryToDelete(cat);
                        }}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        title={t('common.delete', {}, 'Eliminar')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1 mt-auto">
                    <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden border border-white/5">
                      <div 
                        className="h-full rounded-full transition-all duration-500"
                        style={{ 
                          width: `${catPercentage}%`, 
                          backgroundColor: barColor 
                        }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className="text-slate-300 font-medium">
                        {isExpense ? t('categories.executed', {}, 'Ejecutado') : t('categories.collected', {}, 'Recaudado')}: <strong className="text-white font-bold tabular-nums">{formatCurrency(parseNumeric(cat.executed, 0))}</strong>
                      </span>
                      <span className="font-extrabold text-white tabular-nums">
                        {catPercentage}%
                      </span>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Universal Pagination */}
      <Pagination
        currentPage={currentPage}
        totalItems={filteredCategories.length}
        pageSize={pageSize}
        pageSizeOptions={[10, 30, 50]}
        onPageChange={setCurrentPage}
        onPageSizeChange={(newSize) => {
          setPageSize(newSize);
          setCurrentPage(1);
        }}
      />

      <CategoryModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setCategoryToEdit(null);
        }}
        onSave={handleSaveCategory}
        categoryToEdit={categoryToEdit}
        initialType={initialType}
      />

      <ConfirmDeleteModal
        isOpen={!!categoryToDelete}
        onClose={() => setCategoryToDelete(null)}
        onConfirm={handleDeleteCategory}
        itemName={categoryToDelete?.name || 'categoría'}
        itemType="categoría"
      />

    </div>
  );
}
