import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Download, FileSpreadsheet, FileText, ChevronDown } from 'lucide-react';
import { exportToCSV, exportToPDF } from '../utils/exportUtils';
import { useSettings } from '../context/SettingsContext';

export const ExportDropdown = ({ 
  data, 
  columns, 
  title = "Report", 
  filename = "export", 
  summary = null,
  className = "" 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const buttonRef = useRef(null);

  let tFunc = null;
  try {
    const settings = useSettings();
    tFunc = settings?.t;
  } catch (e) {}

  const exportLabel = tFunc ? tFunc('common.export', {}, 'Exportar') : 'Exportar';

  const updatePosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const menuWidth = 176; // 176px (w-44)
      setCoords({
        top: rect.bottom + 6,
        left: rect.right - menuWidth
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
        !e.target.closest('.export-menu-portal')
      ) {
        setIsOpen(false);
      }
    };

    const handleScroll = (e) => {
      // Don't close if scrolling inside the portal menu itself
      if (e?.target?.closest && e.target.closest('.export-menu-portal')) return;
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
    <div className={`relative ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        className="h-11 px-4 bg-[#131E22] hover:bg-white/5 border border-white/10 rounded-xl text-xs font-semibold text-white flex items-center gap-2 transition-all shadow-inner shrink-0 cursor-pointer"
      >
        <Download className="text-[#AEEDD0]" size={15} />
        <span>{exportLabel}</span>
        <ChevronDown className={`text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-[#AEEDD0]' : ''}`} size={14} />
      </button>

      {isOpen && createPortal(
        <div
          style={{ top: `${coords.top}px`, left: `${coords.left}px` }}
          className="export-menu-portal fixed w-44 p-1.5 bg-[#162226] border border-white/10 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.9)] z-[9999] animate-in fade-in zoom-in-95 duration-100 flex flex-col gap-1 backdrop-blur-xl"
        >
          <button
            type="button"
            onClick={() => { exportToCSV(data, filename, columns, summary); setIsOpen(false); }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors text-left cursor-pointer"
          >
            <FileSpreadsheet className="text-emerald-400 shrink-0" size={15} />
            <span className="font-medium">{tFunc ? tFunc('export.csvLabel', {}, 'Excel / CSV (.csv)') : 'Excel / CSV (.csv)'}</span>
          </button>
          <button
            type="button"
            onClick={() => { exportToPDF(title, data, columns, summary); setIsOpen(false); }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors text-left cursor-pointer"
          >
            <FileText className="text-rose-400 shrink-0" size={15} />
            <span className="font-medium">{tFunc ? tFunc('export.pdfLabel', {}, 'PDF Document (.pdf)') : 'PDF Document (.pdf)'}</span>
          </button>
        </div>,
        document.body
      )}
    </div>
  );
};

export default ExportDropdown;
