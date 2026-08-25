import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { formatDateISO } from '../utils/formatters';

export default function CustomDatePicker({
  value,
  onChange,
  placeholder,
  className = '',
  disabled = false
}) {
  const { language, t } = useSettings();
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, isMobileCentered: false });
  const buttonRef = useRef(null);

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

  const updatePosition = useCallback(() => {
    if (buttonRef.current && typeof window !== 'undefined') {
      const rect = buttonRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const calendarWidth = Math.min(300, viewportWidth - 24);

      if (viewportWidth < 640) {
        // Center clamped horizontally on mobile so it never overflows left or right
        let leftPos = rect.left + (rect.width / 2) - (calendarWidth / 2);
        if (leftPos < 12) leftPos = 12;
        if (leftPos + calendarWidth > viewportWidth - 12) {
          leftPos = viewportWidth - calendarWidth - 12;
        }

        let topPos = rect.bottom + 6;
        if (viewportHeight - rect.bottom < 320 && rect.top > 320) {
          topPos = Math.max(12, rect.top - 320);
        }

        setCoords({ top: topPos, left: leftPos, isMobileCentered: true });
      } else {
        // Desktop positioning aligned to trigger button
        let leftPos = rect.left;
        if (leftPos + calendarWidth > viewportWidth - 12) {
          leftPos = viewportWidth - calendarWidth - 12;
        }
        if (leftPos < 12) leftPos = 12;

        let topPos = rect.bottom + 6;
        if (viewportHeight - rect.bottom < 320 && rect.top > 320) {
          topPos = Math.max(12, rect.top - 320);
        }

        setCoords({ top: topPos, left: leftPos, isMobileCentered: false });
      }
    }
  }, []);

  const handleToggle = () => {
    if (disabled) return;
    if (!isOpen) {
      updatePosition();
    }
    setIsOpen(prev => !prev);
  };

  useEffect(() => {
    if (!isOpen) return;

    updatePosition();

    const handleClickOutside = (event) => {
      if (
        buttonRef.current && 
        !buttonRef.current.contains(event.target) &&
        !event.target.closest('.custom-datepicker-portal')
      ) {
        setIsOpen(false);
      }
    };

    const handleScroll = (event) => {
      if (event?.target?.closest && event.target.closest('.custom-datepicker-portal')) return;
      setIsOpen(false);
    };

    const handleResize = () => {
      updatePosition();
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside, { passive: true });
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
    };
  }, [isOpen, updatePosition]);

  const defaultPlaceholder = t('common.selectDate', {}, language === 'es' ? 'Seleccionar fecha' : 'Select date');
  const effectivePlaceholder = placeholder || defaultPlaceholder;

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
      return ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'];
    }
    return ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
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
    <div className={`relative w-full ${className}`}>
      {/* Trigger Button */}
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        onClick={handleToggle}
        className={`form-input w-full h-11 px-3.5 bg-[#121721] border border-white/[0.08] rounded-xl text-xs sm:text-sm font-medium text-white flex items-center justify-between hover:border-[var(--accent,#97F2CC)]/50 active:scale-[0.99] transition-all shadow-inner cursor-pointer select-none ${
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        } ${isOpen ? 'border-[var(--accent,#97F2CC)] ring-1 ring-[var(--accent,#97F2CC)]' : ''}`}
      >
        <span className={`truncate ${!value ? 'text-slate-400 font-normal' : 'text-white font-medium'}`}>
          {formattedLabel}
        </span>
        <CalendarIcon className={`w-4 h-4 text-slate-400 shrink-0 ml-1.5 transition-colors ${isOpen ? 'text-[var(--accent,#97F2CC)]' : ''}`} />
      </button>

      {/* Floating Dark Popover Calendar via React Portal */}
      {isOpen && !disabled && typeof document !== 'undefined' && document.body && createPortal(
        <div 
          style={{ 
            top: `${coords.top}px`, 
            left: `${coords.left}px`,
            width: '300px',
            maxWidth: 'calc(100vw - 24px)'
          }}
          className="custom-datepicker-portal fixed z-[9999] bg-[#0A0D14] border border-white/[0.08] rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.7)] p-4 backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-150 select-none isolate"
        >
          {/* Header with Month / Year and Navigation */}
          <div className="flex items-center justify-between pb-3 mb-2 border-b border-white/[0.06]">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 active:scale-90 transition-all cursor-pointer"
              title={language === 'es' ? 'Mes anterior' : 'Previous month'}
              aria-label={language === 'es' ? 'Mes anterior' : 'Previous month'}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="text-sm font-bold text-white tracking-wide capitalize">
              {monthHeaderLabel}
            </span>

            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 active:scale-90 transition-all cursor-pointer"
              title={language === 'es' ? 'Mes siguiente' : 'Next month'}
              aria-label={language === 'es' ? 'Mes siguiente' : 'Next month'}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Weekday Headers */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
            {weekdays.map((w, idx) => (
              <span key={idx} className="text-[11px] font-bold uppercase text-slate-400">
                {w}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {daysGrid.map((item, idx) => {
              if (!item.isCurrentMonth) {
                return (
                  <span key={idx} className="h-9 w-9 mx-auto flex items-center justify-center text-xs text-slate-600 pointer-events-none">
                    {item.dayNumber}
                  </span>
                );
              }

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectDay(item.dateStr)}
                  className={`h-9 w-9 mx-auto rounded-xl text-xs font-semibold flex items-center justify-center transition-all duration-150 cursor-pointer ${
                    item.isSelected
                      ? 'bg-[var(--accent,#97F2CC)] text-[var(--accent-text,#091E15)] font-bold shadow-lg shadow-[var(--accent,#97F2CC)]/20 scale-105'
                      : item.isToday
                      ? 'border border-[var(--accent,#97F2CC)]/60 text-[var(--accent,#97F2CC)] font-bold hover:bg-white/10'
                      : 'text-slate-200 hover:bg-white/10 hover:text-white active:scale-95'
                  }`}
                >
                  {item.dayNumber}
                </button>
              );
            })}
          </div>

          {/* Quick Actions (Today / Clear) */}
          <div className="flex items-center justify-between pt-3 mt-2 border-t border-white/10">
            <button
              type="button"
              onClick={() => {
                const todayISO = formatDateISO(new Date());
                handleSelectDay(todayISO);
              }}
              className="text-xs font-semibold text-[var(--accent,#97F2CC)] hover:underline cursor-pointer"
            >
              {language === 'es' ? 'Hoy' : 'Today'}
            </button>
            {value && (
              <button
                type="button"
                onClick={() => {
                  onChange('');
                  setIsOpen(false);
                }}
                className="text-xs font-medium text-slate-400 hover:text-rose-300 transition-colors cursor-pointer"
              >
                {language === 'es' ? 'Borrar' : 'Clear'}
              </button>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
