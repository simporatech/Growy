import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { formatDateISO } from '../utils/formatters';

export default function CustomDatePicker({
  value,
  onChange,
  placeholder = 'Seleccionar fecha',
  className = '',
  disabled = false
}) {
  const { language } = useSettings();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const selectedDate = useMemo(() => {
    if (!value) return null;
    try {
      const [y, m, d] = value.split('-').map(Number);
      if (y && m && d) return new Date(y, m - 1, d);
    } catch (e) {
      // Fallback
    }
    return null;
  }, [value]);

  const [viewDate, setViewDate] = useState(() => {
    if (selectedDate) return new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  useEffect(() => {
    if (selectedDate) {
      setViewDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
    }
  }, [selectedDate]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const defaultPlaceholder = language === 'es' ? 'Seleccionar fecha' : 'Select date';
  const effectivePlaceholder = placeholder === 'Seleccionar fecha' || !placeholder ? defaultPlaceholder : placeholder;

  const formattedLabel = useMemo(() => {
    if (!selectedDate) return effectivePlaceholder;
    try {
      const options = { day: 'numeric', month: 'short', year: 'numeric' };
      return selectedDate.toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', options);
    } catch (e) {
      return value;
    }
  }, [selectedDate, value, effectivePlaceholder, language]);

  const handlePrevMonth = useCallback(() => {
    setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  }, []);

  const handleNextMonth = useCallback(() => {
    setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  }, []);

  const monthHeaderLabel = useMemo(() => {
    const options = { month: 'long', year: 'numeric' };
    const str = viewDate.toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', options);
    return str.charAt(0).toUpperCase() + str.slice(1);
  }, [viewDate, language]);

  const weekdays = useMemo(() => {
    if (language === 'es') {
      return ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    }
    return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  }, [language]);

  const daysGrid = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();

    const firstDayOfWeek = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days = [];

    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      days.push({
        dayNumber: daysInPrevMonth - i,
        isCurrentMonth: false,
        dateStr: ''
      });
    }

    const todayStr = formatDateISO(new Date());
    for (let d = 1; d <= daysInMonth; d++) {
      const monthStr = String(month + 1).padStart(2, '0');
      const dayStr = String(d).padStart(2, '0');
      const dateStr = `${year}-${monthStr}-${dayStr}`;

      days.push({
        dayNumber: d,
        isCurrentMonth: true,
        dateStr,
        isToday: dateStr === todayStr,
        isSelected: value === dateStr
      });
    }

    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      days.push({
        dayNumber: i,
        isCurrentMonth: false,
        dateStr: ''
      });
    }

    return days;
  }, [viewDate, value]);

  const handleSelectDay = useCallback((dateStr) => {
    if (!dateStr) return;
    onChange(dateStr);
    setIsOpen(false);
  }, [onChange]);

  return (
    <div className={`relative ${isOpen ? 'z-50' : 'z-10'} ${className}`} ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full h-11 px-4 bg-[#162226] border border-white/10 rounded-xl text-sm font-medium text-white flex items-center justify-between hover:border-[#AEEDD0]/40 active:scale-[0.98] transition-all shadow-sm ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        }`}
      >
        <span className={`truncate ${!value ? 'text-slate-300 font-normal' : 'text-white font-medium'}`}>
          {formattedLabel}
        </span>
        <CalendarIcon className={`w-4 h-4 text-slate-400 shrink-0 transition-colors ${isOpen ? 'text-[#AEEDD0]' : ''}`} />
      </button>

      {isOpen && !disabled && (
        <div 
          className="absolute right-0 sm:right-auto sm:left-0 top-full mt-1.5 z-50 bg-[#162226] border border-white/15 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.9)] p-3.5 min-w-[280px] backdrop-blur-none animate-scaleUp select-none scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
          style={{ backgroundColor: '#162226' }}
        >
          <div className="flex items-center justify-between pb-2 border-b border-white/5">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="text-sm font-bold text-white tracking-wide">
              {monthHeaderLabel}
            </span>

            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center">
            {weekdays.map((w, idx) => (
              <span key={idx} className="text-xs font-semibold uppercase text-slate-300">
                {w}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1 text-center">
            {daysGrid.map((item, idx) => {
              if (!item.isCurrentMonth) {
                return (
                  <span key={idx} className="h-8 flex items-center justify-center text-xs text-slate-600 pointer-events-none">
                    {item.dayNumber}
                  </span>
                );
              }

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectDay(item.dateStr)}
                  className={`h-8 rounded-xl text-xs font-semibold flex items-center justify-center transition-all duration-150 cursor-pointer ${
                    item.isSelected
                      ? 'bg-[#AEEDD0] text-[#1E2D32] font-bold shadow-md scale-105'
                      : item.isToday
                      ? 'border border-[#AEEDD0]/50 text-[#AEEDD0] hover:bg-white/10 hover:scale-105'
                      : 'text-slate-200 hover:bg-white/10 hover:text-white hover:scale-105'
                  }`}
                >
                  {item.dayNumber}
                </button>
              );
            })}
          </div>

        </div>
      )}
    </div>
  );
}
