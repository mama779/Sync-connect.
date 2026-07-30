import * as XLSX from 'xlsx';

export interface ExcelColumn {
  key: string;
  label: string;
}

export function exportToExcel(
  filename: string,
  rows: Record<string, any>[],
  columns?: ExcelColumn[]
) {
  if (!rows || rows.length === 0) {
    alert("No hay datos para exportar.");
    return;
  }

  // Mapear objetos según las columnas indicadas si existen
  const mappedData = rows.map(row => {
    if (!columns) return row;
    const mappedRow: Record<string, any> = {};
    columns.forEach(col => {
      mappedRow[col.label] = row[col.key] !== undefined && row[col.key] !== null ? row[col.key] : '';
    });
    return mappedRow;
  });

  try {
    const worksheet = XLSX.utils.json_to_sheet(mappedData);
    
    // Auto-fit columnas
    const colWidths = Object.keys(mappedData[0] || {}).map(key => ({
      wch: Math.max(key.length + 3, 14)
    }));
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Reporte");

    const sanitizedFilename = filename.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    XLSX.writeFile(workbook, `${sanitizedFilename}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  } catch (error) {
    console.error("Error al exportar con XLSX, usando fallback CSV:", error);
    // Fallback CSV
    const keys = columns ? columns.map(c => c.key) : Object.keys(rows[0]);
    const headerLabels = columns ? columns.map(c => c.label) : keys;
    const csvRows: string[] = [];

    csvRows.push(headerLabels.map(label => `"${String(label).replace(/"/g, '""')}"`).join(','));
    rows.forEach(row => {
      const rowValues = keys.map(key => `"${String(row[key] ?? '').replace(/"/g, '""')}"`);
      csvRows.push(rowValues.join(','));
    });

    const blob = new Blob(['\uFEFF' + csvRows.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const sanitizedFilename = filename.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    link.setAttribute('download', `${sanitizedFilename}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

