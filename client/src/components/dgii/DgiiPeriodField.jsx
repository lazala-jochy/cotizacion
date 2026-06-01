import { useMemo } from 'react';

const MONTHS = [
  { value: '01', label: 'Enero' },
  { value: '02', label: 'Febrero' },
  { value: '03', label: 'Marzo' },
  { value: '04', label: 'Abril' },
  { value: '05', label: 'Mayo' },
  { value: '06', label: 'Junio' },
  { value: '07', label: 'Julio' },
  { value: '08', label: 'Agosto' },
  { value: '09', label: 'Septiembre' },
  { value: '10', label: 'Octubre' },
  { value: '11', label: 'Noviembre' },
  { value: '12', label: 'Diciembre' },
];

export function defaultPeriodParts() {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return {
    year: String(d.getFullYear()),
    month: String(d.getMonth() + 1).padStart(2, '0'),
  };
}

export function buildPeriod(year, month) {
  if (!year || !month) return '';
  return `${year}${month}`;
}

export default function DgiiPeriodField({ year, month, onYearChange, onMonthChange }) {
  const years = useMemo(() => {
    const current = new Date().getFullYear();
    const list = [];
    for (let y = current; y >= current - 6; y -= 1) list.push(String(y));
    return list;
  }, []);

  return (
    <div className="quotes-filters-bar">
      <label className="quotes-filter-field quotes-filter-field--year">
        <span className="quotes-filter-label">Año fiscal</span>
        <select className="quotes-filter-select" value={year} onChange={(e) => onYearChange(e.target.value)}>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </label>
      <label className="quotes-filter-field quotes-filter-field--month">
        <span className="quotes-filter-label">Mes</span>
        <select className="quotes-filter-select" value={month} onChange={(e) => onMonthChange(e.target.value)}>
          {MONTHS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
