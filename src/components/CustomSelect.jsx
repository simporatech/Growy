import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search, Check } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

const parseOption = (opt) => {
  if (!opt) return null;
  if (typeof opt === 'string' || typeof opt === 'number') {
    return {
      value: opt,
      name: String(opt),
      displayName: String(opt),
      emoji: null,
      isImage: false,
      currency: null,
      extra: null
    };
  }

  let emoji = opt.emoji || opt.icon || null;
  let name = opt.name || null;
  let currency = opt.currency || null;
  let label = opt.label;
  let extra = opt.extra || null;

  // If emoji was not provided explicitly on object, check if label has leading URL or image
  if (!emoji && typeof label === 'string') {
    const urlMatch = label.match(/^(https?:\/\/[^\s]+|data:image\/[^\s]+|\/[^\s]+)\s*(.*)$/);
    if (urlMatch) {
      emoji = urlMatch[1];
      if (!name) {
        name = urlMatch[2] || '';
      }
    }
  }

  const isImage = typeof emoji === 'string' && (
    emoji.startsWith('http://') || 
    emoji.startsWith('https://') || 
    emoji.startsWith('data:image') || 
    emoji.startsWith('/')
  );

  const displayName = name || (typeof label === 'string' ? label : String(opt.value || ''));

  return {
    ...opt,
    value: opt.value,
    emoji,
    isImage,
    name: displayName,
    displayName,
    currency,
    extra
  };
};

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
  const selectedParsed = selectedOption ? parseOption(selectedOption) : null;

  // Activate search input ONLY when options count > 7
  const showSearch = safeOptions.length > 7;

  const resolvedSearchPlaceholder = searchPlaceholder || t('placeholders.search', {}, 'Buscar...');
  const resolvedNoResults = t('common.noData', {}, 'Sin resultados');

  const filteredOptions = showSearch
    ? safeOptions.filter(opt => {
        if (!opt) return false;
        const parsed = parseOption(opt);
        const q = search.toLowerCase();
        return (
          String(parsed.displayName || '').toLowerCase().includes(q) ||
          String(parsed.currency || '').toLowerCase().includes(q) ||
          String(parsed.value || '').toLowerCase().includes(q) ||
          String(opt.label || '').toLowerCase().includes(q)
        );
      })
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
        className={`form-select w-full h-11 flex items-center justify-between px-3.5 bg-[#121721] border border-white/[0.08] rounded-xl text-white hover:border-[var(--accent,#97F2CC)]/50 active:scale-[0.99] transition-all shadow-inner cursor-pointer select-none ${
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        } ${isOpen ? 'border-[var(--accent,#97F2CC)] ring-1 ring-[var(--accent,#97F2CC)]' : ''}`}
      >
        {selectedParsed ? (
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            {selectedParsed.emoji ? (
              <div className="w-5 h-5 flex-shrink-0 flex items-center justify-center overflow-hidden">
                {selectedParsed.isImage ? (
                  <img 
                    src={selectedParsed.emoji} 
                    alt={selectedParsed.displayName} 
                    className="w-4.5 h-4.5 object-contain rounded"
                    onError={(e) => { e.target.style.display = 'none'; }} 
                  />
                ) : (
                  <span className="text-sm leading-none">{selectedParsed.emoji}</span>
                )}
              </div>
            ) : null}
            <span className="text-xs sm:text-sm font-medium text-white truncate flex-1">
              {selectedParsed.displayName} {selectedParsed.currency ? `(${selectedParsed.currency === 'HNL' ? 'L.' : '$'} ${selectedParsed.currency})` : ''}
            </span>
          </div>
        ) : (
          <span className="text-xs sm:text-sm truncate font-medium text-slate-400">
            {resolvedPlaceholder}
          </span>
        )}
        <ChevronDown 
          className={`text-slate-400 transition-transform duration-200 shrink-0 ml-2 ${isOpen ? 'rotate-180 text-[var(--accent,#97F2CC)]' : ''}`} 
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
          className="custom-select-portal fixed z-[9999] p-2 bg-[#0A0D14] border border-white/[0.08] rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.7)] flex flex-col animate-in fade-in zoom-in-95 duration-150 backdrop-blur-xl isolate"
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
                className="w-full pl-9 pr-3 py-2 bg-[#121721] border border-white/[0.08] rounded-lg text-xs sm:text-sm text-white placeholder:text-slate-400 outline-none focus:border-[var(--accent,#97F2CC)] focus:ring-1 focus:ring-[var(--accent,#97F2CC)] transition-colors"
              />
            </div>
          )}

          {/* Scrollable Options */}
          <div className="max-h-60 overflow-y-auto space-y-1 custom-scrollbar py-0.5 pr-1">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => {
                const parsed = parseOption(opt);
                if (!parsed) return null;
                const isSelected = String(parsed.value) === String(value);

                return (
                  <button
                    key={String(parsed.value)}
                    type="button"
                    onClick={() => {
                      onChange(parsed.value);
                      setIsOpen(false);
                      setSearch('');
                    }}
                    className={`w-full px-2.5 py-2 rounded-xl flex items-center justify-between gap-3 cursor-pointer transition-all text-left group ${
                      isSelected
                        ? 'bg-[var(--accent-muted,rgba(151,242,204,0.15))] text-[var(--accent,#97F2CC)] font-medium'
                        : 'text-slate-200 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {/* Contenedor del Icono / Imagen */}
                      {parsed.emoji ? (
                        <div className="w-6 h-6 flex-shrink-0 flex items-center justify-center">
                          {parsed.isImage ? (
                            <img 
                              src={parsed.emoji} 
                              alt={parsed.displayName} 
                              className="w-5 h-5 object-contain rounded"
                              onError={(e) => { e.target.style.display = 'none'; }} 
                            />
                          ) : (
                            <span className="text-base leading-none">{parsed.emoji}</span>
                          )}
                        </div>
                      ) : null}

                      {/* Nombre y Moneda */}
                      <span className={`text-sm font-medium truncate flex-1 ${isSelected ? 'text-[var(--accent,#97F2CC)]' : 'text-slate-200 group-hover:text-white'}`}>
                        {parsed.displayName} {parsed.currency ? `(${parsed.currency === 'HNL' ? 'L.' : '$'} ${parsed.currency})` : ''} {parsed.extra ? <span className="text-xs text-slate-400 ml-1">{parsed.extra}</span> : ''}
                      </span>
                    </div>

                    {isSelected && (
                      <Check className="text-[var(--accent,#97F2CC)] shrink-0 ml-1" size={16} strokeWidth={2.5} />
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
