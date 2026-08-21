import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search, Check } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

export const CustomSelect = ({ 
  value, 
  onChange, 
  options = [], 
  placeholder = "Seleccionar...", 
  searchPlaceholder = null,
  className = ""
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const buttonRef = useRef(null);

  let tFunc = null;
  try {
    const settings = useSettings();
    tFunc = settings?.t;
  } catch (e) {
    // Context fallback
  }

  const safeOptions = Array.isArray(options) ? options : [];
  const selectedOption = safeOptions.find(opt => opt && opt.value === value);

  // Activate search input ONLY when options count > 7
  const showSearch = safeOptions.length > 7;

  const resolvedSearchPlaceholder = searchPlaceholder || (tFunc ? tFunc('placeholders.search', {}, 'Buscar...') : 'Buscar...');
  const resolvedNoResults = tFunc ? tFunc('common.noData', {}, 'Sin resultados') : 'Sin resultados';

  const filteredOptions = showSearch
    ? safeOptions.filter(opt =>
        opt &&
        (String(opt.label || '').toLowerCase().includes(search.toLowerCase()) ||
         String(opt.value || '').toLowerCase().includes(search.toLowerCase()))
      )
    : safeOptions;

  const updatePosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + 6,
        left: rect.left,
        width: Math.max(rect.width, 180)
      });
    }
  };

  const handleToggle = () => {
    if (!isOpen) {
      updatePosition();
    }
    setIsOpen(!isOpen);
  };

  useEffect(() => {
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
      if (isOpen) setIsOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleScroll);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleScroll);
    };
  }, [isOpen]);

  return (
    <div className={`relative w-full ${className}`}>
      {/* Native Mobile Fallback (Invisible but tappable over the button) */}
      <select
        className="sm:hidden absolute inset-0 w-full h-full opacity-0 z-50 cursor-pointer"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="" disabled>{placeholder}</option>
        {safeOptions.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {/* Trigger Button (Standardized h-10) */}
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        className="w-full h-10 flex items-center justify-between px-3.5 bg-[#131E22] border border-white/10 rounded-xl text-white hover:border-[#AEEDD0]/50 transition-colors shadow-inner cursor-pointer"
      >
        <span className="text-xs font-semibold truncate">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown 
          className={`text-slate-400 transition-transform duration-200 shrink-0 ml-1 ${isOpen ? 'rotate-180 text-[#AEEDD0]' : ''}`} 
          size={14} 
        />
      </button>

      {/* Floating Glassmorphic Dropdown via React Portal */}
      {isOpen && createPortal(
        <div
          style={{ top: `${coords.top}px`, left: `${coords.left}px`, width: `${coords.width}px` }}
          className="custom-select-portal hidden sm:flex fixed p-1.5 bg-[#162226] border border-white/10 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.9)] z-[9999] flex-col animate-in fade-in zoom-in-95 duration-100 backdrop-blur-xl"
        >
          {/* Render search input ONLY for long lists (> 7 options) */}
          {showSearch && (
            <div className="relative mb-2 px-1 pt-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={resolvedSearchPlaceholder}
                className="w-full pl-8 pr-3 py-1.5 bg-black/40 border border-white/10 rounded-lg text-xs text-white outline-none focus:border-[#AEEDD0]"
                autoFocus
              />
            </div>
          )}

          {/* Scrollable Options */}
          <div className="max-h-60 overflow-y-auto space-y-0.5 custom-scrollbar pr-1">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                    setSearch('');
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer text-left ${
                    opt.value === value
                      ? 'bg-[#AEEDD0]/10 text-[#AEEDD0]'
                      : 'text-slate-300 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <span className="truncate">{opt.label}</span>
                  {opt.value === value && <Check className="text-[#AEEDD0] shrink-0 ml-1" size={14} />}
                </button>
              ))
            ) : (
              <div className="py-2.5 text-center text-xs text-slate-500">{resolvedNoResults}</div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default CustomSelect;
