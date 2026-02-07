import { MedFlowRow, DataSummary } from '../types';

export const parseMedFlowCSV = (text: string): MedFlowRow[] => {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  const rows: MedFlowRow[] = [];

  // Simple CSV parser that handles basic quotes
  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuote = !inQuote;
      } else if (char === ',' && !inQuote) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  for (let i = 1; i < lines.length; i++) {
    const cols = parseLine(lines[i]);
    if (cols.length < headers.length) continue;

    const row: any = {};
    headers.forEach((h, idx) => {
        // Map common headers to consistent keys
        let key = h;
        if(idx === 0) key = 'SupplierID'; // Force first col
        
        let val = cols[idx] ? cols[idx].replace(/^"|"$/g, '') : '';
        row[key] = val;
    });

    // Type coercion
    row.Number = parseInt(row.Number) || 0;
    
    // Date Parsing (YYYYMMDD)
    if (row.Deliverdate && row.Deliverdate.length === 8) {
        const y = parseInt(row.Deliverdate.substring(0, 4));
        const m = parseInt(row.Deliverdate.substring(4, 6)) - 1;
        const d = parseInt(row.Deliverdate.substring(6, 8));
        row.parsedDate = new Date(y, m, d);
    } else {
        row.parsedDate = undefined;
    }

    rows.push(row as MedFlowRow);
  }

  return rows;
};

export const summarizeData = (data: MedFlowRow[]): DataSummary => {
    const totalUnits = data.reduce((sum, r) => sum + r.Number, 0);
    const suppliers = new Set(data.map(r => r.SupplierID)).size;
    const customers = new Set(data.map(r => r.CustomerID)).size;
    const categories = new Set(data.map(r => r.Category)).size;

    const dates = data.filter(r => r.parsedDate).map(r => r.parsedDate!.getTime());
    const minDate = dates.length ? new Date(Math.min(...dates)).toISOString().split('T')[0] : null;
    const maxDate = dates.length ? new Date(Math.max(...dates)).toISOString().split('T')[0] : null;

    const topN = (key: keyof MedFlowRow) => {
        const counts: Record<string, number> = {};
        data.forEach(r => {
            const k = String(r[key]);
            counts[k] = (counts[k] || 0) + r.Number;
        });
        return Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([k, v]) => ({ key: k, units: v }));
    };

    return {
        rows: data.length,
        total_units: totalUnits,
        unique: { suppliers, customers, categories },
        date_range: { min: minDate, max: maxDate },
        top_suppliers: topN('SupplierID'),
        top_customers: topN('CustomerID'),
        top_categories: topN('Category'),
        sample_rows: data.slice(0, 5)
    };
};
