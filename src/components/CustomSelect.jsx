import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search, Check } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

export const CustomSelect = ({ 
  value, 
  onChange, 
  options = [], 
  placeholder, 
  searchPlaceholder = null,
  className = "",
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 240 });
  const buttonRef = useRef(null);

  const { t } = useSettings();

  const resolvedPlaceholder = placeholder || t('common.select', {}, 'Seleccionar...');
  const safeOptions = Array.isArray(options) ? options : [];
  const selectedOption = safeOptions.find(opt => opt && String(opt.value) === String(value));

  // Activate search input ONLY when options count > 7
  const showSearch = safeOptions.length > 7;

  const resolvedSearchPlaceholder = searchPlaceholder || t('placeholders.search', {}, 'Buscar...');
  const resolvedNoResults = t('common.noData', {}, 'Sin resultados');

  const filteredOptions = showSearch
    ? safeOptions.filter(opt =>
        opt &&
        (String(opt.label || '').toLowerCase().includes(search.toLowerCase()) ||
         String(opt.value || '').toLowerCase().includes(search.toLowerCase()))
      )
    : safeOptions;

  const updatePosition = useCallback(() => {
    if (buttonRef.current && typeof window !== 'undefined') {
      const rect = buttonRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      const desiredWidth = Math.max(rect.width, Math.min(viewportWidth - 24, 240));
      
      // Calculate clamped horizontal position to prevent off-screen overflow
      let leftPos = rect.left;
      if (leftPos + desiredWidth > viewportWidth - 12) {
        leftPos = viewportWidth - desiredWidth - 12;
      }
      if (leftPos < 12) {
        leftPos = 12;
      }

      // Check vertical space (open upwards if tight at bottom)
      let topPos = rect.bottom + 6;
      if (viewportHeight - rect.bottom < 240 && rect.top > 250) {
        topPos = Math.max(12, rect.top - 246);
      }

      setCoords({
        top: topPos,
        left: leftPos,
        width: desiredWidth
      });
    }
  }, []);

  const handleToggle = () => {
    if (disabled) return;
    if (!isOpen) {
      updatePosition();
      setSearch('');
    }
    setIsOpen(prev => !prev);
  };

  useEffect(() => {
    if (!isOpen) return;

    updatePosition();

    const handleClickOutside = (e) => {
      if (
        buttonRef.current && 
        !buttonRef.current.contains(e.target) && 
        !e.target.closest('.custom-select-portal')
      ) {
        setIsOpen(false);
      }
    };

    const handleScroll = (e) => {
      // Don't close if scrolling inside the portal options list itself
      if (e?.target?.closest && e.target.closest('.custom-select-portal')) return;
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

  return (
    <div className={`relative w-full ${className}`}>
      {/* Trigger Button */}
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        onClick={handleToggle}
        className={`w-full h-11 flex items-center justify-between px-3.5 bg-[#131E22] border border-white/10 rounded-xl text-white hover:border-[var(--color-primary)]/50 active:scale-[0.99] transition-all shadow-inner cursor-pointer select-none ${
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        } ${isOpen ? 'border-[var(--color-primary)]/60 ring-1 ring-[var(--color-primary)]/30' : ''}`}
      >
        <span className={`text-xs sm:text-sm truncate font-medium ${selectedOption ? 'text-white' : 'text-slate-400'}`}>
          {selectedOption ? selectedOption.label : resolvedPlaceholder}
        </span>
        <ChevronDown 
          className={`text-slate-400 transition-transform duration-200 shrink-0 ml-2 ${isOpen ? 'rotate-180 text-[var(--color-primary)]' : ''}`} 
          size={16} 
        />
      </button>

      {/* Floating Dark Popover Dropdown via React Portal */}
      {isOpen && typeof document !== 'undefined' && document.body && createPortal(
        <div
          style={{ 
            top: `${coords.top}px`, 
            left: `${coords.left}px`, 
            width: `${coords.width}px`,
            maxWidth: 'calc(100vw - 24px)'
          }}
          className="custom-select-portal fixed z-[9999] p-2 bg-[#152328] border border-white/10 rounded-xl shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-150 backdrop-blur-xl isolate"
        >
          {/* Render search input ONLY for long lists (> 7 options) */}
          {showSearch && (
            <div className="relative mb-2 px-1 pt-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={resolvedSearchPlaceholder}
                className="w-full pl-9 pr-3 py-2 bg-black/40 border border-white/10 rounded-lg text-xs sm:text-sm text-white placeholder:text-slate-400 outline-none focus:border-[var(--color-primary)] transition-colors"
                autoFocus
              />
            </div>
          )}

          {/* Scrollable Options */}
          <div className="max-h-60 overflow-y-auto space-y-1 custom-scrollbar py-0.5 pr-1">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => {
                const isSelected = String(opt.value) === String(value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                      setSearch('');
                    }}
                    className={`w-full px-4 py-3 text-sm rounded-xl flex items-center justify-between gap-3 cursor-pointer transition-all text-left ${
                      isSelected
                        ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-medium'
                        : 'text-slate-200 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <span className="truncate flex-1">{opt.label}</span>
                    {isSelected && (
                      <Check className="text-[var(--color-primary)] shrink-0 ml-1" size={16} strokeWidth={2.5} />
                    )}
                  </button>
                );
              })
            ) : (
              <div className="px-4 py-3 text-center text-xs text-slate-400 font-medium">
                {resolvedNoResults}
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default CustomSelect;
