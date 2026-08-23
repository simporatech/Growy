import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { 
  LogOut,
  LayoutDashboard, Landmark, Tag, ArrowLeftRight, Percent, RefreshCw, UserCheck,
  Plus, AlertCircle, CheckCircle2, Clock,
  Layers, Activity, Settings as SettingsIcon,
  ChevronDown, Info, MessageSquarePlus, PanelLeftClose, PanelLeftOpen, X
} from 'lucide-react';
import AccountsModule from './AccountsModule';
import CategoriesModule from './CategoriesModule';
import TransactionsModule from './TransactionsModule';
import LoansModule from './LoansModule';
import SubscriptionsModule from './SubscriptionsModule';
import SettingsModule from './SettingsModule';
import AboutModule from './AboutModule';
import FeedbackModule from './FeedbackModule';
import TransactionModal from './TransactionModal';
import LoanModal from './LoanModal';
import SubscriptionModal from './SubscriptionModal';
import AccountModal from './AccountModal';
import PayLoanModal from './PayLoanModal';
import BottomNav from './BottomNav';
import AmbientBackground from './AmbientBackground';
import { useFinance } from '../context/FinanceContext';
import { useSettings } from '../context/SettingsContext';
import { formatCurrency, formatDateLabel, formatHeaderDate, parseNumeric } from '../utils/formatters';
import { safeGetStorage, safeSetStorage } from '../utils/storage';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export default function DashboardPreview({ user, onLogout }) {
  const { 
    accounts, categories, transactions, loans, subscriptions, isLoading, isInitialized,
    autoDebitsNotification, clearAutoDebitsNotification,
    dbStatusToast, clearDbStatusToast,
    addTransaction, addLoan, addSubscription, addAccount, markLoanAsPaid
  } = useFinance();

  const { convertToGlobal, formatToGlobal, baseCurrency, formatCurrency, t, language } = useSettings();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [chartPeriod, setChartPeriod] = useState('this_month'); // 'this_month' | '3_months' | 'year'
  const [isMoreSheetOpen, setIsMoreSheetOpen] = useState(false);

  // Dynamic Fault-Tolerant Document Title Synchronization
  useDocumentTitle(activeTab);

  // Sidebar Collapse State with LocalStorage Persistence
  const [isCollapsed, setIsCollapsed] = useState(() => safeGetStorage('growy_sidebar_collapsed', false));

  const toggleSidebar = useCallback(() => {
    setIsCollapsed(prev => {
      const next = !prev;
      safeSetStorage('growy_sidebar_collapsed', next);
      return next;
    });
  }, []);

  // Quick Action Dropdown State
  const [isQuickMenuOpen, setIsQuickMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Quick Action Modal States
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [initialTxType, setInitialTxType] = useState('expense');
  const [isLoanModalOpen, setIsLoanModalOpen] = useState(false);
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [loanToPay, setLoanToPay] = useState(null);

  // Close quick menu on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsQuickMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const safeAccountsList = useMemo(() => Array.isArray(accounts) ? accounts.filter(Boolean) : [], [accounts]);
  const safeCategoriesList = useMemo(() => Array.isArray(categories) ? categories.filter(Boolean) : [], [categories]);
  const safeTransactionsList = useMemo(() => Array.isArray(transactions) ? transactions.filter(Boolean) : [], [transactions]);
  const safeLoansList = useMemo(() => Array.isArray(loans) ? loans.filter(Boolean) : [], [loans]);
  const safeSubsList = useMemo(() => Array.isArray(subscriptions) ? subscriptions.filter(Boolean) : [], [subscriptions]);

  const primaryNavItems = useMemo(() => [
    { id: 'dashboard', label: t('nav.dashboard', {}, 'Resumen'), icon: LayoutDashboard },
    { id: 'transactions', label: t('nav.transactions', {}, 'Transacciones'), icon: ArrowLeftRight },
    { id: 'accounts', label: t('nav.accounts', {}, 'Cuentas'), icon: Landmark },
    { id: 'loans', label: t('nav.loans', {}, 'Saldos Pendientes'), icon: Percent },
    { id: 'subscriptions', label: t('nav.subscriptions', {}, 'Suscripciones'), icon: RefreshCw },
    { id: 'categories', label: t('nav.categories', {}, 'Categorías'), icon: Tag },
    { id: 'settings', label: t('nav.settings', {}, 'Configuración'), icon: SettingsIcon },
  ], [t]);

  const secondaryNavItems = useMemo(() => [
    { id: 'feedback', label: t('nav.feedback', {}, 'Reportes y Feedback'), icon: MessageSquarePlus },
    { id: 'about', label: t('nav.about', {}, 'Acerca de SIMPORA'), icon: Info },
  ], [t]);

  const allNavItems = useMemo(() => [...primaryNavItems, ...secondaryNavItems], [primaryNavItems, secondaryNavItems]);

  const formattedDate = useMemo(() => formatHeaderDate(new Date(), language), [language]);

  const today = useMemo(() => new Date(), []);
  const currentMonthYear = useMemo(() => `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`, [today]);
  const prevMonthYear = useMemo(() => {
    const prev = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
  }, [today]);

  // RULE 2: Total balance converted to Base Currency
  const totalBalance = useMemo(() => {
    return safeAccountsList.reduce((sum, acc) => {
      const curr = acc?.currency || 'USD';
      return sum + convertToGlobal(parseNumeric(acc?.balance, 0), curr);
    }, 0);
  }, [safeAccountsList, convertToGlobal]);

  // RULE 2: Total pending debt converted to Base Currency
  const totalPendingDebt = useMemo(() => {
    return safeLoansList
      .filter(l => l && l.status === 'pending')
      .reduce((sum, l) => {
        const curr = l?.currency || 'USD';
        return sum + convertToGlobal(parseNumeric(l?.amount, 0), curr);
      }, 0);
  }, [safeLoansList, convertToGlobal]);

  const netWealth = useMemo(() => totalBalance - totalPendingDebt, [totalBalance, totalPendingDebt]);

  const currentMonthTx = useMemo(() => {
    return safeTransactionsList.filter(t => t?.date && t.date.startsWith(currentMonthYear));
  }, [safeTransactionsList, currentMonthYear]);

  const prevMonthTx = useMemo(() => {
    return safeTransactionsList.filter(t => t?.date && t.date.startsWith(prevMonthYear));
  }, [safeTransactionsList, prevMonthYear]);

  // Dynamic Monthly Incomes (pure render conversion to global currency)
  const monthlyIncomes = useMemo(() => {
    return currentMonthTx
      .filter(t => t?.type === 'income')
      .reduce((sum, t) => sum + Math.abs(formatToGlobal(t)), 0);
  }, [currentMonthTx, formatToGlobal]);

  const prevMonthlyIncomes = useMemo(() => {
    return prevMonthTx
      .filter(t => t?.type === 'income')
      .reduce((sum, t) => sum + Math.abs(formatToGlobal(t)), 0);
  }, [prevMonthTx, formatToGlobal]);

  const monthlyExpenses = useMemo(() => {
    return currentMonthTx
      .filter(t => t?.type === 'expense')
      .reduce((sum, t) => sum + Math.abs(formatToGlobal(t)), 0);
  }, [currentMonthTx, formatToGlobal]);

  const prevMonthlyExpenses = useMemo(() => {
    return prevMonthTx
      .filter(t => t?.type === 'expense')
      .reduce((sum, t) => sum + Math.abs(formatToGlobal(t)), 0);
  }, [prevMonthTx, formatToGlobal]);

  const incomeDiffPercentage = useMemo(() => {
    return prevMonthlyIncomes > 0 
      ? Math.round(((monthlyIncomes - prevMonthlyIncomes) / prevMonthlyIncomes) * 100)
      : 0;
  }, [monthlyIncomes, prevMonthlyIncomes]);

  const expenseDiffPercentage = useMemo(() => {
    return prevMonthlyExpenses > 0 
      ? Math.round(((monthlyExpenses - prevMonthlyExpenses) / prevMonthlyExpenses) * 100)
      : 0;
  }, [monthlyExpenses, prevMonthlyExpenses]);

  const daysPassed = useMemo(() => Math.max(1, today.getDate()), [today]);
  const dailyBurnRate = useMemo(() => daysPassed > 0 ? monthlyExpenses / daysPassed : 0, [monthlyExpenses, daysPassed]);

  const daysInMonth = useMemo(() => new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate(), [today]);
  const remainingDays = useMemo(() => Math.max(0, daysInMonth - today.getDate()), [daysInMonth, today]);
  const projectedExpensesRemainder = useMemo(() => dailyBurnRate * remainingDays, [dailyBurnRate, remainingDays]);
  const projectedMonthEndBalance = useMemo(() => totalBalance - projectedExpensesRemainder, [totalBalance, projectedExpensesRemainder]);

  const savingsRate = useMemo(() => {
    return monthlyIncomes > 0 
      ? Math.max(0, Math.round(((monthlyIncomes - monthlyExpenses) / monthlyIncomes) * 100))
      : 0;
  }, [monthlyIncomes, monthlyExpenses]);

  const netSavingsAmount = useMemo(() => monthlyIncomes - monthlyExpenses, [monthlyIncomes, monthlyExpenses]);

  const financialScore = useMemo(() => {
    const baseSavingsScore = Math.min(50, Math.round((savingsRate / 30) * 50));
    const cashflowScore = netSavingsAmount >= 0 ? 30 : 0;
    const debtScore = totalPendingDebt === 0 ? 20 : Math.max(0, 20 - Math.round((totalPendingDebt / (totalBalance || 1)) * 20));
    return Math.min(100, Math.max(10, baseSavingsScore + cashflowScore + debtScore));
  }, [savingsRate, netSavingsAmount, totalPendingDebt, totalBalance]);

  const trendPoints = useMemo(() => {
    if (chartPeriod === 'this_month') {
      const weekPrefix = language === 'es' ? 'Sem' : 'Wk';
      const weeks = [
        { label: `${weekPrefix} 1`, income: 0, expense: 0 },
        { label: `${weekPrefix} 2`, income: 0, expense: 0 },
        { label: `${weekPrefix} 3`, income: 0, expense: 0 },
        { label: `${weekPrefix} 4`, income: 0, expense: 0 }
      ];

      currentMonthTx.forEach(t => {
        const day = new Date(t.date + 'T00:00:00').getDate();
        const weekIdx = Math.min(3, Math.floor((day - 1) / 7));
        const amt = Math.abs(formatToGlobal(t));
        if (t.type === 'income') weeks[weekIdx].income += amt;
        if (t.type === 'expense') weeks[weekIdx].expense += amt;
      });

      return weeks;
    } else if (chartPeriod === '3_months') {
      const months = [];
      for (let i = 2; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const mKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const label = d.toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', { month: 'short' });
        
        let inc = 0, exp = 0;
        safeTransactionsList.forEach(t => {
          if (t?.date && t.date.startsWith(mKey)) {
            const amt = Math.abs(formatToGlobal(t));
            if (t.type === 'income') inc += amt;
            if (t.type === 'expense') exp += amt;
          }
        });
        months.push({ label, income: inc, expense: exp });
      }
      return months;
    } else {
      const periods = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const mKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const label = d.toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', { month: 'short' });
        
        let inc = 0, exp = 0;
        safeTransactionsList.forEach(t => {
          if (t?.date && t.date.startsWith(mKey)) {
            const amt = Math.abs(formatToGlobal(t));
            if (t.type === 'income') inc += amt;
            if (t.type === 'expense') exp += amt;
          }
        });
        periods.push({ label, income: inc, expense: exp });
      }
      return periods;
    }
  }, [chartPeriod, currentMonthTx, safeTransactionsList, today, language, formatToGlobal]);

  const maxTrendVal = useMemo(() => Math.max(1, ...trendPoints.flatMap(p => [p.income, p.expense])), [trendPoints]);

  const categoryExpenses = useMemo(() => {
    return safeCategoriesList
      .filter(c => c && c.type === 'expense')
      .map(cat => {
        const totalSpent = currentMonthTx
          .filter(t => t && (t.categoryId === cat.id || t.category_id === cat.id) && t.type === 'expense')
          .reduce((sum, t) => sum + Math.abs(formatToGlobal(t)), 0);
        return { ...cat, totalSpent };
      })
      .filter(c => c.totalSpent > 0)
      .sort((a, b) => b.totalSpent - a.totalSpent);
  }, [safeCategoriesList, currentMonthTx, formatToGlobal]);

  const totalCatExpenses = useMemo(() => categoryExpenses.reduce((sum, c) => sum + c.totalSpent, 0), [categoryExpenses]);

  const criticalBudgets = useMemo(() => {
    return safeCategoriesList
      .filter(c => {
        const rawTarget = c?.targetAmount !== undefined ? c.targetAmount : (c?.target_amount !== undefined ? c.target_amount : c?.monthly_budget);
        return c && c.type === 'expense' && parseNumeric(rawTarget, 0) > 0;
      })
      .map(cat => {
        const executed = currentMonthTx
          .filter(t => t && (t.categoryId === cat.id || t.category_id === cat.id) && t.type === 'expense')
          .reduce((sum, t) => sum + Math.abs(formatToGlobal(t)), 0);
        const rawTarget = cat.targetAmount !== undefined ? cat.targetAmount : (cat.target_amount !== undefined ? cat.target_amount : cat.monthly_budget);
        const numTarget = parseNumeric(rawTarget, 0);
        const target = (!cat.currency || cat.currency === baseCurrency)
          ? numTarget
          : convertToGlobal(numTarget, cat.currency);
        const percentage = target > 0 ? Math.round((executed / target) * 100) : 0;
        return { ...cat, executed, target, percentage };
      })
      .filter(c => c.percentage >= 70)
      .sort((a, b) => b.percentage - a.percentage);
  }, [safeCategoriesList, currentMonthTx, formatToGlobal, convertToGlobal, baseCurrency]);

  const topExpenses = useMemo(() => categoryExpenses.slice(0, 3), [categoryExpenses]);
  const pendingLoansList = useMemo(() => safeLoansList.filter(l => l && l.status === 'pending'), [safeLoansList]);
  const activeSubsList = useMemo(() => safeSubsList.filter(s => s && s.isActive), [safeSubsList]);
  const recentTransactions = useMemo(() => safeTransactionsList.slice(0, 5), [safeTransactionsList]);

  const handleSaveTransaction = useCallback(async (txData) => {
    if (txData) return await addTransaction(txData);
  }, [addTransaction]);

  const handleSaveLoan = useCallback((loanData) => {
    if (loanData) addLoan(loanData);
  }, [addLoan]);

  const handleSaveSub = useCallback((subData) => {
    if (subData) addSubscription(subData);
  }, [addSubscription]);

  const handleSaveAccount = useCallback((accData) => {
    if (accData) addAccount(accData);
  }, [addAccount]);

  const handleConfirmPayLoan = useCallback((loanId, accountId, customDebitAmount, keepRecord, paymentDate) => {
    markLoanAsPaid(loanId, accountId, customDebitAmount, keepRecord, paymentDate);
    setLoanToPay(null);
  }, [markLoanAsPaid]);

  return (
    <div className="relative min-h-screen bg-[#090C10] text-white overflow-hidden font-sans">
      {/* Fondo Ambiental Dinámico con Anti-Banding Dithering y Aceleración GPU */}
      <AmbientBackground />
      
      {/* Contenedor de la aplicación con aislamiento */}
      <div className="relative z-10 flex h-screen w-screen overflow-hidden">
        
        {/* DESKTOP SIDEBAR WITH COLLAPSIBLE MODE */}
        <aside className={`h-full shrink-0 hidden md:flex flex-col justify-between border-r border-white/10 bg-[#141E22]/70 backdrop-blur-xl z-30 select-none overflow-hidden isolate transition-all duration-300 ease-in-out ${
          isCollapsed ? 'w-20 p-3' : 'w-64 md:w-72 p-6'
        }`}>
          
          <div className="space-y-6 flex-1 flex flex-col min-h-0">
            
            {/* INTERACTIVE LOGO BRANDING & TOGGLE CONTAINER */}
            <div className="flex items-center justify-between shrink-0">
              {!isCollapsed ? (
                <>
                  <div 
                    onClick={() => setActiveTab('dashboard')}
                    className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity group min-w-0"
                    title="Ir a Resumen / Dashboard"
                  >
                    <div className="w-9 h-9 rounded-xl bg-[var(--color-primary,#AEEDD0)]/15 border border-[var(--color-primary,#AEEDD0)]/30 flex items-center justify-center p-2 shadow-inner group-hover:scale-105 transition-transform shrink-0">
                      <img src="/logos/Transparent.svg" alt="Growy" className="w-full h-full object-contain" />
                    </div>
                    <div className="min-w-0">
                      <h1 className="text-lg font-bold text-white tracking-tight leading-none group-hover:text-[var(--color-primary,#AEEDD0)] transition-colors truncate">
                        Growy
                      </h1>
                      <span className="text-[11px] font-semibold text-slate-300 tracking-wider uppercase block truncate">
                        {t('common.smartFinances', {}, 'Finanzas Inteligentes')}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={toggleSidebar}
                    className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0 ml-1"
                    title="Minimizar Menú"
                  >
                    <PanelLeftClose className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <div className="flex flex-col items-center gap-3 w-full">
                  <div 
                    onClick={() => setActiveTab('dashboard')}
                    className="w-9 h-9 rounded-xl bg-[var(--color-primary,#AEEDD0)]/15 border border-[var(--color-primary,#AEEDD0)]/30 flex items-center justify-center p-2 shadow-inner hover:scale-105 transition-transform cursor-pointer"
                    title="Growy • Resumen"
                  >
                    <img src="/logos/Transparent.svg" alt="Growy" className="w-full h-full object-contain" />
                  </div>

                  <button
                    type="button"
                    onClick={toggleSidebar}
                    className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
                    title="Expandir Menú"
                  >
                    <PanelLeftOpen className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* USER PROFILE PILL */}
            {!isCollapsed ? (
              <div className="rounded-2xl p-3 border border-white/10 bg-[#141E22]/70 backdrop-blur-xl flex items-center gap-3 overflow-hidden group hover:border-white/15 transition-all shrink-0 isolate">
                <div className="w-8 h-8 rounded-xl bg-[var(--color-primary,#AEEDD0)]/15 border border-[var(--color-primary,#AEEDD0)]/20 flex items-center justify-center text-[var(--color-primary,#AEEDD0)] shrink-0 font-bold">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-xs font-semibold text-white truncate">
                    {user?.username || 'Admin'}
                  </h3>
                  <span className="text-[11px] text-slate-300 font-medium truncate block">
                    {t('common.planPro', {}, 'Plan Pro • Finanzas')}
                  </span>
                </div>
              </div>
            ) : (
              <div 
                className="rounded-2xl p-2 border border-white/10 bg-[#141E22]/70 backdrop-blur-xl flex items-center justify-center shrink-0 isolate"
                title={`${user?.username || 'Admin'} • ${t('common.planPro', {}, 'Plan Pro • Finanzas')}`}
              >
                <div className="w-8 h-8 rounded-xl bg-[var(--color-primary,#AEEDD0)]/15 border border-[var(--color-primary,#AEEDD0)]/20 flex items-center justify-center text-[var(--color-primary,#AEEDD0)] font-bold">
                  <UserCheck className="w-4 h-4" />
                </div>
              </div>
            )}

            {/* PRIMARY OPERATIONAL NAVIGATION MENU */}
            <nav className="space-y-1.5 pt-1 flex-1 overflow-y-auto pr-1">
              {primaryNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;

                if (isCollapsed) {
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      title={item.label}
                      className={`w-full flex items-center justify-center h-10 rounded-xl transition-all duration-150 group cursor-pointer ${
                        isActive
                          ? 'bg-[var(--color-primary,#97F2CC)] text-[var(--color-primary-text,#091E15)] shadow-sm font-bold scale-105'
                          : 'text-slate-300 hover:text-white hover:bg-white/[0.06]'
                      }`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[var(--color-primary-text,#091E15)]' : 'text-slate-400 group-hover:text-white'}`} />
                    </button>
                  );
                }

                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 text-left group cursor-pointer ${
                      isActive
                        ? 'bg-[var(--color-primary,#97F2CC)] text-[var(--color-primary-text,#091E15)] shadow-sm font-bold scale-[1.01]'
                        : 'text-slate-300 hover:text-white hover:bg-white/[0.04] hover:translate-x-1'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 transition-transform duration-150 ${isActive ? 'text-[var(--color-primary-text,#091E15)]' : 'text-slate-400 group-hover:text-white'}`} />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* SECONDARY FOOTER NAV BLOCK */}
          <div className="mt-auto pt-4 border-t border-white/5 space-y-1 shrink-0">
            <div className="space-y-0.5 pb-2">
              {secondaryNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;

                if (isCollapsed) {
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      title={item.label}
                      className={`w-full flex items-center justify-center h-9 rounded-lg transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-white/10 text-white font-bold'
                          : 'text-slate-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-[#AEEDD0]' : 'text-slate-400'}`} />
                    </button>
                  );
                }

                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full text-xs font-medium flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-left cursor-pointer ${
                      isActive
                        ? 'bg-white/10 text-white font-bold'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-[#AEEDD0]' : 'text-slate-400'}`} />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>

            {!isCollapsed ? (
              <button
                onClick={onLogout}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-medium text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 active:scale-[0.98] transition-all cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>{t('nav.logout', {}, 'Cerrar Sesión')}</span>
              </button>
            ) : (
              <button
                onClick={onLogout}
                title={t('nav.logout', {}, 'Cerrar Sesión')}
                className="w-full flex items-center justify-center h-10 rounded-xl text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 active:scale-[0.98] transition-all cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </aside>

        {/* MAIN CONTENT WRAPPER */}
        <main className="flex-1 min-h-screen overflow-y-auto overflow-x-hidden max-w-full bg-transparent transition-all duration-200 ease-in-out pb-32 md:pb-8">
        
        <div className="w-full max-w-[1600px] mx-auto px-4 pt-4 pb-32 md:px-6 lg:px-8 md:pt-8 md:pb-12 space-y-4 md:space-y-6 animate-fadeIn isolate transition-all duration-200 ease-in-out">
          {activeTab === 'dashboard' ? (
            <>
              {/* PAGE HEADER WITH SPLIT BUTTON */}
              <header className="flex items-center justify-between gap-3 w-full relative z-30">
                <div className="min-w-0 flex-1">
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white leading-tight truncate">
                    {t('common.greeting', { name: user?.username ? user.username.split(' ')[0] : 'Admin' }, `¡Hola, ${user?.username ? user.username.split(' ')[0] : 'Admin'}!`)}
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-400 mt-0.5 block font-normal truncate">
                    {formattedDate}
                  </p>
                </div>

                {/* QUICK CREATION DROPDOWN */}
                <div className="relative inline-block z-50 shrink-0" ref={menuRef}>
                  <div className="inline-flex items-stretch bg-[var(--color-primary,#97F2CC)] rounded-xl overflow-hidden shadow-md shadow-[var(--color-primary,#97F2CC)]/10 h-11 md:h-10">
                    <button 
                      onClick={() => {
                        setInitialTxType('expense');
                        setIsTxModalOpen(true);
                      }}
                      className="px-3 sm:px-4 font-bold text-xs sm:text-sm text-[var(--color-primary-text,#091E15)] hover:bg-black/5 active:scale-[0.98] transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                    >
                      <Plus className="w-4 h-4 stroke-[2.5] shrink-0" />
                      <span className="hidden sm:inline">{t('speedActions.newMovement', {}, 'Nuevo Movimiento')}</span>
                    </button>

                    <div className="w-[1px] bg-black/15 my-2" />

                    <button
                      onClick={() => setIsQuickMenuOpen(!isQuickMenuOpen)}
                      className="px-2.5 sm:px-3 hover:bg-black/5 active:scale-[0.98] transition-colors flex items-center justify-center text-[var(--color-primary-text,#091E15)] cursor-pointer"
                      title="Opciones de registro rápido"
                    >
                      <ChevronDown className={`w-4 h-4 stroke-[2.5] transition-transform duration-200 ${isQuickMenuOpen ? 'rotate-180' : ''}`} />
                    </button>
                  </div>

                  {/* EXPANDED DROPDOWN MENU */}
                  {isQuickMenuOpen && (
                    <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 p-3 z-[9999] bg-[#162226] border border-white/15 rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.95)] origin-top-right animate-scaleUp select-none backdrop-blur-none space-y-2 isolate">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400 px-3 py-1.5 block mb-1">
                        {t('dashboard.quickRegistration', {}, 'REGISTRO RÁPIDO')}
                      </span>

                      <button
                        onClick={() => {
                          setIsQuickMenuOpen(false);
                          setIsLoanModalOpen(true);
                        }}
                        className="w-full hover:bg-white/10 rounded-xl p-3 transition-all flex items-center gap-3.5 text-left cursor-pointer group"
                      >
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                          <Percent className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors">
                            {t('loans.newLoan', {}, 'Nuevo Saldo Pendiente')}
                          </h4>
                          <p className="text-xs text-slate-400 font-medium truncate mt-0.5">
                            {t('dashboard.loanSubtitle', {}, 'Deuda o compromiso por pagar')}
                          </p>
                        </div>
                      </button>

                      <button
                        onClick={() => {
                          setIsQuickMenuOpen(false);
                          setIsSubModalOpen(true);
                        }}
                        className="w-full hover:bg-white/10 rounded-xl p-3 transition-all flex items-center gap-3.5 text-left cursor-pointer group"
                      >
                        <div className="w-10 h-10 rounded-xl bg-[var(--color-primary,#AEEDD0)]/10 border border-[var(--color-primary,#AEEDD0)]/20 text-[var(--color-primary,#AEEDD0)] flex items-center justify-center shrink-0">
                          <RefreshCw className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-white group-hover:text-[var(--color-primary,#AEEDD0)] transition-colors">
                            {t('subscriptions.newSubscription', {}, 'Nueva Suscripción')}
                          </h4>
                          <p className="text-xs text-slate-400 font-medium truncate mt-0.5">
                            {t('dashboard.subSubtitle', {}, 'Pago y servicio recurrente')}
                          </p>
                        </div>
                      </button>

                      <button
                        onClick={() => {
                          setIsQuickMenuOpen(false);
                          setIsAccountModalOpen(true);
                        }}
                        className="w-full hover:bg-white/10 rounded-xl p-3 transition-all flex items-center gap-3.5 text-left cursor-pointer group"
                      >
                        <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
                          <Landmark className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
                            {t('accounts.newAccount', {}, 'Nueva Cuenta')}
                          </h4>
                          <p className="text-xs text-slate-400 font-medium truncate mt-0.5">
                            {t('dashboard.accountSubtitle', {}, 'Nuevo banco o billetera')}
                          </p>
                        </div>
                      </button>
                    </div>
                  )}
                </div>
              </header>

              {/* KPIS ROW: 2x2 COMPACT GRID ON MOBILE, 4-COLUMN SINGLE ROW ON DESKTOP */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 w-full relative z-10">
                
                {/* KPI 1: Patrimonio Neto Real (Colspan 2 en mobile, 1 en desktop) */}
                <div className="col-span-2 lg:col-span-1 growy-glass growy-card-hover rounded-2xl h-auto lg:h-32 p-4 lg:p-5 bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 flex flex-col justify-between space-y-1 lg:space-y-0 overflow-hidden isolate transform-gpu-layer">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                      {t('dashboard.netWealth', {}, 'Patrimonio Neto')}
                    </span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[var(--color-primary,#AEEDD0)]/15 text-[var(--color-primary,#AEEDD0)] border border-[var(--color-primary,#AEEDD0)]/20">
                      {baseCurrency}
                    </span>
                  </div>
                  {isLoading || !isInitialized ? (
                    <div className="space-y-2 py-1">
                      <div className="h-7 w-36 bg-white/5 rounded-lg animate-pulse" />
                      <div className="h-4 w-44 bg-white/5 rounded-md animate-pulse" />
                    </div>
                  ) : (
                    <>
                      <div className="text-xl lg:text-2xl font-bold tracking-tight text-white tabular-nums">
                        {formatCurrency(netWealth, baseCurrency)}
                      </div>
                      <div className="flex items-center gap-2 sm:gap-3 text-xs text-slate-300 font-medium tabular-nums flex-wrap pt-0.5">
                        <span className="text-emerald-400 font-semibold">{formatCurrency(totalBalance, baseCurrency)} {t('dashboard.assets', {}, 'Activos')}</span>
                        <span className="text-slate-400">•</span>
                        <span className="text-rose-400 font-semibold">{formatCurrency(totalPendingDebt, baseCurrency)} {t('dashboard.liabilities', {}, 'Pasivos')}</span>
                      </div>
                    </>
                  )}
                </div>

                {/* KPI 2: Ingresos del Mes (Col 1 en mobile, 1 en desktop) */}
                <div className="col-span-1 lg:col-span-1 h-24 lg:h-32 growy-glass growy-card-hover rounded-2xl p-3.5 lg:p-5 flex flex-col justify-between overflow-hidden isolate transform-gpu-layer">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-300 truncate block">
                    {t('dashboard.monthlyIncome', {}, 'Ingresos')}
                  </span>
                  {isLoading || !isInitialized ? (
                    <div className="space-y-2 py-0.5">
                      <div className="h-6 lg:h-7 w-24 bg-white/5 rounded-lg animate-pulse" />
                      <div className="h-3 w-16 bg-white/5 rounded-md animate-pulse" />
                    </div>
                  ) : (
                    <>
                      <div className="text-lg lg:text-2xl font-bold tracking-tight text-emerald-400 tabular-nums truncate">
                        {formatCurrency(monthlyIncomes, baseCurrency)}
                      </div>
                      <p className="text-xs text-slate-300 font-medium truncate">
                        <span className="text-emerald-400 font-bold tabular-nums">
                          {incomeDiffPercentage >= 0 ? `+${incomeDiffPercentage}%` : `${incomeDiffPercentage}%`}
                        </span> <span className="hidden sm:inline">{t('dashboard.vsPrevMonth', {}, 'vs. mes anterior')}</span><span className="sm:hidden">vs mes ant.</span>
                      </p>
                    </>
                  )}
                </div>

                {/* KPI 3: Gastos del Mes & Burn Rate (Col 2 en mobile, 1 en desktop) */}
                <div className="col-span-1 lg:col-span-1 h-24 lg:h-32 growy-glass growy-card-hover rounded-2xl p-3.5 lg:p-5 flex flex-col justify-between overflow-hidden isolate transform-gpu-layer">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-300 truncate block">
                    {t('dashboard.monthlyExpenses', {}, 'Gastos')}
                  </span>
                  {isLoading || !isInitialized ? (
                    <div className="space-y-2 py-0.5">
                      <div className="h-6 lg:h-7 w-24 bg-white/5 rounded-lg animate-pulse" />
                      <div className="h-3 w-16 bg-white/5 rounded-md animate-pulse" />
                    </div>
                  ) : (
                    <>
                      <div className="text-lg lg:text-2xl font-bold tracking-tight text-rose-400 tabular-nums truncate">
                        {formatCurrency(monthlyExpenses, baseCurrency)}
                      </div>
                      <p className="text-xs text-slate-300 font-medium truncate">
                        <span className="text-rose-400 font-bold tabular-nums">
                          {expenseDiffPercentage >= 0 ? `+${expenseDiffPercentage}%` : `${expenseDiffPercentage}%`}
                        </span> <span className="hidden sm:inline">{t('dashboard.vsPrevMonth', {}, 'vs. mes anterior')}</span><span className="sm:hidden">vs mes ant.</span>
                      </p>
                    </>
                  )}
                </div>

                {/* KPI 4: Tasa de Ahorro Real (Colspan 2 en mobile, 1 en desktop) */}
                <div className="col-span-2 lg:col-span-1 h-auto lg:h-32 growy-glass growy-card-hover rounded-2xl p-3.5 lg:p-5 flex flex-col justify-between space-y-1 lg:space-y-0 overflow-hidden isolate transform-gpu-layer">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                      {t('dashboard.savingsRate', {}, 'Tasa de Ahorro')}
                    </span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[var(--color-primary,#AEEDD0)]/15 text-[var(--color-primary,#AEEDD0)] border border-[var(--color-primary,#AEEDD0)]/20 tabular-nums">
                      Score {financialScore}/100
                    </span>
                  </div>
                  {isLoading || !isInitialized ? (
                    <div className="space-y-2 py-0.5">
                      <div className="h-6 lg:h-7 w-20 bg-white/5 rounded-lg animate-pulse" />
                      <div className="h-3 w-32 bg-white/5 rounded-md animate-pulse" />
                    </div>
                  ) : (
                    <>
                      <div className="text-lg lg:text-2xl font-bold tracking-tight text-white tabular-nums">
                        {savingsRate}%
                      </div>
                      <p className="text-xs text-slate-300 font-medium truncate">
                        {netSavingsAmount >= 0 ? t('dashboard.positiveCashflow', {}, 'Superávit:') : t('dashboard.deficitCashflow', {}, 'Déficit:')} <span className="text-white font-semibold tabular-nums">{formatCurrency(netSavingsAmount, baseCurrency)}</span>
                      </p>
                    </>
                  )}
                </div>

              </div>

              {/* CHARTS ROW */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full relative z-10">
                
                {/* Chart 1: Flujo de Caja y Proyección */}
                <div className="lg:col-span-2 growy-glass growy-card-hover rounded-2xl p-4 sm:p-6 flex flex-col justify-between space-y-4 overflow-hidden isolate transform-gpu-layer">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                        <span>{t('dashboard.cashflowTitle', {}, 'Flujo de Caja y Proyección')}</span>
                      </h2>
                      <p className="text-xs sm:text-sm text-slate-400 font-normal">{t('dashboard.cashflowSubtitle', {}, 'Ingresos vs Gastos')}</p>
                    </div>

                    <div className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/10 shrink-0 overflow-x-auto no-scrollbar">
                      <button
                        onClick={() => setChartPeriod('this_month')}
                        className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs font-medium active:scale-95 transition-all whitespace-nowrap ${
                          chartPeriod === 'this_month' ? 'bg-[var(--color-primary,#AEEDD0)] text-[#1E2D32] font-bold shadow-sm' : 'text-slate-300 hover:text-white'
                        }`}
                      >
                        {t('common.thisMonth', {}, 'Este Mes')}
                      </button>
                      <button
                        onClick={() => setChartPeriod('3_months')}
                        className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs font-medium active:scale-95 transition-all whitespace-nowrap ${
                          chartPeriod === '3_months' ? 'bg-[var(--color-primary,#AEEDD0)] text-[#1E2D32] font-bold shadow-sm' : 'text-slate-300 hover:text-white'
                        }`}
                      >
                        {t('common.threeMonths', {}, '3 Meses')}
                      </button>
                      <button
                        onClick={() => setChartPeriod('year')}
                        className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs font-medium active:scale-95 transition-all whitespace-nowrap ${
                          chartPeriod === 'year' ? 'bg-[var(--color-primary,#AEEDD0)] text-[#1E2D32] shadow-sm' : 'text-slate-300 hover:text-white'
                        }`}
                      >
                        {t('common.currentYear', {}, 'Año Actual')}
                      </button>
                    </div>
                  </div>

                  {currentMonthTx.length === 0 && chartPeriod === 'this_month' ? (
                    <div className="w-full h-48 sm:h-56 flex flex-col items-center justify-center text-center text-slate-300 space-y-3 bg-[#162226] rounded-xl border border-dashed border-white/10">
                      <Layers className="w-8 h-8 text-slate-400" />
                      <p className="text-xs font-medium">{t('dashboard.noMovementsMonth', {}, 'Sin movimientos registrados este mes')}</p>
                      <button
                        onClick={() => {
                          setInitialTxType('expense');
                          setIsTxModalOpen(true);
                        }}
                        className="px-4 h-10 rounded-xl bg-[#AEEDD0] text-[#1E2D32] font-bold text-xs inline-flex items-center gap-1.5 shadow cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" /> {t('dashboard.registerMovement', {}, 'Registrar Movimiento')}
                      </button>
                    </div>
                  ) : (
                    <div className="w-full h-48 sm:h-56 pt-4 pb-4 flex items-end justify-between gap-2.5 sm:gap-3 px-2 sm:px-3">
                      {trendPoints.map((pt, idx) => {
                        const incHeight = maxTrendVal > 0 ? Math.max(6, Math.round((pt.income / maxTrendVal) * 120)) : 6;
                        const expHeight = maxTrendVal > 0 ? Math.max(6, Math.round((pt.expense / maxTrendVal) * 120)) : 6;

                        return (
                          <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                            <div className="flex items-end gap-1 h-full w-full justify-center">
                              <div 
                                className="w-1/3 max-w-[12px] rounded-t-md bg-emerald-400 transition-all duration-300 hover:opacity-80 relative group/bar"
                                style={{ height: `${incHeight}px` }}
                              >
                                <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-[#1E2D32] border border-white/20 text-emerald-400 text-xs font-semibold px-2 py-0.5 rounded opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap z-20 pointer-events-none tabular-nums shadow-lg">
                                  {formatCurrency(pt.income)}
                                </div>
                              </div>

                              <div 
                                className="w-1/3 max-w-[12px] rounded-t-md bg-rose-400 transition-all duration-300 hover:opacity-80 relative group/bar"
                                style={{ height: `${expHeight}px` }}
                              >
                                <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-[#1E2D32] border border-white/20 text-rose-400 text-xs font-semibold px-2 py-0.5 rounded opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap z-20 pointer-events-none tabular-nums shadow-lg">
                                  {formatCurrency(pt.expense)}
                                </div>
                              </div>
                            </div>

                            <span className="text-xs font-semibold text-slate-300 group-hover:text-white transition-colors mt-1">
                              {pt.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="p-3 rounded-xl bg-[#162226] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <Activity className="w-3.5 h-3.5 text-[var(--color-primary,#AEEDD0)] shrink-0" />
                      <span className="text-slate-300 font-medium">
                        {t('dashboard.projectedMonthEnd', { days: remainingDays }, `Proyección de saldo al cierre del mes (${remainingDays} días restantes):`)}
                      </span>
                    </div>
                    <span className="font-bold text-white text-xs sm:text-sm tabular-nums">
                      {formatCurrency(projectedMonthEndBalance, baseCurrency)}
                    </span>
                  </div>
                </div>

                {/* Chart 2: Donut Chart */}
                <div className="growy-glass growy-card-hover rounded-2xl p-4 sm:p-6 flex flex-col justify-between space-y-4 overflow-hidden isolate transform-gpu-layer">
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">{t('dashboard.categoryDistribution', {}, 'Distribución por Categoría')}</h2>
                    <p className="text-xs sm:text-sm text-slate-400 font-normal">{t('dashboard.categorySubtitle', {}, 'Desglose del mes')}</p>
                  </div>

                  {categoryExpenses.length === 0 ? (
                    <div className="w-full h-44 flex flex-col items-center justify-center text-center text-slate-300 space-y-2 bg-[#162226] rounded-xl border border-dashed border-white/10">
                      <Layers className="w-7 h-7 text-slate-400" />
                      <p className="text-xs font-medium">{t('dashboard.noExpensesMonth', {}, 'Sin gastos registrados este mes')}</p>
                    </div>
                  ) : (
                    <div className="relative w-40 h-40 mx-auto flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                        <circle
                          cx="50"
                          cy="50"
                          r="42"
                          className="text-white/5 stroke-current"
                          strokeWidth="8"
                          fill="transparent"
                        />
                        {categoryExpenses.reduce((acc, cat, idx) => {
                          const pct = totalCatExpenses > 0 ? cat.totalSpent / totalCatExpenses : 0;
                          const strokeDasharray = 2 * Math.PI * 42;
                          const dash = pct * strokeDasharray;
                          const offset = acc.currentOffset;
                          acc.currentOffset -= dash;

                          acc.elements.push(
                            <circle
                              key={cat.id || idx}
                              cx="50"
                              cy="50"
                              r="42"
                              stroke={cat.color || '#FF6B6B'}
                              strokeWidth="8"
                              strokeDasharray={`${dash} ${strokeDasharray - dash}`}
                              strokeDashoffset={offset}
                              fill="transparent"
                              className="transition-all duration-500 hover:opacity-80"
                            />
                          );
                          return acc;
                        }, { currentOffset: 0, elements: [] }).elements}
                      </svg>

                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2 pointer-events-none">
                        <span className="text-xs text-slate-300 font-semibold">{t('common.spent', {}, 'Gastado')}</span>
                        <span className="text-lg font-bold text-white tracking-tight tabular-nums">
                          {formatCurrency(totalCatExpenses)}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2 pt-2 border-t border-white/5 max-h-36 overflow-y-auto pr-1">
                    {categoryExpenses.length === 0 ? (
                      <div className="text-center text-xs text-slate-300">
                        {t('dashboard.noExpensesMonth', {}, 'Sin gastos registrados este mes')}
                      </div>
                    ) : (
                      categoryExpenses.slice(0, 4).map((cat) => {
                        const pct = totalCatExpenses > 0 ? Math.round((cat.totalSpent / totalCatExpenses) * 100) : 0;
                        return (
                          <div key={cat.id} className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2 min-w-0">
                              <span 
                                className="w-2 h-2 rounded-full shrink-0" 
                                style={{ backgroundColor: cat.color || '#FF6B6B' }}
                              />
                              <span className="text-white font-medium truncate">{cat.emoji} {cat.name}</span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-slate-300 font-semibold tabular-nums">{pct}%</span>
                              <span className="text-white font-bold tabular-nums">{formatCurrency(cat.totalSpent)}</span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

              </div>

              {/* LOWER WIDGETS ROW */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch w-full relative z-10">
                
                {/* WIDGET 1: Mini Portfolio de Cuentas */}
                <div className="growy-glass growy-card-hover rounded-2xl p-4 sm:p-6 h-full flex flex-col justify-between space-y-4 overflow-hidden isolate transform-gpu-layer">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Landmark className="w-4 h-4 text-[var(--color-primary,#AEEDD0)]" />
                      <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">{t('dashboard.miniPortfolio', {}, 'Mini Portfolio')}</h2>
                    </div>
                    <button 
                      onClick={() => setActiveTab('accounts')}
                      className="text-xs font-semibold text-[var(--color-primary,#AEEDD0)] hover:underline"
                    >
                      {t('dashboard.viewAccounts', {}, 'Ver Cuentas')}
                    </button>
                  </div>

                  <div className="space-y-3 flex-1">
                    {safeAccountsList.length === 0 ? (
                      <div className="text-center py-6 text-xs text-slate-300 space-y-2">
                        <p>{t('dashboard.noAccounts', {}, 'No tienes cuentas registradas.')}</p>
                        <button
                          onClick={() => setIsAccountModalOpen(true)}
                          className="px-4 h-11 rounded-xl bg-[#AEEDD0] text-[#1E2D32] font-bold text-xs inline-flex items-center gap-1 shadow"
                        >
                          <Plus className="w-3.5 h-3.5" /> {t('dashboard.createAccount', {}, 'Crear Cuenta')}
                        </button>
                      </div>
                    ) : (
                      safeAccountsList.slice(0, 3).map((acc) => (
                        <div 
                          key={acc.id}
                          className="p-3 sm:p-3.5 rounded-xl bg-[#162226] border border-white/10 flex items-center justify-between hover:bg-white/[0.06] transition-all"
                        >
                          <div className="flex items-center gap-3 min-w-0 pr-2">
                            <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-base shrink-0">
                              {acc.emoji || '🏦'}
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-xs font-semibold text-white truncate">{acc.name}</h4>
                              <span className="text-[11px] text-slate-300 font-medium">{acc.currency || 'USD'}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs font-bold text-white tabular-nums">
                              {formatCurrency(acc.balance, acc.currency || 'USD')}
                            </span>
                            <button
                              onClick={() => {
                                setInitialTxType('transfer');
                                setIsTxModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-[var(--color-primary,#AEEDD0)] hover:bg-white/10 active:scale-95 transition-all"
                              title={t('dashboard.transferBetween', {}, 'Transferir entre cuentas')}
                            >
                              <ArrowLeftRight className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* WIDGET 2: Alertas de Presupuesto */}
                <div className="growy-glass growy-card-hover rounded-2xl p-4 sm:p-6 h-full flex flex-col justify-between space-y-4 overflow-hidden isolate transform-gpu-layer">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertCircle className={`w-4 h-4 ${criticalBudgets.length > 0 ? 'text-amber-400' : 'text-[var(--color-primary,#AEEDD0)]'}`} />
                      <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                        {criticalBudgets.length > 0
                          ? t('dashboard.budgetAlerts', {}, 'Alertas de Presupuesto')
                          : t('dashboard.topExpenses', {}, 'Top 3 Gastos del Mes')}
                      </h2>
                    </div>
                    <button 
                      onClick={() => setActiveTab('categories')}
                      className="text-xs font-semibold text-[var(--color-primary,#AEEDD0)] hover:underline"
                    >
                      {t('dashboard.viewCategories', {}, 'Ver Categorías')}
                    </button>
                  </div>

                  <div className="space-y-3 flex-1">
                    {criticalBudgets.length > 0 ? (
                      criticalBudgets.map((cat) => {
                        const isOverLimit = cat.percentage >= 90;
                        const isWarning = cat.percentage >= 75 && cat.percentage < 90;
                        const barColor = isOverLimit ? '#F87171' : isWarning ? '#F59E0B' : (cat.color || '#34D399');

                        return (
                          <div key={cat.id} className="p-3 rounded-xl bg-[#162226] border border-white/10 space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-white flex items-center gap-1.5">
                                <span>{cat.emoji}</span>
                                <span>{cat.name}</span>
                              </span>
                              
                              <div className="flex items-center gap-2">
                                {isOverLimit && (
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 uppercase">
                                    {t('dashboard.limitReached', {}, '¡Límite alcanzado!')}
                                  </span>
                                )}
                                <span className="font-bold text-white tabular-nums">{cat.percentage}%</span>
                              </div>
                            </div>

                            <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden border border-white/5">
                              <div 
                                className="h-full rounded-full transition-all duration-300"
                                style={{ 
                                  width: `${Math.min(100, cat.percentage)}%`, 
                                  backgroundColor: barColor 
                                }}
                              />
                            </div>

                            <div className="flex justify-between items-center text-[11px] text-slate-300 font-medium tabular-nums">
                              <span>{t('dashboard.executed', {}, 'Ejecutado')}: {formatCurrency(cat.executed)}</span>
                              <span>{t('dashboard.limit', {}, 'Límite')}: {formatCurrency(cat.target)}</span>
                            </div>
                          </div>
                        );
                      })
                    ) : topExpenses.length > 0 ? (
                      topExpenses.map((cat) => {
                        const pct = totalCatExpenses > 0 ? Math.round((cat.totalSpent / totalCatExpenses) * 100) : 0;
                        return (
                          <div key={cat.id} className="p-3 rounded-xl bg-[#162226] border border-white/10 space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-white flex items-center gap-1.5">
                                <span>{cat.emoji}</span>
                                <span>{cat.name}</span>
                              </span>
                              <span className="font-bold text-white tabular-nums">{formatCurrency(cat.totalSpent)}</span>
                            </div>

                            <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden border border-white/5">
                              <div 
                                className="h-full rounded-full transition-all duration-300"
                                style={{ 
                                  width: `${Math.min(100, pct)}%`, 
                                  backgroundColor: cat.color || '#34D399' 
                                }}
                              />
                            </div>

                            <div className="flex justify-between items-center text-[11px] text-slate-300 font-medium">
                              <span className="tabular-nums">{pct}% {t('dashboard.ofTotalSpent', {}, 'del total gastado')}</span>
                              <span className="text-emerald-400 font-semibold">
                                {t('dashboard.healthyBudget', {}, 'Presupuesto saludable')}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-6 text-xs text-slate-300 space-y-1">
                        <p>{t('dashboard.noExpensesMonth', {}, 'Sin gastos registrados este mes')}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* WIDGET 3: Próximos Compromisos */}
                <div className="growy-glass growy-card-hover rounded-2xl p-4 sm:p-6 h-full flex flex-col justify-between space-y-4 overflow-hidden isolate transform-gpu-layer">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-400" />
                      <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">{t('dashboard.upcomingCommitments', {}, 'Próximos Compromisos')}</h2>
                    </div>
                    <button 
                      onClick={() => setActiveTab('loans')}
                      className="text-xs font-semibold text-[var(--color-primary,#AEEDD0)] hover:underline"
                    >
                      {t('dashboard.viewLoans', {}, 'Ver Saldos')}
                    </button>
                  </div>

                  <div className="space-y-3 flex-1">
                    {pendingLoansList.length === 0 && activeSubsList.length === 0 ? (
                      <div className="text-center py-6 text-xs text-slate-300">
                        {t('dashboard.noCommitments', {}, '¡Excelente! No tienes saldos ni cobros pendientes próximos.')}
                      </div>
                    ) : (
                      <>
                        {pendingLoansList.slice(0, 2).map((loan) => (
                          <div 
                            key={loan.id}
                            className="p-3 sm:p-3.5 rounded-xl bg-[#162226] border border-amber-500/20 flex items-center justify-between hover:bg-white/[0.06] transition-all"
                          >
                            <div className="min-w-0 flex-1 pr-2">
                              <h4 className="text-xs font-semibold text-white truncate">{loan.description}</h4>
                              <p className="text-[11px] text-amber-300 font-medium">
                                {t('dashboard.due', {}, 'Vence')}: {loan.dueDate || 'Pronto'} • {loan.currency || 'USD'}
                              </p>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-xs font-bold text-white tabular-nums">
                                {formatCurrency(loan.amount, loan.currency || 'USD')}
                              </span>
                              <button
                                onClick={() => setLoanToPay(loan)}
                                className="py-1 px-2.5 rounded-lg bg-[#AEEDD0] text-[#1E2D32] text-xs font-bold flex items-center gap-1 shadow cursor-pointer"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>{t('common.payNow', {}, 'Pagar')}</span>
                              </button>
                            </div>
                          </div>
                        ))}

                        {activeSubsList.slice(0, 2).map((sub) => (
                          <div 
                            key={sub.id}
                            className="p-3 sm:p-3.5 rounded-xl bg-[#162226] border border-white/10 flex items-center justify-between hover:bg-white/[0.06] transition-all"
                          >
                            <div className="min-w-0 flex-1 pr-2">
                              <h4 className="text-xs font-semibold text-white truncate flex items-center gap-1">
                                <span>{sub.emoji}</span>
                                <span>{sub.name}</span>
                              </h4>
                              <p className="text-[11px] text-slate-300 font-medium">
                                {t('dashboard.autoDebitDay', { day: sub.billingDay }, `Débito aut. el día ${sub.billingDay} de cada mes`)}
                              </p>
                            </div>

                            <div className="text-xs font-bold text-rose-400 shrink-0 tabular-nums">
                              {formatCurrency(sub.amount, sub.currency || 'USD')} / {t('common.month', {}, 'mes')}
                            </div>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                </div>

              </div>

              {/* RECENT ACTIVITY FEED */}
              <div className="growy-glass growy-card-hover rounded-2xl p-4 sm:p-6 w-full space-y-4 overflow-hidden isolate transform-gpu-layer relative z-10">
                <div className="flex items-center justify-between">
                  <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                    <span>{t('dashboard.recentActivity', {}, 'Actividad Reciente')}</span>
                    <span className="w-2 h-2 rounded-full bg-[var(--color-primary,#AEEDD0)] animate-pulse" />
                  </h2>

                  <button 
                    onClick={() => setActiveTab('transactions')}
                    className="text-xs font-semibold text-[var(--color-primary,#AEEDD0)] hover:underline flex items-center gap-1"
                  >
                    <span>{t('common.viewFullHistory', {}, 'Ver historial completo →')}</span>
                  </button>
                </div>

                {recentTransactions.length === 0 ? (
                  <div className="text-center py-6 text-xs text-slate-300 space-y-2">
                    <p>{t('dashboard.noMovements', {}, 'No hay movimientos registrados. ¡Agrega tu primera transacción!')}</p>
                    <button
                      onClick={() => {
                        setInitialTxType('expense');
                        setIsTxModalOpen(true);
                      }}
                      className="px-4 h-11 rounded-xl bg-[#AEEDD0] text-[#1E2D32] font-bold text-xs inline-flex items-center gap-1.5 shadow cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> {t('dashboard.registerMovement', {}, 'Registrar Movimiento')}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {recentTransactions.map((tx) => {
                      if (!tx) return null;
                      
                      const acc = safeAccountsList.find(a => a?.id === tx.accountId) || { name: 'Cuenta General', currency: 'USD', currencySymbol: '$', emoji: '💳' };
                      const cat = safeCategoriesList.find(c => c?.id === tx.categoryId) || { name: 'General', emoji: '📌' };

                      const isIncome = tx.type === 'income';
                      const isExpense = tx.type === 'expense';
                      const emoji = tx.type === 'transfer' ? '🔁' : (cat?.emoji || '💰');

                      return (
                        <div 
                          key={tx.id || Math.random()}
                          className="p-3.5 rounded-xl bg-[#162226] border border-white/10 flex items-center justify-between hover:bg-white/[0.06] transition-all group"
                        >
                          <div className="flex items-center gap-3 min-w-0 pr-2">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm shrink-0 ${
                              isIncome ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' : isExpense ? 'bg-rose-500/15 text-rose-400 border border-rose-500/20' : 'bg-sky-500/15 text-sky-400 border border-sky-500/20'
                            }`}>
                              {emoji}
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-xs font-semibold text-white group-hover:text-slate-200 transition-colors truncate">
                                {tx.description || cat?.name || 'Movimiento'}
                              </h4>
                              <p className="text-[11px] text-slate-300 truncate font-medium">{acc?.name} • {formatDateLabel(tx.date, language)}</p>
                            </div>
                          </div>

                          <div className={`text-xs font-bold shrink-0 tabular-nums ${isIncome ? 'text-emerald-400' : isExpense ? 'text-rose-400' : 'text-sky-400'}`}>
                            {isIncome ? '+ ' : isExpense ? '- ' : ''}
                            {formatCurrency(tx.amount, tx.currency || acc.currency || 'USD')}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </>
          ) : activeTab === 'accounts' ? (
            <AccountsModule />
          ) : activeTab === 'categories' ? (
            <CategoriesModule />
          ) : activeTab === 'transactions' ? (
            <TransactionsModule />
          ) : activeTab === 'loans' ? (
            <LoansModule />
          ) : activeTab === 'subscriptions' ? (
            <SubscriptionsModule />
          ) : activeTab === 'settings' ? (
            <SettingsModule />
          ) : activeTab === 'feedback' ? (
            <FeedbackModule />
          ) : (
            <AboutModule />
          )}
        </div>

      </main>

      {/* MOBILE BOTTOM NAVIGATION BAR (ERGONOMIC 4-TAB + ACTION FAB + MORE DRAWER) */}
      <BottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isMoreSheetOpen={isMoreSheetOpen}
        setIsMoreSheetOpen={setIsMoreSheetOpen}
        onOpenNewTx={() => {
          setInitialTxType('expense');
          setIsTxModalOpen(true);
        }}
        isModalActive={isTxModalOpen || isLoanModalOpen || isSubModalOpen || isAccountModalOpen || !!loanToPay}
      />

      {/* MOBILE "MORE" BOTTOM SHEET DRAWER */}
      {isMoreSheetOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex flex-col justify-end animate-fadeIn">
          {/* Backdrop Overlay */}
          <div 
            className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity cursor-pointer"
            onClick={() => setIsMoreSheetOpen(false)}
          />

          {/* Slide-Up Bottom Sheet */}
          <div className="relative z-10 w-full bg-[#131E22] border-t border-white/10 rounded-t-3xl p-6 pb-safe shadow-[0_-12px_45px_rgba(0,0,0,0.85)] max-h-[85vh] overflow-y-auto animate-scaleUp">
            {/* Drag Handle Bar */}
            <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-4" />

            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[var(--color-primary,#AEEDD0)]/15 border border-[var(--color-primary,#AEEDD0)]/30 flex items-center justify-center p-1.5 shadow-inner">
                  <img src="/logos/Transparent.svg" alt="Growy" className="w-full h-full object-contain" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white tracking-tight">{t('common.moreOptions', {}, 'Más Opciones')}</h3>
                  <p className="text-[11px] text-slate-400">{user?.username || 'Usuario'} • Plan Pro</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setIsMoreSheetOpen(false)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Grid of Drawer Modules (2 Columns) */}
            <div className="grid grid-cols-2 gap-3 py-1">
              {[
                { 
                  id: 'loans', 
                  label: t('nav.loans', {}, 'Saldos Pendientes'), 
                  icon: Percent, 
                  badge: pendingLoansList.length > 0 ? `${pendingLoansList.length}` : null, 
                  color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' 
                },
                { 
                  id: 'subscriptions', 
                  label: t('nav.subscriptions', {}, 'Suscripciones'), 
                  icon: RefreshCw, 
                  badge: activeSubsList.length > 0 ? `${activeSubsList.length}` : null, 
                  color: 'text-[var(--color-primary,#AEEDD0)] bg-[var(--color-primary,#AEEDD0)]/10 border-[var(--color-primary,#AEEDD0)]/20' 
                },
                { 
                  id: 'categories', 
                  label: t('nav.categories', {}, 'Categorías'), 
                  icon: Tag, 
                  color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' 
                },
                { 
                  id: 'settings', 
                  label: t('nav.settings', {}, 'Configuración'), 
                  icon: SettingsIcon, 
                  color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20' 
                },
                { 
                  id: 'feedback', 
                  label: t('nav.feedback', {}, 'Reportes y Feedback'), 
                  icon: MessageSquarePlus, 
                  color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' 
                },
                { 
                  id: 'about', 
                  label: t('nav.about', {}, 'Acerca de SIMPORA'), 
                  icon: Info, 
                  color: 'text-sky-400 bg-sky-500/10 border-sky-500/20' 
                },
              ].map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(item.id);
                      setIsMoreSheetOpen(false);
                    }}
                    className={`p-2.5 sm:p-3 rounded-2xl border flex items-center gap-2.5 text-left transition-all active:scale-95 cursor-pointer ${
                      isActive 
                        ? 'bg-[var(--color-primary,#AEEDD0)] text-[#1E2D32] border-[var(--color-primary,#AEEDD0)] font-bold shadow-md' 
                        : 'bg-[#182428] border-white/10 text-white hover:bg-white/5'
                    }`}
                  >
                    <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl border flex items-center justify-center shrink-0 ${
                      isActive ? 'bg-[#1E2D32]/10 border-[#1E2D32]/20 text-[#1E2D32]' : item.color
                    }`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] sm:text-xs font-medium leading-snug break-words">{item.label}</p>
                      {item.badge && (
                        <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full inline-block mt-0.5 ${
                          isActive ? 'bg-[#1E2D32] text-white' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}>
                          {item.badge}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Log Out Action (Full width row) */}
            <div className="pt-4 mt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => {
                  setIsMoreSheetOpen(false);
                  onLogout();
                }}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl text-xs font-bold text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 active:scale-[0.98] transition-all cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>{t('nav.logout', {}, 'Cerrar Sesión')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QUICK ACTION MODALS */}
      <TransactionModal
        isOpen={isTxModalOpen}
        onClose={() => setIsTxModalOpen(false)}
        onSave={handleSaveTransaction}
        accounts={safeAccountsList}
        categories={safeCategoriesList}
        initialType={initialTxType}
      />

      <LoanModal
        isOpen={isLoanModalOpen}
        onClose={() => setIsLoanModalOpen(false)}
        onSave={handleSaveLoan}
        categories={safeCategoriesList}
      />

      <SubscriptionModal
        isOpen={isSubModalOpen}
        onClose={() => setIsSubModalOpen(false)}
        onSave={handleSaveSub}
        accounts={safeAccountsList}
        categories={safeCategoriesList}
      />

      <AccountModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        onSave={handleSaveAccount}
      />

      <PayLoanModal
        isOpen={!!loanToPay}
        onClose={() => setLoanToPay(null)}
        onConfirmPay={handleConfirmPayLoan}
        loan={loanToPay}
        accounts={safeAccountsList}
      />

      {/* Toast Notification for Processed Auto-Debits */}
      {autoDebitsNotification && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-2xl bg-[#141E22]/95 border border-[#AEEDD0]/30 shadow-2xl backdrop-blur-xl flex items-center gap-3 max-w-sm animate-fadeIn">
          <div className="w-10 h-10 rounded-xl bg-[#AEEDD0]/10 flex items-center justify-center text-[#AEEDD0] shrink-0 font-bold">
            <RefreshCw className="w-5 h-5 animate-spin" />
          </div>
          <div className="flex-1 min-w-0 text-left">
            <h4 className="text-xs font-bold text-white">
              {language === 'es' ? 'Débitos Automáticos Procesados 🔄' : 'Auto-Debits Processed 🔄'}
            </h4>
            <p className="text-[11px] text-slate-300 truncate">
              {autoDebitsNotification.names.join(', ')}
            </p>
          </div>
          <button
            type="button"
            onClick={clearAutoDebitsNotification}
            className="text-slate-400 hover:text-white text-xs font-bold px-2 py-1 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Toast Notification for DB Operations */}
      {dbStatusToast && (
        <div className={`fixed bottom-6 left-6 z-50 p-4 rounded-2xl bg-[#141E22]/95 border shadow-2xl backdrop-blur-xl flex items-center gap-3 max-w-sm animate-fadeIn ${
          dbStatusToast.type === 'error' ? 'border-rose-500/40 text-rose-300' : 'border-[#AEEDD0]/30 text-white'
        }`}>
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 font-bold ${
            dbStatusToast.type === 'error' ? 'bg-rose-500/20 text-rose-400' : 'bg-[#AEEDD0]/15 text-[#AEEDD0]'
          }`}>
            {dbStatusToast.type === 'error' ? '⚠️' : '✅'}
          </div>
          <p className="text-xs font-semibold truncate flex-1">
            {dbStatusToast.message}
          </p>
          <button
            type="button"
            onClick={clearDbStatusToast}
            className="text-slate-400 hover:text-white text-xs font-bold px-1.5 py-0.5 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      </div>
    </div>
  );
}
