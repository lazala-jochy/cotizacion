import { useMemo } from 'react';
import {
  FORMA_PAGO_CREDIT_VALUE,
  FORMA_PAGO_PRESETS,
  buildFormaPago,
  parseFormaPago,
} from '../utils/formaPago';

export default function FormaPagoFields({ value, onChange, className = '' }) {
  const parsed = useMemo(() => parseFormaPago(value), [value]);
  const selectValue =
    parsed.kind === FORMA_PAGO_CREDIT_VALUE || FORMA_PAGO_PRESETS.includes(parsed.kind)
      ? parsed.kind
      : parsed.kind;

  const handleKindChange = (nextKind) => {
    if (nextKind === FORMA_PAGO_CREDIT_VALUE) {
      onChange(buildFormaPago({ kind: FORMA_PAGO_CREDIT_VALUE, creditDays: parsed.creditDays || 30 }));
      return;
    }
    onChange(buildFormaPago({ kind: nextKind, creditDays: parsed.creditDays }));
  };

  const handleCreditDaysChange = (days) => {
    onChange(buildFormaPago({ kind: FORMA_PAGO_CREDIT_VALUE, creditDays: days }));
  };

  const showCreditDays = selectValue === FORMA_PAGO_CREDIT_VALUE;
  const showLegacyHint = parsed.isLegacy && !FORMA_PAGO_PRESETS.includes(parsed.kind);

  return (
    <div className={`forma-pago-fields${className ? ` ${className}` : ''}`}>
      <label>
        Forma de pago
        <select value={selectValue} onChange={(e) => handleKindChange(e.target.value)}>
          {FORMA_PAGO_PRESETS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
          <option value={FORMA_PAGO_CREDIT_VALUE}>Crédito</option>
          {showLegacyHint && (
            <option value={parsed.kind}>{parsed.kind}</option>
          )}
        </select>
      </label>
      {showCreditDays && (
        <label>
          Días de crédito
          <input
            type="number"
            min={1}
            max={365}
            value={parsed.creditDays || 30}
            onChange={(e) => handleCreditDaysChange(e.target.value)}
            placeholder="Ej: 30"
          />
        </label>
      )}
    </div>
  );
}
