import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Search, Globe, Landmark, Link as LinkIcon, X, Check, Edit2, Image as ImageIcon } from 'lucide-react';
import { EMOJI_CATEGORIES, CURATED_PRESETS } from '../constants/emojis';
import DynamicIcon from './DynamicIcon';

export default function UniversalIconPicker({
  value = '💳',
  onChange,
  label = 'Icono / Emoji',
  className = ''
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('emojis'); // 'emojis' | 'presets' | 'custom'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [customUrlInput, setCustomUrlInput] = useState('');
  const [customUrlPreview, setCustomUrlPreview] = useState('');
  const [customUrlError, setCustomUrlError] = useState(false);

  const modalRef = useRef(null);

  // Close on ESC
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // When opening custom tab, populate current value if it is a URL
  useEffect(() => {
    if (isOpen) {
      if (value && (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('data:image'))) {
        setCustomUrlInput(value);
        setCustomUrlPreview(value);
        setActiveTab('custom');
      } else {
        setCustomUrlInput('');
        setCustomUrlPreview('');
      }
      setSearchQuery('');
    }
  }, [isOpen, value]);

  // Filtered Emojis
  const filteredCategories = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    
    if (!query) {
      if (selectedCategory === 'all') return EMOJI_CATEGORIES;
      return EMOJI_CATEGORIES.filter(c => c.id === selectedCategory);
    }

    return EMOJI_CATEGORIES.map(cat => {
      const matching = cat.emojis.filter(emoji => {
        // Direct emoji match or category match
        return emoji.includes(query) || cat.name.toLowerCase().includes(query);
      });
      return { ...cat, emojis: matching };
    }).filter(cat => cat.emojis.length > 0);
  }, [searchQuery, selectedCategory]);

  // Filtered Presets
  const filteredPresets = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return CURATED_PRESETS;

    return CURATED_PRESETS.map(cat => {
      const matching = cat.items.filter(item => 
        item.name.toLowerCase().includes(query) || cat.category.toLowerCase().includes(query)
      );
      return { ...cat, items: matching };
    }).filter(cat => cat.items.length > 0);
  }, [searchQuery]);

  const handleSelectIcon = (iconVal) => {
    if (onChange) {
      onChange(iconVal);
    }
    setIsOpen(false);
  };

  const handleApplyCustomUrl = (e) => {
    e?.preventDefault();
    const cleanUrl = customUrlInput.trim();
    if (!cleanUrl) return;
    handleSelectIcon(cleanUrl);
  };

  return (
    <div className={`relative ${className}`}>
      {label && (
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2 block">
          {label}
        </label>
      )}

      {/* TRIGGER BUTTON */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="group relative w-12 h-12 rounded-2xl bg-[#121721] border border-white/[0.08] hover:border-[var(--accent,#97F2CC)]/50 hover:bg-white/[0.04] p-1.5 flex items-center justify-center transition-all cursor-pointer shadow-sm active:scale-95"
        title="Cambiar icono o logo"
      >
        <DynamicIcon 
          value={value} 
          className="w-7 h-7 text-2xl flex items-center justify-center transition-transform group-hover:scale-110" 
        />
        <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[var(--accent,#97F2CC)] text-[#0B101B] flex items-center justify-center shadow-md scale-90 group-hover:scale-100 transition-transform">
          <Edit2 className="w-2.5 h-2.5 stroke-[2.5]" />
        </div>
      </button>

      {/* POPOVER / MODAL OVERLAY */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          {/* Backdrop Click */}
          <div 
            className="absolute inset-0" 
            onClick={() => setIsOpen(false)} 
          />

          {/* Modal Container */}
          <div 
            ref={modalRef}
            className="relative w-full max-w-md max-h-[85vh] bg-[#121721] border border-white/10 rounded-3xl shadow-2xl flex flex-col overflow-hidden z-10 animate-scale-up"
          >
            {/* Header: Title & Close */}
            <div className="p-4 sm:p-5 border-b border-white/[0.08] flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                  <span>Seleccionar Icono</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--accent-muted,rgba(151,242,204,0.15))] text-[var(--accent,#97F2CC)] font-semibold">
                    Notion style
                  </span>
                </h3>
                <p className="text-xs text-slate-400 font-medium mt-0.5">
                  Elige un emoji, logotipo predefinido o pega una imagen web
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-white/[0.08] bg-[#0E131D] px-4 pt-2 gap-2">
              <button
                type="button"
                onClick={() => { setActiveTab('emojis'); setSearchQuery(''); }}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-t-xl border-b-2 transition-all cursor-pointer ${
                  activeTab === 'emojis'
                    ? 'border-[var(--accent,#97F2CC)] text-[var(--accent,#97F2CC)] bg-white/[0.03]'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Emojis</span>
              </button>

              <button
                type="button"
                onClick={() => { setActiveTab('presets'); setSearchQuery(''); }}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-t-xl border-b-2 transition-all cursor-pointer ${
                  activeTab === 'presets'
                    ? 'border-[var(--accent,#97F2CC)] text-[var(--accent,#97F2CC)] bg-white/[0.03]'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Landmark className="w-3.5 h-3.5" />
                <span>Bancos & Servicios</span>
              </button>

              <button
                type="button"
                onClick={() => { setActiveTab('custom'); }}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-t-xl border-b-2 transition-all cursor-pointer ${
                  activeTab === 'custom'
                    ? 'border-[var(--accent,#97F2CC)] text-[var(--accent,#97F2CC)] bg-white/[0.03]'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <LinkIcon className="w-3.5 h-3.5" />
                <span>URL Imagen</span>
              </button>
            </div>

            {/* Search Bar for Emojis & Presets */}
            {activeTab !== 'custom' && (
              <div className="p-3 border-b border-white/[0.06] bg-[#121721]">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={activeTab === 'emojis' ? 'Buscar emoji...' : 'Buscar banco o servicio...'}
                    className="w-full pl-9 pr-8 h-9 text-xs rounded-xl bg-[#0E131D] border border-white/[0.08] text-white placeholder:text-slate-500 focus:outline-none focus:border-[var(--accent,#97F2CC)] focus:ring-1 focus:ring-[var(--accent,#97F2CC)] transition-all"
                    autoFocus
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Emoji Category Filter Chips */}
                {activeTab === 'emojis' && !searchQuery && (
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-2.5 pb-0.5">
                    <button
                      type="button"
                      onClick={() => setSelectedCategory('all')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all cursor-pointer ${
                        selectedCategory === 'all'
                          ? 'bg-[var(--accent)] text-[var(--accent-text,#0B101B)] shadow-sm'
                          : 'bg-white/5 text-slate-400 hover:text-white'
                      }`}
                    >
                      Todos
                    </button>
                    {EMOJI_CATEGORIES.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all flex items-center gap-1 cursor-pointer ${
                          selectedCategory === cat.id
                            ? 'bg-[var(--accent)] text-[var(--accent-text,#0B101B)] shadow-sm'
                            : 'bg-white/5 text-slate-400 hover:text-white'
                        }`}
                      >
                        <span>{cat.icon}</span>
                        <span>{cat.name.split(' ')[0]}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 1: EMOJIS BODY */}
            {activeTab === 'emojis' && (
              <div className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-4 custom-scrollbar max-h-[50vh]">
                {filteredCategories.length === 0 ? (
                  <div className="text-center py-10 text-xs text-slate-400">
                    No se encontraron emojis para "{searchQuery}"
                  </div>
                ) : (
                  filteredCategories.map((cat) => (
                    <div key={cat.id} className="space-y-1.5">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                        <span>{cat.icon}</span>
                        <span>{cat.name}</span>
                      </span>

                      <div className="grid grid-cols-7 sm:grid-cols-8 gap-1">
                        {cat.emojis.map((em, idx) => {
                          const isSelected = value === em;
                          return (
                            <button
                              key={`${cat.id}-${idx}`}
                              type="button"
                              onClick={() => handleSelectIcon(em)}
                              className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl hover:bg-white/10 hover:scale-110 active:scale-90 transition-all cursor-pointer relative ${
                                isSelected ? 'bg-[var(--accent-muted,rgba(151,242,204,0.2))] ring-2 ring-[var(--accent,#97F2CC)]' : ''
                              }`}
                              title={em}
                            >
                              <span>{em}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB 2: PRESETS BODY */}
            {activeTab === 'presets' && (
              <div className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-4 custom-scrollbar max-h-[50vh]">
                {filteredPresets.length === 0 ? (
                  <div className="text-center py-10 text-xs text-slate-400">
                    No se encontraron servicios para "{searchQuery}"
                  </div>
                ) : (
                  filteredPresets.map((cat, catIdx) => (
                    <div key={catIdx} className="space-y-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        {cat.category}
                      </span>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {cat.items.map((item, itemIdx) => {
                          const isSelected = value === item.value;
                          return (
                            <button
                              key={itemIdx}
                              type="button"
                              onClick={() => handleSelectIcon(item.value)}
                              className={`p-2 rounded-xl bg-[#0E131D] border flex items-center gap-2.5 hover:bg-white/[0.06] hover:border-[var(--accent)]/40 hover:scale-[1.02] active:scale-95 transition-all text-left cursor-pointer group ${
                                isSelected ? 'border-[var(--accent)] bg-[var(--accent-muted,rgba(151,242,204,0.1))]' : 'border-white/[0.08]'
                              }`}
                            >
                              <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center shrink-0 overflow-hidden border border-white/5">
                                <DynamicIcon value={item.value} className="w-5 h-5 text-base" />
                              </div>
                              <span className="text-xs font-semibold text-white truncate group-hover:text-[var(--accent)] transition-colors">
                                {item.name}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB 3: CUSTOM URL BODY */}
            {activeTab === 'custom' && (
              <div className="p-5 space-y-5 flex-1 flex flex-col justify-between">
                <form onSubmit={handleApplyCustomUrl} className="space-y-4">
                  <div className="flex items-center gap-4 p-4 rounded-2xl bg-[#0E131D] border border-white/[0.08]">
                    <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 overflow-hidden shadow-inner">
                      {customUrlPreview ? (
                        <img 
                          src={customUrlPreview} 
                          alt="Vista previa" 
                          className="w-10 h-10 object-contain rounded-lg"
                          onError={() => setCustomUrlError(true)}
                          onLoad={() => setCustomUrlError(false)}
                        />
                      ) : (
                        <ImageIcon className="w-6 h-6 text-slate-500" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-bold text-white block">
                        Vista Previa
                      </span>
                      <span className="text-[11px] text-slate-400 block mt-0.5">
                        {customUrlError 
                          ? '⚠️ No se pudo cargar la imagen' 
                          : customUrlPreview 
                            ? 'Imagen cargada correctamente' 
                            : 'Pega un enlace PNG, SVG o ICO'}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5 block">
                      Enlace de la imagen (URL)
                    </label>
                    <input
                      type="url"
                      value={customUrlInput}
                      onChange={(e) => {
                        setCustomUrlInput(e.target.value);
                        setCustomUrlPreview(e.target.value.trim());
                        setCustomUrlError(false);
                      }}
                      placeholder="https://ejemplo.com/logo.png"
                      className="w-full px-3.5 h-11 text-xs rounded-xl bg-[#0E131D] border border-white/[0.08] text-white placeholder:text-slate-500 focus:outline-none focus:border-[var(--accent,#97F2CC)] focus:ring-1 focus:ring-[var(--accent,#97F2CC)] transition-all font-mono"
                    />
                  </div>

                  <div className="text-[11px] text-slate-400 space-y-1 bg-white/[0.02] p-3 rounded-xl border border-white/5">
                    <p className="font-semibold text-slate-300">💡 Sugerencia de enlaces:</p>
                    <p>• Logos transparentes en formato .PNG o .SVG</p>
                    <p>• Favicons oficiales (ej: <code>https://notion.so/images/favicon.ico</code>)</p>
                  </div>
                </form>

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCustomUrlInput('');
                      setCustomUrlPreview('');
                    }}
                    className="flex-1 h-11 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300 transition-all cursor-pointer"
                  >
                    Limpiar
                  </button>

                  <button
                    type="button"
                    onClick={handleApplyCustomUrl}
                    disabled={!customUrlInput.trim() || customUrlError}
                    className="flex-1 h-11 rounded-xl bg-[var(--accent,#97F2CC)] text-[#0B101B] text-xs font-bold flex items-center justify-center gap-1.5 shadow hover:brightness-105 active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                  >
                    <Check className="w-4 h-4 stroke-[2.5]" />
                    <span>Aplicar Icono</span>
                  </button>
                </div>
              </div>
            )}

            {/* Footer Summary */}
            <div className="p-3 bg-[#0E131D] border-t border-white/[0.06] flex items-center justify-between text-xs text-slate-400 px-4">
              <span>Icono actual:</span>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 flex items-center justify-center">
                  <DynamicIcon value={value} className="w-4 h-4 text-sm" />
                </div>
                <span className="font-mono text-[11px] text-slate-300 truncate max-w-[180px]">
                  {value}
                </span>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
