// 1. Exportar a CSV (Compatible directamente con Excel con BOM UTF-8)
export const exportToCSV = (data, filename = 'export', columns = []) => {
  if (!data || !data.length) {
    alert('No hay datos disponibles para exportar');
    return;
  }

  const headers = columns.map(c => `"${c.label}"`).join(',');
  const rows = data.map(item =>
    columns.map(c => {
      let val = typeof c.accessor === 'function' ? c.accessor(item) : item[c.accessor];
      val = val === null || val === undefined ? '' : String(val).replace(/"/g, '""');
      return `"${val}"`;
    }).join(',')
  );

  const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers, ...rows].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// 2. Exportar a PDF (Impresión estilizada directa y limpia con membrete Growy)
export const exportToPDF = (title, data, columns = []) => {
  if (!data || !data.length) {
    alert('No hay datos disponibles para exportar');
    return;
  }

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Por favor permite ventanas emergentes para generar el PDF');
    return;
  }

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
          @page { size: auto; margin: 20mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 10px; color: #111827; }
          .header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #AEEDD0; padding-bottom: 12px; margin-bottom: 20px; }
          .title { margin: 0; font-size: 22px; font-weight: 800; color: #131E22; letter-spacing: -0.5px; }
          .subtitle { margin: 4px 0 0; font-size: 11px; color: #6b7280; font-weight: 500; }
          .badge { background-color: #131E22; color: #AEEDD0; padding: 4px 10px; border-radius: 6px; font-size: 10px; font-weight: 700; text-transform: uppercase; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          .footer { margin-top: 25px; padding-top: 10px; border-top: 1px solid #e5e7eb; font-size: 10px; color: #9ca3af; display: flex; justify-content: space-between; align-items: center; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="title">${title}</h1>
            <p class="subtitle">Reporte generado por Growy • ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
          </div>
          <div class="badge">GROWY APP</div>
        </div>
        <table>
          <thead><tr>${tableHeaders}</tr></thead>
          <tbody>${tableRows}</tbody>
        </table>
        <div class="footer">
          <span>Confidencial • Finanzas Personales</span>
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
