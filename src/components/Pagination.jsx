import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

/**
 * Universal Pagination Component for Growy data lists and grids.
 */
export default function Pagination({
  currentPage = 1,
  totalItems = 0,
  pageSize = 10,
  pageSizeOptions = [10, 30, 50],
  onPageChange,
  onPageSizeChange,
  className = ''
}) {
  const { t } = useSettings();

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const validCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const startIndex = totalItems === 0 ? 0 : (validCurrentPage - 1) * pageSize + 1;
  const endIndex = Math.min(validCurrentPage * pageSize, totalItems);

  if (totalItems <= 0) return null;

  return (
    <div className={`w-full flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-[#141E22]/60 border border-white/5 backdrop-blur-md relative z-10 ${className}`}>
      
      {/* Page Size & Range Counter */}
      <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
        {onPageSizeChange && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium whitespace-nowrap">
              {t('pagination.rowsPerPage', {}, 'Mostrar:')}
            </span>
            <div className="flex items-center gap-1 bg-[#131E22] p-0.5 rounded-lg border border-white/10">
              {pageSizeOptions.map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => onPageSizeChange(size)}
                  className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                    pageSize === size
                      ? 'bg-[var(--accent,#97F2CC)] text-[var(--accent-text,#091E15)] shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="text-xs text-slate-300 font-medium tabular-nums whitespace-nowrap">
          <span className="text-white font-bold">{startIndex} - {endIndex}</span>
          <span className="text-slate-500 mx-1.5">/</span>
          <span className="text-slate-400">{totalItems} {t('pagination.totalRecords', {}, 'Registros')}</span>
        </div>
      </div>

      {/* Page Navigator Controls */}
      <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
        <span className="text-xs text-slate-400 font-medium tabular-nums">
          {t('pagination.pageOf', { current: validCurrentPage, total: totalPages }, `Página ${validCurrentPage} de ${totalPages}`)}
        </span>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onPageChange(validCurrentPage - 1)}
            disabled={validCurrentPage <= 1}
            className="w-8 h-8 rounded-xl bg-[#131E22] hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white flex items-center justify-center transition-all disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
            title={t('pagination.previous', {}, 'Anterior')}
          >
            <ChevronLeft size={15} />
          </button>

          <button
            type="button"
            onClick={() => onPageChange(validCurrentPage + 1)}
            disabled={validCurrentPage >= totalPages}
            className="w-8 h-8 rounded-xl bg-[#131E22] hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white flex items-center justify-center transition-all disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
            title={t('pagination.next', {}, 'Siguiente')}
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

    </div>
  );
}
