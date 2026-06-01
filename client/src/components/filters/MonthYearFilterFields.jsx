import { MONTH_FILTER_OPTIONS, buildYearOptions } from '../../utils/dateRangeFilters';

/**
 * Selectores de año y mes (mismo patrón que Cotizaciones / Facturas).
 */
export default function MonthYearFilterFields({
  year,
  month,
  onYearChange,
  onMonthChange,
  yearOptions,
  idPrefix = 'filter',
}) {
  const years = yearOptions ?? buildYearOptions();

  return (
    <>
      <label className="quotes-filter-field quotes-filter-field--year">
        <span className="quotes-filter-label">Año</span>
        <select
          id={`${idPrefix}-year`}
          className="quotes-filter-select"
          value={year}
          onChange={(e) => onYearChange(e.target.value)}
        >
          {years.map((o) => (
            <option key={o.value || 'all'} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      <label className="quotes-filter-field quotes-filter-field--month">
        <span className="quotes-filter-label">Mes</span>
        <select
          id={`${idPrefix}-month`}
          className="quotes-filter-select"
          value={month}
          onChange={(e) => onMonthChange(e.target.value)}
        >
          {MONTH_FILTER_OPTIONS.map((o) => (
            <option key={o.value || 'all'} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
    </>
  );
}
