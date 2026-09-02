import React, { useState, useMemo, useRef } from 'react';
import { TrendingUp, TrendingDown, Minus, Activity, Calendar, Zap } from 'lucide-react';
import useCashflowProjection from '../../hooks/useCashflowProjection';
import { useSettings } from '../../context/SettingsContext';

export default function CashflowForecastChart({
  currentTotalBalance = 0,
  currentMonthTransactions = [],
  activeSubscriptions = [],
  pendingDebts = [],
  referenceDate,
  className = ''
}) {
  const { formatCurrency, baseCurrency, formatToGlobal, t, language } = useSettings();
  const isEs = String(language || 'es').toLowerCase().startsWith('es');

  // Calculation Engine
  const {
    projectedBalance,
    dailyBurnRate,
    daysRemaining,
    daysInMonth,
    currentDay,
    expensesSoFar,
    pendingSubscriptionsTotal,
    pendingDebtsTotal,
    trend,
    chartData
  } = useCashflowProjection({
    currentTotalBalance,
    currentMonthTransactions,
    activeSubscriptions,
    pendingDebts,
    referenceDate,
    formatToGlobal,
    baseCurrency
  });

  // Hover Tooltip State
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const svgRef = useRef(null);

  // SVG Chart Dimensions
  const svgWidth = 600;
  const svgHeight = 200;
  const padLeft = 45;
  const padRight = 20;
  const padTop = 25;
  const padBottom = 30;

  const chartInnerWidth = svgWidth - padLeft - padRight;
  const chartInnerHeight = svgHeight - padTop - padBottom;

  // Min and Max values for scale
  const { minVal, maxVal, actualPoints, projectedPoints } = useMemo(() => {
    let min = currentTotalBalance;
    let max = currentTotalBalance;

    const actual = [];
    const projected = [];

    chartData.forEach((pt) => {
      if (pt.actual !== null) {
        min = Math.min(min, pt.actual);
        max = Math.max(max, pt.actual);
      }
      if (pt.projected !== null) {
        min = Math.min(min, pt.projected);
        max = Math.max(max, pt.projected);
      }
    });

    // Add 10% breathing room on Y axis
    const range = Math.max(1, max - min);
    const paddedMin = min - range * 0.12;
    const paddedMax = max + range * 0.12;

    const getX = (day) => {
      const fraction = daysInMonth > 1 ? (day - 1) / (daysInMonth - 1) : 0.5;
      return padLeft + fraction * chartInnerWidth;
    };

    const getY = (val) => {
      const valRange = paddedMax - paddedMin || 1;
      const fraction = (val - paddedMin) / valRange;
      return padTop + (1 - fraction) * chartInnerHeight;
    };

    chartData.forEach((pt) => {
      const x = getX(pt.day);
      if (pt.actual !== null) {
        actual.push({ x, y: getY(pt.actual), day: pt.day, val: pt.actual, type: 'actual' });
      }
      if (pt.projected !== null) {
        projected.push({ x, y: getY(pt.projected), day: pt.day, val: pt.projected, type: 'projected' });
      }
    });

    return {
      minVal: paddedMin,
      maxVal: paddedMax,
      actualPoints: actual,
      projectedPoints: projected
    };
  }, [chartData, currentTotalBalance, daysInMonth, chartInnerWidth, chartInnerHeight, padLeft, padTop]);

  // Construct SVG Path strings
  const actualPath = useMemo(() => {
    if (actualPoints.length === 0) return '';
    return actualPoints.reduce((acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)},${pt.y.toFixed(1)}`, '');
  }, [actualPoints]);

  const projectedPath = useMemo(() => {
    if (projectedPoints.length === 0) return '';
    return projectedPoints.reduce((acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)},${pt.y.toFixed(1)}`, '');
  }, [projectedPoints]);

  // Fill area under actual line
  const actualAreaPath = useMemo(() => {
    if (actualPoints.length < 2) return '';
    const first = actualPoints[0];
    const last = actualPoints[actualPoints.length - 1];
    const bottomY = padTop + chartInnerHeight;
    return `${actualPath} L ${last.x.toFixed(1)},${bottomY} L ${first.x.toFixed(1)},${bottomY} Z`;
  }, [actualPoints, actualPath, padTop, chartInnerHeight]);

  // Fill area under projected line
  const projectedAreaPath = useMemo(() => {
    if (projectedPoints.length < 2) return '';
    const first = projectedPoints[0];
    const last = projectedPoints[projectedPoints.length - 1];
    const bottomY = padTop + chartInnerHeight;
    return `${projectedPath} L ${last.x.toFixed(1)},${bottomY} L ${first.x.toFixed(1)},${bottomY} Z`;
  }, [projectedPoints, projectedPath, padTop, chartInnerHeight]);

  // Pointer move handler to calculate nearest day
  const handlePointerMove = (e) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const svgRelativeX = (clientX / rect.width) * svgWidth;

    const clampedX = Math.max(padLeft, Math.min(padLeft + chartInnerWidth, svgRelativeX));
    const dayFraction = (clampedX - padLeft) / chartInnerWidth;
    const hoveredDay = Math.round(1 + dayFraction * (daysInMonth - 1));

    const point = chartData.find((p) => p.day === hoveredDay);
    if (point) {
      const isActual = point.day <= currentDay && point.actual !== null;
      const val = isActual ? point.actual : point.projected;
      const fraction = (dayFraction);
      const x = padLeft + fraction * chartInnerWidth;
      const valRange = maxVal - minVal || 1;
      const y = padTop + (1 - (val - minVal) / valRange) * chartInnerHeight;

      setHoveredPoint({
        day: hoveredDay,
        val,
        isActual,
        x,
        y
      });
    }
  };

  const handlePointerLeave = () => {
    setHoveredPoint(null);
  };

  // Connection point (Today)
  const todayPoint = actualPoints.find(p => p.day === currentDay);
  const endPoint = projectedPoints.find(p => p.day === daysInMonth);

  return (
    <div className={`w-full flex flex-col justify-between space-y-4 ${className}`}>
      {/* Header Info & Badges */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {isEs ? 'PROYECCIÓN DE FLUJO' : 'CASHFLOW PROJECTION'}
            </span>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border shadow-sm ${
              trend === 'positive'
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                : trend === 'negative'
                ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                : 'bg-slate-500/15 text-slate-300 border-slate-500/30'
            }`}>
              {trend === 'positive' && <TrendingUp className="w-3 h-3" />}
              {trend === 'negative' && <TrendingDown className="w-3 h-3" />}
              {trend === 'stable' && <Minus className="w-3 h-3" />}
              <span>{trend === 'positive' ? (isEs ? 'Superávit' : 'Positive') : trend === 'negative' ? (isEs ? 'Disminución' : 'Burn Rate') : (isEs ? 'Estable' : 'Stable')}</span>
            </span>
          </div>

          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl sm:text-2xl font-black text-white tabular-nums tracking-tight">
              {formatCurrency(projectedBalance, baseCurrency)}
            </span>
            <span className="text-xs text-slate-400 font-medium">
              {isEs ? 'saldo proyectado a fin de mes' : 'projected month-end balance'}
            </span>
          </div>
        </div>

        {/* Quick Micro Badges */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <div className="px-2.5 py-1 rounded-xl bg-white/[0.04] border border-white/5 flex items-center gap-1.5 text-slate-300">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[11px] text-slate-400">{isEs ? 'Ritmo diario:' : 'Burn rate:'}</span>
            <span className="font-bold text-white tabular-nums">{formatCurrency(dailyBurnRate, baseCurrency)}/d</span>
          </div>

          <div className="px-2.5 py-1 rounded-xl bg-white/[0.04] border border-white/5 flex items-center gap-1.5 text-slate-300">
            <Calendar className="w-3.5 h-3.5 text-[var(--accent,#97F2CC)]" />
            <span className="text-[11px] text-slate-400">{isEs ? 'Restan:' : 'Left:'}</span>
            <span className="font-bold text-white tabular-nums">{daysRemaining} {isEs ? 'días' : 'days'}</span>
          </div>
        </div>
      </div>

      {/* SVG Interactive Chart */}
      <div 
        className="w-full relative select-none touch-none"
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-44 sm:h-52 overflow-visible"
        >
          <defs>
            {/* Linear gradient for actual area */}
            <linearGradient id="actualGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent, #97F2CC)" stopOpacity="0.25" />
              <stop offset="100%" stopColor="var(--accent, #97F2CC)" stopOpacity="0.0" />
            </linearGradient>

            {/* Linear gradient for projected area */}
            <linearGradient id="projectedGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent, #97F2CC)" stopOpacity="0.10" />
              <stop offset="100%" stopColor="var(--accent, #97F2CC)" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 0.33, 0.66, 1].map((ratio, idx) => {
            const y = padTop + ratio * chartInnerHeight;
            const gridVal = maxVal - ratio * (maxVal - minVal);
            return (
              <g key={idx}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={padLeft + chartInnerWidth}
                  y2={y}
                  stroke="rgba(255, 255, 255, 0.06)"
                  strokeDasharray="3 3"
                />
                <text
                  x={padLeft - 8}
                  y={y + 3}
                  textAnchor="end"
                  className="fill-slate-500 text-[9px] tabular-nums font-mono select-none"
                >
                  {formatCurrency(gridVal, baseCurrency, baseCurrency).split('.')[0]}
                </text>
              </g>
            );
          })}

          {/* Areas under curve */}
          {actualAreaPath && (
            <path d={actualAreaPath} fill="url(#actualGradient)" />
          )}
          {projectedAreaPath && (
            <path d={projectedAreaPath} fill="url(#projectedGradient)" />
          )}

          {/* Projected dashed line */}
          {projectedPath && (
            <path
              d={projectedPath}
              fill="none"
              stroke="var(--accent, #97F2CC)"
              strokeWidth="2.2"
              strokeDasharray="5 5"
              strokeOpacity="0.65"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Actual solid line */}
          {actualPath && (
            <path
              d={actualPath}
              fill="none"
              stroke="var(--accent, #97F2CC)"
              strokeWidth="2.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Today Indicator Line & Marker */}
          {todayPoint && (
            <g>
              <line
                x1={todayPoint.x}
                y1={padTop}
                x2={todayPoint.x}
                y2={padTop + chartInnerHeight}
                stroke="rgba(151, 242, 204, 0.3)"
                strokeDasharray="2 2"
              />
              <circle
                cx={todayPoint.x}
                cy={todayPoint.y}
                r="5"
                className="fill-[var(--accent,#97F2CC)] stroke-[#0E131D] stroke-2 shadow-md"
              />
            </g>
          )}

          {/* Month End Marker */}
          {endPoint && (
            <circle
              cx={endPoint.x}
              cy={endPoint.y}
              r="4"
              className="fill-transparent stroke-[var(--accent,#97F2CC)] stroke-2 opacity-80"
              strokeDasharray="2 2"
            />
          )}

          {/* X Axis Day Labels */}
          {[1, 7, 14, 21, daysInMonth].map((d) => {
            const fraction = (d - 1) / (daysInMonth - 1);
            const x = padLeft + fraction * chartInnerWidth;
            const isToday = d === currentDay;
            return (
              <text
                key={d}
                x={x}
                y={padTop + chartInnerHeight + 16}
                textAnchor="middle"
                className={`text-[10px] tabular-nums font-semibold select-none ${
                  isToday ? 'fill-[var(--accent,#97F2CC)] font-bold' : 'fill-slate-500'
                }`}
              >
                {isToday ? `${d} (${isEs ? 'Hoy' : 'Today'})` : `d${d}`}
              </text>
            );
          })}

          {/* Active Hover Point & Crosshair */}
          {hoveredPoint && (
            <g className="transition-all duration-75">
              <line
                x1={hoveredPoint.x}
                y1={padTop}
                x2={hoveredPoint.x}
                y2={padTop + chartInnerHeight}
                stroke="rgba(255, 255, 255, 0.3)"
                strokeWidth="1"
              />
              <circle
                cx={hoveredPoint.x}
                cy={hoveredPoint.y}
                r="6"
                className="fill-[var(--accent,#97F2CC)] stroke-[#0E131D] stroke-2 shadow-lg"
              />
            </g>
          )}
        </svg>

        {/* Floating HTML Tooltip on hover */}
        {hoveredPoint && (
          <div
            className="absolute -top-3 z-30 pointer-events-none transform -translate-x-1/2 -translate-y-full bg-[#131E22] border border-white/20 rounded-xl p-2.5 shadow-2xl backdrop-blur-md whitespace-nowrap text-left text-xs animate-fade-in"
            style={{
              left: `${(hoveredPoint.x / svgWidth) * 100}%`,
              top: `${Math.max(10, (hoveredPoint.y / svgHeight) * 100 - 10)}%`
            }}
          >
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-semibold uppercase">
              <span>{isEs ? `Día ${hoveredPoint.day}` : `Day ${hoveredPoint.day}`}</span>
              <span>•</span>
              <span className={hoveredPoint.isActual ? 'text-[var(--accent,#97F2CC)]' : 'text-amber-400'}>
                {hoveredPoint.isActual ? (isEs ? 'Saldo Real' : 'Actual Balance') : (isEs ? 'Proyección' : 'Projected')}
              </span>
            </div>
            <div className="text-sm font-black text-white tabular-nums mt-0.5">
              {formatCurrency(hoveredPoint.val, baseCurrency)}
            </div>
          </div>
        )}
      </div>

      {/* Legend & Summary Badge */}
      <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-[var(--accent,#97F2CC)] shrink-0" />
          <span className="text-slate-300 font-normal leading-relaxed">
            {isEs
              ? `Si sigues a este ritmo, vas a cerrar el mes con `
              : `If you maintain this current pace, you are projected to close the month with `}
            <strong className="font-bold text-white tabular-nums">
              {formatCurrency(projectedBalance, baseCurrency)}
            </strong>
            {isEs ? ` en cuenta.` : ` in account balance.`}
          </span>
        </div>

        {/* Visual Legend */}
        <div className="flex items-center gap-3 shrink-0 text-[11px] font-semibold text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-[var(--accent,#97F2CC)] rounded-full"></span>
            <span>{isEs ? 'Real' : 'Actual'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 border-b-2 border-dashed border-[var(--accent,#97F2CC)] opacity-70"></span>
            <span>{isEs ? 'Proyección' : 'Projected'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
