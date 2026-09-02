import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  HeartPulse, Sparkles, TrendingUp, TrendingDown, AlertTriangle, 
  CheckCircle2, ArrowRight, ShieldCheck, ChevronRight, X, PiggyBank, 
  Percent, Target, Info
} from 'lucide-react';
import useFinancialHealth from '../../hooks/useFinancialHealth';
import { useSettings } from '../../context/SettingsContext';
import { formatCurrency } from '../../utils/formatters';

export default function FinancialHealthCard({
  onNavigateTab,
  className = ''
}) {
  const { score, tier, statusTitle, statusMessage, breakdown } = useFinancialHealth();
  const { t, language, baseCurrency } = useSettings();
  const isEs = String(language || 'es').toLowerCase().startsWith('es');

  const [isModalOpen, setIsModalOpen] = useState(false);

  // Dynamic Theme Colors based on Score
  const theme = useMemo(() => {
    if (score >= 80) {
      return {
        color: 'var(--accent, #97F2CC)',
        hexColor: 'var(--accent, #97F2CC)',
        bgClass: 'bg-[var(--accent)]/10 border-[var(--accent)]/20 text-[var(--accent)]',
        badgeClass: 'bg-[var(--accent)]/15 text-[var(--accent)] border-[var(--accent)]/30',
        ringGlow: 'var(--color-glow, rgba(151, 242, 204, 0.25))',
        icon: Sparkles
      };
    }
    if (score >= 60) {
      return {
        color: '#F59E0B',
        hexColor: '#F59E0B',
        bgClass: 'bg-amber-500/10 border-amber-500/20 text-amber-300',
        badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
        ringGlow: 'rgba(245, 158, 11, 0.25)',
        icon: TrendingUp
      };
    }
    return {
      color: '#F87171',
      hexColor: '#F87171',
      bgClass: 'bg-rose-500/10 border-rose-500/20 text-rose-300',
      badgeClass: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
      ringGlow: 'rgba(248, 113, 113, 0.25)',
      icon: AlertTriangle
    };
  }, [score]);

  // Circular Gauge Calculations
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const StatusIcon = theme.icon;

  return (
    <>
      <div 
        onClick={() => setIsModalOpen(true)}
        className={`growy-glass growy-card-hover rounded-2xl p-4 sm:p-6 flex flex-col justify-between space-y-4 cursor-pointer relative overflow-hidden isolate group ${className}`}
        title={isEs ? 'Haz clic para ver el desglose detallado' : 'Click to view detailed breakdown'}
      >
        {/* Subtle background ambient glow */}
        <div 
          className="absolute -right-12 -top-12 w-36 h-36 rounded-full blur-3xl pointer-events-none transition-opacity opacity-30 group-hover:opacity-60"
          style={{ backgroundColor: score >= 80 ? 'var(--accent, #97F2CC)' : theme.hexColor }}
        />

        {/* Header */}
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-2">
            <HeartPulse className="w-4 h-4 text-[var(--accent,#97F2CC)] animate-pulse" />
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
              {t('financial_health.title', {}, 'Salud Financiera')}
            </h2>
          </div>
        </div>

        {/* Main Score & Dynamic Message Body */}
        <div className="flex items-center gap-4 relative z-10">
          {/* Circular SVG Gauge */}
          <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r={radius}
                className="text-white/[0.06] stroke-current"
                strokeWidth="8"
                fill="transparent"
              />
              <circle
                cx="50"
                cy="50"
                r={radius}
                stroke={score >= 80 ? 'var(--accent, #97F2CC)' : theme.hexColor}
                strokeWidth="8"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
                className="transition-all duration-1000 ease-out"
                style={{
                  filter: `drop-shadow(0 0 6px ${score >= 80 ? 'var(--color-glow, rgba(151,242,204,0.3))' : theme.ringGlow})`
                }}
              />
            </svg>

            <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none pointer-events-none">
              <span className="text-2xl sm:text-3xl font-black text-white tabular-nums tracking-tight">
                {score}
              </span>
              <span className="text-[10px] text-slate-400 font-semibold -mt-1">
                / 100
              </span>
            </div>
          </div>

          {/* Dynamic Sarcastic / Realistic Message */}
          <div className="flex-1 min-w-0 pr-1">
            <p className="text-sm leading-relaxed text-slate-300 break-words line-clamp-3 group-hover:text-white transition-colors">
              "{statusMessage}"
            </p>
            <div className="flex items-center gap-1 text-[11px] text-[var(--accent,#97F2CC)] font-semibold mt-2 group-hover:underline">
              <span>{isEs ? 'Ver diagnóstico completo' : 'View full diagnosis'}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>

        {/* Quick Micro Breakdown Progress Bars */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/5 relative z-10">
          {/* 1. Ahorro */}
          <div className="p-2 rounded-xl bg-white/[0.03] border border-white/5 space-y-1">
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400">
              <div className="flex items-center gap-1.5 min-w-0">
                <PiggyBank className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />
                <span className="truncate">{isEs ? 'Ahorro' : 'Savings'}</span>
              </div>
              <span className="text-white font-bold tabular-nums text-xs shrink-0">{breakdown?.savings?.points ?? 0}/40</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
              <div 
                className="h-full rounded-full transition-all duration-500 bg-[var(--accent)]"
                style={{ width: `${((breakdown?.savings?.points ?? 0) / 40) * 100}%`, backgroundColor: 'var(--accent)' }}
              />
            </div>
          </div>

          {/* 2. Deudas */}
          <div className="p-2 rounded-xl bg-white/[0.03] border border-white/5 space-y-1">
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400">
              <div className="flex items-center gap-1.5 min-w-0">
                <Percent className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />
                <span className="truncate">{isEs ? 'Deudas' : 'Debts'}</span>
              </div>
              <span className="text-white font-bold tabular-nums text-xs shrink-0">{breakdown?.debts?.points ?? 0}/30</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
              <div 
                className="h-full rounded-full transition-all duration-500 bg-[var(--accent)]"
                style={{ width: `${((breakdown?.debts?.points ?? 0) / 30) * 100}%`, backgroundColor: 'var(--accent)' }}
              />
            </div>
          </div>

          {/* 3. Presupuesto */}
          <div className="p-2 rounded-xl bg-white/[0.03] border border-white/5 space-y-1">
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400">
              <div className="flex items-center gap-1.5 min-w-0">
                <Target className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />
                <span className="truncate">{isEs ? 'Metas' : 'Budget'}</span>
              </div>
              <span className="text-white font-bold tabular-nums text-xs shrink-0">{breakdown?.budget?.points ?? 0}/30</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
              <div 
                className="h-full rounded-full transition-all duration-500 bg-[var(--accent)]"
                style={{ width: `${((breakdown?.budget?.points ?? 0) / 30) * 100}%`, backgroundColor: 'var(--accent)' }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* DETAILED DIAGNOSIS MODAL - RENDERED IN ROOT PORTAL */}
      {isModalOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-[#0F141C] border border-white/10 rounded-2xl sm:rounded-3xl p-5 sm:p-7 space-y-5 shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar"
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`p-2 rounded-xl ${theme.bgClass}`}>
                    <HeartPulse className="w-5 h-5 text-current" />
                  </span>
                  <div>
                    <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">
                      {isEs ? 'Diagnóstico de Salud Financiera' : 'Financial Health Diagnosis'}
                    </h3>
                    <span className="text-xs text-slate-400 font-medium">
                      {isEs ? 'Desglose detallado de tu puntuación' : 'Detailed score breakdown'}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Score Banner */}
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  {isEs ? 'Puntaje General' : 'Overall Score'}
                </span>
                <p className="text-2xl sm:text-3xl font-black text-white tabular-nums">
                  {score} <span className="text-sm font-semibold text-slate-400">/ 100 pts</span>
                </p>
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${theme.badgeClass}`}>
                  {statusTitle}
                </span>
              </div>

              <div className="text-right max-w-xs">
                <p className="text-xs font-medium text-slate-200 italic">
                  "{statusMessage}"
                </p>
              </div>
            </div>

            {/* Detailed 3 Metric Breakdowns */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                {isEs ? 'Desglose de las 3 Dimensiones' : '3 Dimension Breakdown'}
              </h4>

              {/* 1. Ahorro */}
              <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-white text-xs sm:text-sm">
                    <PiggyBank className="w-4 h-4 text-[var(--accent)]" />
                    <span>{isEs ? '1. Ratio Ahorro / Gasto' : '1. Savings / Expense Ratio'}</span>
                  </div>
                  <span className="font-black text-white text-xs sm:text-sm tabular-nums">
                    {breakdown?.savings?.points ?? 0} / 40 pts
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-normal">
                  {isEs
                    ? `Tasa actual de ahorro: ${breakdown?.savings?.rate ?? 0}%. Meta recomendada: ≥ 20% de tus ingresos mensuales.`
                    : `Current savings rate: ${breakdown?.savings?.rate ?? 0}%. Target recommended: ≥ 20% of monthly income.`}
                </p>
                <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                  <div 
                    className="h-full rounded-full bg-[var(--accent)] transition-all duration-500"
                    style={{ width: `${((breakdown?.savings?.points ?? 0) / 40) * 100}%`, backgroundColor: 'var(--accent)' }}
                  />
                </div>
              </div>

              {/* 2. Deudas */}
              <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-white text-xs sm:text-sm">
                    <Percent className="w-4 h-4 text-[var(--accent)]" />
                    <span>{isEs ? '2. Deudas y Compromisos al Día' : '2. Debts and Commitments on Track'}</span>
                  </div>
                  <span className="font-black text-white text-xs sm:text-sm tabular-nums">
                    {breakdown?.debts?.points ?? 0} / 30 pts
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-normal">
                  {(breakdown?.debts?.overdueCount ?? 0) === 0
                    ? (isEs ? '¡Excelente! No tienes compromisos financieros vencidos.' : 'Great! No overdue financial commitments.')
                    : (isEs
                        ? `Tienes ${breakdown?.debts?.overdueCount} deuda(s) vencida(s). Paga tus saldos para recuperar hasta 30 puntos.`
                        : `You have ${breakdown?.debts?.overdueCount} overdue debt(s). Settle them to recover up to 30 points.`)}
                </p>
                <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                  <div 
                    className="h-full rounded-full bg-[var(--accent)] transition-all duration-500"
                    style={{ width: `${((breakdown?.debts?.points ?? 0) / 30) * 100}%`, backgroundColor: 'var(--accent)' }}
                  />
                </div>
              </div>

              {/* 3. Presupuesto */}
              <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-white text-xs sm:text-sm">
                    <Target className="w-4 h-4 text-[var(--accent)]" />
                    <span>{isEs ? '3. Apego a Presupuestos por Categoría' : '3. Category Budget Adherence'}</span>
                  </div>
                  <span className="font-black text-white text-xs sm:text-sm tabular-nums">
                    {breakdown?.budget?.points ?? 0} / 30 pts
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-normal">
                  {(breakdown?.budget?.totalBudgetedCount ?? 0) > 0
                    ? (isEs
                        ? `${breakdown?.budget?.onTrackCount ?? 0} de ${breakdown?.budget?.totalBudgetedCount} categorías se mantienen dentro del presupuesto fijado.`
                        : `${breakdown?.budget?.onTrackCount ?? 0} of ${breakdown?.budget?.totalBudgetedCount} categories are within their allocated budget.`)
                    : (isEs
                        ? 'Tus gastos globales se mantienen en un rango razonable respecto a tus ingresos.'
                        : 'Your global expenses remain balanced relative to your income.')}
                </p>
                <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                  <div 
                    className="h-full rounded-full bg-[var(--accent)] transition-all duration-500"
                    style={{ width: `${((breakdown?.budget?.points ?? 0) / 30) * 100}%`, backgroundColor: 'var(--accent)' }}
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex items-center justify-end gap-2.5">
              {onNavigateTab && (
                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    onNavigateTab('categories');
                  }}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-white transition-colors cursor-pointer"
                >
                  {isEs ? 'Ver Categorías' : 'View Categories'}
                </button>
              )}

              <button
                onClick={() => setIsModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-[var(--accent,#97F2CC)] text-[var(--accent-text,#09231B)] text-xs font-bold shadow hover:brightness-105 active:scale-95 transition-all cursor-pointer"
              >
                {isEs ? 'Entendido' : 'Got it'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
