/**
 * Universal Export Utilities with Consolidated Summary (CSV / PDF)
 */

// 1. Exportar a CSV (Compatible con Excel, BOM UTF-8 y bloque de resumen consolidado)
export const exportToCSV = (data, filename = 'export', columns = [], summary = null) => {
  if (!data || !data.length) {
    alert('No hay datos disponibles para exportar');
    return;
  }

  const timestamp = `${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  
  let summaryRows = [];
  if (summary) {
    summaryRows = [
      `"REPORTE OFICIAL GROWY - RESUMEN EJECUTIVO"`,
      `"Fecha de Generación:","${timestamp}"`,
      `"Total Registros Filtrados:","${summary.totalRecords ?? data.length}"`,
      summary.consolidatedTotal ? `"Total Consolidado en [${summary.baseCurrency || 'Base'}]:","${summary.consolidatedTotal}"` : '',
      `""` // Empty row separator
    ].filter(Boolean);
  }

  const headers = columns.map(c => `"${c.label}"`).join(',');
  const rows = data.map(item =>
    columns.map(c => {
      let val = typeof c.accessor === 'function' ? c.accessor(item) : item[c.accessor];
      val = val === null || val === undefined ? '' : String(val).replace(/"/g, '""');
      return `"${val}"`;
    }).join(',')
  );

  const fullContent = [
    ...(summaryRows.length ? summaryRows : []),
    headers,
    ...rows
  ];

  const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + fullContent.join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// 2. Exportar a PDF (Impresión estilizada directa, membrete oficial y tarjeta de resumen)
export const exportToPDF = (title, data, columns = [], summary = null) => {
  if (!data || !data.length) {
    alert('No hay datos disponibles para exportar');
    return;
  }

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Por favor permite ventanas emergentes para generar el PDF');
    return;
  }

  const timestamp = `${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

  const summaryHtml = summary ? `
    <div style="display: flex; gap: 15px; background: #f3f4f6; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px; border-left: 4px solid #10b981;">
      <div style="flex: 1;">
        <span style="font-size: 10px; text-transform: uppercase; color: #6b7280; font-weight: 700; display: block;">Total Registros Filtrados</span>
        <span style="font-size: 16px; font-weight: 800; color: #111827;">${summary.totalRecords ?? data.length}</span>
      </div>
      ${summary.consolidatedTotal ? `
      <div style="flex: 1; border-left: 1px solid #e5e7eb; padding-left: 15px;">
        <span style="font-size: 10px; text-transform: uppercase; color: #6b7280; font-weight: 700; display: block;">Total Consolidado en [${summary.baseCurrency || 'Base'}]</span>
        <span style="font-size: 16px; font-weight: 800; color: #059669;">${summary.consolidatedTotal}</span>
      </div>` : ''}
    </div>
  ` : '';

  const tableHeaders = columns.map(c => `<th style="padding: 10px; border-bottom: 2px solid #131E22; text-align: left; font-size: 11px; color: #131E22; text-transform: uppercase; letter-spacing: 0.5px;">${c.label}</th>`).join('');
  
  const tableRows = data.map((item, idx) => {
    const bg = idx % 2 === 0 ? '#ffffff' : '#f9fafb';
    const cells = columns.map(c => {
      const val = typeof c.accessor === 'function' ? c.accessor(item) : item[c.accessor];
      return `<td style="padding: 9px 10px; border-bottom: 1px solid #e5e7eb; font-size: 11px; color: #374151;">${val ?? '-'}</td>`;
    }).join('');
    return `<tr style="background-color: ${bg};">${cells}</tr>`;
  }).join('');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title} - Growy Report</title>
        <style>
          @page { size: auto; margin: 15mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 10px; color: #111827; }
          .header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #AEEDD0; padding-bottom: 12px; margin-bottom: 15px; }
          .title { margin: 0; font-size: 22px; font-weight: 800; color: #131E22; letter-spacing: -0.5px; }
          .subtitle { margin: 4px 0 0; font-size: 11px; color: #6b7280; font-weight: 500; }
          .badge { background-color: #131E22; color: #AEEDD0; padding: 4px 10px; border-radius: 6px; font-size: 10px; font-weight: 700; text-transform: uppercase; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          .footer { margin-top: 25px; padding-top: 10px; border-top: 1px solid #e5e7eb; font-size: 10px; color: #9ca3af; display: flex; justify-content: space-between; align-items: center; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="title">${title}</h1>
            <p class="subtitle">Reporte generado por Growy • ${timestamp}</p>
          </div>
          <div class="badge">GROWY APP</div>
        </div>
        ${summaryHtml}
        <table>
          <thead><tr>${tableHeaders}</tr></thead>
          <tbody>${tableRows}</tbody>
        </table>
        <div class="footer">
          <span>Confidencial • Finanzas Personales Growy</span>
          <span>Total de Registros: ${data.length}</span>
        </div>
        <script>
          window.onload = function() { window.print(); window.close(); };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
};
